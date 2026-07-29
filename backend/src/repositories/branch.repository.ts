import type { FilterQuery, SortOrder, Types, UpdateQuery } from "mongoose";
import { BranchModel, type Branch, type BranchDocument } from "../models/branch.model.js";
import type { ListBranchesQuery } from "../validation/branch.validation.js";

export type BranchCreateData = Omit<Branch, "createdAt" | "updatedAt">;

function buildBranchFilter(organizationId: Types.ObjectId, query: ListBranchesQuery): FilterQuery<Branch> {
  const filter: FilterQuery<Branch> = { organizationId };

  if (query.search) {
    filter.$text = { $search: query.search };
  }
  if (query.status) filter.status = query.status;

  return filter;
}

export class BranchRepository {
  async create(data: BranchCreateData) {
    return BranchModel.create(data);
  }

  async findById(id: string) {
    return BranchModel.findById(id).lean();
  }

  async list(organizationId: Types.ObjectId, query: ListBranchesQuery) {
    const filter = buildBranchFilter(organizationId, query);
    const skip = (query.page - 1) * query.limit;
    const sort: Record<string, SortOrder> = {
      [query.sortBy]: query.sortOrder === "asc" ? 1 : -1,
    };

    const [items, total] = await Promise.all([
      BranchModel.find(filter).sort(sort).skip(skip).limit(query.limit).lean(),
      BranchModel.countDocuments(filter),
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

  async listAll(organizationId: Types.ObjectId) {
    return BranchModel.find({ organizationId }).sort({ name: 1 }).lean();
  }

  async update(id: string, updates: UpdateQuery<BranchDocument>) {
    return BranchModel.findByIdAndUpdate(id, updates, { new: true, runValidators: true }).lean();
  }

  async delete(id: string) {
    return BranchModel.findByIdAndDelete(id).select("_id").lean();
  }

  async clearHeadOfficeFlag(organizationId: Types.ObjectId, excludeId?: string) {
    return BranchModel.updateMany(
      { organizationId, isHeadOffice: true, _id: { $ne: excludeId } },
      { $set: { isHeadOffice: false } },
    );
  }

  async countByOrganization(organizationId: Types.ObjectId) {
    return BranchModel.countDocuments({ organizationId });
  }
}

export const branchRepository = new BranchRepository();
