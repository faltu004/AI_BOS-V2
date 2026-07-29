export const departmentStatuses = ["Active", "Inactive"] as const;

export type DepartmentStatus = (typeof departmentStatuses)[number];
