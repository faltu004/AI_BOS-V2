import type { FilterQuery } from "mongoose";
import {
  PermissionAuditLogModel,
  type PermissionAuditLog,
} from "../models/permission-audit-log.model.js";
import type { ListPermissionAuditLogQuery } from "../validation/permission-audit-log.validation.js";

export type PermissionAuditLogCreateData = Omit<PermissionAuditLog, "createdAt">;

export class PermissionAuditLogRepository {
  async create(data: PermissionAuditLogCreateData) {
    return PermissionAuditLogModel.create(data);
  }

  async list(query: ListPermissionAuditLogQuery) {
    const filter: FilterQuery<PermissionAuditLog> = {};
    if (query.targetType) filter.targetType = query.targetType;
    if (query.targetId) filter.targetId = query.targetId as unknown as FilterQuery<PermissionAuditLog>["targetId"];
    if (query.actorUserId) filter.actorUserId = query.actorUserId as unknown as FilterQuery<PermissionAuditLog>["actorUserId"];
    if (query.from || query.to) {
      filter.createdAt = {
        ...(query.from ? { $gte: query.from } : {}),
        ...(query.to ? { $lte: query.to } : {}),
      };
    }

    const skip = (query.page - 1) * query.limit;

    const [items, total] = await Promise.all([
      PermissionAuditLogModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(query.limit).lean(),
      PermissionAuditLogModel.countDocuments(filter),
    ]);

    return {
      items,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit) || 1,
      },
    };
  }
}

export const permissionAuditLogRepository = new PermissionAuditLogRepository();
