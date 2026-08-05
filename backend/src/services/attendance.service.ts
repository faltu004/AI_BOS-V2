import { Types } from "mongoose";
import { env } from "../config/env.js";
import type { AttendanceLocation } from "../models/attendance.model.js";
import { organizationRepository } from "../repositories/organization.repository.js";
import { organizationSettingsRepository } from "../repositories/organization-settings.repository.js";
import { attendanceRepository } from "../repositories/attendance.repository.js";
import { AppError } from "../utils/app-error.js";
import type { AttendanceHistoryQuery, AttendanceLocationInput, AttendanceMarkInput, AttendanceSummaryQuery } from "../validation/attendance.validation.js";

const indiaTimezone = "Asia/Kolkata";

function todayKey() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: indiaTimezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  return `${year}-${month}-${day}`;
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
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(fromLat) * Math.cos(toLat) * Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);

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

  const shouldEnforceGeoFence = office.enforceGeoFence || !office.allowRemoteCheckIn;

  if (shouldEnforceGeoFence && distanceMeters > office.radiusMeters) {
    throw new AppError(
      `You are ${distanceMeters}m away from office. Attendance is allowed within ${office.radiusMeters}m only.`,
      400,
    );
  }

  return {
    latitude: input.latitude,
    longitude: input.longitude,
    accuracy: input.accuracy,
    distanceMeters,
  };
}

function requireUserId(userId?: string) {
  if (!userId) throw new AppError("Authentication required", 401);
  return userId;
}

export class AttendanceService {
  async office() {
    const { allowRemoteCheckIn: _allowRemoteCheckIn, enforceGeoFence: _enforceGeoFence, ...office } = await officeLocation();
    return office;
  }

  async today(userId?: string) {
    const currentUserId = requireUserId(userId);
    const { allowRemoteCheckIn: _allowRemoteCheckIn, enforceGeoFence: _enforceGeoFence, ...office } = await officeLocation();
    const record = await attendanceRepository.findByUserAndDate(currentUserId, todayKey());
    return {
      record,
      office,
    };
  }

  async history(userId: string | undefined, query: AttendanceHistoryQuery) {
    const currentUserId = requireUserId(userId);
    return attendanceRepository.findRecentByUser(currentUserId, query.limit);
  }

  async summary(query: AttendanceSummaryQuery) {
    return attendanceRepository.findByDate(query.date ?? todayKey());
  }

  async checkIn(userId: string | undefined, input: AttendanceMarkInput) {
    const currentUserId = requireUserId(userId);
    const date = todayKey();
    const existing = await attendanceRepository.findByUserAndDate(currentUserId, date);

    if (existing) {
      throw new AppError("Attendance is already checked in for today.", 409);
    }

    return attendanceRepository.create({
      userId: new Types.ObjectId(currentUserId),
      date,
      status: "Present",
      checkInAt: new Date(),
      checkInLocation: await verifiedLocation(input),
      checkInFaceImage: input.faceImage,
    });
  }

  async checkOut(userId: string | undefined, input: AttendanceMarkInput) {
    const currentUserId = requireUserId(userId);
    const date = todayKey();
    const existing = await attendanceRepository.findByUserAndDate(currentUserId, date);

    if (!existing) {
      throw new AppError("Please check in before checking out.", 400);
    }

    if (existing.checkOutAt) {
      throw new AppError("Attendance is already checked out for today.", 409);
    }

    return attendanceRepository.updateByUserAndDate(currentUserId, date, {
      status: "Checked Out",
      checkOutAt: new Date(),
      checkOutLocation: await verifiedLocation(input),
      checkOutFaceImage: input.faceImage,
    });
  }
}

export const attendanceService = new AttendanceService();
