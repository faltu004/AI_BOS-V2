import type { FilterQuery, SortOrder, Types, UpdateQuery } from "mongoose";
import { HolidayModel, type Holiday, type HolidayDocument } from "../models/holiday.model.js";
import type { ListHolidaysQuery } from "../validation/holiday.validation.js";

export type HolidayCreateData = Omit<Holiday, "createdAt" | "updatedAt">;

function buildHolidayFilter(organizationId: Types.ObjectId, query: ListHolidaysQuery): FilterQuery<Holiday> {
  const filter: FilterQuery<Holiday> = { organizationId };

  if (query.type) filter.type = query.type;
  if (query.year) {
    filter.date = {
      $gte: new Date(`${query.year}-01-01T00:00:00.000Z`),
      $lte: new Date(`${query.year}-12-31T23:59:59.999Z`),
    };
  }

  return filter;
}

export class HolidayRepository {
  async create(data: HolidayCreateData) {
    return HolidayModel.create(data);
  }

  async findById(id: string) {
    return HolidayModel.findById(id).lean();
  }

  async findDuplicate(organizationId: Types.ObjectId, name: string, date: Date) {
    return HolidayModel.findOne({ organizationId, name, date }).select("_id").lean();
  }

  async list(organizationId: Types.ObjectId, query: ListHolidaysQuery) {
    const filter = buildHolidayFilter(organizationId, query);
    const skip = (query.page - 1) * query.limit;
    const sort: Record<string, SortOrder> = {
      [query.sortBy]: query.sortOrder === "asc" ? 1 : -1,
    };

    const [items, total] = await Promise.all([
      HolidayModel.find(filter).sort(sort).skip(skip).limit(query.limit).lean(),
      HolidayModel.countDocuments(filter),
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

  async update(id: string, updates: UpdateQuery<HolidayDocument>) {
    return HolidayModel.findByIdAndUpdate(id, updates, { new: true, runValidators: true }).lean();
  }

  async delete(id: string) {
    return HolidayModel.findByIdAndDelete(id).select("_id").lean();
  }
}

export const holidayRepository = new HolidayRepository();
