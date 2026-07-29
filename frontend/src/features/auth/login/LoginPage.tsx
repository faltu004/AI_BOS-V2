import { LoginPage as SharedLoginPage } from "@shared/auth/pages/LoginPage";

const intendedFor = ["Employee", "HR", "Finance", "Sales", "Support", "Developer", "Guest"] as const;

export function LoginPage() {
  return (
    <SharedLoginPage
      eyebrow="Workspace"
      allowedRoles={intendedFor}
      intendedFor={intendedFor}
      subtitle="Sign in with Employee, HR, Sales, Finance, Support, Developer, or Guest accounts."
      title="Employee Workspace Login"
    />
  );
}
