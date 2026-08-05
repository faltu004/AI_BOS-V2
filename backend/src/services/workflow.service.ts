import type { Types } from "mongoose";
import { workflowRepository } from "../repositories/workflow.repository.js";
import { workflowExecutionRepository } from "../repositories/workflow-execution.repository.js";
import type { Workflow, WorkflowStep } from "../models/workflow.model.js";
import type { WorkflowExecutionDocument, WorkflowExecutionStepLog } from "../models/workflow-execution.model.js";
import { resolveNextStepId, runAction } from "./workflow-engine.service.js";
import { notificationService } from "./notification.service.js";
import { AppError } from "../utils/app-error.js";
import { logger } from "../utils/logger.js";
import type {
  CreateWorkflowInput,
  DuplicateWorkflowInput,
  ExecuteWorkflowInput,
  ListWorkflowsQuery,
  UpdateWorkflowInput,
} from "../validation/workflow.validation.js";

function stepMap(steps: WorkflowStep[]) {
  return new Map(steps.map((step) => [step.stepId, step]));
}

function firstStepId(steps: WorkflowStep[]) {
  return [...steps].sort((a, b) => a.order - b.order)[0]?.stepId;
}

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

  async execute(id: string, input: ExecuteWorkflowInput, userId?: string) {
    const startedAt = new Date();
    const workflow = await workflowRepository.markExecuted(id, startedAt, userId);

    if (!workflow) {
      const existingWorkflow = await workflowRepository.findById(id);

      if (!existingWorkflow) {
        throw new AppError("Workflow not found", 404);
      }

      throw new AppError("Cannot execute a paused workflow", 400);
    }

    if (workflow.steps.length === 0) {
      throw new AppError("This workflow has no steps to execute", 400);
    }

    const inputPayload = input.inputPayload ?? {};
    const execution = await workflowExecutionRepository.create({
      workflowId: workflow._id as Types.ObjectId,
      workflowName: workflow.name,
      status: "running",
      triggeredBy: userId as unknown as Types.ObjectId,
      inputPayload,
      context: { ...inputPayload },
      startedAt,
      stepLogs: [],
    });

    return runSteps(execution, workflow as unknown as Workflow, firstStepId(workflow.steps));
  }

  async approveStep(executionId: string, approverRole: string, approved: boolean) {
    const execution = await workflowExecutionRepository.findById(executionId);
    if (!execution) {
      throw new AppError("Workflow execution not found", 404);
    }
    if (execution.status !== "paused" || !execution.pendingApproval) {
      throw new AppError("This execution is not waiting for approval", 400);
    }
    if (execution.pendingApproval.approverRoles.length > 0 && !execution.pendingApproval.approverRoles.includes(approverRole)) {
      throw new AppError("You are not an approver for this step", 403);
    }

    const workflow = await workflowRepository.findById(execution.workflowId.toString());
    if (!workflow) {
      throw new AppError("Workflow not found", 404);
    }

    const stepId = execution.pendingApproval.stepId;
    const lastLog = execution.stepLogs.find((log) => log.stepId === stepId && log.status === "waiting_approval");
    if (lastLog) {
      lastLog.status = approved ? "completed" : "failed";
      lastLog.finishedAt = new Date();
      if (!approved) lastLog.error = "Rejected by approver";
    }

    if (!approved) {
      execution.status = "failed";
      execution.error = "Rejected by approver";
      execution.finishedAt = new Date();
      execution.pendingApproval = undefined;
      await workflowExecutionRepository.save(execution);
      return execution;
    }

    execution.pendingApproval = undefined;
    return runSteps(execution, workflow as unknown as Workflow, execution.currentStepId);
  }

  async resumeDueDelays(now: Date) {
    const due = await workflowExecutionRepository.findDue(now);
    let resumed = 0;

    for (const execution of due) {
      const workflow = await workflowRepository.findById(execution.workflowId.toString());
      if (!workflow) {
        execution.status = "failed";
        execution.error = "Workflow no longer exists";
        execution.finishedAt = new Date();
        await workflowExecutionRepository.save(execution);
        continue;
      }

      execution.resumeAt = undefined;
      await runSteps(execution, workflow as unknown as Workflow, execution.currentStepId);
      resumed += 1;
    }

    return resumed;
  }

  async listExecutions(workflowId: string, limit?: number) {
    return workflowExecutionRepository.listByWorkflow(workflowId, limit);
  }

  async stats() {
    const [stats, recentExecutions] = await Promise.all([
      workflowRepository.stats(),
      workflowExecutionRepository.countRecent(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)),
    ]);

    return { ...stats, recentExecutions };
  }
}

