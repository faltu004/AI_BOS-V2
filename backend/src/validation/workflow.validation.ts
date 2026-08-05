import { z } from "zod";
import {
  workflowActionTypes,
  workflowConditionOperators,
  workflowStatuses,
  workflowStepTypes,
  workflowTriggerTypes,
} from "../constants/workflow.js";

const stepBranchSchema = z.object({
  condition: z.string().min(1).max(180),
  operator: z.enum(workflowConditionOperators).default("equals"),
  value: z.string().min(1).max(180),
  nextStepId: z.string().min(1),
});

const workflowStepSchema = z.object({
  stepId: z.string().min(1),
  type: z.enum(workflowStepTypes),
  name: z.string().min(1).max(180),
  description: z.string().max(1000).optional(),
  triggerType: z.enum(workflowTriggerTypes).optional(),
  actionType: z.enum(workflowActionTypes).optional(),
  config: z.record(z.string(), z.unknown()).optional(),
  delayMinutes: z.coerce.number().min(0).max(10080).optional(),
  approverRoles: z.array(z.string().min(1).max(60)).default([]),
  notificationChannels: z.array(z.string().min(1).max(60)).default([]),
  nextStepId: z.string().optional(),
  branches: z.array(stepBranchSchema).default([]),
  order: z.coerce.number().int().min(0),
});

export const createWorkflowSchema = z.object({
  name: z.string().min(2).max(180),
  description: z.string().max(3000).optional(),
  status: z.enum(workflowStatuses).default("Draft"),
  isTemplate: z.boolean().default(false),
  triggerType: z.enum(workflowTriggerTypes),
  triggerConfig: z.record(z.string(), z.unknown()).optional(),
  steps: z.array(workflowStepSchema).min(1, "At least one step is required"),
  tags: z.array(z.string().min(1).max(40)).default([]),
});

export const updateWorkflowSchema = createWorkflowSchema.partial();

export const workflowIdParamsSchema = z.object({
  id: z.string().min(1),
});

export const listWorkflowsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(12),
  search: z.string().optional(),
  status: z.enum(workflowStatuses).optional(),
  isTemplate: z.coerce.boolean().optional(),
  triggerType: z.enum(workflowTriggerTypes).optional(),
  sortBy: z.enum(["name", "status", "executionCount", "lastExecutedAt", "createdAt", "updatedAt"]).default("updatedAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export const duplicateWorkflowSchema = z.object({
  name: z.string().min(2).max(180).optional(),
});

export const executeWorkflowSchema = z.object({
  inputPayload: z.record(z.string(), z.unknown()).optional(),
});

export const executionIdParamsSchema = z.object({
  executionId: z.string().min(1),
});

export const approveExecutionSchema = z.object({
  approved: z.boolean(),
});

export const listExecutionsQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export type CreateWorkflowInput = z.infer<typeof createWorkflowSchema>;
export type UpdateWorkflowInput = z.infer<typeof updateWorkflowSchema>;
export type ListWorkflowsQuery = z.infer<typeof listWorkflowsQuerySchema>;
export type DuplicateWorkflowInput = z.infer<typeof duplicateWorkflowSchema>;
export type ExecuteWorkflowInput = z.infer<typeof executeWorkflowSchema>;
export type ApproveExecutionInput = z.infer<typeof approveExecutionSchema>;
export type ListExecutionsQuery = z.infer<typeof listExecutionsQuerySchema>;
