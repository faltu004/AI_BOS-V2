import { Router } from "express";
import { route } from "../middleware/async-handler.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { requirePermission } from "../middleware/rbac.middleware.js";
import { securityController } from "../controllers/security.controller.js";

export const securityRoutes = Router();

securityRoutes.use(authenticate, requirePermission("security.view"));

securityRoutes.get("/", ...route(securityController.summarize));
securityRoutes.get("/events", ...route(securityController.listEvents));
securityRoutes.get("/history", ...route(securityController.loginHistory));
securityRoutes.get("/devices", ...route(securityController.listDevices));
securityRoutes.post("/devices/:id/trust", ...route(securityController.trustDevice));
securityRoutes.post("/devices/:id/untrust", ...route(securityController.untrustDevice));
securityRoutes.delete("/devices/:id", ...route(securityController.revokeDevice));
securityRoutes.delete("/sessions/:id", ...route(securityController.revokeSession));
