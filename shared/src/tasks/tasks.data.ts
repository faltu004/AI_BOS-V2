import type { TaskIssueType, TaskPriority, TaskStatus } from "./tasks.types";

export const taskStatuses: TaskStatus[] = ["Todo", "In Progress", "Blocked", "Review", "Testing", "Completed"];
export const taskPriorities: TaskPriority[] = ["Low", "Medium", "High", "Critical"];
export const taskIssueTypes: TaskIssueType[] = ["Epic", "Story", "Task", "Subtask", "Bug"];
export const taskLabels = ["Frontend", "Backend", "AI", "CRM", "Finance", "HR", "Bug", "Design", "Automation"];
