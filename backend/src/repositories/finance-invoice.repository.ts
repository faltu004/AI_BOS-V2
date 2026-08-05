import type { Types } from "mongoose";
import { InvoiceModel, type Invoice, type InvoiceStatus } from "../models/finance-invoice.model.js";

export type InvoiceCreateData = Pick<
  Invoice,
  "invoiceNo" | "customer" | "email" | "issueDate" | "dueDate" | "items" | "subtotal" | "tax" | "total" | "status" | "lastAction"
> &
  Partial<Pick<Invoice, "createdBy">> & { organizationId: Types.ObjectId };

export class FinanceInvoiceRepository {
  async create(data: InvoiceCreateData) {
    return InvoiceModel.create(data);
  }

  async findById(id: string) {
    return InvoiceModel.findById(id);
  }

  async countForOrganization(organizationId: Types.ObjectId) {
    return InvoiceModel.countDocuments({ organizationId });
  }

  async list(organizationId: Types.ObjectId, query: { status?: InvoiceStatus; limit?: number }) {
    const filter: Record<string, unknown> = { organizationId };
    if (query.status) filter.status = query.status;

    return InvoiceModel.find(filter)
      .sort({ createdAt: -1 })
      .limit(query.limit ?? 100)
      .lean();
  }

  async updateStatus(id: string, status: InvoiceStatus, lastAction: string) {
    return InvoiceModel.findByIdAndUpdate(id, { $set: { status, lastAction } }, { new: true, runValidators: true }).lean();
  }

  async delete(id: string) {
    return InvoiceModel.findByIdAndDelete(id).select("_id").lean();
  }

  async outstandingTotal(organizationId: Types.ObjectId) {
    const [result] = await InvoiceModel.aggregate<{ total: number }>([
      { $match: { organizationId, status: { $in: ["Sent", "Overdue"] } } },
      { $group: { _id: null, total: { $sum: "$total" } } },
    ]);
    return result?.total ?? 0;
  }
}

export const financeInvoiceRepository = new FinanceInvoiceRepository();
