import type { Request } from "express";
import { attendanceService } from "../services/attendance.service.js";
import { faceVerificationChallengeService } from "../services/face-verification-challenge.service.js";
import { jsonController } from "../utils/controller.js";
import type { AttendanceAdminOverviewQuery, AttendanceHistoryQuery, AttendanceSummaryQuery } from "../validation/attendance.validation.js";

function requestMeta(req: Request) {
  return {
    ip: req.ip,
    userAgent: req.get("user-agent") ?? undefined,
    deviceId: req.header("x-device-id") ?? undefined,
  };
}

export class AttendanceController {
  office = jsonController(200, "Attendance office fetched successfully", () => attendanceService.office());

  today = jsonController(200, "Attendance fetched successfully", ({ req }) =>
    attendanceService.today(req.user?.id),
  );

  history = jsonController(200, "Attendance history fetched successfully", ({ req }) =>
    attendanceService.history(req.user?.id, req.query as unknown as AttendanceHistoryQuery),
  );

  summary = jsonController(200, "Attendance summary fetched successfully", ({ req }) =>
    attendanceService.summary(req.query as unknown as AttendanceSummaryQuery),
  );

  adminOverview = jsonController(200, "Attendance overview fetched successfully", ({ req }) =>
    attendanceService.adminOverview(req.query as unknown as AttendanceAdminOverviewQuery),
  );

  issueVerificationChallenge = jsonController(201, "Liveness challenge issued successfully", ({ req }) =>
    faceVerificationChallengeService.issue(req.user!.id, req.body.action, req.header("x-device-id") ?? undefined),
  );

  checkIn = jsonController(201, "Attendance checked in successfully", ({ req }) =>
    attendanceService.checkIn(req.user?.id, req.body, requestMeta(req)),
  );

  checkOut = jsonController(200, "Attendance checked out successfully", ({ req }) =>
    attendanceService.checkOut(req.user?.id, req.body, requestMeta(req)),
  );

  manualCheckIn = jsonController(201, "Manual attendance check-in recorded", ({ req }) =>
    attendanceService.manualCheckIn(req.user?.id, req.body, requestMeta(req)),
  );

  manualCheckOut = jsonController(200, "Manual attendance check-out recorded", ({ req }) =>
    attendanceService.manualCheckOut(req.user?.id, req.body, requestMeta(req)),
  );
}

export const attendanceController = new AttendanceController();
