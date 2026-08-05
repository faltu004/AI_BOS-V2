export const taskStatuses = ["Todo", "In Progress", "Review", "Testing", "Completed"] as const;

export const taskPriorities = ["Low", "Medium", "High", "Critical"] as const;

export const taskIssueTypes = ["Epic", "Story", "Task", "Subtask", "Bug"] as const;

export type TaskStatus = (typeof taskStatuses)[number];
export type TaskPriority = (typeof taskPriorities)[number];
export type TaskIssueType = (typeof taskIssueTypes)[number];
