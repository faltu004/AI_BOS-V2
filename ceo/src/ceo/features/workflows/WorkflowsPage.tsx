import { motion } from "framer-motion";
import {
  ArrowRight,
  Bell,
  BookOpenText,
  Bot,
  Check,
  ChevronDown,
  Clock,
  Copy,
  Download,
  Edit3,
  Eye,
  FolderKanban,
  GitBranch,
  GripVertical,
  LayoutList,
  MessageSquareText,
  MoreVertical,
  Pause,
  Play,
  Plus,
  Search,
  Settings2,
  ShieldCheck,
  TrendingUp,
  Trash2,
  Zap,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ThemeToggle } from "@shared/ui/ThemeToggle";
import { Button } from "@shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@shared/ui/card";
import { EmptyState } from "@shared/ui/empty-state";
import { Input } from "@shared/ui/input";
import { Label } from "@shared/ui/label";
import { useConfirm } from "@shared/ui/confirm-dialog-context";
import { useToast } from "@shared/ui/toast-context";
import {
  seedWorkflows,
  workflowActionTypes,
  workflowStatuses,
  workflowTriggerTypes,
} from "./workflows.data";
import {
  createWorkflowFromInput,
  getStepColor,
  getStepIcon,
  getStepStatusColor,
  getStatusColor,
  getTriggerIcon,
  getWorkflowStats,
} from "./workflows.utils";
import type {
  Workflow,
  WorkflowFormInput,
  WorkflowStep,
  WorkflowView,
} from "./workflows.types";

const pageSize = 6;
const emptyForm: WorkflowFormInput = {
  name: "",
  description: "",
  status: "Draft",
  isTemplate: false,
  triggerType: "manual",
  triggerConfig: {},
  steps: [],
  tags: [],
};

