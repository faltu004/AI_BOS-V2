import type { Types } from "mongoose";
import { holidayRepository } from "../repositories/holiday.repository.js";
import { organizationRepository } from "../repositories/organization.repository.js";
import { AppError } from "../utils/app-error.js";
import type {
  CreateHolidayInput,
  ListHolidaysQuery,
  UpdateHolidayInput,
} from "../validation/holiday.validation.js";

async function resolveOrganizationId(): Promise<Types.ObjectId> {
  const organization = await organizationRepository.getOrCreateDefault();
  return organization._id as Types.ObjectId;
}

export class HolidayService {
  async create(input: CreateHolidayInput, userId?: string) {
    const organizationId = await resolveOrganizationId();

    const duplicate = await holidayRepository.findDuplicate(organizationId, input.name, input.date);
    if (duplicate) {
      throw new AppError("Holiday already exists for this date", 409);
    }

    return holidayRepository.create({
      ...input,
      organizationId,
      branchIds: input.branchIds as unknown as Types.ObjectId[],
      createdBy: userId as unknown as Types.ObjectId,
    });
  }

  async list(query: ListHolidaysQuery) {
    const organizationId = await resolveOrganizationId();
    return holidayRepository.list(organizationId, query);
  }

  async getById(id: string) {
    const holiday = await holidayRepository.findById(id);
    if (!holiday) {
      throw new AppError("Holiday not found", 404);
    }
    return holiday;
  }

  async update(id: string, input: UpdateHolidayInput, userId?: string) {
    const holiday = await holidayRepository.update(id, { ...input, updatedBy: userId });
    if (!holiday) {
      throw new AppError("Holiday not found", 404);
    }
    return holiday;
  }

  async delete(id: string) {
    const holiday = await holidayRepository.delete(id);
    if (!holiday) {
      throw new AppError("Holiday not found", 404);
    }
    return { deleted: true };
  }
}

export const holidayService = new HolidayService();
