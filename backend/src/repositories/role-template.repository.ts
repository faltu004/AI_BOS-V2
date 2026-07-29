import type { FilterQuery, UpdateQuery } from "mongoose";
import {
  RoleTemplateModel,
  type RoleTemplate,
  type RoleTemplateDocument,
} from "../models/role-template.model.js";
import type { ListRoleTemplatesQuery } from "../validation/role-template.validation.js";

export type RoleTemplateCreateData = Omit<RoleTemplate, "createdAt" | "updatedAt">;

export class RoleTemplateRepository {
  async create(data: RoleTemplateCreateData) {
    return RoleTemplateModel.create(data);
  }

  async findById(id: string) {
    return RoleTemplateModel.findById(id).lean();
  }

  async list(query: ListRoleTemplatesQuery) {
    const filter: FilterQuery<RoleTemplate> = query.search
      ? { name: { $regex: query.search, $options: "i" } }
      : {};
    const skip = (query.page - 1) * query.limit;

    const [items, total] = await Promise.all([
      RoleTemplateModel.find(filter).sort({ name: 1 }).skip(skip).limit(query.limit).lean(),
      RoleTemplateModel.countDocuments(filter),
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

  async update(id: string, updates: UpdateQuery<RoleTemplateDocument>) {
    return RoleTemplateModel.findByIdAndUpdate(id, updates, { new: true, runValidators: true }).lean();
  }

  async delete(id: string) {
    return RoleTemplateModel.findByIdAndDelete(id).select("_id").lean();
  }
}

export const roleTemplateRepository = new RoleTemplateRepository();
