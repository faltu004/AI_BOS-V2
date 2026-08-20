import { LoginPage as SharedLoginPage } from "@shared/auth/pages/LoginPage";
import { Link } from "react-router-dom";

const intendedFor = ["Administrator", "Owner"] as const;

export function LoginPage() {
  return (
    <SharedLoginPage
      eyebrow="Admin Console"
      allowedRoles={intendedFor}
      intendedFor={intendedFor}
      subtitle="Sign in with an Owner or Administrator account."
      title="Admin / Owner Login"
      secondaryAction={
        <p className="mt-4 text-center text-sm text-muted-foreground">
          First run?{" "}
          <Link className="font-semibold text-primary hover:underline" to="/first-owner-setup">
            Set up Owner
          </Link>
        </p>
      }
    />
  );
}
