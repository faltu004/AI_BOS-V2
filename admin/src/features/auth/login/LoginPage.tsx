import { LoginPage as SharedLoginPage } from "@shared/auth/pages/LoginPage";

const intendedFor = ["Administrator", "Manager"] as const;

export function LoginPage() {
  return (
    <SharedLoginPage
      eyebrow="Admin Console"
      allowedRoles={intendedFor}
      intendedFor={intendedFor}
      subtitle="Sign in with an Administrator or Manager account only."
      title="Admin / Manager Login"
    />
  );
}
