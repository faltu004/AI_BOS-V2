import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { AuthDivider } from "../components/AuthDivider";
import { AuthFormField } from "../components/AuthFormField";
import { AuthLayout } from "../components/AuthLayout";
import { RoleSelector } from "../components/RoleSelector";
import { SocialAuthButtons } from "../components/SocialAuthButtons";
import { persistAuthIntent } from "../auth-service";
import { loginSchema, type LoginFormValues } from "./login.schema";

export function LoginPage() {
  const [submittedEmail, setSubmittedEmail] = useState("");
  const navigate = useNavigate();
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    watch,
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
      role: "Employee",
      rememberMe: true,
    },
  });

  const onSubmit: SubmitHandler<LoginFormValues> = async (values) => {
    await new Promise((resolve) => setTimeout(resolve, 450));
    persistAuthIntent(values);
    setSubmittedEmail(values.email);
    setTimeout(() => navigate("/dashboard"), 350);
  };

  return (
    <AuthLayout
      eyebrow="Login"
      subtitle="Access your business command center with role-aware authentication."
      title="Welcome back"
    >
      {submittedEmail && (
        <motion.div
          animate={{ opacity: 1, y: 0 }}
          className="mb-5 flex items-start gap-3 rounded-md border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-300"
          initial={{ opacity: 0, y: -8 }}
        >
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          <span>JWT-ready session created for {submittedEmail}.</span>
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

        <RoleSelector
          error={errors.role}
          registration={register("role")}
          selectedRole={watch("role")}
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

      <p className="mt-6 text-center text-sm text-muted-foreground">
        New to AI BOS?{" "}
        <Link className="font-semibold text-primary hover:underline" to="/register">
          Create an account
        </Link>
      </p>
    </AuthLayout>
  );
}
