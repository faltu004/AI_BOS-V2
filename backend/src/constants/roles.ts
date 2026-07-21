export const userRoles = ["Admin", "CEO", "Manager", "HR", "Employee"] as const;

export type UserRole = (typeof userRoles)[number];

export const roleHierarchy: Record<UserRole, number> = {
  Admin: 5,
  CEO: 4,
  Manager: 3,
  HR: 2,
  Employee: 1,
};
