import type { Types } from "mongoose";
import { PaymentModel, type Payment } from "../models/finance-payment.model.js";

export type PaymentCreateData = Pick<Payment, "customer" | "invoiceNo" | "amount" | "method" | "date" | "status"> &
  Partial<Pick<Payment, "createdBy">> & { organizationId: Types.ObjectId };

export class FinancePaymentRepository {
  async create(data: PaymentCreateData) {
    return PaymentModel.create(data);
  }

  async list(organizationId: Types.ObjectId, limit: number) {
    return PaymentModel.find({ organizationId }).sort({ date: -1, createdAt: -1 }).limit(limit).lean();
  }

  async delete(id: string) {
    return PaymentModel.findByIdAndDelete(id).select("_id").lean();
  }
}

export const financePaymentRepository = new FinancePaymentRepository();
