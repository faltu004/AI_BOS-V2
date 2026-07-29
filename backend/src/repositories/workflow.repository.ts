import type { FilterQuery, SortOrder, UpdateQuery } from "mongoose";
import { WorkflowModel, type Workflow, type WorkflowDocument } from "../models/workflow.model.js";
import type { CreateWorkflowInput, ListWorkflowsQuery, UpdateWorkflowInput } from "../validation/workflow.validation.js";

export type WorkflowCreateData = Omit<Workflow, "createdAt" | "updatedAt">;

function buildWorkflowFilter(query: ListWorkflowsQuery): FilterQuery<Workflow> {
  const filter: FilterQuery<Workflow> = {};

  if (query.search) {
    filter.$text = { $search: query.search };
  }

  if (query.status) filter.status = query.status;
  if (typeof query.isTemplate === "boolean") filter.isTemplate = query.isTemplate;
  if (query.triggerType) filter.triggerType = query.triggerType;

  return filter;
}

export class WorkflowRepository {
  async create(data: WorkflowCreateData) {
    return WorkflowModel.create(data);
  }

  async findById(id: string) {
    return WorkflowModel.findById(id).lean();
  }

  async list(query: ListWorkflowsQuery) {
    const filter = buildWorkflowFilter(query);
    const skip = (query.page - 1) * query.limit;
    const sort: Record<string, SortOrder> = {
      [query.sortBy]: query.sortOrder === "asc" ? 1 : -1,
    };

    const [items, total] = await Promise.all([
      WorkflowModel.find(filter).sort(sort).skip(skip).limit(query.limit).lean(),
      WorkflowModel.countDocuments(filter),
    ]);

    return {
      items,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit) || 1,
      },
    };
  }

  async listAll(query: ListWorkflowsQuery) {
    return WorkflowModel.find(buildWorkflowFilter(query)).sort({
      [query.sortBy]: query.sortOrder === "asc" ? 1 : -1,
    }).lean();
  }

  async update(id: string, updates: UpdateQuery<WorkflowDocument>) {
    return WorkflowModel.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    }).lean();
  }

  async markExecuted(id: string, startedAt: Date, updatedBy?: string) {
    return WorkflowModel.findOneAndUpdate(
      { _id: id, status: { $ne: "Paused" } },
      {
        $inc: { executionCount: 1 },
        $set: {
          lastExecutedAt: startedAt,
          ...(updatedBy ? { updatedBy } : {}),
        },
      },
      { new: true, runValidators: true },
    ).lean();
  }

  async delete(id: string) {
    return WorkflowModel.findByIdAndDelete(id).select("_id").lean();
  }

  async stats() {
    const [stats] = await WorkflowModel.aggregate<{
      total: number;
      active: number;
      paused: number;
      templates: number;
      totalExecutions: number;
    }>([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          active: { $sum: { $cond: [{ $eq: ["$status", "Active"] }, 1, 0] } },
          paused: { $sum: { $cond: [{ $eq: ["$status", "Paused"] }, 1, 0] } },
          templates: { $sum: { $cond: ["$isTemplate", 1, 0] } },
          totalExecutions: { $sum: "$executionCount" },
        },
      },
      { $project: { _id: 0, total: 1, active: 1, paused: 1, templates: 1, totalExecutions: 1 } },
    ]);

    return {
      total: stats?.total ?? 0,
      active: stats?.active ?? 0,
      paused: stats?.paused ?? 0,
      templates: stats?.templates ?? 0,
      totalExecutions: stats?.totalExecutions ?? 0,
      recentExecutions: 0,
    };
  }
}

export const workflowRepository = new WorkflowRepository();
