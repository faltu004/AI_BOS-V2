import { motion } from "framer-motion";
import {
  AlarmClock,
  Bell,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  Edit3,
  GripVertical,
  LayoutList,
  ListChecks,
  Plus,
  Repeat2,
  Search,
  Timer,
  Trash2,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ThemeToggle } from "@shared/ui/ThemeToggle";
import { Button } from "@shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@shared/ui/card";
import { useConfirm } from "@shared/ui/confirm-dialog-context";
import { EmptyState } from "@shared/ui/empty-state";
import { Input } from "@shared/ui/input";
import { Label } from "@shared/ui/label";
import { useToast } from "@shared/ui/toast-context";
import { cn } from "@shared/lib/utils";
import { seedTasks, taskLabels, taskPriorities, taskStatuses, teamMembers } from "./tasks.data";
import type { Task, TaskFormInput, TaskPriority, TaskStatus, TaskView } from "./tasks.types";
import {
  createTaskFromInput,
  formatHours,
  generateTaskCode,
  getTaskCompletion,
  getTaskStats,
  priorityClass,
  statusClass,
} from "./tasks.utils";

const emptyForm: TaskFormInput = {
  title: "",
  description: "",
  status: "Todo",
  priority: "Medium",
  labels: [],
  assignee: "Priya Sharma",
  reporter: "Priya Sharma",
  dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
  startDate: new Date().toISOString().slice(0, 10),
  estimatedHours: 0,
  actualHours: 0,
  attachments: [],
  comments: [],
  checklist: [],
  recurring: false,
  recurrence: "None",
  notifications: [],
};

const statusLabels: Record<TaskStatus, string> = {
  Todo: "To Do",
  "In Progress": "In Progress",
  Review: "In Review",
  Testing: "Testing",
  Completed: "Completed",
};

const priorityLabels: Record<TaskPriority, string> = {
  Low: "Low Priority",
  Medium: "Medium Priority",
  High: "High Priority",
  Critical: "Critical Priority",
};

