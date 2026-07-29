import { RoleHistoryModel, type RoleHistory } from "../models/role-history.model.js";
import type { ListRoleHistoryQuery } from "../validation/role-history.validation.js";

export type RoleHistoryCreateData = Omit<RoleHistory, "createdAt">;

export class RoleHistoryRepository {
  async create(data: RoleHistoryCreateData) {
    return RoleHistoryModel.create(data);
  }

  async latestVersion(roleId: string) {
    const latest = await RoleHistoryModel.findOne({ roleId }).sort({ version: -1 }).select("version").lean();
    return latest?.version ?? 0;
  }

  async listByRole(roleId: string, query: ListRoleHistoryQuery) {
    const skip = (query.page - 1) * query.limit;

    const [items, total] = await Promise.all([
      RoleHistoryModel.find({ roleId }).sort({ version: -1 }).skip(skip).limit(query.limit).lean(),
      RoleHistoryModel.countDocuments({ roleId }),
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

export const roleHistoryRepository = new RoleHistoryRepository();
