import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { ArrowRight, TriangleAlert } from "lucide-react";
import { useState } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { clearAuthSession, login } from "@shared/auth/auth-service";
import { AuthDivider } from "@shared/auth/components/AuthDivider";
import { AuthFormField } from "@shared/auth/components/AuthFormField";
import { AuthLayout } from "@shared/auth/components/AuthLayout";
import { SocialAuthButtons } from "@shared/auth/components/SocialAuthButtons";
import { loginSchema, type LoginFormValues } from "@shared/auth/schemas";
import type { AuthRole } from "@shared/auth/types";
import { Button } from "@shared/ui/button";

type LoginPageProps = {
  redirectTo?: string;
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  /** Purely informational — tells the visitor who this portal is for. Not a picker; role always comes from the account. */
  intendedFor?: readonly AuthRole[];
  allowedRoles?: readonly AuthRole[];
  roleLabels?: Partial<Record<AuthRole, string>>;
};

export function LoginPage({
  redirectTo = "/dashboard",
  eyebrow = "Login",
  title = "Welcome back",
  subtitle = "Access your business command center.",
  intendedFor,
  allowedRoles = intendedFor,
  roleLabels,
}: LoginPageProps) {
  const [loginError, setLoginError] = useState("");
  const navigate = useNavigate();
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
      rememberMe: true,
    },
  });

  const onSubmit: SubmitHandler<LoginFormValues> = async (values) => {
    setLoginError("");
    try {
      const session = await login(values.email, values.password, values.rememberMe);
      if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(session.user.role)) {
        clearAuthSession();
        setLoginError(`This ${session.user.role} account is not allowed on this login page.`);
        return;
      }
      navigate(redirectTo);
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : "Unable to sign in. Please try again.");
    }
  };

  return (
    <AuthLayout eyebrow={eyebrow} subtitle={subtitle} title={title}>
      {intendedFor && intendedFor.length > 0 && (
        <div className="mb-5 flex flex-wrap items-center justify-center gap-2 text-center">
          <span className="text-xs font-semibold uppercase text-muted-foreground">For:</span>
          {intendedFor.map((role) => (
            <span
              className="rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary"
              key={role}
            >
              {roleLabels?.[role] ?? role}
            </span>
          ))}
        </div>
      )}

      {loginError && (
        <motion.div
          animate={{ opacity: 1, y: 0 }}
          className="mb-5 flex items-start gap-3 rounded-md border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive"
          initial={{ opacity: 0, y: -8 }}
          role="alert"
        >
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{loginError}</span>
        </motion.div>
      )}

      <SocialAuthButtons />
      <AuthDivider />

      <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
        <AuthFormField
          autoComplete="email"
          error={errors.email}
          label="Email"
          placeholder="you@company.com"
          registration={{ id: "email", ...register("email") }}
          type="email"
        />

        <AuthFormField
          autoComplete="current-password"
          error={errors.password}
          label="Password"
          placeholder="Enter your password"
          registration={{ id: "password", ...register("password") }}
          type="password"
        />

        <div className="flex items-center justify-between gap-4">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
            <input
              className="h-4 w-4 rounded border-input accent-primary"
              type="checkbox"
              {...register("rememberMe")}
            />
            Remember me
          </label>
          <Link className="text-sm font-semibold text-primary hover:underline" to="/forgot-password">
            Forgot password?
          </Link>
        </div>

        <Button className="w-full" disabled={isSubmitting} size="lg" type="submit">
          {isSubmitting ? "Signing in..." : "Login"}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </form>
    </AuthLayout>
  );
}