function parseList(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function TaskFormModal({
  initialTask,
  onClose,
  onSubmit,
  taskCode,
}: {
  initialTask?: Task | null;
  onClose: () => void;
  onSubmit: (input: TaskFormInput) => void;
  taskCode: string;
}) {
  const [form, setForm] = useState<TaskFormInput>(() =>
    initialTask
      ? {
          taskCode: initialTask.taskCode,
          title: initialTask.title,
          description: initialTask.description,
          status: initialTask.status,
          priority: initialTask.priority,
          labels: initialTask.labels,
          assignee: initialTask.assignee,
          reporter: initialTask.reporter,
          dueDate: initialTask.dueDate,
          startDate: initialTask.startDate,
          estimatedHours: initialTask.estimatedHours,
          actualHours: initialTask.actualHours,
          attachments: initialTask.attachments,
          comments: initialTask.comments,
          checklist: initialTask.checklist,
          recurring: initialTask.recurring,
          recurrence: initialTask.recurrence,
          notifications: initialTask.notifications,
        }
      : { ...emptyForm, taskCode },
  );

  const updateField = <K extends keyof TaskFormInput>(field: K, value: TaskFormInput[K]) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/35 p-4 backdrop-blur-sm">
      <motion.form
        animate={{ opacity: 1, scale: 1 }}
        className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-lg border bg-background p-5 shadow-glass"
        initial={{ opacity: 0, scale: 0.96 }}
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit(form);
        }}
      >
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold">{initialTask ? "Edit Task" : "Create Task"}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{form.taskCode}</p>
          </div>
          <Button onClick={onClose} type="button" variant="outline">
            Close
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input id="title" required value={form.title} onChange={(event) => updateField("title", event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <select
              className="h-11 w-full rounded-md border bg-background px-3 text-sm"
              value={form.status}
              onChange={(event) => updateField("status", event.target.value as TaskStatus)}
            >
              {taskStatuses.map((status) => (
                <option key={status}>{status}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label>Priority</Label>
            <select
              className="h-11 w-full rounded-md border bg-background px-3 text-sm"
              value={form.priority}
              onChange={(event) => updateField("priority", event.target.value as TaskFormInput["priority"])}
            >
              {taskPriorities.map((priority) => (
                <option key={priority}>{priority}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label>Assignee</Label>
            <select
              className="h-11 w-full rounded-md border bg-background px-3 text-sm"
              value={form.assignee}
              onChange={(event) => updateField("assignee", event.target.value)}
            >
              {teamMembers.map((member) => (
                <option key={member}>{member}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label>Reporter</Label>
            <select
              className="h-11 w-full rounded-md border bg-background px-3 text-sm"
              value={form.reporter}
              onChange={(event) => updateField("reporter", event.target.value)}
            >
              {teamMembers.map((member) => (
                <option key={member}>{member}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="labels">Labels</Label>
            <Input
              id="labels"
              placeholder="Frontend, AI, Bug"
              value={form.labels.join(", ")}
              onChange={(event) => updateField("labels", parseList(event.target.value))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="startDate">Start Date</Label>
            <Input id="startDate" type="date" value={form.startDate} onChange={(event) => updateField("startDate", event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dueDate">Due Date</Label>
            <Input id="dueDate" type="date" value={form.dueDate} onChange={(event) => updateField("dueDate", event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="estimatedHours">Estimated Hours</Label>
            <Input
              id="estimatedHours"
              min={0}
              type="number"
              value={form.estimatedHours}
              onChange={(event) => updateField("estimatedHours", Number(event.target.value))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="actualHours">Actual Hours</Label>
            <Input
              id="actualHours"
              min={0}
              type="number"
              value={form.actualHours}
              onChange={(event) => updateField("actualHours", Number(event.target.value))}
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="description">Description</Label>
            <textarea
              className="min-h-24 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              id="description"
              value={form.description}
              onChange={(event) => updateField("description", event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="attachments">Attachments</Label>
            <Input
              id="attachments"
              placeholder="brief.pdf, screenshot.png"
              value={form.attachments.map((item) => item.name).join(", ")}
              onChange={(event) =>
                updateField(
                  "attachments",
                  parseList(event.target.value).map((name) => ({ name, type: "File", size: "Pending" })),
                )
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notifications">Notifications</Label>
            <Input
              id="notifications"
              placeholder="Due soon, Needs review"
              value={form.notifications.join(", ")}
              onChange={(event) => updateField("notifications", parseList(event.target.value))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="comments">Comments</Label>
            <Input
              id="comments"
              placeholder="Comma separated comments"
              value={form.comments.map((item) => item.message).join(", ")}
              onChange={(event) =>
                updateField(
                  "comments",
                  parseList(event.target.value).map((message, index) => ({
                    id: `comment-${index}`,
                    author: form.reporter,
                    message,
                    createdAt: new Date().toISOString().slice(0, 10),
                  })),
                )
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="checklist">Checklist</Label>
            <Input
              id="checklist"
              placeholder="Design, Build, Review"
              value={form.checklist.map((item) => item.title).join(", ")}
              onChange={(event) =>
                updateField(
                  "checklist",
                  parseList(event.target.value).map((title, index) => ({
                    id: `checklist-${index}`,
                    title,
                    done: false,
                  })),
                )
              }
            />
          </div>
          <div className="flex items-center gap-3 rounded-lg border bg-muted/35 p-4">
            <input
              checked={form.recurring}
              className="h-4 w-4 accent-primary"
              id="recurring"
              onChange={(event) => updateField("recurring", event.target.checked)}
              type="checkbox"
            />
            <Label htmlFor="recurring">Recurring Task</Label>
          </div>
          <div className="space-y-2">
            <Label htmlFor="recurrence">Recurrence</Label>
            <select
              className="h-11 w-full rounded-md border bg-background px-3 text-sm"
              id="recurrence"
              value={form.recurrence}
              onChange={(event) => updateField("recurrence", event.target.value)}
            >
              {["None", "Daily", "Weekly", "Monthly", "Quarterly"].map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Button onClick={onClose} type="button" variant="outline">
            Cancel
          </Button>
          <Button type="submit">{initialTask ? "Save Task" : "Create Task"}</Button>
        </div>
      </motion.form>
    </div>
  );
}

function TaskCard({
  task,
  onDelete,
  onEdit,
  onLogTime,
  onToggleChecklist,
  onDragStart,
}: {
  task: Task;
  onDelete: () => void;
  onEdit: () => void;
  onLogTime: () => void;
  onToggleChecklist: (itemId: string) => void;
  onDragStart?: () => void;
}) {
  const completion = getTaskCompletion(task);
  const timePercent = task.estimatedHours > 0 ? Math.min(100, Math.round((task.actualHours / task.estimatedHours) * 100)) : 0;

  return (
    <motion.article
      animate={{ opacity: 1, y: 0 }}
      className="rounded-lg border bg-background/70 p-5 shadow-sm transition-all hover:-translate-y-1 hover:border-primary/40 hover:shadow-glass"
      draggable={Boolean(onDragStart)}
      initial={{ opacity: 0, y: 14 }}
      onDragStart={onDragStart}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-xs font-semibold text-primary">{task.taskCode}</p>
            {task.recurring && (
              <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                <Repeat2 className="h-3 w-3" />
                {task.recurrence}
              </span>
            )}
          </div>
          <h3 className="mt-2 text-base leading-7 font-bold line-clamp-2">{task.title}</h3>
        </div>
        <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground" />
      </div>
      <p className="mt-2 text-sm leading-6 text-muted-foreground line-clamp-2">{task.description}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", statusClass(task.status))}>{task.status}</span>
        <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", priorityClass(task.priority))}>{task.priority}</span>
        {task.recurring && (
          <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground">
            <Repeat2 className="h-3 w-3" />
            {task.recurrence}
          </span>
        )}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {task.labels.map((label) => (
          <span className="rounded-full border bg-card/70 px-2 py-1 text-xs text-muted-foreground" key={label}>
            {label}
          </span>
        ))}
      </div>
      <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <p className="text-xs text-muted-foreground">Assignee</p>
          <p className="mt-1 truncate font-semibold">{task.assignee}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Due Date</p>
          <p className="mt-1 font-semibold">{task.dueDate}</p>
        </div>
      </div>
      <div className="mt-4 space-y-3">
        <div>
          <div className="mb-2 flex justify-between text-xs">
            <span className="text-muted-foreground">Checklist</span>
            <span className="font-semibold">{completion}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary" style={{ width: `${completion}%` }} />
          </div>
        </div>
        <div>
          <div className="mb-2 flex justify-between text-xs">
            <span className="text-muted-foreground">Time Tracking</span>
            <span className="font-semibold">
              {formatHours(task.actualHours)} / {formatHours(task.estimatedHours)}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-emerald-500" style={{ width: `${timePercent}%` }} />
          </div>
        </div>
      </div>
      {task.checklist.length > 0 && (
        <div className="mt-4 space-y-2">
          {task.checklist.slice(0, 3).map((item) => (
            <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground" key={item.id}>
              <input
                checked={item.done}
                className="h-3.5 w-3.5 accent-primary"
                onChange={() => onToggleChecklist(item.id)}
                type="checkbox"
              />
              <span className={cn(item.done && "line-through")}>{item.title}</span>
            </label>
          ))}
        </div>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        <Button onClick={onEdit} size="sm" type="button" variant="outline">
          <Edit3 className="h-4 w-4" />
          Edit
        </Button>
        <Button onClick={onLogTime} size="sm" type="button" variant="outline">
          <Timer className="h-4 w-4" />
          Log 1h
        </Button>
        <Button onClick={onDelete} size="sm" type="button" variant="outline">
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </motion.article>
  );
}

function CalendarView({ tasks }: { tasks: Task[] }) {
  const sortedTasks = [...tasks].sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {sortedTasks.map((task) => (
        <Card className="glass" key={task.id}>
          <CardContent className="p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <CalendarDays className="h-5 w-5 text-primary" />
              <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", priorityClass(task.priority))}>{task.priority}</span>
            </div>
            <p className="font-semibold leading-6">{task.title}</p>
            <p className="mt-2 text-sm text-muted-foreground">
              {task.startDate} to {task.dueDate}
            </p>
            <p className="mt-3 text-xs font-semibold text-primary">{task.assignee}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function TimelineView({ tasks }: { tasks: Task[] }) {
  return (
    <Card className="glass">
      <CardContent className="space-y-4 p-5">
        {[...tasks]
          .sort((a, b) => a.startDate.localeCompare(b.startDate))
          .map((task) => {
            const completion = getTaskCompletion(task);
            return (
              <div className="grid gap-3 rounded-lg border bg-background/65 p-4 lg:grid-cols-[220px_1fr_140px]" key={task.id}>
                <div>
                  <p className="text-sm font-semibold">{task.startDate}</p>
                  <p className="mt-1 text-xs text-muted-foreground">Due {task.dueDate}</p>
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold">{task.title}</p>
                    <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", statusClass(task.status))}>{task.status}</span>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${completion}%` }} />
                  </div>
                </div>
                <div className="text-sm lg:text-right">
                  <p className="font-semibold">{task.assignee}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{formatHours(task.actualHours)} tracked</p>
                </div>
              </div>
            );
          })}
      </CardContent>
    </Card>
  );
}

export function TasksPage() {
  const { confirm } = useConfirm();
  const { toast } = useToast();
  const [tasks, setTasks] = useState(seedTasks);
  const [view, setView] = useState<TaskView>("kanban");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("All");
  const [priority, setPriority] = useState("All");
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);

  const filteredTasks = useMemo(() => {
    return tasks
      .filter((task) => {
        const searchText = `${task.title} ${task.description} ${task.assignee} ${task.reporter} ${task.labels.join(" ")}`.toLowerCase();
        return searchText.includes(search.toLowerCase());
      })
      .filter((task) => status === "All" || task.status === status)
      .filter((task) => priority === "All" || task.priority === priority);
  }, [priority, search, status, tasks]);

  const stats = getTaskStats(tasks);
  const latestActivities = tasks.flatMap((task) => task.activityLogs.map((log) => ({ ...log, task: task.title }))).slice(0, 6);
  const notifications = tasks.flatMap((task) => task.notifications.map((title) => ({ id: `${task.id}-${title}`, title, task: task.title }))).slice(0, 6);

  const upsertTask = (input: TaskFormInput) => {
    if (editingTask) {
      setTasks((current) =>
        current.map((task) =>
          task.id === editingTask.id
            ? {
                ...task,
                ...input,
                updatedAt: new Date().toISOString().slice(0, 10),
                activityLogs: [{ id: `activity-${Date.now()}`, title: "Task updated", time: "Now" }, ...task.activityLogs],
              }
            : task,
        ),
      );
    } else {
      setTasks((current) => [createTaskFromInput(input, current), ...current]);
    }
    setEditingTask(null);
    setIsCreating(false);
  };

  const deleteTask = async (id: string) => {
    const accepted = await confirm({
      title: "Delete task?",
      description: "This task will be removed from the current workspace view.",
      confirmLabel: "Delete Task",
      tone: "danger",
    });
    if (accepted) {
      setTasks((current) => current.filter((task) => task.id !== id));
      toast({ title: "Task deleted", description: "The task was removed from the workspace view.", type: "warning" });
    }
  };

  const updateTaskStatus = (id: string, nextStatus: TaskStatus) => {
    setTasks((current) =>
      current.map((task) =>
        task.id === id
          ? {
              ...task,
              status: nextStatus,
              updatedAt: new Date().toISOString().slice(0, 10),
              activityLogs: [{ id: `activity-${Date.now()}`, title: `Moved to ${nextStatus}`, time: "Now" }, ...task.activityLogs],
              notifications: nextStatus === "Review" ? ["Review requested", ...task.notifications] : task.notifications,
            }
          : task,
      ),
    );
  };

  const toggleChecklist = (taskId: string, itemId: string) => {
    setTasks((current) =>
      current.map((task) =>
        task.id === taskId
          ? {
              ...task,
              checklist: task.checklist.map((item) => (item.id === itemId ? { ...item, done: !item.done } : item)),
              activityLogs: [{ id: `activity-${Date.now()}`, title: "Checklist updated", time: "Now" }, ...task.activityLogs],
            }
          : task,
      ),
    );
  };

  const logTime = (taskId: string) => {
    setTasks((current) =>
      current.map((task) =>
        task.id === taskId
          ? {
              ...task,
              actualHours: task.actualHours + 1,
              timeEntries: [
                { id: `time-${Date.now()}`, user: task.assignee, hours: 1, note: "Manual time entry", createdAt: new Date().toISOString().slice(0, 10) },
                ...task.timeEntries,
              ],
              activityLogs: [{ id: `activity-${Date.now()}`, title: "Logged 1 hour", time: "Now" }, ...task.activityLogs],
            }
          : task,
      ),
    );
  };

  const statCards = [
    { label: "Total Tasks", value: stats.total, icon: ListChecks },
    { label: "Active Tasks", value: stats.active, icon: ClipboardCheck },
    { label: "Due Soon", value: stats.dueSoon, icon: AlarmClock },
    { label: "Overdue", value: stats.overdue, icon: Bell },
    { label: "Tracked Hours", value: formatHours(stats.tracked), icon: Clock3 },
];

  return (
    <main className="min-h-screen bg-enterprise">
      <header className="sticky top-0 z-40 border-b bg-background/78 backdrop-blur-xl">
        <div className="container flex min-h-16 flex-wrap items-center justify-between gap-3 py-3">
          <div>
            <p className="text-sm font-semibold text-primary">Task Management & Execution</p>
            <h1 className="text-2xl font-bold">Task Control Center</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild type="button" variant="outline">
              <Link to="/dashboard">Dashboard</Link>
            </Button>
            <ThemeToggle />
            <Button onClick={() => setIsCreating(true)} type="button">
              <Plus className="h-4 w-4" />
              Create Task
            </Button>
          </div>
        </div>
      </header>

      <div className="container grid gap-6 py-6 xl:grid-cols-[1fr_320px]">
        <section className="min-w-0 space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            {statCards.map((card, index) => {
              const Icon = card.icon;
              return (
                <motion.div animate={{ opacity: 1, y: 0 }} initial={{ opacity: 0, y: 16 }} key={card.label} transition={{ delay: index * 0.04 }}>
                  <Card className="glass h-full">
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
                  <Input
                    className="pl-9"
                    placeholder="Search tasks, labels, assignees..."
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                  />
                </div>
                <select className="h-11 rounded-md border bg-background/75 px-3 text-sm" value={status} onChange={(event) => setStatus(event.target.value)}>
                  <option>All</option>
                  {taskStatuses.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
                <select className="h-11 rounded-md border bg-background/75 px-3 text-sm" value={priority} onChange={(event) => setPriority(event.target.value)}>
                  <option>All</option>
                  {taskPriorities.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
                <div className="flex flex-wrap gap-2">
                  {(["kanban", "list", "calendar", "timeline"] as TaskView[]).map((item) => (
                    <Button key={item} onClick={() => setView(item)} type="button" variant={view === item ? "default" : "outline"}>
                      {item === "kanban" && <ClipboardCheck className="h-4 w-4" />}
                      {item === "list" && <LayoutList className="h-4 w-4" />}
                      {item === "calendar" && <CalendarDays className="h-4 w-4" />}
                      {item === "timeline" && <Clock3 className="h-4 w-4" />}
                      {item}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {taskLabels.map((label) => (
                  <button
                    className="rounded-full border bg-background/60 px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
                    key={label}
                    onClick={() => setSearch(label)}
                    type="button"
                  >
                    {label}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {view === "kanban" && (
            filteredTasks.length === 0 ? (
              <EmptyState
                action={{ label: "Create Task", onClick: () => setIsCreating(true) }}
                description="No tasks match the current filters. Clear your search or create a task to get moving."
                icon={ListChecks}
                title="No tasks found"
              />
            ) : (
            <div className="grid gap-4 xl:grid-cols-5">
              {taskStatuses.map((column) => (
                <Card
                  className="glass min-h-[360px]"
                  key={column}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={() => {
                    if (draggingTaskId) {
                      updateTaskStatus(draggingTaskId, column);
                      setDraggingTaskId(null);
                    }
                  }}
                >
                  <CardHeader className="p-4">
                    <div className="flex items-center justify-between gap-3">
                      <CardTitle className="text-base">{statusLabels[column]}</CardTitle>
                      <span className="rounded-full bg-muted px-2 py-1 text-xs font-semibold text-muted-foreground">
                        {filteredTasks.filter((task) => task.status === column).length}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3 p-4 pt-0">
                    {filteredTasks
                      .filter((task) => task.status === column)
                      .map((task) => (
                        <TaskCard
                          key={task.id}
                          onDelete={() => deleteTask(task.id)}
                          onDragStart={() => setDraggingTaskId(task.id)}
                          onEdit={() => setEditingTask(task)}
                          onLogTime={() => logTime(task.id)}
                          onToggleChecklist={(itemId) => toggleChecklist(task.id, itemId)}
                          task={task}
                        />
                      ))}
                  </CardContent>
                </Card>
              ))}
            </div>
            )
          )}

          {view === "list" && (
            <Card className="glass overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[980px] text-sm">
                  <thead className="border-b bg-muted/40 text-left">
                    <tr>
                      <th className="p-4">Task</th>
                      <th className="p-4">Status</th>
                      <th className="p-4">Priority</th>
                      <th className="p-4">Assignee</th>
                      <th className="p-4">Reporter</th>
                      <th className="p-4">Due Date</th>
                      <th className="p-4">Hours</th>
                      <th className="p-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTasks.map((task) => (
                      <tr className="border-b" key={task.id}>
                        <td className="p-4">
                          <p className="font-semibold">{task.title}</p>
                          <p className="mt-1 text-xs text-primary">{task.taskCode}</p>
                        </td>
                        <td className="p-4">
                          <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", statusClass(task.status))}>{task.status}</span>
                        </td>
                        <td className="p-4">
                          <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", priorityClass(task.priority))}>{task.priority}</span>
                        </td>
                        <td className="p-4">{task.assignee}</td>
                        <td className="p-4">{task.reporter}</td>
                        <td className="p-4">{task.dueDate}</td>
                        <td className="p-4">
                          {formatHours(task.actualHours)} / {formatHours(task.estimatedHours)}
                        </td>
                        <td className="p-4">
                          <div className="flex gap-2">
                            <Button onClick={() => setEditingTask(task)} size="sm" type="button" variant="outline">
                              Edit
                            </Button>
                            <Button onClick={() => deleteTask(task.id)} size="sm" type="button" variant="outline">
                              Delete
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {view === "calendar" && <CalendarView tasks={filteredTasks} />}
          {view === "timeline" && <TimelineView tasks={filteredTasks} />}
        </section>

        <aside className="space-y-4">
          <Card className="glass">
            <CardHeader>
              <CardTitle>Notifications</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {notifications.map((item) => (
                <div className="rounded-lg border bg-background/65 p-3" key={item.id}>
                  <p className="text-sm font-semibold leading-6">{item.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{item.task}</p>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card className="glass">
            <CardHeader>
              <CardTitle>Activity Logs</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {latestActivities.map((item) => (
                <div className="rounded-lg border bg-background/65 p-3" key={item.id}>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold leading-6">{item.title}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {item.task} - {item.time}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card className="bg-foreground text-background dark:bg-white dark:text-slate-950">
            <CardContent className="p-5">
              <Timer className="mb-4 h-5 w-5" />
              <p className="text-sm font-semibold">Time Tracking</p>
              <p className="mt-2 text-3xl font-bold">{formatHours(stats.tracked)}</p>
              <p className="mt-2 text-sm opacity-75">Logged across active work.</p>
            </CardContent>
          </Card>
        </aside>
      </div>

      {(isCreating || editingTask) && (
        <TaskFormModal
          initialTask={editingTask}
          onClose={() => {
            setIsCreating(false);
            setEditingTask(null);
          }}
          onSubmit={upsertTask}
          taskCode={generateTaskCode(tasks)}
        />
      )}
    </main>
  );
}