function formatDate(value?: string) {
  if (!value) return "Never";
  return new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatDateTime(value?: string) {
  if (!value) return "Never";
  return new Date(value).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function WorkflowBuilderPalette({ onAddStep }: { onAddStep: (type: WorkflowStep["type"]) => void }) {
  const [expanded, setExpanded] = useState(true);

  const categories = [
    { title: "Triggers", items: [{ type: "trigger" as const, label: "Trigger", icon: Zap, desc: "Start the workflow" }] },
    { title: "Logic", items: [
      { type: "condition" as const, label: "Condition", icon: GitBranch, desc: "Branch based on rules" },
      { type: "delay" as const, label: "Delay", icon: Clock, desc: "Wait before next step" },
    ]},
    { title: "Actions", items: [
      { type: "action" as const, label: "Action", icon: ArrowRight, desc: "Perform an action" },
      { type: "approval" as const, label: "Approval", icon: ShieldCheck, desc: "Request approval" },
      { type: "notification" as const, label: "Notification", icon: Bell, desc: "Send notification" },
    ]},
  ];

  return (
    <Card className="glass h-full">
      <CardHeader className="cursor-pointer" onClick={() => setExpanded((current) => !current)}>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Node Palette</CardTitle>
          <ChevronDown className={`h-4 w-4 transition-transform ${expanded ? "rotate-180" : ""}`} />
        </div>
      </CardHeader>
      {expanded && (
        <CardContent className="space-y-4 pt-0">
          {categories.map((category) => (
            <div key={category.title}>
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">{category.title}</p>
              <div className="space-y-2">
                {category.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      className="flex w-full items-center gap-3 rounded-xl border bg-background/60 p-3 text-left transition-all hover:-translate-y-0.5 hover:border-primary/40"
                      key={item.type}
                      onClick={() => onAddStep(item.type)}
                      type="button"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold">{item.label}</span>
                        <span className="block truncate text-xs text-muted-foreground">{item.desc}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </CardContent>
      )}
    </Card>
  );
}

function WorkflowCanvas({
  steps,
  selectedStepId,
  onSelectStep,
  onReorder,
  onRemoveStep,
  onUpdateStep,
}: {
  steps: WorkflowStep[];
  selectedStepId?: string;
  onSelectStep: (step: WorkflowStep) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
  onRemoveStep: (stepId: string) => void;
  onUpdateStep: (step: WorkflowStep) => void;
}) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  if (steps.length === 0) {
    return (
      <Card className="glass flex h-full items-center justify-center">
        <CardContent className="py-20 text-center">
          <MessageSquareText className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
          <p className="text-lg font-semibold">No steps yet</p>
          <p className="mt-1 text-sm text-muted-foreground">Drag nodes from the palette to build your workflow.</p>
        </CardContent>
      </Card>
    );
  }

  const handleDragStart = (index: number) => () => setDraggedIndex(index);
  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    onReorder(draggedIndex, index);
    setDraggedIndex(index);
  };
  const handleDragEnd = () => setDraggedIndex(null);

  return (
    <Card className="glass h-full overflow-y-auto">
      <CardContent className="space-y-1 p-4">
        {steps.map((step, index) => {
          const Icon = getStepIcon(step.type);
          const colorClass = getStepColor(step.type);
          const isSelected = selectedStepId === step.stepId;
          const isDragging = draggedIndex === index;

          return (
            <div key={step.stepId}>
              <div className="flex items-stretch gap-3">
                <div className="flex flex-col items-center">
                    <button
                      className="cursor-grab rounded-lg border bg-background/60 p-2 transition-all hover:border-primary/40 active:cursor-grabbing"
                      draggable
                      onDragEnd={handleDragEnd}
                      onDragStart={handleDragStart(index)}
                      onDragOver={(e) => handleDragOver(e, index)}
                      type="button"
                    >
                      <GripVertical className="h-4 w-4 text-muted-foreground" />
                    </button>
                </div>
                <button
                  className={`flex-1 rounded-2xl border p-4 text-left transition-all ${
                    isSelected
                      ? "border-primary/60 bg-primary/5 shadow-lg shadow-primary/10"
                      : "border-border bg-background/60 hover:border-primary/40"
                  } ${isDragging ? "opacity-50" : ""}`}
                  onClick={() => onSelectStep(step)}
                  type="button"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${colorClass}`}>
                        <Icon className="h-5 w-5" />
                      </span>
                      <div>
                        <p className="font-semibold">{step.name}</p>
                        <p className="text-xs text-muted-foreground capitalize">{step.type}</p>
                      </div>
                    </div>
                    <Button
                      onClick={(e) => { e.stopPropagation(); onRemoveStep(step.stepId); }}
                      size="icon"
                      type="button"
                      variant="ghost"
                    >
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </div>
                  {step.description && <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{step.description}</p>}
                  {step.delayMinutes && (
                    <span className="mt-2 inline-flex items-center gap-1 rounded-full border bg-orange-500/10 px-2 py-0.5 text-xs font-semibold text-orange-600 dark:text-orange-300">
                      <Clock className="h-3 w-3" /> {step.delayMinutes} min
                    </span>
                  )}
                  {step.approverRoles && step.approverRoles.length > 0 && (
                    <span className="mt-2 inline-flex items-center gap-1 rounded-full border bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-300">
                      <ShieldCheck className="h-3 w-3" /> {step.approverRoles.join(", ")}
                    </span>
                  )}
                </button>
              </div>
              {index < steps.length - 1 && (
                <div className="flex justify-center py-1">
                  <div className="flex h-6 w-0.5 items-center justify-center bg-border">
                    <ArrowRight className="h-3 w-3 -rotate-90 text-muted-foreground" />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

function StepPropertiesPanel({
  step,
  onUpdate,
  onClose,
}: {
  step: WorkflowStep;
  onUpdate: (step: WorkflowStep) => void;
  onClose: () => void;
}) {
  const [local, setLocal] = useState(step);

  useState(() => setLocal(step));

  const update = (patch: Partial<WorkflowStep>) => {
    const updated = { ...local, ...patch };
    setLocal(updated);
    onUpdate(updated);
  };

  return (
    <Card className="glass h-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Step Properties</CardTitle>
          <Button onClick={onClose} size="icon" type="button" variant="ghost">
            <Eye className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pt-0">
        <div className="space-y-2">
          <Label>Name</Label>
          <Input value={local.name} onChange={(e) => update({ name: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>Description</Label>
          <textarea
            className="min-h-20 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            value={local.description ?? ""}
            onChange={(e) => update({ description: e.target.value })}
          />
        </div>
        {local.type === "trigger" && (
          <div className="space-y-2">
            <Label>Trigger Type</Label>
            <select
              className="h-11 w-full rounded-md border bg-background px-3 text-sm"
              value={local.triggerType ?? ""}
              onChange={(e) => update({ triggerType: e.target.value as WorkflowStep["triggerType"] })}
            >
              {workflowTriggerTypes.map((t) => (
                <option key={t} value={t}>{t.replace(/_/g, " ")}</option>
              ))}
            </select>
          </div>
        )}
        {local.type === "action" && (
          <div className="space-y-2">
            <Label>Action Type</Label>
            <select
              className="h-11 w-full rounded-md border bg-background px-3 text-sm"
              value={local.actionType ?? ""}
              onChange={(e) => update({ actionType: e.target.value as WorkflowStep["actionType"] })}
            >
              {workflowActionTypes.map((t) => (
                <option key={t} value={t}>{t.replace(/_/g, " ")}</option>
              ))}
            </select>
          </div>
        )}
        {local.type === "delay" && (
          <div className="space-y-2">
            <Label>Delay (minutes)</Label>
            <Input
              min={0}
              type="number"
              value={local.delayMinutes ?? 0}
              onChange={(e) => update({ delayMinutes: Number(e.target.value) })}
            />
          </div>
        )}
        {local.type === "approval" && (
          <div className="space-y-2">
            <Label>Approver Roles (comma separated)</Label>
            <Input
              value={local.approverRoles?.join(", ") ?? ""}
              onChange={(e) => update({ approverRoles: e.target.value.split(",").map((v) => v.trim()).filter(Boolean) })}
            />
          </div>
        )}
        {local.type === "notification" && (
          <div className="space-y-2">
            <Label>Channels (comma separated)</Label>
            <Input
              value={local.notificationChannels?.join(", ") ?? ""}
              onChange={(e) => update({ notificationChannels: e.target.value.split(",").map((v) => v.trim()).filter(Boolean) })}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function WorkflowExecutionHistory({ history }: { history: Workflow["executionHistory"] }) {
  if (!history || history.length === 0) {
    return (
      <EmptyState
        description="No executions yet. Run the workflow to see execution history."
        icon={Clock}
        title="No History"
      />
    );
  }

  return (
    <div className="space-y-3">
      {history.map((exec) => (
        <Card className="glass" key={exec.executionId}>
          <CardContent className="p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-semibold">Execution {exec.executionId.slice(-8)}</p>
                <p className="text-xs text-muted-foreground">{formatDateTime(exec.startedAt)}</p>
              </div>
              <span className={`rounded-full border px-3 py-1 text-xs font-semibold capitalize ${exec.status === "completed" ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300" : exec.status === "failed" ? "border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-300" : "border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-300"}`}>
                {exec.status}
              </span>
            </div>
            <div className="mt-4 space-y-2">
              {exec.stepLogs.map((log) => (
                <div className="flex items-center gap-3 rounded-lg border bg-background/60 p-3" key={log.stepId}>
                  <span className={`flex h-6 w-6 items-center justify-center rounded-full border text-xs ${getStepStatusColor(log.status)}`}>
                    {log.status === "completed" ? <Check className="h-3 w-3" /> : log.status === "failed" ? <Trash2 className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                  </span>
                  <span className="flex-1 text-sm">{log.stepId}</span>
                  <span className="text-xs text-muted-foreground capitalize">{log.status}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function WorkflowFormModal({
  initialWorkflow,
  onClose,
  onSubmit,
}: {
  initialWorkflow?: Workflow | null;
  onClose: () => void;
  onSubmit: (input: WorkflowFormInput) => void;
}) {
  const [form, setForm] = useState<WorkflowFormInput>(() =>
    initialWorkflow
      ? {
          id: initialWorkflow.id,
          name: initialWorkflow.name,
          description: initialWorkflow.description,
          status: initialWorkflow.status,
          isTemplate: initialWorkflow.isTemplate,
          triggerType: initialWorkflow.triggerType,
          triggerConfig: initialWorkflow.triggerConfig,
          steps: initialWorkflow.steps,
          tags: initialWorkflow.tags,
        }
      : { ...emptyForm },
  );
  const [view, setView] = useState<WorkflowView>("list");

  const updateField = <K extends keyof WorkflowFormInput>(field: K, value: WorkflowFormInput[K]) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = () => {
    onSubmit(form);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/35 p-4 backdrop-blur-sm">
      <motion.div
        animate={{ opacity: 1, scale: 1 }}
        className="flex h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-lg border bg-background shadow-glass"
        initial={{ opacity: 0, scale: 0.96 }}
      >
        <div className="flex items-center justify-between border-b p-5">
          <div>
            <h2 className="text-2xl font-bold">{initialWorkflow ? "Edit Workflow" : "Create Workflow"}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {initialWorkflow ? `ID: ${initialWorkflow.id}` : "Build and configure your automation workflow"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex rounded-lg border bg-background/60 p-1">
              {(["list", "builder", "history"] as WorkflowView[]).map((v) => (
                <button
                  className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${view === v ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
                  key={v}
                  onClick={() => setView(v)}
                  type="button"
                >
                  {v === "list" ? "List" : v === "builder" ? "Builder" : "History"}
                </button>
              ))}
            </div>
            <Button onClick={onClose} type="button" variant="outline">Close</Button>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 overflow-hidden">
          {view === "list" && (
            <div className="flex-1 overflow-y-auto p-5">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Workflow Name</Label>
                  <Input id="name" required value={form.name} onChange={(e) => updateField("name", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <select className="h-11 w-full rounded-md border bg-background px-3 text-sm" value={form.status} onChange={(e) => updateField("status", e.target.value as WorkflowFormInput["status"])}>
                    {workflowStatuses.map((s) => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Trigger Type</Label>
                  <select className="h-11 w-full rounded-md border bg-background px-3 text-sm" value={form.triggerType} onChange={(e) => updateField("triggerType", e.target.value as WorkflowFormInput["triggerType"])}>
                    {workflowTriggerTypes.map((t) => <option key={t}>{t.replace(/_/g, " ")}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Is Template</Label>
                  <select className="h-11 w-full rounded-md border bg-background px-3 text-sm" value={String(form.isTemplate)} onChange={(e) => updateField("isTemplate", e.target.value === "true")}>
                    <option value="false">No</option>
                    <option value="true">Yes</option>
                  </select>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="description">Description</Label>
                  <textarea className="min-h-24 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:border-primary" id="description" value={form.description ?? ""} onChange={(e) => updateField("description", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tags">Tags</Label>
                  <Input id="tags" placeholder="crm, automation, sales" value={form.tags.join(", ")} onChange={(e) => updateField("tags", e.target.value.split(",").map((v) => v.trim()).filter(Boolean))} />
                </div>
              </div>
            </div>
          )}

          {view === "builder" && (
            <div className="flex min-h-0 flex-1 gap-4 overflow-hidden p-5">
              <div className="w-64 shrink-0 overflow-y-auto">
                <WorkflowBuilderPalette
                  onAddStep={(type) => {
                    const newStep: WorkflowStep = {
                      stepId: `step-${crypto.randomUUID().slice(0, 8)}`,
                      type,
                      name: `New ${type.charAt(0).toUpperCase() + type.slice(1)}`,
                      config: {},
                      order: form.steps.length,
                    };
                    updateField("steps", [...form.steps, newStep]);
                  }}
                />
              </div>
              <div className="min-w-0 flex-1 overflow-y-auto">
                <WorkflowCanvas
                  selectedStepId={form.steps.find((s) => s.stepId === form.steps[form.steps.length - 1]?.stepId)?.stepId}
                  steps={form.steps}
                  onRemoveStep={(stepId) => updateField("steps", form.steps.filter((s) => s.stepId !== stepId))}
                  onReorder={(fromIndex, toIndex) => {
                    const updated = [...form.steps];
                    const [moved] = updated.splice(fromIndex, 1);
                    updated.splice(toIndex, 0, moved);
                    updateField("steps", updated.map((step, i) => ({ ...step, order: i })));
                  }}
                  onSelectStep={(step) => {
                    updateField("steps", form.steps.map((s) => s.stepId === step.stepId ? step : s));
                  }}
                  onUpdateStep={(updatedStep) => {
                    updateField("steps", form.steps.map((s) => s.stepId === updatedStep.stepId ? updatedStep : s));
                  }}
                />
              </div>
              <div className="w-80 shrink-0 overflow-y-auto">
                {form.steps.length > 0 ? (
                  <StepPropertiesPanel
                    onClose={() => {}}
                    onUpdate={(updatedStep) => {
                      updateField("steps", form.steps.map((s) => s.stepId === updatedStep.stepId ? updatedStep : s));
                    }}
                    step={form.steps[form.steps.length - 1] ?? form.steps[0]}
                  />
                ) : (
                  <Card className="glass">
                    <CardContent className="p-5 text-center text-sm text-muted-foreground">
                      Select a step to edit its properties.
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          )}

          {view === "history" && (
            <div className="flex-1 overflow-y-auto p-5">
              <WorkflowExecutionHistory history={initialWorkflow?.executionHistory} />
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 border-t p-5">
          <Button onClick={onClose} type="button" variant="outline">Cancel</Button>
          <Button onClick={handleSubmit} type="submit">{initialWorkflow ? "Save Workflow" : "Create Workflow"}</Button>
        </div>
      </motion.div>
    </div>
  );
}

export function WorkflowsPage() {
  const { confirm } = useConfirm();
  const { toast } = useToast();
  const [workflows, setWorkflows] = useState<Workflow[]>(seedWorkflows);
  const [view, setView] = useState<WorkflowView>("list");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("All");
  const [sortBy, setSortBy] = useState<keyof Workflow>("updatedAt");
  const [page, setPage] = useState(1);
  const [editingWorkflow, setEditingWorkflow] = useState<Workflow | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(null);

  const filteredWorkflows = useMemo(() => {
    return workflows
      .filter((workflow) => {
        const searchText = `${workflow.name} ${workflow.description} ${workflow.tags.join(" ")}`.toLowerCase();
        return searchText.includes(search.toLowerCase());
      })
      .filter((workflow) => status === "All" || workflow.status === status)
      .sort((a, b) => String(b[sortBy]).localeCompare(String(a[sortBy])));
  }, [sortBy, status, search, workflows]);

  const paginatedWorkflows = filteredWorkflows.slice((page - 1) * pageSize, page * pageSize);
  const totalPages = Math.max(1, Math.ceil(filteredWorkflows.length / pageSize));
  const stats = getWorkflowStats(workflows);

  const upsertWorkflow = (input: WorkflowFormInput) => {
    if (editingWorkflow) {
      setWorkflows((current) =>
        current.map((workflow) =>
          workflow.id === editingWorkflow.id
            ? { ...workflow, ...input, updatedAt: new Date().toISOString().slice(0, 10) }
            : workflow,
        ),
      );
    } else {
      setWorkflows((current) => [createWorkflowFromInput(input, current), ...current]);
    }
    setEditingWorkflow(null);
    setIsCreating(false);
  };

  const deleteWorkflow = async (id: string) => {
    const accepted = await confirm({
      title: "Delete workflow?",
      description: "This workflow and its execution history will be permanently removed.",
      confirmLabel: "Delete Workflow",
      tone: "danger",
    });
    if (accepted) {
      setWorkflows((current) => current.filter((workflow) => workflow.id !== id));
      toast({ title: "Workflow deleted", description: "The workflow was removed.", type: "warning" });
    }
  };

  const duplicateWorkflow = (workflow: Workflow) => {
    setWorkflows((current) => [createWorkflowFromInput({ ...workflow, name: `${workflow.name} Copy`, status: "Draft", isTemplate: false }, current), ...current]);
    toast({ title: "Workflow duplicated", description: "A copy has been created as a new draft.", type: "success" });
  };

  const toggleStatus = async (id: string) => {
    const workflow = workflows.find((w) => w.id === id);
    if (!workflow) return;
    const newStatus = workflow.status === "Active" ? "Paused" : "Active";
    setWorkflows((current) => current.map((w) => w.id === id ? { ...w, status: newStatus, updatedAt: new Date().toISOString().slice(0, 10) } : w));
    toast({ title: `Workflow ${newStatus === "Active" ? "activated" : "paused"}`, description: `${workflow.name} is now ${newStatus}.`, type: "success" });
  };

  const executeWorkflow = async (id: string) => {
    const workflow = workflows.find((w) => w.id === id);
    if (!workflow) return;
    if (workflow.status === "Paused") {
      toast({ title: "Workflow paused", description: "Activate the workflow before executing.", type: "warning" });
      return;
    }
    const execution = {
      executionId: `exec-${Date.now()}`,
      startedAt: new Date().toISOString(),
      finishedAt: new Date().toISOString(),
      status: "completed" as const,
      triggeredBy: "user",
      inputPayload: {},
      outputPayload: {},
      stepLogs: workflow.steps.map((step) => ({
        stepId: step.stepId,
        startedAt: new Date().toISOString(),
        finishedAt: new Date().toISOString(),
        status: "completed" as const,
      })),
    };
    setWorkflows((current) => current.map((w) => w.id === id ? { ...w, executionCount: w.executionCount + 1, lastExecutedAt: new Date().toISOString(), executionHistory: [execution, ...(w.executionHistory ?? [])] } : w));
    toast({ title: "Workflow executed", description: `${workflow.name} completed successfully.`, type: "success" });
  };

  const statCards = [
    { label: "Total Workflows", value: stats.total, icon: FolderKanban },
    { label: "Active", value: stats.active, icon: Play },
    { label: "Paused", value: stats.paused, icon: Pause },
    { label: "Templates", value: stats.templates, icon: BookOpenText },
    { label: "Total Runs", value: stats.totalExecutions, icon: TrendingUp },
  ];

  return (
    <main className="min-h-screen bg-enterprise">
      <header className="sticky top-0 z-40 border-b bg-background/78 backdrop-blur-xl">
        <div className="container flex min-h-16 flex-wrap items-center justify-between gap-3 py-3">
          <div>
            <p className="text-sm font-semibold text-primary">Workflows</p>
            <h1 className="text-2xl font-bold">AI Workflow Automation</h1>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button onClick={() => setIsCreating(true)}><Plus className="h-4 w-4" />Create Workflow</Button>
          </div>
        </div>
      </header>

      <div className="container space-y-6 py-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {statCards.map((card, index) => {
            const Icon = card.icon;
            return (
              <motion.div animate={{ opacity: 1, y: 0 }} initial={{ opacity: 0, y: 16 }} key={card.label} transition={{ delay: index * 0.04 }}>
                <Card className="glass">
                  <CardContent className="p-5">
                    <Icon className="mb-4 h-5 w-5 text-primary" />
                    <p className="text-sm text-muted-foreground">{card.label}</p>
                    <p className="mt-2 text-3xl font-bold">{card.value}</p>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        <Card className="glass">
          <CardContent className="space-y-4 p-4">
            <div className="grid gap-3 lg:grid-cols-[1fr_160px_160px_auto]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input className="pl-9" placeholder="Search workflows..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
              </div>
              <select className="h-11 rounded-md border bg-background/75 px-3 text-sm" value={status} onChange={(e) => setStatus(e.target.value)}>
                <option>All</option>
                {workflowStatuses.map((item) => <option key={item}>{item}</option>)}
              </select>
              <select className="h-11 rounded-md border bg-background/75 px-3 text-sm" value={sortBy} onChange={(e) => setSortBy(e.target.value as keyof Workflow)}>
                <option value="updatedAt">Sort: Updated</option>
                <option value="name">Sort: Name</option>
                <option value="executionCount">Sort: Runs</option>
                <option value="lastExecutedAt">Sort: Last Run</option>
              </select>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => downloadFile(exportWorkflowsCsv(filteredWorkflows), "workflows.csv", "text/csv")}><Download className="h-4 w-4" />CSV</Button>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex gap-2">
                {(["list", "builder"] as WorkflowView[]).map((v) => (
                  <Button key={v} variant={view === v ? "default" : "outline"} onClick={() => setView(v)}>
                    {v === "list" && <LayoutList className="h-4 w-4" />}
                    {v === "builder" && <Settings2 className="h-4 w-4" />}
                    {v === "list" ? "List" : "Builder"}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {view === "list" && (
          paginatedWorkflows.length === 0 ? (
            <EmptyState
              action={{ label: "Create Workflow", onClick: () => setIsCreating(true) }}
              description="No workflows match the current search and filters."
              icon={Bot}
              title="No workflows found"
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {paginatedWorkflows.map((workflow) => {
                const TriggerIcon = getTriggerIcon(workflow.triggerType);
                const isSelected = selectedWorkflow?.id === workflow.id;
                return (
                  <Card
                    className={`glass cursor-pointer transition-all hover:-translate-y-1 ${isSelected ? "border-primary/50 shadow-lg shadow-primary/10" : "hover:border-primary/35"}`}
                    key={workflow.id}
                    onClick={() => setSelectedWorkflow(workflow)}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <CardTitle className="truncate">{workflow.name}</CardTitle>
                          <p className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                            <TriggerIcon className="h-3.5 w-3.5" />
                            <span className="capitalize">{workflow.triggerType.replace(/_/g, " ")}</span>
                          </p>
                        </div>
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusColor(workflow.status)}`}>{workflow.status}</span>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="line-clamp-2 text-sm leading-6 text-muted-foreground">{workflow.description}</p>
                      <div className="flex flex-wrap gap-2 text-xs">
                        <span className="rounded-full bg-primary/10 px-2.5 py-1 font-semibold text-primary">{workflow.steps.length} steps</span>
                        <span className="rounded-full bg-accent/15 px-2.5 py-1 font-semibold text-accent">{workflow.executionCount} runs</span>
                        {workflow.isTemplate && <span className="rounded-full bg-muted px-2.5 py-1 font-semibold text-muted-foreground">Template</span>}
                      </div>
                      <p className="text-xs text-muted-foreground">Last run: {formatDateTime(workflow.lastExecutedAt)}</p>
                      <div className="flex flex-wrap gap-2 opacity-90 transition-opacity hover:opacity-100">
                        <Button asChild size="sm" variant="outline"><Link to={`/workflows/${workflow.id}`}><Eye className="h-4 w-4" />Open</Link></Button>
                        <Button size="sm" variant="outline" onClick={() => { setEditingWorkflow(workflow); }}><Edit3 className="h-4 w-4" />Edit</Button>
                        <Button size="sm" variant="outline" onClick={() => duplicateWorkflow(workflow)}><Copy className="h-4 w-4" /></Button>
                        <Button size="sm" variant="outline" onClick={() => toggleStatus(workflow.id)}>{workflow.status === "Active" ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}</Button>
                        <Button size="sm" variant="outline" onClick={() => executeWorkflow(workflow.id)}><Zap className="h-4 w-4" /></Button>
                        <Button size="sm" variant="outline" onClick={() => deleteWorkflow(workflow.id)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )
        )}

        {view === "builder" && (
          <Card className="glass">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">Visual Workflow Builder</h3>
                  <p className="text-sm text-muted-foreground">Drag nodes from the palette to design your workflow.</p>
                </div>
                <Button onClick={() => setIsCreating(true)}><Plus className="h-4 w-4" />New Workflow</Button>
              </div>
              <div className="mt-6 grid gap-4 lg:grid-cols-[280px_1fr]">
                <WorkflowBuilderPalette onAddStep={() => setIsCreating(true)} />
                <div className="flex items-center justify-center rounded-2xl border border-dashed p-10">
                  <div className="text-center">
                    <Settings2 className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                    <p className="text-lg font-semibold">Select a workflow to edit</p>
                    <p className="mt-1 text-sm text-muted-foreground">Choose an existing workflow or create a new one to open the builder.</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Page {page} of {totalPages}</p>
          <div className="flex gap-2">
            <Button disabled={page === 1} variant="outline" onClick={() => setPage((current) => Math.max(1, current - 1))}>Previous</Button>
            <Button disabled={page === totalPages} variant="outline" onClick={() => setPage((current) => Math.min(totalPages, current + 1))}>Next</Button>
          </div>
        </div>
      </div>

      {(isCreating || editingWorkflow) && (
        <WorkflowFormModal
          initialWorkflow={editingWorkflow}
          onClose={() => { setIsCreating(false); setEditingWorkflow(null); }}
          onSubmit={upsertWorkflow}
        />
      )}
    </main>
  );
}

function downloadFile(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function exportWorkflowsCsv(workflows: Workflow[]) {
  const columns = ["id", "name", "status", "triggerType", "steps", "executionCount", "lastExecutedAt", "createdAt"];
  const rows = workflows.map((w) => columns.map((c) => `"${String(w[c as keyof Workflow] ?? "").replace(/"/g, '""')}"`).join(","));
  return [columns.join(","), ...rows].join("\n");
}
