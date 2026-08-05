import {
  WorkflowExecutionModel,
  type WorkflowExecution,
  type WorkflowExecutionDocument,
} from "../models/workflow-execution.model.js";

export type WorkflowExecutionCreateData = Pick<
  WorkflowExecution,
  "workflowId" | "workflowName" | "status" | "triggeredBy" | "inputPayload" | "context" | "startedAt" | "stepLogs"
>;

export class WorkflowExecutionRepository {
  async create(data: WorkflowExecutionCreateData) {
    return WorkflowExecutionModel.create(data);
  }

  async findById(id: string) {
    return WorkflowExecutionModel.findById(id);
  }

  async listByWorkflow(workflowId: string, limit = 20) {
    return WorkflowExecutionModel.find({ workflowId }).sort({ createdAt: -1 }).limit(limit).lean();
  }

  async findDue(now: Date) {
    return WorkflowExecutionModel.find({ status: "paused", resumeAt: { $lte: now } });
  }

  async save(execution: WorkflowExecutionDocument) {
    return execution.save();
  }

  async countRecent(since: Date) {
    return WorkflowExecutionModel.countDocuments({ createdAt: { $gte: since } });
  }
}

export const workflowExecutionRepository = new WorkflowExecutionRepository();
