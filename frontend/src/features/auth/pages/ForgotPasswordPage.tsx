import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { ArrowRight, MailCheck, TriangleAlert } from "lucide-react";
import { useState } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { Link } from "react-router-dom";
import { getApiBaseUrl } from "@shared/lib/env";
import { Button } from "@shared/ui/button";
import { AuthFormField } from "@shared/auth/components/AuthFormField";
import { AuthLayout } from "@shared/auth/components/AuthLayout";
import {
  forgotPasswordSchema,
  type ForgotPasswordFormValues,
} from "@shared/auth/schemas";

export function ForgotPasswordPage() {
  const [sentEmail, setSentEmail] = useState("");
  const [error, setError] = useState("");
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
    setError("");
    try {
      const res = await fetch(`${getApiBaseUrl()}/auth/reset-password/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: values.email }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { message?: string }).message ?? "Unable to send reset link. Please try again.");
      }

      setSentEmail(values.email);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    }
  };

  return (
    <AuthLayout
      eyebrow="Recovery"
      subtitle="Enter your work email and we will prepare a secure reset link."
      title="Reset access safely"
    >
      {error && (
        <motion.div
          animate={{ opacity: 1, y: 0 }}
          className="mb-5 flex items-start gap-3 rounded-md border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive"
          initial={{ opacity: 0, y: -8 }}
          role="alert"
        >
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </motion.div>
      )}

      {sentEmail ? (
        <motion.div
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
          initial={{ opacity: 0, y: -8 }}
        >
          <div className="flex items-start gap-3 rounded-md border border-primary/20 bg-primary/10 p-4 text-sm text-primary">
            <MailCheck className="mt-0.5 h-5 w-5 shrink-0" />
            <div className="space-y-1">
              <p className="font-semibold">Reset link prepared</p>
              <p className="text-muted-foreground">
                If <span className="font-medium text-foreground">{sentEmail}</span> is registered,
                a reset link has been sent. Check your inbox or ask your Administrator for the link.
              </p>
            </div>
          </div>
          <p className="text-center text-sm text-muted-foreground">
            Link expires in <span className="font-semibold text-foreground">15 minutes</span>.
          </p>
          <p className="text-center text-sm text-muted-foreground">
            Back to{" "}
            <Link className="font-semibold text-primary hover:underline" to="/login">
              login
            </Link>
          </p>
        </motion.div>
      ) : (
        <>
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
        </>
      )}
    </AuthLayout>
  );
}
