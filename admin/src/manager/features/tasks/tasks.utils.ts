import type { Task, TaskFormInput, TaskPriority, TaskStatus } from "./tasks.types";

export function generateTaskCode(tasks: Task[]) {
  const nextNumber = tasks.length + 1;
  return `TSK-2026-${String(nextNumber).padStart(3, "0")}`;
}

export function createTaskFromInput(input: TaskFormInput, tasks: Task[]): Task {
  const now = new Date().toISOString().slice(0, 10);

  return {
    ...input,
    id: `task-${Date.now()}`,
    taskCode: input.taskCode ?? generateTaskCode(tasks),
    activityLogs: [{ id: `activity-${Date.now()}`, title: "Task created", time: "Now" }],
    timeEntries: [],
    createdAt: now,
    updatedAt: now,
  };
}

export function getTaskCompletion(task: Task) {
  if (task.checklist.length === 0) {
    return task.status === "Completed" ? 100 : 0;
  }

  return Math.round((task.checklist.filter((item) => item.done).length / task.checklist.length) * 100);
}

export function getTaskStats(tasks: Task[]) {
  const today = new Date("2026-07-18");
  const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

  return {
    total: tasks.length,
    active: tasks.filter((task) => !["Completed", "Todo"].includes(task.status)).length,
    overdue: tasks.filter((task) => new Date(task.dueDate) < today && task.status !== "Completed").length,
    dueSoon: tasks.filter((task) => {
      const dueDate = new Date(task.dueDate);
      return dueDate >= today && dueDate <= nextWeek && task.status !== "Completed";
    }).length,
    tracked: tasks.reduce((sum, task) => sum + task.actualHours, 0),
  };
}

export function priorityClass(priority: TaskPriority) {
  const classes: Record<TaskPriority, string> = {
    Low: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300",
    Medium: "bg-amber-500/10 text-amber-600 dark:text-amber-300",
    High: "bg-orange-500/10 text-orange-600 dark:text-orange-300",
    Critical: "bg-rose-500/10 text-rose-600 dark:text-rose-300",
  };

  return classes[priority];
}

export function statusClass(status: TaskStatus) {
  const classes: Record<TaskStatus, string> = {
    Todo: "bg-muted text-muted-foreground",
    "In Progress": "bg-primary/10 text-primary",
    Review: "bg-violet-500/10 text-violet-600 dark:text-violet-300",
    Testing: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-300",
    Completed: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300",
  };

  return classes[status];
}

export function formatHours(hours: number) {
  return `${hours.toLocaleString("en-US", { maximumFractionDigits: 1 })}h`;
}
