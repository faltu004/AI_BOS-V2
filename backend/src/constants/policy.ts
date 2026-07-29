export const policyCategories = [
  "HR",
  "IT",
  "Finance",
  "Compliance",
  "Conduct",
  "Leave",
  "Security",
  "General",
] as const;

export const policyStatuses = ["Draft", "Published", "Archived"] as const;

export type PolicyCategory = (typeof policyCategories)[number];
export type PolicyStatus = (typeof policyStatuses)[number];
