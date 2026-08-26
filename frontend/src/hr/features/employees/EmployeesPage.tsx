import { getStoredAuthSession } from "@shared/auth/auth-service";
import { EmployeesPage as SharedEmployeesPage } from "@shared/employees";

export function EmployeesPage() {
 return <SharedEmployeesPage canCreateDepartments={getStoredAuthSession()?.user.role !== "Manager"} />;
}
