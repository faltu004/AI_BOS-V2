import { z } from "zod";
import { auditCategories } from "../constants/audit.js";

export const listAuditLogQuerySchema = z.object({
  category: z.enum(auditCategories).optional(),
  actorUserId: z.string().optional(),
  search: z.string().max(200).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(200).default(50),
});

export type ListAuditLogQuery = z.infer<typeof listAuditLogQuerySchema>;
