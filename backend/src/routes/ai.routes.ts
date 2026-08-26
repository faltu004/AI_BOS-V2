import { Router } from "express";
import { aiController } from "../controllers/ai.controller.js";
import { aiRateLimiter } from "../middleware/ai-rate-limit.middleware.js";
import { route } from "../middleware/async-handler.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { requireAdministratorMonitoringPermission, requireRole } from "../middleware/rbac.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import {
  aiAlertParamsSchema,
  aiChatSchema,
  aiDeviceGuidanceSchema,
  aiDeviceParamsSchema,
} from "../validation/ai.validation.js";

export const aiRoutes = Router();

aiRoutes.use(authenticate, requireRole("Owner", "Administrator"));

aiRoutes.get("/status", ...route(aiController.status));
aiRoutes.get("/context", ...route(aiController.context));
aiRoutes.post("/query", aiRateLimiter, ...route(validate({ body: aiChatSchema }), aiController.query));
// Kept as a secured compatibility alias for the existing Admin shell assistant.
aiRoutes.post("/chat", aiRateLimiter, ...route(validate({ body: aiChatSchema }), aiController.query));

aiRoutes.post(
  "/monitoring/summary",
  requireAdministratorMonitoringPermission("device.monitoring.view"),
  aiRateLimiter,
  ...route(aiController.monitoringSummary),
);
aiRoutes.post(
  "/alerts/prioritize",
  requireAdministratorMonitoringPermission("device.monitoring.view"),
  aiRateLimiter,
  ...route(aiController.prioritizeAlerts),
);
aiRoutes.post(
  "/alerts/:alertId/explain",
  requireAdministratorMonitoringPermission("device.monitoring.view"),
  aiRateLimiter,
  ...route(validate({ params: aiAlertParamsSchema }), aiController.explainAlert),
);
aiRoutes.post(
  "/devices/:deviceId/troubleshoot",
  requireAdministratorMonitoringPermission("device.monitoring.view"),
  aiRateLimiter,
  ...route(
    validate({ params: aiDeviceParamsSchema, body: aiDeviceGuidanceSchema }),
    aiController.troubleshootDevice,
  ),
);