/**
 * Walks the workflow's step graph starting at `startStepId`, running each
 * step in order until either the chain ends (execution completes), an
 * action fails (execution fails), or a delay/approval step pauses it —
 * in which case this returns immediately and a later call (cron sweep or
 * the approve endpoint) resumes from `execution.currentStepId`.
 */
async function runSteps(execution: WorkflowExecutionDocument, workflow: Workflow, startStepId: string | undefined) {
  const steps = stepMap(workflow.steps);
  let currentStepId = startStepId;
  execution.status = "running";

  while (currentStepId) {
    const step = steps.get(currentStepId);
    if (!step) {
      execution.status = "failed";
      execution.error = `Step "${currentStepId}" not found in workflow definition`;
      break;
    }

    const log: WorkflowExecutionStepLog = {
      stepId: step.stepId,
      name: step.name,
      type: step.type,
      status: "completed",
      startedAt: new Date(),
    };

    try {
      if (step.type === "delay" && (step.delayMinutes ?? 0) > 0) {
        const resumeStepId = resolveNextStepId(step, execution.context);
        log.status = "waiting_delay";
        log.finishedAt = new Date();
        execution.stepLogs.push(log);
        execution.status = "paused";
        execution.currentStepId = resumeStepId;
        execution.resumeAt = new Date(Date.now() + (step.delayMinutes ?? 0) * 60 * 1000);
        await workflowExecutionRepository.save(execution);
        return execution;
      }

      if (step.type === "approval") {
        const resumeStepId = resolveNextStepId(step, execution.context);
        log.status = "waiting_approval";
        log.finishedAt = new Date();
        execution.stepLogs.push(log);
        execution.status = "paused";
        execution.currentStepId = resumeStepId;
        execution.pendingApproval = { stepId: step.stepId, approverRoles: step.approverRoles ?? [] };
        await workflowExecutionRepository.save(execution);
        return execution;
      }

      if (step.type === "notification") {
        const recipientUserIds = execution.triggeredBy ? [execution.triggeredBy.toString()] : [];
        if (recipientUserIds.length > 0) {
          await notificationService.dispatch({
            recipientUserIds,
            type: "workflow.notification",
            category: "system",
            title: step.name,
            body: (step.config?.body as string) ?? `Workflow "${workflow.name}" reached step "${step.name}"`,
            sourceType: "Workflow",
          });
          log.output = { dispatched: true };
        } else {
          log.output = { dispatched: false, reason: "No recipient available (workflow was not run by a user)" };
        }
      }

      if (step.type === "action") {
        const result = await runAction(step, execution.triggeredBy?.toString(), execution.context);
        log.status = result.skipped ? "skipped" : "completed";
        log.output = result.output;
        execution.context = { ...execution.context, [step.stepId]: result.output };
      }

      log.finishedAt = new Date();
      execution.stepLogs.push(log);
      currentStepId = resolveNextStepId(step, execution.context);
    } catch (error) {
      log.status = "failed";
      log.error = error instanceof Error ? error.message : "Unknown error";
      log.finishedAt = new Date();
      execution.stepLogs.push(log);
      execution.status = "failed";
      execution.error = log.error;
      logger.error(error, `Workflow "${workflow.name}" step "${step.name}" failed`);
      break;
    }
  }

  if (execution.status === "running") {
    execution.status = "completed";
  }
  execution.finishedAt = new Date();
  await workflowExecutionRepository.save(execution);
  return execution;
}

export const workflowService = new WorkflowService();
