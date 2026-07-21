export const projectPriorities = ["Low", "Medium", "High", "Critical"] as const;

export const projectStatuses = [
  "Planning",
  "Active",
  "On Hold",
  "Completed",
  "Delayed",
  "Archived",
] as const;

export const projectCategories = [
  "Internal",
  "Client",
  "Product",
  "Operations",
  "Research",
  "Automation",
] as const;

export type ProjectPriority = (typeof projectPriorities)[number];
export type ProjectStatus = (typeof projectStatuses)[number];
export type ProjectCategory = (typeof projectCategories)[number];
