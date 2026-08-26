import { Types } from "mongoose";
import { env } from "../config/env.js";
import type { AttendanceLocation } from "../models/attendance.model.js";
import { attendanceRepository } from "../repositories/attendance.repository.js";
import { faceEnrollmentRepository } from "../repositories/face-enrollment.repository.js";
import { organizationRepository } from "../repositories/organization.repository.js";
import { organizationSettingsRepository } from "../repositories/organization-settings.repository.js";
import { AppError } from "../utils/app-error.js";
import { hashValue } from "../utils/crypto.js";
import type {
  AttendanceAdminOverviewQuery,
  AttendanceHistoryQuery,
  AttendanceLocationInput,
  AttendanceMarkInput,
  AttendanceSummaryQuery,
  ManualAttendanceMarkInput,
} from "../validation/attendance.validation.js";
import { faceEnrollmentService } from "./face-enrollment.service.js";
import { securityService } from "./security.service.js";

const indiaTimezone = "Asia/Kolkata";
type RequestMeta = { ip?: string; userAgent?: string; deviceId?: string };

function todayKey() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: indiaTimezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  return `${parts.find((part) => part.type === "year")?.value}-${parts.find((part) => part.type === "month")?.value}-${parts.find((part) => part.type === "day")?.value}`;
}

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

