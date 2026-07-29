import { type UserRole } from "./roles.js";

/**
 * Who may create a profile for whom. Deliberately an explicit allow-list, not a
 * generic rank comparison — e.g. Manager may not create Finance/Support/Developer
 * even though those roles rank lower, so it can't be derived from Role.rank alone.
 */
export const assignableRolesByRole: Partial<Record<UserRole, UserRole[]>> = {
  Owner: ["Manager", "HR", "Employee", "Sales"],
  Administrator: ["Manager", "HR", "Employee", "Sales"],
  Manager: ["HR", "Employee", "Sales"],
  HR: ["Employee", "Sales"],
};

export function getAssignableRoles(creatorRole: string): UserRole[] {
  return assignableRolesByRole[creatorRole as UserRole] ?? [];
}
