export type WorkflowStatus = "Active" | "Paused" | "Draft" | "Archived";
export type WorkflowStepType = "trigger" | "action" | "condition" | "delay" | "approval" | "notification";
export type WorkflowTriggerType = "customer_created" | "manual" | "schedule" | "webhook" | "project_created" | "invoice_created";
export type WorkflowActionType = "create_crm_lead" | "assign_sales_executive" | "schedule_meeting" | "send_email" | "create_task" | "update_record" | "send_notification" | "create_project";
export type WorkflowConditionOperator = "equals" | "not_equals" | "contains" | "greater_than" | "less_than" | "is_empty" | "is_not_empty";

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
  startedAt: string;
  finishedAt?: string;
  status: "running" | "completed" | "failed" | "cancelled";
  triggeredBy?: string;
  inputPayload: Record<string, unknown>;
  outputPayload?: Record<string, unknown>;
  error?: string;
  stepLogs: Array<{
    stepId: string;
    startedAt: string;
    finishedAt?: string;
    status: "running" | "completed" | "failed" | "skipped";
    output?: Record<string, unknown>;
    error?: string;
  }>;
};

export type Workflow = {
  id: string;
  name: string;
  description?: string;
  status: WorkflowStatus;
  isTemplate: boolean;
  triggerType: WorkflowTriggerType;
  triggerConfig: Record<string, unknown>;
  steps: WorkflowStep[];
  tags: string[];
  executionCount: number;
  lastExecutedAt?: string;
  createdBy: string;
  updatedBy?: string;
  createdAt: string;
  updatedAt: string;
  executionHistory?: WorkflowExecutionLog[];
};

export type WorkflowFormInput = Omit<Workflow, "id" | "createdBy" | "updatedBy" | "createdAt" | "updatedAt" | "executionHistory" | "executionCount"> & {
  id?: string;
};

export type WorkflowView = "list" | "builder" | "history";
