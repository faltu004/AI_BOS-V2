import { Router } from "express";
import { attendanceController } from "../controllers/attendance.controller.js";
import { route } from "../middleware/async-handler.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { requirePermission } from "../middleware/rbac.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import { attendanceHistoryQuerySchema, attendanceMarkSchema, attendanceSummaryQuerySchema } from "../validation/attendance.validation.js";

export const attendanceRoutes = Router();

attendanceRoutes.use(authenticate);

attendanceRoutes.get("/office", ...route(attendanceController.office));
attendanceRoutes.get("/me/today", ...route(attendanceController.today));
attendanceRoutes.get("/me/history", ...route(validate({ query: attendanceHistoryQuerySchema }), attendanceController.history));
attendanceRoutes.get("/summary", requirePermission("user.view_all"), ...route(validate({ query: attendanceSummaryQuerySchema }), attendanceController.summary));
attendanceRoutes.post("/check-in", ...route(validate({ body: attendanceMarkSchema }), attendanceController.checkIn));
attendanceRoutes.post("/check-out", ...route(validate({ body: attendanceMarkSchema }), attendanceController.checkOut));
