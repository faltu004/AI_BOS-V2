import { attendanceService } from "../services/attendance.service.js";
import { jsonController } from "../utils/controller.js";
import type { AttendanceHistoryQuery, AttendanceSummaryQuery } from "../validation/attendance.validation.js";

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

  checkIn = jsonController(201, "Attendance checked in successfully", ({ req }) =>
    attendanceService.checkIn(req.user?.id, req.body),
  );

  checkOut = jsonController(200, "Attendance checked out successfully", ({ req }) =>
    attendanceService.checkOut(req.user?.id, req.body),
  );
}

export const attendanceController = new AttendanceController();