function calculateDistanceMeters(from: AttendanceLocationInput, to: { latitude: number; longitude: number }) {
  const earthRadiusMeters = 6371000;
  const deltaLat = toRadians(to.latitude - from.latitude);
  const deltaLng = toRadians(to.longitude - from.longitude);
  const fromLat = toRadians(from.latitude);
  const toLat = toRadians(to.latitude);
  const haversine =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(fromLat) * Math.cos(toLat) * Math.sin(deltaLng / 2) ** 2;
  return 2 * earthRadiusMeters * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

type AttendanceOfficeConfig = {
  name: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  allowRemoteCheckIn: boolean;
  enforceGeoFence: boolean;
};

function fallbackOfficeLocation(): AttendanceOfficeConfig {
  return {
    name: "Main Office",
    latitude: env.ATTENDANCE_OFFICE_LAT,
    longitude: env.ATTENDANCE_OFFICE_LNG,
    radiusMeters: env.ATTENDANCE_RADIUS_METERS,
    allowRemoteCheckIn: false,
    enforceGeoFence: true,
  };
}

async function officeLocation(): Promise<AttendanceOfficeConfig> {
  const organization = await organizationRepository.getOrCreateDefault();
  const settings = await organizationSettingsRepository.getOrCreateDefault(organization._id);
  const location = settings.workspacePreferences.officeLocation;
  const fallback = fallbackOfficeLocation();
  return {
    name: location?.name ?? fallback.name,
    latitude: location?.latitude ?? fallback.latitude,
    longitude: location?.longitude ?? fallback.longitude,
    radiusMeters: location?.radiusMeters ?? fallback.radiusMeters,
    allowRemoteCheckIn: settings.workspacePreferences.allowRemoteCheckIn,
    enforceGeoFence: settings.workspacePreferences.enforceGeoFence !== false,
  };
}

async function verifiedLocation(input: AttendanceLocationInput): Promise<AttendanceLocation> {
  const office = await officeLocation();
  const distanceMeters = Math.round(calculateDistanceMeters(input, office));
  if ((office.enforceGeoFence || !office.allowRemoteCheckIn) && distanceMeters > office.radiusMeters) {
    throw new AppError(`You are ${distanceMeters}m away from office. Attendance is allowed within ${office.radiusMeters}m only.`, 400);
  }
  return { latitude: input.latitude, longitude: input.longitude, accuracy: input.accuracy, distanceMeters };
}

function requireUserId(userId?: string) {
  if (!userId) throw new AppError("Authentication required", 401);
  return userId;
}

function deviceHash(meta?: RequestMeta) {
  return meta?.deviceId ? hashValue(meta.deviceId) : undefined;
}

export class AttendanceService {
  async office() {
    const { allowRemoteCheckIn: _allowRemoteCheckIn, enforceGeoFence: _enforceGeoFence, ...office } = await officeLocation();
    return office;
  }

  async today(userId?: string) {
    const currentUserId = requireUserId(userId);
    const { allowRemoteCheckIn: _allowRemoteCheckIn, enforceGeoFence: _enforceGeoFence, ...office } = await officeLocation();
    return { record: await attendanceRepository.findByUserAndDate(currentUserId, todayKey()), office };
  }

  async history(userId: string | undefined, query: AttendanceHistoryQuery) {
    return attendanceRepository.findRecentByUser(requireUserId(userId), query.limit);
  }

  async summary(query: AttendanceSummaryQuery) {
    return attendanceRepository.findByDate(query.date ?? todayKey());
  }

  async adminOverview(query: AttendanceAdminOverviewQuery) {
    const records = await attendanceRepository.findAdminOverview(query.date ?? todayKey());
    const userIds = records.map((record) => {
      const user = record.userId as unknown as { _id?: Types.ObjectId };
      return user?._id?.toString();
    }).filter((value): value is string => Boolean(value));
    const enrollments = await faceEnrollmentRepository.findLatestStatusesByUsers(userIds);
    const enrollmentByUser = new Map<string, string>();
    for (const enrollment of enrollments) {
      const key = enrollment.userId.toString();
      if (!enrollmentByUser.has(key)) enrollmentByUser.set(key, enrollment.status);
    }
    const normalized = records.map((record) => {
      const user = record.userId as unknown as { _id?: Types.ObjectId; fullName?: string; email?: string; role?: string; employeeProfile?: { employeeCode?: string } };
      const userId = user?._id?.toString() ?? String(record.userId);
      return {
        id: record._id.toString(),
        date: record.date,
        status: record.status,
        checkInAt: record.checkInAt,
        checkOutAt: record.checkOutAt,
        checkInMethod: record.checkInMethod ?? (record.checkInFaceVerified ? "face" : "manual"),
        checkOutMethod: record.checkOutMethod,
        checkInFaceVerified: Boolean(record.checkInFaceVerified),
        checkOutFaceVerified: Boolean(record.checkOutFaceVerified),
        checkInManualReason: record.checkInManualReason,
        checkOutManualReason: record.checkOutManualReason,
        employee: {
          id: userId,
          fullName: user?.fullName ?? "Unknown employee",
          email: user?.email ?? "",
          role: user?.role ?? "",
          employeeCode: user?.employeeProfile?.employeeCode,
        },
        enrollmentStatus: enrollmentByUser.get(userId) ?? "not_enrolled",
      };
    });
    const search = query.search?.toLowerCase();
    const filtered = normalized.filter((record) => {
      if (query.status && record.status !== query.status) return false;
      if (query.method && record.checkInMethod !== query.method && record.checkOutMethod !== query.method) return false;
      if (search && !`${record.employee.fullName} ${record.employee.email} ${record.employee.employeeCode ?? ""}`.toLowerCase().includes(search)) return false;
      return true;
    });
    const start = (query.page - 1) * query.limit;
    return { records: filtered.slice(start, start + query.limit), total: filtered.length, page: query.page, limit: query.limit, date: query.date ?? todayKey() };
  }

  async checkIn(userId: string | undefined, input: AttendanceMarkInput, meta?: RequestMeta) {
    const currentUserId = requireUserId(userId);
    const date = todayKey();
    if (await attendanceRepository.findByUserAndDate(currentUserId, date)) {
      throw new AppError("Attendance is already checked in for today.", 409);
    }
    const location = await verifiedLocation(input);
    const verification = await faceEnrollmentService.verifyAttendance(currentUserId, "check-in", input.verification, meta);
    const record = await attendanceRepository.create({
      userId: new Types.ObjectId(currentUserId),
      date,
      status: "Present",
      checkInAt: new Date(),
      checkInMethod: "face",
      checkInFaceVerified: true,
      checkInLivenessPassed: true,
      checkInFaceEnrollmentId: new Types.ObjectId(verification.faceEnrollmentId),
      checkInVerificationChallengeId: new Types.ObjectId(verification.verificationChallengeId),
      checkInVerificationModelVersion: verification.verificationModelVersion,
      checkInDeviceIdHash: deviceHash(meta),
      checkInLocation: location,
    });
    await this.auditAttendance(currentUserId, "check-in", "face", meta);
    return record;
  }

  async checkOut(userId: string | undefined, input: AttendanceMarkInput, meta?: RequestMeta) {
    const currentUserId = requireUserId(userId);
    const date = todayKey();
    const existing = await attendanceRepository.findByUserAndDate(currentUserId, date);
    if (!existing) throw new AppError("Please check in before checking out.", 400);
    if (existing.checkOutAt) throw new AppError("Attendance is already checked out for today.", 409);
    const location = await verifiedLocation(input);
    const verification = await faceEnrollmentService.verifyAttendance(currentUserId, "check-out", input.verification, meta);
    const record = await attendanceRepository.updateByUserAndDate(currentUserId, date, {
      status: "Checked Out",
      checkOutAt: new Date(),
      checkOutMethod: "face",
      checkOutFaceVerified: true,
      checkOutLivenessPassed: true,
      checkOutFaceEnrollmentId: new Types.ObjectId(verification.faceEnrollmentId),
      checkOutVerificationChallengeId: new Types.ObjectId(verification.verificationChallengeId),
      checkOutVerificationModelVersion: verification.verificationModelVersion,
      checkOutDeviceIdHash: deviceHash(meta),
      checkOutLocation: location,
    });
    await this.auditAttendance(currentUserId, "check-out", "face", meta);
    return record;
  }

  async manualCheckIn(userId: string | undefined, input: ManualAttendanceMarkInput, meta?: RequestMeta) {
    const currentUserId = requireUserId(userId);
    const date = todayKey();
    if (await attendanceRepository.findByUserAndDate(currentUserId, date)) throw new AppError("Attendance is already checked in for today.", 409);
    const record = await attendanceRepository.create({
      userId: new Types.ObjectId(currentUserId), date, status: "Present", checkInAt: new Date(),
      checkInMethod: "manual", checkInManualReason: input.reason, checkInFaceVerified: false,
      checkInLivenessPassed: false, checkInDeviceIdHash: deviceHash(meta), checkInLocation: await verifiedLocation(input),
    });
    await this.auditAttendance(currentUserId, "check-in", "manual", meta, input.reason);
    return record;
  }

  async manualCheckOut(userId: string | undefined, input: ManualAttendanceMarkInput, meta?: RequestMeta) {
    const currentUserId = requireUserId(userId);
    const date = todayKey();
    const existing = await attendanceRepository.findByUserAndDate(currentUserId, date);
    if (!existing) throw new AppError("Please check in before checking out.", 400);
    if (existing.checkOutAt) throw new AppError("Attendance is already checked out for today.", 409);
    const record = await attendanceRepository.updateByUserAndDate(currentUserId, date, {
      status: "Checked Out", checkOutAt: new Date(), checkOutMethod: "manual",
      checkOutManualReason: input.reason, checkOutFaceVerified: false, checkOutLivenessPassed: false,
      checkOutDeviceIdHash: deviceHash(meta), checkOutLocation: await verifiedLocation(input),
    });
    await this.auditAttendance(currentUserId, "check-out", "manual", meta, input.reason);
    return record;
  }

  private async auditAttendance(userId: string, action: string, method: "face" | "manual", meta?: RequestMeta, reason?: string) {
    await securityService.recordSecurityEvent({
      userId,
      eventType: method === "face" ? "face_attendance_recorded" : "manual_attendance_recorded",
      severity: method === "face" ? "low" : "medium",
      ip: meta?.ip,
      userAgent: meta?.userAgent,
      description: `${method === "face" ? "Face-verified" : "Manual"} attendance ${action} recorded`,
      metadata: { action, verificationMethod: method, faceVerified: method === "face", reason, deviceIdentifierPresent: Boolean(meta?.deviceId) },
    });
  }
}

export const attendanceService = new AttendanceService();
