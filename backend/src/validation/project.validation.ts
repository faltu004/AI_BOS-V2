import { z } from "zod";
import { projectMemberRoles } from "../models/project-member.model.js";
import { projectCategories, projectPriorities, projectStatuses } from "../constants/projects.js";

const dateStringSchema = z.coerce.date();

const attachmentSchema = z.object({
  name: z.string().min(1).max(180),
  url: z.string().url().optional(),
  mimeType: z.string().optional(),
  size: z.number().min(0).optional(),
});

const epicSchema = z.object({
  _id: z.string().min(1).optional(),
  title: z.string().min(2).max(180),
  description: z.string().max(1500).optional(),
  status: z.enum(["Planned", "In Progress", "Done"]).default("Planned"),
  ownerId: z.string().length(24).optional(),
  startDate: dateStringSchema.optional(),
  targetDate: dateStringSchema.optional(),
});

const sprintSchema = z
  .object({
    _id: z.string().min(1).optional(),
    name: z.string().min(2).max(120),
    goal: z.string().max(1000).optional(),
    status: z.enum(["Planned", "Active", "Closed"]).default("Planned"),
    startDate: dateStringSchema,
    endDate: dateStringSchema,
  })
  .refine((data) => data.endDate >= data.startDate, {
    message: "Sprint end date must be after start date",
    path: ["endDate"],
  });

export const createProjectSchema = z
  .object({
    projectName: z.string().min(2).max(180),
    description: z.string().max(3000).optional(),
    category: z.enum(projectCategories).default("Internal"),
    priority: z.enum(projectPriorities).default("Medium"),
    status: z.enum(projectStatuses).default("Planning"),
    progress: z.number().min(0).max(100).default(0),
    startDate: dateStringSchema,
    endDate: dateStringSchema,
    budget: z.number().min(0).default(0),
    estimatedHours: z.number().min(0).default(0),
    client: z.string().max(180).optional(),
    teamMembers: z.array(z.string().min(1).max(120)).default([]),
    projectManager: z.string().min(2).max(120),
    attachments: z.array(attachmentSchema).default([]),
    epics: z.array(epicSchema).default([]),
    sprints: z.array(sprintSchema).default([]),
    notes: z.string().max(5000).optional(),
    tags: z.array(z.string().min(1).max(40)).default([]),
  })
  .refine((data) => data.endDate >= data.startDate, {
    message: "End date must be after start date",
    path: ["endDate"],
  });

export const updateProjectSchema = z.object({
  projectName: z.string().min(2).max(180).optional(),
  description: z.string().max(3000).optional(),
  category: z.enum(projectCategories).optional(),
  priority: z.enum(projectPriorities).optional(),
  status: z.enum(projectStatuses).optional(),
  progress: z.number().min(0).max(100).optional(),
  startDate: dateStringSchema.optional(),
  endDate: dateStringSchema.optional(),
  budget: z.number().min(0).optional(),
  estimatedHours: z.number().min(0).optional(),
  client: z.string().max(180).optional(),
  teamMembers: z.array(z.string().min(1).max(120)).optional(),
  projectManager: z.string().min(2).max(120).optional(),
  attachments: z.array(attachmentSchema).optional(),
  epics: z.array(epicSchema).optional(),
  sprints: z.array(sprintSchema).optional(),
  notes: z.string().max(5000).optional(),
  tags: z.array(z.string().min(1).max(40)).optional(),
});

export const projectIdParamsSchema = z.object({
  id: z.string().min(1),
});

export const projectMemberParamsSchema = z.object({
  id: z.string().min(1),
  userId: z.string().length(24),
});

export const upsertProjectMemberSchema = z.object({
  userId: z.string().length(24),
  role: z.enum(projectMemberRoles),
});

export const listProjectsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(12),
  search: z.string().optional(),
  status: z.enum(projectStatuses).optional(),
  priority: z.enum(projectPriorities).optional(),
  category: z.enum(projectCategories).optional(),
  sortBy: z.enum(["projectName", "projectCode", "status", "priority", "startDate", "endDate", "budget", "progress", "createdAt"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  archived: z.coerce.boolean().optional(),
});

export const bulkDeleteProjectsSchema = z.object({
  ids: z.array(z.string().min(1)).min(1),
});

export const bulkUpdateProjectsSchema = z.object({
  ids: z.array(z.string().min(1)).min(1),
  updates: z.object({
    status: z.enum(projectStatuses).optional(),
    priority: z.enum(projectPriorities).optional(),
    isArchived: z.boolean().optional(),
    tags: z.array(z.string().min(1).max(40)).optional(),
  }),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
export type ListProjectsQuery = z.infer<typeof listProjectsQuerySchema>;
export type BulkDeleteProjectsInput = z.infer<typeof bulkDeleteProjectsSchema>;
export type BulkUpdateProjectsInput = z.infer<typeof bulkUpdateProjectsSchema>;
export type UpsertProjectMemberInput = z.infer<typeof upsertProjectMemberSchema>;
