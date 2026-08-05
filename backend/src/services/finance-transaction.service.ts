import { Types } from "mongoose";
import { financeTransactionRepository } from "../repositories/finance-transaction.repository.js";
import { organizationRepository } from "../repositories/organization.repository.js";
import { AppError } from "../utils/app-error.js";
import type {
  CreateFinanceTransactionInput,
  ListFinanceTransactionsQuery,
  UpdateFinanceTransactionInput,
} from "../validation/finance-transaction.validation.js";

export async function resolveOrganizationId(): Promise<Types.ObjectId> {
  const organization = await organizationRepository.getOrCreateDefault();
  return organization._id as Types.ObjectId;
}

export class FinanceTransactionService {
  async create(input: CreateFinanceTransactionInput, userId?: string) {
    const organizationId = await resolveOrganizationId();
    return financeTransactionRepository.create({
      ...input,
      organizationId,
      createdBy: userId as unknown as Types.ObjectId,
    });
  }

  async list(query: ListFinanceTransactionsQuery) {
    const organizationId = await resolveOrganizationId();
    return financeTransactionRepository.list(organizationId, query);
  }

  async update(id: string, input: UpdateFinanceTransactionInput) {
    const updated = await financeTransactionRepository.update(id, input);
    if (!updated) {
      throw new AppError("Finance transaction not found", 404);
    }
    return updated;
  }

  async delete(id: string) {
    const deleted = await financeTransactionRepository.delete(id);
    if (!deleted) {
      throw new AppError("Finance transaction not found", 404);
    }
    return { deleted: true };
  }
}

export const financeTransactionService = new FinanceTransactionService();
