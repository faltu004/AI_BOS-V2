import { permissionAuditLogService } from "../services/permission-audit-log.service.js";
import { jsonController } from "../utils/controller.js";
import type { ListPermissionAuditLogQuery } from "../validation/permission-audit-log.validation.js";

export class PermissionAuditLogController {
  list = jsonController(200, "Permission audit log fetched successfully", ({ req }) =>
    permissionAuditLogService.list(req.query as unknown as ListPermissionAuditLogQuery),
  );
}

export const permissionAuditLogController = new PermissionAuditLogController();
