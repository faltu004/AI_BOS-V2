import { LoginPage as SharedLoginPage } from "@shared/auth/pages/LoginPage";

const intendedFor = ["Owner"] as const;

export function LoginPage() {
  return (
    <SharedLoginPage
      eyebrow="Executive Access"
      allowedRoles={intendedFor}
      intendedFor={intendedFor}
      roleLabels={{ Owner: "CEO" }}
      subtitle="Sign in with the CEO account only."
      title="CEO Login"
    />
  );
}
