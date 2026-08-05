import { z } from "zod";
import { departmentStatuses } from "../constants/department.js";

export const createTeamSchema = z.object({
  name: z.string().min(2).max(120),
  departmentId: z.string().min(1),
  leadId: z.string().min(1, "A team must have a lead"),
  memberIds: z.array(z.string().min(1)).default([]),
  description: z.string().max(1000).optional(),
  status: z.enum(departmentStatuses).default("Active"),
});

export const updateTeamSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  departmentId: z.string().min(1).optional(),
  leadId: z.string().min(1).optional(),
  memberIds: z.array(z.string().min(1)).optional(),
  description: z.string().max(1000).optional(),
  status: z.enum(departmentStatuses).optional(),
});

export const teamIdParamsSchema = z.object({
  id: z.string().min(1),
});

export const listTeamsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().optional(),
  departmentId: z.string().min(1).optional(),
  status: z.enum(departmentStatuses).optional(),
  sortBy: z.enum(["name", "status", "createdAt"]).default("name"),
  sortOrder: z.enum(["asc", "desc"]).default("asc"),
});

export type CreateTeamInput = z.infer<typeof createTeamSchema>;
export type UpdateTeamInput = z.infer<typeof updateTeamSchema>;
export type ListTeamsQuery = z.infer<typeof listTeamsQuerySchema>;
