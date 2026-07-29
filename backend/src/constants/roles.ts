export const userRoles = [
  "Owner",
  "Administrator",
  "Manager",
  "HR",
  "Finance",
  "Sales",
  "Support",
  "Developer",
  "Employee",
  "Guest",
] as const;

export type UserRole = (typeof userRoles)[number];
