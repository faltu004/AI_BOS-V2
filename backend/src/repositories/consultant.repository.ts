import type { FilterQuery, SortOrder, UpdateQuery } from "mongoose";
import { ConsultantReportModel, type ConsultantReport, type ConsultantReportDocument } from "../models/consultant.model.js";
import type { ConsultantListQuery } from "../validation/consultant.validation.js";

export type ConsultantCreateData = Omit<ConsultantReport, "createdAt" | "updatedAt">;

function buildConsultantFilter(query: ConsultantListQuery): FilterQuery<ConsultantReport> {
  const filter: FilterQuery<ConsultantReport> = {};

  if (query.type) filter.type = query.type;
  if (query.status) filter.status = query.status;
  if (query.period) filter.period = query.period;

  return filter;
}

export class ConsultantRepository {
  async create(data: ConsultantCreateData) {
    return ConsultantReportModel.create(data);
  }

  async findById(id: string) {
    return ConsultantReportModel.findById(id);
  }

  async list(query: ConsultantListQuery) {
    const filter = buildConsultantFilter(query);
    const skip = (query.page - 1) * query.limit;
    const sort: Record<string, SortOrder> = {
      [query.sortBy]: query.sortOrder === "asc" ? 1 : -1,
    };

    const [items, total] = await Promise.all([
      ConsultantReportModel.find(filter).sort(sort).skip(skip).limit(query.limit),
      ConsultantReportModel.countDocuments(filter),
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

  async update(id: string, updates: UpdateQuery<ConsultantReportDocument>) {
    return ConsultantReportModel.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    });
  }

  async delete(id: string) {
    return ConsultantReportModel.findByIdAndDelete(id);
  }

  async listRecent(limit = 5) {
    return ConsultantReportModel.find().sort({ createdAt: -1 }).limit(limit);
  }
}

export const consultantRepository = new ConsultantRepository();
