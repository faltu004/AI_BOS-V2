import { Router } from "express";
import { permissionAuditLogController } from "../controllers/permission-audit-log.controller.js";
import { route } from "../middleware/async-handler.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { requirePermission } from "../middleware/rbac.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import { listPermissionAuditLogQuerySchema } from "../validation/permission-audit-log.validation.js";

export const permissionAuditLogRoutes = Router();

permissionAuditLogRoutes.use(authenticate);

permissionAuditLogRoutes.get(
  "/",
  ...route(
    requirePermission("permission_audit.view"),
    validate({ query: listPermissionAuditLogQuerySchema }),
    permissionAuditLogController.list,
  ),
);
