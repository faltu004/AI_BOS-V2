import type { FilterQuery, UpdateQuery } from "mongoose";
import {
  PermissionGroupModel,
  type PermissionGroup,
  type PermissionGroupDocument,
} from "../models/permission-group.model.js";
import type { ListPermissionGroupsQuery } from "../validation/permission-group.validation.js";

export type PermissionGroupCreateData = Omit<PermissionGroup, "createdAt" | "updatedAt">;

export class PermissionGroupRepository {
  async create(data: PermissionGroupCreateData) {
    return PermissionGroupModel.create(data);
  }

  async findById(id: string) {
    return PermissionGroupModel.findById(id).lean();
  }

  async list(query: ListPermissionGroupsQuery) {
    const filter: FilterQuery<PermissionGroup> = query.search
      ? { name: { $regex: query.search, $options: "i" } }
      : {};
    const skip = (query.page - 1) * query.limit;

    const [items, total] = await Promise.all([
      PermissionGroupModel.find(filter).sort({ name: 1 }).skip(skip).limit(query.limit).lean(),
      PermissionGroupModel.countDocuments(filter),
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

  async update(id: string, updates: UpdateQuery<PermissionGroupDocument>) {
    return PermissionGroupModel.findByIdAndUpdate(id, updates, { new: true, runValidators: true }).lean();
  }

  async delete(id: string) {
    return PermissionGroupModel.findByIdAndDelete(id).select("_id").lean();
  }
}

export const permissionGroupRepository = new PermissionGroupRepository();
