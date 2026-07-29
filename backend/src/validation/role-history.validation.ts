import { z } from "zod";

export const roleHistoryParamsSchema = z.object({
  roleId: z.string().min(1),
});

export const listRoleHistoryQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
});

export type ListRoleHistoryQuery = z.infer<typeof listRoleHistoryQuerySchema>;
