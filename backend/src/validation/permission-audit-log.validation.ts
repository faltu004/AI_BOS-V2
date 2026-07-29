import { z } from "zod";
import { permissionAuditTargetTypes } from "../models/permission-audit-log.model.js";

export const listPermissionAuditLogQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(200).default(50),
  targetType: z.enum(permissionAuditTargetTypes).optional(),
  targetId: z.string().min(1).optional(),
  actorUserId: z.string().min(1).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

export type ListPermissionAuditLogQuery = z.infer<typeof listPermissionAuditLogQuerySchema>;
