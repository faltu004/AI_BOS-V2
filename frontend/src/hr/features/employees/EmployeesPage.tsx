import { usePermissions } from "@shared/auth/usePermissions";
import { EmployeesPage as SharedEmployeesPage } from "@shared/employees";

export function EmployeesPage() {
  const { hasPermission } = usePermissions();
  return <SharedEmployeesPage canCreateDepartments={hasPermission("department.create")} />;
}
