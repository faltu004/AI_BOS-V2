import { z } from "zod";
import { permissionKeys } from "../constants/permissions.js";

const permissionKeySchema = z.enum(permissionKeys);

export const createPermissionGroupSchema = z.object({
  name: z.string().min(2).max(120),
  description: z.string().max(500).optional(),
  permissionKeys: z.array(permissionKeySchema).default([]),
});

export const updatePermissionGroupSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  description: z.string().max(500).optional(),
  permissionKeys: z.array(permissionKeySchema).optional(),
});

export const permissionGroupIdParamsSchema = z.object({
  id: z.string().min(1),
});

export const listPermissionGroupsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
  search: z.string().optional(),
});

export type CreatePermissionGroupInput = z.infer<typeof createPermissionGroupSchema>;
export type UpdatePermissionGroupInput = z.infer<typeof updatePermissionGroupSchema>;
export type ListPermissionGroupsQuery = z.infer<typeof listPermissionGroupsQuerySchema>;
