import {
 ArrowRight,
 Bell,
 Clock,
 FolderKanban,
 GitBranch,
 Globe,
 Play,
 ReceiptText,
 ShieldCheck,
 UserPlus,
 Zap,
} from "lucide-react";
import type { Workflow, WorkflowFormInput } from "./workflows.types";

export function generateWorkflowId() {
 return `wf-${crypto.randomUUID().slice(0, 8)}`;
}

export function createWorkflowFromInput(input: WorkflowFormInput, workflows: Workflow[]): Workflow {
 const now = new Date().toISOString().slice(0, 10);

 return {
 ...input,
 id: input.id || generateWorkflowId(),
 executionCount: 0,
 createdBy: "Current User",
 createdAt: now,
 updatedAt: now,
 };
}

export function getWorkflowStats(workflows: Workflow[]) {
 const now = new Date();
 return {
 total: workflows.length,
 active: workflows.filter((w) => w.status === "Active").length,
 paused: workflows.filter((w) => w.status === "Paused").length,
 templates: workflows.filter((w) => w.isTemplate).length,
 totalExecutions: workflows.reduce((sum, w) => sum + w.executionCount, 0),
 };
}

export function getStepStatusColor(status: string) {
 switch (status) {
 case "completed":
 return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border-emerald-500/30";
 case "running":
 return "bg-blue-500/10 text-blue-600 dark:text-blue-300 border-blue-500/30";
 case "failed":
 return "bg-red-500/10 text-red-600 dark:text-red-300 border-red-500/30";
 case "skipped":
 return "bg-muted text-muted-foreground border-border";
 default:
 return "bg-primary/10 text-primary border-primary/30";
 }
}

export function getStatusColor(status: string) {
 switch (status) {
 case "Active":
 return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300";
 case "Paused":
 return "bg-amber-500/10 text-amber-600 dark:text-amber-300";
 case "Draft":
 return "bg-muted text-muted-foreground";
 case "Archived":
 return "bg-red-500/10 text-red-600 dark:text-red-300";
 default:
 return "bg-primary/10 text-primary";
 }
}

export function getTriggerIcon(triggerType: string) {
 switch (triggerType) {
 case "customer_created":
 return UserPlus;
 case "project_created":
 return FolderKanban;
 case "invoice_created":
 return ReceiptText;
 case "schedule":
 return Clock;
 case "webhook":
 return Globe;
 case "manual":
 return Play;
 default:
 return Zap;
 }
}

export function getStepIcon(type: string) {
 switch (type) {
 case "trigger":
 return Zap;
 case "action":
 return ArrowRight;
 case "condition":
 return GitBranch;
 case "delay":
 return Clock;
 case "approval":
 return ShieldCheck;
 case "notification":
 return Bell;
 default:
 return Zap;
 }
}

export function getStepColor(type: string) {
 switch (type) {
 case "trigger":
 return "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-300";
 case "action":
 return "border-sky-500/40 bg-sky-500/10 text-sky-600 dark:text-sky-300";
 case "condition":
 return "border-purple-500/40 bg-purple-500/10 text-purple-600 dark:text-purple-300";
 case "delay":
 return "border-orange-500/40 bg-orange-500/10 text-orange-600 dark:text-orange-300";
 case "approval":
 return "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300";
 case "notification":
 return "border-pink-500/40 bg-pink-500/10 text-pink-600 dark:text-pink-300";
 default:
 return "border-primary/40 bg-primary/10 text-primary";
 }
}
