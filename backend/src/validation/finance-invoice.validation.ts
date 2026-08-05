import { z } from "zod";
import { invoiceStatuses } from "../models/finance-invoice.model.js";

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format");

export const createInvoiceSchema = z.object({
  customer: z.string().min(1).max(160),
  email: z.string().email().max(180),
  issueDate: dateSchema,
  dueDate: dateSchema,
  itemDescription: z.string().min(1).max(200),
  quantity: z.number().int().positive(),
  rate: z.number().min(0),
  taxRate: z.number().min(0).max(100),
});

export const invoiceIdParamsSchema = z.object({
  id: z.string().min(1),
});

export const listInvoicesQuerySchema = z.object({
  status: z.enum(invoiceStatuses).optional(),
  limit: z.coerce.number().int().positive().max(200).default(100),
});

export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;
export type ListInvoicesQuery = z.infer<typeof listInvoicesQuerySchema>;
