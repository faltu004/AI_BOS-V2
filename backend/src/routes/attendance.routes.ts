import { Router } from "express";
import { attendanceController } from "../controllers/attendance.controller.js";
import { route } from "../middleware/async-handler.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { requirePermission, requireRole } from "../middleware/rbac.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import { attendanceAdminOverviewQuerySchema, attendanceHistoryQuerySchema, attendanceMarkSchema, attendanceSummaryQuerySchema, issueFaceChallengeSchema, manualAttendanceMarkSchema } from "../validation/attendance.validation.js";

export const attendanceRoutes = Router();

attendanceRoutes.use(authenticate);

attendanceRoutes.get("/office", ...route(attendanceController.office));
attendanceRoutes.get("/me/today", ...route(attendanceController.today));
attendanceRoutes.get("/me/history", ...route(validate({ query: attendanceHistoryQuerySchema }), attendanceController.history));
attendanceRoutes.get("/summary", requirePermission("user.view_all"), ...route(validate({ query: attendanceSummaryQuerySchema }), attendanceController.summary));
attendanceRoutes.get("/admin/overview", requireRole("Owner", "Administrator"), ...route(validate({ query: attendanceAdminOverviewQuerySchema }), attendanceController.adminOverview));
attendanceRoutes.post("/verification-challenge", ...route(validate({ body: issueFaceChallengeSchema }), attendanceController.issueVerificationChallenge));
attendanceRoutes.post("/check-in", ...route(validate({ body: attendanceMarkSchema }), attendanceController.checkIn));
attendanceRoutes.post("/check-out", ...route(validate({ body: attendanceMarkSchema }), attendanceController.checkOut));
attendanceRoutes.post("/manual/check-in", ...route(validate({ body: manualAttendanceMarkSchema }), attendanceController.manualCheckIn));
attendanceRoutes.post("/manual/check-out", ...route(validate({ body: manualAttendanceMarkSchema }), attendanceController.manualCheckOut));
