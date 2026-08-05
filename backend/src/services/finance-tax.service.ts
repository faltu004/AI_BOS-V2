import { Types } from "mongoose";
import { financeTaxRepository } from "../repositories/finance-tax.repository.js";
import { resolveOrganizationId } from "./finance-transaction.service.js";
import { AppError } from "../utils/app-error.js";
import type { CreateTaxRecordInput, ListTaxRecordsQuery } from "../validation/finance-tax.validation.js";

export class FinanceTaxService {
  async create(input: CreateTaxRecordInput, userId?: string) {
    const organizationId = await resolveOrganizationId();
    return financeTaxRepository.create({
      ...input,
      organizationId,
      createdBy: userId as unknown as Types.ObjectId,
    });
  }

  async list(query: ListTaxRecordsQuery) {
    const organizationId = await resolveOrganizationId();
    return financeTaxRepository.list(organizationId, query.limit);
  }

  async delete(id: string) {
    const deleted = await financeTaxRepository.delete(id);
    if (!deleted) {
      throw new AppError("Tax record not found", 404);
    }
    return { deleted: true };
  }
}

export const financeTaxService = new FinanceTaxService();
