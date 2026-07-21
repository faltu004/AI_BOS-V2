export const workflowStatuses = ["Active", "Paused", "Draft", "Archived"] as const;
export const workflowStepTypes = ["trigger", "action", "condition", "delay", "approval", "notification"] as const;
export const workflowTriggerTypes = ["customer_created", "manual", "schedule", "webhook", "project_created", "invoice_created"] as const;
export const workflowActionTypes = ["create_crm_lead", "assign_sales_executive", "schedule_meeting", "send_email", "create_task", "update_record", "send_notification", "create_project"] as const;
export const workflowConditionOperators = ["equals", "not_equals", "contains", "greater_than", "less_than", "is_empty", "is_not_empty"] as const;

export type WorkflowStatus = (typeof workflowStatuses)[number];
export type WorkflowStepType = (typeof workflowStepTypes)[number];
export type WorkflowTriggerType = (typeof workflowTriggerTypes)[number];
export type WorkflowActionType = (typeof workflowActionTypes)[number];
export type WorkflowConditionOperator = (typeof workflowConditionOperators)[number];
