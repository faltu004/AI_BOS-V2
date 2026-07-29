import type { Types } from "mongoose";
import { permissionAuditLogRepository } from "../repositories/permission-audit-log.repository.js";
import type {
  PermissionAuditAction,
  PermissionAuditTargetType,
} from "../models/permission-audit-log.model.js";

export class AuditService {
  async record(entry: {
    actorUserId: string | Types.ObjectId;
    action: PermissionAuditAction;
    targetType: PermissionAuditTargetType;
    targetId: string | Types.ObjectId;
    before?: unknown;
    after?: unknown;
    metadata?: Record<string, unknown>;
  }) {
    return permissionAuditLogRepository.create({
      actorUserId: entry.actorUserId as Types.ObjectId,
      action: entry.action,
      targetType: entry.targetType,
      targetId: entry.targetId as Types.ObjectId,
      before: entry.before,
      after: entry.after,
      metadata: entry.metadata,
    });
  }
}

export const auditService = new AuditService();
