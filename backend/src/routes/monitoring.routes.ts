import { Router } from "express";
import { asyncHandler } from "../middleware/async-handler.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { requireAdministratorMonitoringPermission } from "../middleware/rbac.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import { monitoringController } from "../controllers/monitoring.controller.js";
import { monitoringOverviewQuerySchema, monitoringReportExportSchema } from "../validation/monitoring.validation.js";

export const monitoringRoutes = Router();

monitoringRoutes.use(
  authenticate,
  requireAdministratorMonitoringPermission(
    "device.monitoring.view",
  ),
);

monitoringRoutes.get("/overview", validate({ query: monitoringOverviewQuerySchema }), asyncHandler(monitoringController.overview));
monitoringRoutes.get("/metrics", validate({ query: monitoringOverviewQuerySchema }), asyncHandler(monitoringController.metrics));
monitoringRoutes.get("/alerts", asyncHandler(monitoringController.alerts));
monitoringRoutes.get("/reports", asyncHandler(monitoringController.reports));
monitoringRoutes.post("/reports/export", validate({ body: monitoringReportExportSchema }), asyncHandler(monitoringController.exportReport));
monitoringRoutes.post("/alerts/:id/acknowledge", asyncHandler(monitoringController.acknowledgeAlert));
