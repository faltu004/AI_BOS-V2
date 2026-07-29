import type { FilterQuery, SortOrder, UpdateQuery } from "mongoose";
import { RoleModel, type Role, type RoleDocument } from "../models/role.model.js";
import type { ListRolesQuery } from "../validation/role.validation.js";

export type RoleCreateData = Omit<Role, "createdAt" | "updatedAt">;

function buildRoleFilter(query: ListRolesQuery): FilterQuery<Role> {
  const filter: FilterQuery<Role> = {};

  if (query.search) {
    filter.name = { $regex: query.search, $options: "i" };
  }
  if (typeof query.isSystem === "boolean") filter.isSystem = query.isSystem;

  return filter;
}

export class RoleRepository {
  async create(data: RoleCreateData) {
    return RoleModel.create(data);
  }

  async findById(id: string) {
    return RoleModel.findById(id).lean();
  }

  async findBySlug(slug: string) {
    return RoleModel.findOne({ slug }).lean();
  }

  async existsBySlug(slug: string) {
    return RoleModel.exists({ slug });
  }

  async list(query: ListRolesQuery) {
    const filter = buildRoleFilter(query);
    const skip = (query.page - 1) * query.limit;
    const sort: Record<string, SortOrder> = {
      [query.sortBy]: query.sortOrder === "asc" ? 1 : -1,
    };

    const [items, total] = await Promise.all([
      RoleModel.find(filter).sort(sort).skip(skip).limit(query.limit).lean(),
      RoleModel.countDocuments(filter),
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

  async listAll() {
    return RoleModel.find({}).sort({ rank: -1 }).lean();
  }

  async update(id: string, updates: UpdateQuery<RoleDocument>) {
    return RoleModel.findByIdAndUpdate(id, updates, { new: true, runValidators: true }).lean();
  }

  async delete(id: string) {
    return RoleModel.findByIdAndDelete(id).select("_id").lean();
  }
}

export const roleRepository = new RoleRepository();
