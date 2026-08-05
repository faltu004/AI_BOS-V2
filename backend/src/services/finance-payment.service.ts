import { Types } from "mongoose";
import { financePaymentRepository } from "../repositories/finance-payment.repository.js";
import { resolveOrganizationId } from "./finance-transaction.service.js";
import { AppError } from "../utils/app-error.js";
import type { CreatePaymentInput, ListPaymentsQuery } from "../validation/finance-payment.validation.js";

export class FinancePaymentService {
  async create(input: CreatePaymentInput, userId?: string) {
    const organizationId = await resolveOrganizationId();
    return financePaymentRepository.create({
      ...input,
      organizationId,
      createdBy: userId as unknown as Types.ObjectId,
    });
  }

  async list(query: ListPaymentsQuery) {
    const organizationId = await resolveOrganizationId();
    return financePaymentRepository.list(organizationId, query.limit);
  }

  async delete(id: string) {
    const deleted = await financePaymentRepository.delete(id);
    if (!deleted) {
      throw new AppError("Payment not found", 404);
    }
    return { deleted: true };
  }
}

export const financePaymentService = new FinancePaymentService();
