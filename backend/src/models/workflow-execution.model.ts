import { Schema, model, type Types, type HydratedDocument } from "mongoose";
import type { WorkflowStepType } from "../constants/workflow.js";

export const workflowExecutionStatuses = ["running", "paused", "completed", "failed", "cancelled"] as const;
export type WorkflowExecutionStatus = (typeof workflowExecutionStatuses)[number];

export const workflowExecutionStepStatuses = ["completed", "failed", "skipped", "waiting_delay", "waiting_approval"] as const;
export type WorkflowExecutionStepStatus = (typeof workflowExecutionStepStatuses)[number];

export type WorkflowExecutionStepLog = {
  stepId: string;
  name: string;
  type: WorkflowStepType;
  status: WorkflowExecutionStepStatus;
  startedAt: Date;
  finishedAt?: Date;
  output?: Record<string, unknown>;
  error?: string;
};

export type WorkflowExecutionPendingApproval = {
  stepId: string;
  approverRoles: string[];
};

export type WorkflowExecution = {
  workflowId: Types.ObjectId;
  workflowName: string;
  status: WorkflowExecutionStatus;
  triggeredBy?: Types.ObjectId;
  inputPayload: Record<string, unknown>;
  context: Record<string, unknown>;
  currentStepId?: string;
  resumeAt?: Date;
  pendingApproval?: WorkflowExecutionPendingApproval;
  stepLogs: WorkflowExecutionStepLog[];
  startedAt: Date;
  finishedAt?: Date;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
};

export type WorkflowExecutionDocument = HydratedDocument<WorkflowExecution>;

const stepLogSchema = new Schema<WorkflowExecutionStepLog>(
  {
    stepId: { type: String, required: true },
    name: { type: String, required: true },
    type: { type: String, required: true },
    status: { type: String, enum: workflowExecutionStepStatuses, required: true },
    startedAt: { type: Date, required: true },
    finishedAt: { type: Date },
    output: { type: Schema.Types.Mixed },
    error: { type: String },
  },
  { _id: false },
);

const pendingApprovalSchema = new Schema<WorkflowExecutionPendingApproval>(
  {
    stepId: { type: String, required: true },
    approverRoles: [{ type: String, trim: true }],
  },
  { _id: false },
);

const workflowExecutionSchema = new Schema<WorkflowExecution>(
  {
    workflowId: { type: Schema.Types.ObjectId, ref: "Workflow", required: true, index: true },
    workflowName: { type: String, required: true },
    status: { type: String, enum: workflowExecutionStatuses, default: "running", index: true },
    triggeredBy: { type: Schema.Types.ObjectId, ref: "User" },
    inputPayload: { type: Schema.Types.Mixed, default: {} },
    context: { type: Schema.Types.Mixed, default: {} },
    currentStepId: { type: String },
    resumeAt: { type: Date, index: true },
    pendingApproval: { type: pendingApprovalSchema },
    stepLogs: { type: [stepLogSchema], default: [] },
    startedAt: { type: Date, required: true },
    finishedAt: { type: Date },
    error: { type: String },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

workflowExecutionSchema.index({ workflowId: 1, createdAt: -1 });
workflowExecutionSchema.index({ status: 1, resumeAt: 1 });

export const WorkflowExecutionModel = model("WorkflowExecution", workflowExecutionSchema);
