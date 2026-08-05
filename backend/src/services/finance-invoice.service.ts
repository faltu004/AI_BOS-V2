import { Types } from "mongoose";
import { financeInvoiceRepository } from "../repositories/finance-invoice.repository.js";
import { resolveOrganizationId } from "./finance-transaction.service.js";
import { AppError } from "../utils/app-error.js";
import type { CreateInvoiceInput, ListInvoicesQuery } from "../validation/finance-invoice.validation.js";

async function generateInvoiceNo(organizationId: Types.ObjectId) {
  const count = await financeInvoiceRepository.countForOrganization(organizationId);
  const year = new Date().getFullYear();
  return `INV-${year}-${String(count + 1).padStart(3, "0")}`;
}

export class FinanceInvoiceService {
  async create(input: CreateInvoiceInput, userId?: string) {
    const organizationId = await resolveOrganizationId();
    const invoiceNo = await generateInvoiceNo(organizationId);

    const subtotal = input.quantity * input.rate;
    const tax = Math.round(subtotal * (input.taxRate / 100));
    const total = subtotal + tax;

    return financeInvoiceRepository.create({
      organizationId,
      invoiceNo,
      customer: input.customer,
      email: input.email,
      issueDate: input.issueDate,
      dueDate: input.dueDate,
      items: [{ description: input.itemDescription, quantity: input.quantity, rate: input.rate }],
      subtotal,
      tax,
      total,
      status: "Draft",
      lastAction: "Invoice generated",
      createdBy: userId as unknown as Types.ObjectId,
    });
  }

  async list(query: ListInvoicesQuery) {
    const organizationId = await resolveOrganizationId();
    return financeInvoiceRepository.list(organizationId, query);
  }

  async send(id: string) {
    const invoice = await financeInvoiceRepository.findById(id);
    if (!invoice) {
      throw new AppError("Invoice not found", 404);
    }

    const nextStatus = invoice.status === "Draft" ? "Sent" : invoice.status;
    const updated = await financeInvoiceRepository.updateStatus(
      id,
      nextStatus,
      `Invoice emailed on ${new Date().toISOString().slice(0, 10)}`,
    );
    if (!updated) {
      throw new AppError("Invoice not found", 404);
    }
    return updated;
  }

  async delete(id: string) {
    const deleted = await financeInvoiceRepository.delete(id);
    if (!deleted) {
      throw new AppError("Invoice not found", 404);
    }
    return { deleted: true };
  }
}

export const financeInvoiceService = new FinanceInvoiceService();
