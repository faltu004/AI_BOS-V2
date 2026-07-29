import type { Types } from "mongoose";
import { workflowRepository } from "../repositories/workflow.repository.js";
import { AppError } from "../utils/app-error.js";
import type {
  CreateWorkflowInput,
  DuplicateWorkflowInput,
  ExecuteWorkflowInput,
  ListWorkflowsQuery,
  UpdateWorkflowInput,
} from "../validation/workflow.validation.js";

export class WorkflowService {
  async create(input: CreateWorkflowInput, userId?: string) {
    const steps = input.steps.map((step) => ({
      ...step,
      config: step.config ?? {},
    }));

    const workflow = await workflowRepository.create({
      ...input,
      executionCount: 0,
      triggerConfig: input.triggerConfig ?? {},
      steps,
      createdBy: userId as unknown as Types.ObjectId,
      updatedBy: userId as unknown as Types.ObjectId,
    });

    return workflow;
  }

  async list(query: ListWorkflowsQuery) {
    return workflowRepository.list(query);
  }

  async getById(id: string) {
    const workflow = await workflowRepository.findById(id);

    if (!workflow) {
      throw new AppError("Workflow not found", 404);
    }

    return workflow;
  }

  async update(id: string, input: UpdateWorkflowInput, userId?: string) {
    const updates = {
      ...input,
      ...(userId ? { updatedBy: userId as unknown as Types.ObjectId } : {}),
    };

    const workflow = await workflowRepository.update(id, updates);

    if (!workflow) {
      throw new AppError("Workflow not found", 404);
    }

    return workflow;
  }

  async delete(id: string) {
    const workflow = await workflowRepository.delete(id);

    if (!workflow) {
      throw new AppError("Workflow not found", 404);
    }

    return { deleted: true };
  }

  async duplicate(id: string, input: DuplicateWorkflowInput, userId?: string) {
    const original = await this.getById(id);

    const duplicate = await workflowRepository.create({
      name: input.name || `${original.name} Copy`,
      description: original.description,
      status: "Draft",
      isTemplate: false,
      triggerType: original.triggerType,
      triggerConfig: original.triggerConfig,
      steps: original.steps,
      tags: [...original.tags, "duplicate"],
      executionCount: 0,
      createdBy: userId as unknown as Types.ObjectId,
      updatedBy: userId as unknown as Types.ObjectId,
    });

    return duplicate;
  }

  async toggleStatus(id: string, userId?: string) {
    const workflow = await this.getById(id);
    const newStatus = workflow.status === "Active" ? "Paused" : "Active";

    return workflowRepository.update(id, {
      status: newStatus,
      ...(userId ? { updatedBy: userId as unknown as Types.ObjectId } : {}),
    });
  }

  async execute(id: string, _input: ExecuteWorkflowInput, userId?: string) {
    const startedAt = new Date();
    const workflow = await workflowRepository.markExecuted(id, startedAt, userId);

    if (!workflow) {
      const existingWorkflow = await workflowRepository.findById(id);

      if (!existingWorkflow) {
        throw new AppError("Workflow not found", 404);
      }

      throw new AppError("Cannot execute a paused workflow", 400);
    }

    const executionId = `${workflow._id}-${Date.now()}`;

    return {
      executionId,
      workflowId: workflow._id,
      workflowName: workflow.name,
      status: "completed",
      startedAt,
      finishedAt: new Date(),
      steps: workflow.steps.map((step) => ({
        stepId: step.stepId,
        name: step.name,
        status: "completed" as const,
        startedAt,
        finishedAt: new Date(),
      })),
    };
  }

  async stats() {
    return workflowRepository.stats();
  }
}

export const workflowService = new WorkflowService();
