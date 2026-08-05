import { z } from "zod";
import { taxRecordStatuses } from "../models/finance-tax.model.js";

export const createTaxRecordSchema = z.object({
  name: z.string().min(1).max(160),
  period: z.string().min(1).max(40),
  taxableAmount: z.number().min(0),
  taxAmount: z.number().min(0),
  status: z.enum(taxRecordStatuses).default("Pending"),
});

export const taxRecordIdParamsSchema = z.object({
  id: z.string().min(1),
});

export const listTaxRecordsQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(200).default(100),
});

export type CreateTaxRecordInput = z.infer<typeof createTaxRecordSchema>;
export type ListTaxRecordsQuery = z.infer<typeof listTaxRecordsQuerySchema>;
