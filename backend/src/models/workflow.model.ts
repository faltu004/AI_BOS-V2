import { Schema, model, type Types, type HydratedDocument, type Document } from "mongoose";
import {
  type WorkflowActionType,
  type WorkflowConditionOperator,
  type WorkflowStatus,
  type WorkflowStepType,
  type WorkflowTriggerType,
  workflowActionTypes,
  workflowConditionOperators,
  workflowStatuses,
  workflowStepTypes,
  workflowTriggerTypes,
} from "../constants/workflow.js";

export type WorkflowStepBranch = {
  condition: string;
  operator: WorkflowConditionOperator;
  value: string;
  nextStepId: string;
};

export type WorkflowStep = {
  stepId: string;
  type: WorkflowStepType;
  name: string;
  description?: string;
  triggerType?: WorkflowTriggerType;
  actionType?: WorkflowActionType;
  config: Record<string, unknown>;
  delayMinutes?: number;
  approverRoles?: string[];
  notificationChannels?: string[];
  nextStepId?: string;
  branches?: WorkflowStepBranch[];
  order: number;
};

export type WorkflowExecutionLog = {
  executionId: string;
  startedAt: Date;
  finishedAt?: Date;
  status: "running" | "completed" | "failed" | "cancelled";
  triggeredBy?: string;
  inputPayload: Record<string, unknown>;
  outputPayload?: Record<string, unknown>;
  error?: string;
  stepLogs: Array<{
    stepId: string;
    startedAt: Date;
    finishedAt?: Date;
    status: "running" | "completed" | "failed" | "skipped";
    output?: Record<string, unknown>;
    error?: string;
  }>;
};

export type Workflow = {
  name: string;
  description?: string;
  status: WorkflowStatus;
  isTemplate: boolean;
  triggerType: WorkflowTriggerType;
  triggerConfig: Record<string, unknown>;
  steps: WorkflowStep[];
  tags: string[];
  executionCount: number;
  lastExecutedAt?: Date;
  createdBy: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export type WorkflowDocument = HydratedDocument<Workflow> & Document;

const stepSchema = new Schema<WorkflowStep>(
  {
    stepId: { type: String, required: true },
    type: { type: String, enum: workflowStepTypes, required: true },
    name: { type: String, required: true, trim: true, maxlength: 180 },
    description: { type: String, trim: true, maxlength: 1000 },
    triggerType: { type: String, enum: workflowTriggerTypes },
    actionType: { type: String, enum: workflowActionTypes },
    config: { type: Schema.Types.Mixed, default: {} },
    delayMinutes: { type: Number, min: 0, max: 10080 },
    approverRoles: [{ type: String, trim: true }],
    notificationChannels: [{ type: String, trim: true }],
    nextStepId: { type: String },
    branches: [
      new Schema<WorkflowStepBranch>(
        {
          condition: { type: String, required: true },
          operator: { type: String, enum: workflowConditionOperators, default: "equals" },
          value: { type: String, required: true },
          nextStepId: { type: String, required: true },
        },
        { _id: false },
      ),
    ],
    order: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const executionLogSchema = new Schema<WorkflowExecutionLog>(
  {
    executionId: { type: String, required: true },
    startedAt: { type: Date, required: true },
    finishedAt: { type: Date },
    status: { type: String, enum: ["running", "completed", "failed", "cancelled"], default: "running" },
    triggeredBy: { type: String },
    inputPayload: { type: Schema.Types.Mixed, default: {} },
    outputPayload: { type: Schema.Types.Mixed },
    error: { type: String },
    stepLogs: [
      new Schema(
        {
          stepId: { type: String, required: true },
          startedAt: { type: Date, required: true },
          finishedAt: { type: Date },
          status: { type: String, enum: ["running", "completed", "failed", "skipped"], default: "running" },
          output: { type: Schema.Types.Mixed },
          error: { type: String },
        },
        { _id: false },
      ),
    ],
  },
  { _id: false },
);

const workflowSchema = new Schema<Workflow>(
  {
    name: { type: String, required: true, trim: true, maxlength: 180, index: true },
    description: { type: String, trim: true, maxlength: 3000 },
    status: { type: String, enum: workflowStatuses, default: "Draft", index: true },
    isTemplate: { type: Boolean, default: false, index: true },
    triggerType: { type: String, enum: workflowTriggerTypes, required: true },
    triggerConfig: { type: Schema.Types.Mixed, default: {} },
    steps: { type: [stepSchema], default: [] },
    tags: [{ type: String, trim: true, lowercase: true, index: true }],
    executionCount: { type: Number, default: 0, min: 0 },
    lastExecutedAt: { type: Date },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

workflowSchema.index({ name: "text", description: "text", tags: "text" });
workflowSchema.index({ status: 1, isTemplate: 1 });
workflowSchema.index({ status: 1, updatedAt: -1 });
workflowSchema.index({ isTemplate: 1, updatedAt: -1 });
workflowSchema.index({ triggerType: 1, updatedAt: -1 });
workflowSchema.index({ executionCount: -1, updatedAt: -1 });

export const WorkflowModel = model("Workflow", workflowSchema);
