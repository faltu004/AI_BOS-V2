import type { FilterQuery } from "mongoose";
import { AuditLogModel, type AuditLog } from "../models/audit-log.model.js";
import type { AuditCategory } from "../constants/audit.js";

export type AuditLogCreateData = Omit<AuditLog, "createdAt">;

export type AuditLogFilters = {
  category?: AuditCategory;
  actorUserId?: string;
  search?: string;
  from?: Date;
  to?: Date;
};

function buildFilter(filters: AuditLogFilters): FilterQuery<AuditLog> {
  const filter: FilterQuery<AuditLog> = {};
  if (filters.category) filter.category = filters.category;
  if (filters.actorUserId) filter.actorUserId = filters.actorUserId;
  if (filters.from || filters.to) {
    filter.createdAt = {};
    if (filters.from) (filter.createdAt as Record<string, Date>).$gte = filters.from;
    if (filters.to) (filter.createdAt as Record<string, Date>).$lte = filters.to;
  }
  if (filters.search) {
    filter.$or = [
      { path: { $regex: filters.search, $options: "i" } },
      { actorEmail: { $regex: filters.search, $options: "i" } },
      { resourceType: { $regex: filters.search, $options: "i" } },
    ];
  }
  return filter;
}

export class AuditLogRepository {
  async create(data: AuditLogCreateData) {
    return AuditLogModel.create(data);
  }

  async list(filters: AuditLogFilters, page: number, limit: number) {
    const filter = buildFilter(filters);
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      AuditLogModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      AuditLogModel.countDocuments(filter),
    ]);

    return { items, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 } };
  }

  async listForExport(filters: AuditLogFilters, limit = 5000) {
    return AuditLogModel.find(buildFilter(filters)).sort({ createdAt: -1 }).limit(limit).lean();
  }
}

export const auditLogRepository = new AuditLogRepository();
