import { z } from "zod";
import { permissionKeys } from "../constants/permissions.js";

const permissionKeySchema = z.enum(permissionKeys);

export const createRoleSchema = z.object({
  name: z.string().min(2).max(80),
  description: z.string().max(500).optional(),
  rank: z.number().int().min(0).max(100).default(10),
  permissionKeys: z.array(permissionKeySchema).default([]),
  templateId: z.string().min(1).optional(),
});

export const updateRoleSchema = z.object({
  name: z.string().min(2).max(80).optional(),
  description: z.string().max(500).optional(),
  rank: z.number().int().min(0).max(100).optional(),
  permissionKeys: z.array(permissionKeySchema).optional(),
  isActive: z.boolean().optional(),
});

export const roleIdParamsSchema = z.object({
  id: z.string().min(1),
});

export const listRolesQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
  search: z.string().optional(),
  isSystem: z.coerce.boolean().optional(),
  sortBy: z.enum(["name", "rank", "createdAt"]).default("rank"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export type CreateRoleInput = z.infer<typeof createRoleSchema>;
export type UpdateRoleInput = z.infer<typeof updateRoleSchema>;
export type ListRolesQuery = z.infer<typeof listRolesQuerySchema>;
