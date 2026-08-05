import { z } from "zod";
import { paymentStatuses } from "../models/finance-payment.model.js";

export const createPaymentSchema = z.object({
  customer: z.string().min(1).max(160),
  invoiceNo: z.string().min(1).max(40),
  amount: z.number().min(0),
  method: z.string().min(1).max(60),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
  status: z.enum(paymentStatuses).default("Pending"),
});

export const paymentIdParamsSchema = z.object({
  id: z.string().min(1),
});

export const listPaymentsQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(200).default(100),
});

export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;
export type ListPaymentsQuery = z.infer<typeof listPaymentsQuerySchema>;
