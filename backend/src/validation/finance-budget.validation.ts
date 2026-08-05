import { z } from "zod";

export const createBudgetSchema = z.object({
  department: z.string().min(1).max(120),
  allocated: z.number().min(0),
  spent: z.number().min(0).default(0),
  owner: z.string().min(1).max(120),
});

export const updateBudgetSchema = z.object({
  allocated: z.number().min(0).optional(),
  spent: z.number().min(0).optional(),
  owner: z.string().min(1).max(120).optional(),
});

export const budgetIdParamsSchema = z.object({
  id: z.string().min(1),
});

export type CreateBudgetInput = z.infer<typeof createBudgetSchema>;
export type UpdateBudgetInput = z.infer<typeof updateBudgetSchema>;
