import { Types } from "mongoose";
import { financeBudgetRepository } from "../repositories/finance-budget.repository.js";
import { resolveOrganizationId } from "./finance-transaction.service.js";
import { AppError } from "../utils/app-error.js";
import type { CreateBudgetInput, UpdateBudgetInput } from "../validation/finance-budget.validation.js";

export class FinanceBudgetService {
  async create(input: CreateBudgetInput, userId?: string) {
    const organizationId = await resolveOrganizationId();
    return financeBudgetRepository.create({
      ...input,
      organizationId,
      createdBy: userId as unknown as Types.ObjectId,
    });
  }

  async list() {
    const organizationId = await resolveOrganizationId();
    return financeBudgetRepository.list(organizationId);
  }

  async update(id: string, input: UpdateBudgetInput) {
    const updated = await financeBudgetRepository.update(id, input);
    if (!updated) {
      throw new AppError("Budget not found", 404);
    }
    return updated;
  }

  async delete(id: string) {
    const deleted = await financeBudgetRepository.delete(id);
    if (!deleted) {
      throw new AppError("Budget not found", 404);
    }
    return { deleted: true };
  }
}

export const financeBudgetService = new FinanceBudgetService();
