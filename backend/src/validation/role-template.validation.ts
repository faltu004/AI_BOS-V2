import { z } from "zod";
import { permissionKeys } from "../constants/permissions.js";
import { userRoles } from "../constants/roles.js";

const permissionKeySchema = z.enum(permissionKeys);

export const createRoleTemplateSchema = z.object({
  name: z.string().min(2).max(120),
  description: z.string().max(500).optional(),
  permissionKeys: z.array(permissionKeySchema).default([]),
  basedOnSystemRole: z.enum(userRoles).optional(),
});

export const updateRoleTemplateSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  description: z.string().max(500).optional(),
  permissionKeys: z.array(permissionKeySchema).optional(),
});

export const roleTemplateIdParamsSchema = z.object({
  id: z.string().min(1),
});

export const instantiateRoleTemplateSchema = z.object({
  name: z.string().min(2).max(80),
  description: z.string().max(500).optional(),
  rank: z.number().int().min(0).max(100).default(10),
  additionalPermissionKeys: z.array(permissionKeySchema).default([]),
});

export const listRoleTemplatesQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
  search: z.string().optional(),
});

export type CreateRoleTemplateInput = z.infer<typeof createRoleTemplateSchema>;
export type UpdateRoleTemplateInput = z.infer<typeof updateRoleTemplateSchema>;
export type InstantiateRoleTemplateInput = z.infer<typeof instantiateRoleTemplateSchema>;
export type ListRoleTemplatesQuery = z.infer<typeof listRoleTemplatesQuerySchema>;
