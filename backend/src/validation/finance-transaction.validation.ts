import { z } from "zod";
import { financeTransactionTypes } from "../models/finance-transaction.model.js";

export const createFinanceTransactionSchema = z.object({
  type: z.enum(financeTransactionTypes),
  title: z.string().min(1).max(160),
  category: z.string().min(1).max(80),
  amount: z.number().min(0),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
  owner: z.string().min(1).max(120),
  status: z.string().min(1).max(40),
});

export const updateFinanceTransactionSchema = createFinanceTransactionSchema.partial();

export const financeTransactionIdParamsSchema = z.object({
  id: z.string().min(1),
});

export const listFinanceTransactionsQuerySchema = z.object({
  type: z.enum(financeTransactionTypes).optional(),
  limit: z.coerce.number().int().positive().max(200).default(100),
});

export type CreateFinanceTransactionInput = z.infer<typeof createFinanceTransactionSchema>;
export type UpdateFinanceTransactionInput = z.infer<typeof updateFinanceTransactionSchema>;
export type ListFinanceTransactionsQuery = z.infer<typeof listFinanceTransactionsQuerySchema>;
