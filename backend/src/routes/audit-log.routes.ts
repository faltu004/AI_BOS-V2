import { Router } from "express";
import { auditLogController } from "../controllers/audit-log.controller.js";
import { route } from "../middleware/async-handler.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { requirePermission } from "../middleware/rbac.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import { listAuditLogQuerySchema } from "../validation/audit-log.validation.js";

export const auditLogRoutes = Router();

auditLogRoutes.use(authenticate, requirePermission("audit.view"));

auditLogRoutes.get("/", ...route(validate({ query: listAuditLogQuerySchema }), auditLogController.list));
auditLogRoutes.get("/export", ...route(validate({ query: listAuditLogQuerySchema }), auditLogController.export));
