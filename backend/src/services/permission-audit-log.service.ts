import { permissionAuditLogRepository } from "../repositories/permission-audit-log.repository.js";
import type { ListPermissionAuditLogQuery } from "../validation/permission-audit-log.validation.js";

export class PermissionAuditLogService {
  async list(query: ListPermissionAuditLogQuery) {
    return permissionAuditLogRepository.list(query);
  }
}

export const permissionAuditLogService = new PermissionAuditLogService();
