import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { AuthDivider } from "../components/AuthDivider";
import { AuthFormField } from "../components/AuthFormField";
import { AuthLayout } from "../components/AuthLayout";
import { RoleSelector } from "../components/RoleSelector";
import { SocialAuthButtons } from "../components/SocialAuthButtons";
import { persistAuthIntent } from "../auth-service";
import { registerSchema, type RegisterFormValues } from "../schemas";

export function RegisterPage() {
  const [createdEmail, setCreatedEmail] = useState("");
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    watch,
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: "",
      companyName: "",
      email: "",
      role: "CEO",
      password: "",
      confirmPassword: "",
      acceptTerms: false,
    },
  });

  const onSubmit: SubmitHandler<RegisterFormValues> = async (values) => {
    await new Promise((resolve) => setTimeout(resolve, 500));
    persistAuthIntent({
      email: values.email,
      role: values.role,
      rememberMe: true,
    });
    setCreatedEmail(values.email);
  };

  return (
    <AuthLayout
      eyebrow="Register"
      subtitle="Create your secure workspace and choose the role that matches your operating view."
      title="Start your AI BOS workspace"
    >
      {createdEmail && (
        <motion.div
          animate={{ opacity: 1, y: 0 }}
          className="mb-5 flex items-start gap-3 rounded-md border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-300"
          initial={{ opacity: 0, y: -8 }}
        >
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          <span>Workspace draft created. Verify {createdEmail} to continue.</span>
        </motion.div>
      )}

      <SocialAuthButtons />
      <AuthDivider />

      <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
        <div className="grid gap-4 sm:grid-cols-2">
          <AuthFormField
            autoComplete="name"
            error={errors.fullName}
            label="Full name"
            placeholder="Maya Chen"
            registration={{ id: "fullName", ...register("fullName") }}
          />
          <AuthFormField
            autoComplete="organization"
            error={errors.companyName}
            label="Company"
            placeholder="Acme Inc."
            registration={{ id: "companyName", ...register("companyName") }}
          />
        </div>

        <AuthFormField
          autoComplete="email"
          error={errors.email}
          label="Email"
          placeholder="you@company.com"
          registration={{ id: "registerEmail", ...register("email") }}
          type="email"
        />

        <RoleSelector
          error={errors.role}
          registration={register("role")}
          selectedRole={watch("role")}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <AuthFormField
            autoComplete="new-password"
            error={errors.password}
            label="Password"
            placeholder="Create password"
            registration={{ id: "newPassword", ...register("password") }}
            type="password"
          />
          <AuthFormField
            autoComplete="new-password"
            error={errors.confirmPassword}
            label="Confirm"
            placeholder="Repeat password"
            registration={{ id: "confirmPassword", ...register("confirmPassword") }}
            type="password"
          />
        </div>

        <div className="space-y-2">
          <label className="flex cursor-pointer items-start gap-2 text-sm text-muted-foreground">
            <input
              className="mt-0.5 h-4 w-4 rounded border-input accent-primary"
              type="checkbox"
              {...register("acceptTerms")}
            />
            <span>I agree to the AI BOS terms, privacy policy, and security notices.</span>
          </label>
          {errors.acceptTerms && (
            <p className="text-xs font-medium text-destructive">{errors.acceptTerms.message}</p>
          )}
        </div>

        <Button className="w-full" disabled={isSubmitting} size="lg" type="submit">
          {isSubmitting ? "Creating account..." : "Get Started"}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link className="font-semibold text-primary hover:underline" to="/login">
          Login
        </Link>
      </p>
    </AuthLayout>
  );
}
