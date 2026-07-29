export type TaskStatus = "Todo" | "In Progress" | "Review" | "Testing" | "Completed";
export type TaskPriority = "Low" | "Medium" | "High" | "Critical";
export type TaskView = "kanban" | "list" | "calendar" | "timeline";

export type TaskAttachment = {
  name: string;
  type: string;
  size: string;
};

export type TaskComment = {
  id: string;
  author: string;
  message: string;
  createdAt: string;
};

export type ChecklistItem = {
  id: string;
  title: string;
  done: boolean;
};

export type TimeEntry = {
  id: string;
  user: string;
  hours: number;
  note: string;
  createdAt: string;
};

export type ActivityLog = {
  id: string;
  title: string;
  time: string;
};

export type Task = {
  id: string;
  taskCode: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  labels: string[];
  assignee: string;
  reporter: string;
  dueDate: string;
  startDate: string;
  estimatedHours: number;
  actualHours: number;
  attachments: TaskAttachment[];
  comments: TaskComment[];
  checklist: ChecklistItem[];
  recurring: boolean;
  recurrence: string;
  activityLogs: ActivityLog[];
  notifications: string[];
  timeEntries: TimeEntry[];
  createdAt: string;
  updatedAt: string;
};

export type TaskFormInput = Omit<
  Task,
  "id" | "taskCode" | "activityLogs" | "timeEntries" | "createdAt" | "updatedAt"
> & {
  taskCode?: string;
};
