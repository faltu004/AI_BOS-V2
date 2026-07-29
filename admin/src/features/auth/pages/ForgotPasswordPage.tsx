import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { ArrowRight, MailCheck } from "lucide-react";
import { useState } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { Link } from "react-router-dom";
import { Button } from "@shared/ui/button";
import { AuthFormField } from "@shared/auth/components/AuthFormField";
import { AuthLayout } from "@shared/auth/components/AuthLayout";
import {
  forgotPasswordSchema,
  type ForgotPasswordFormValues,
} from "@shared/auth/schemas";

export function ForgotPasswordPage() {
  const [sentEmail, setSentEmail] = useState("");
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  const onSubmit: SubmitHandler<ForgotPasswordFormValues> = async (values) => {
    await new Promise((resolve) => setTimeout(resolve, 450));
    setSentEmail(values.email);
  };

  return (
    <AuthLayout
      eyebrow="Recovery"
      subtitle="Enter your work email and we will prepare a secure reset link."
      title="Reset access safely"
    >
      {sentEmail && (
        <motion.div
          animate={{ opacity: 1, y: 0 }}
          className="mb-5 flex items-start gap-3 rounded-md border border-primary/20 bg-primary/10 p-3 text-sm text-primary"
          initial={{ opacity: 0, y: -8 }}
        >
          <MailCheck className="mt-0.5 h-4 w-4 shrink-0" />
          <span>Reset instructions are ready for {sentEmail}.</span>
        </motion.div>
      )}

      <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
        <AuthFormField
          autoComplete="email"
          error={errors.email}
          label="Email"
          placeholder="you@company.com"
          registration={{ id: "forgotEmail", ...register("email") }}
          type="email"
        />

        <Button className="w-full" disabled={isSubmitting} size="lg" type="submit">
          {isSubmitting ? "Preparing link..." : "Send reset link"}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Remember your password?{" "}
        <Link className="font-semibold text-primary hover:underline" to="/login">
          Back to login
        </Link>
      </p>
    </AuthLayout>
  );
}
