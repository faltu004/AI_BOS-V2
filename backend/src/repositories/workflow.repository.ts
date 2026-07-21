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
    return WorkflowModel.findById(id);
  }

  async list(query: ListWorkflowsQuery) {
    const filter = buildWorkflowFilter(query);
    const skip = (query.page - 1) * query.limit;
    const sort: Record<string, SortOrder> = {
      [query.sortBy]: query.sortOrder === "asc" ? 1 : -1,
    };

    const [items, total] = await Promise.all([
      WorkflowModel.find(filter).sort(sort).skip(skip).limit(query.limit),
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
    });
  }

  async update(id: string, updates: UpdateQuery<WorkflowDocument>) {
    return WorkflowModel.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    });
  }

  async delete(id: string) {
    return WorkflowModel.findByIdAndDelete(id);
  }

  async stats() {
    const now = new Date();

    const [total, active, paused, templates, executions] = await Promise.all([
      WorkflowModel.countDocuments({}),
      WorkflowModel.countDocuments({ status: "Active" }),
      WorkflowModel.countDocuments({ status: "Paused" }),
      WorkflowModel.countDocuments({ isTemplate: true }),
      WorkflowModel.aggregate([
        { $match: {} },
        { $group: { _id: null, totalExecutions: { $sum: "$executionCount" } } },
      ]),
    ]);

    return {
      total,
      active,
      paused,
      templates,
      totalExecutions: executions[0]?.totalExecutions ?? 0,
      recentExecutions: 0,
    };
  }
}

export const workflowRepository = new WorkflowRepository();
