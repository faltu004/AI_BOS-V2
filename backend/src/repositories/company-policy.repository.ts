import type { FilterQuery, SortOrder, Types, UpdateQuery } from "mongoose";
import {
  CompanyPolicyModel,
  type CompanyPolicy,
  type CompanyPolicyDocument,
} from "../models/company-policy.model.js";
import type { ListCompanyPoliciesQuery } from "../validation/company-policy.validation.js";

export type CompanyPolicyCreateData = Omit<CompanyPolicy, "createdAt" | "updatedAt">;

function buildPolicyFilter(
  organizationId: Types.ObjectId,
  query: ListCompanyPoliciesQuery,
): FilterQuery<CompanyPolicy> {
  const filter: FilterQuery<CompanyPolicy> = { organizationId };

  if (query.search) {
    filter.$text = { $search: query.search };
  }
  if (query.category) filter.category = query.category;
  if (query.status) filter.status = query.status;

  return filter;
}

export class CompanyPolicyRepository {
  async create(data: CompanyPolicyCreateData) {
    return CompanyPolicyModel.create(data);
  }

  async findById(id: string) {
    return CompanyPolicyModel.findById(id).lean();
  }

  async list(organizationId: Types.ObjectId, query: ListCompanyPoliciesQuery) {
    const filter = buildPolicyFilter(organizationId, query);
    const skip = (query.page - 1) * query.limit;
    const sort: Record<string, SortOrder> = {
      [query.sortBy]: query.sortOrder === "asc" ? 1 : -1,
    };

    const [items, total] = await Promise.all([
      CompanyPolicyModel.find(filter).sort(sort).skip(skip).limit(query.limit).lean(),
      CompanyPolicyModel.countDocuments(filter),
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

  async listPublished(organizationId: Types.ObjectId, query: ListCompanyPoliciesQuery) {
    return this.list(organizationId, { ...query, status: "Published" });
  }

  async update(id: string, updates: UpdateQuery<CompanyPolicyDocument>) {
    return CompanyPolicyModel.findByIdAndUpdate(id, updates, { new: true, runValidators: true }).lean();
  }

  async delete(id: string) {
    return CompanyPolicyModel.findByIdAndDelete(id).select("_id").lean();
  }
}

export const companyPolicyRepository = new CompanyPolicyRepository();
