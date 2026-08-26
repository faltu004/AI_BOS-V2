import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { ArrowRight, CheckCircle2, ShieldCheck, TriangleAlert } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { Link, useNavigate, useParams } from "react-router-dom";
import { getApiBaseUrl } from "@shared/lib/env";
import { Button } from "@shared/ui/button";
import { AuthFormField } from "@shared/auth/components/AuthFormField";
import { AuthLayout } from "@shared/auth/components/AuthLayout";
import { resetPasswordSchema, type ResetPasswordFormValues } from "@shared/auth/schemas";

export function ResetPasswordPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [isReset, setIsReset] = useState(false);
  const [tokenError, setTokenError] = useState("");
  const [submitError, setSubmitError] = useState("");

  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  // Verify token validity on page load
  useEffect(() => {
    if (!token) {
      setTokenError("No reset token found. Please request a new password reset link.");
      return;
    }

    fetch(`${getApiBaseUrl()}/auth/reset-password/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          setTokenError((body as { message?: string }).message ?? "This reset link is invalid or has expired.");
        }
      })
      .catch(() => {
        setTokenError("Could not verify reset link. Check your connection and try again.");
      });
  }, [token]);

  const onSubmit: SubmitHandler<ResetPasswordFormValues> = async (values) => {
    setSubmitError("");
    try {
      const res = await fetch(`${getApiBaseUrl()}/auth/reset-password/set`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword: values.password }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { message?: string }).message ?? "Unable to update password. Please try again.");
      }

      setIsReset(true);
      // Auto-redirect to login after 3 seconds
      setTimeout(() => navigate("/login"), 3000);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    }
  };

  return (
    <AuthLayout
      eyebrow="Reset Password"
      subtitle="Create a strong new password for your AI BOS account."
      title="Set a new password"
    >
      {/* Token error state */}
      {tokenError && (
        <motion.div
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
          initial={{ opacity: 0, y: -8 }}
        >
          <div className="flex items-start gap-3 rounded-md border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
            <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0" />
            <div className="space-y-1">
              <p className="font-semibold">Invalid reset link</p>
              <p>{tokenError}</p>
            </div>
          </div>
          <p className="text-center text-sm text-muted-foreground">
            <Link className="font-semibold text-primary hover:underline" to="/forgot-password">
              Request a new reset link
            </Link>
          </p>
        </motion.div>
      )}

      {/* Success state */}
      {isReset && (
        <motion.div
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
          initial={{ opacity: 0, y: -8 }}
        >
          <div className="flex items-start gap-3 rounded-md border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-700 dark:text-emerald-300">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
            <div className="space-y-1">
              <p className="font-semibold">Password updated successfully!</p>
              <p>Your new password is active. Redirecting to login...</p>
            </div>
          </div>
          <p className="text-center text-sm text-muted-foreground">
            <Link className="font-semibold text-primary hover:underline" to="/login">
              Go to login now
            </Link>
          </p>
        </motion.div>
      )}

      {/* Form — only shown when token is valid and not yet reset */}
      {!tokenError && !isReset && (
        <>
          <div className="mb-5 flex items-center gap-2 rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-muted-foreground">
            <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
            <span>This link is valid for <span className="font-semibold text-foreground">15 minutes</span> and can only be used once.</span>
          </div>

          {submitError && (
            <motion.div
              animate={{ opacity: 1, y: 0 }}
              className="mb-5 flex items-start gap-3 rounded-md border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive"
              initial={{ opacity: 0, y: -8 }}
              role="alert"
            >
              <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{submitError}</span>
            </motion.div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
            <AuthFormField
              autoComplete="new-password"
              error={errors.password}
              label="New password"
              placeholder="Min. 8 characters, 1 uppercase, 1 number"
              registration={{ id: "resetPassword", ...register("password") }}
              type="password"
            />

            <AuthFormField
              autoComplete="new-password"
              error={errors.confirmPassword}
              label="Confirm password"
              placeholder="Repeat your new password"
              registration={{ id: "resetConfirmPassword", ...register("confirmPassword") }}
              type="password"
            />

            <Button className="w-full" disabled={isSubmitting} size="lg" type="submit">
              {isSubmitting ? "Updating password..." : "Update password"}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Go back to{" "}
            <Link className="font-semibold text-primary hover:underline" to="/login">
              login
            </Link>
          </p>
        </>
      )}
    </AuthLayout>
  );
}
