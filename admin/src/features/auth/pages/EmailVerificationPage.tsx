import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { ArrowRight, BadgeCheck } from "lucide-react";
import { useState } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { Link } from "react-router-dom";
import { Button } from "@shared/ui/button";
import { AuthFormField } from "@shared/auth/components/AuthFormField";
import { AuthLayout } from "@shared/auth/components/AuthLayout";
import {
  emailVerificationSchema,
  type EmailVerificationFormValues,
} from "@shared/auth/schemas";

export function EmailVerificationPage() {
  const [verified, setVerified] = useState(false);
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
  } = useForm<EmailVerificationFormValues>({
    resolver: zodResolver(emailVerificationSchema),
    defaultValues: {
      code: "",
    },
  });

  const onSubmit: SubmitHandler<EmailVerificationFormValues> = async () => {
    await new Promise((resolve) => setTimeout(resolve, 450));
    setVerified(true);
  };

  return (
    <AuthLayout
      eyebrow="Verification"
      subtitle="Confirm the code sent to your business email to activate your workspace."
      title="Verify your email"
    >
      {verified && (
        <motion.div
          animate={{ opacity: 1, y: 0 }}
          className="mb-5 flex items-start gap-3 rounded-md border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-300"
          initial={{ opacity: 0, y: -8 }}
        >
          <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0" />
          <span>Email verified. Your workspace can now be activated.</span>
        </motion.div>
      )}

      <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
        <AuthFormField
          autoComplete="one-time-code"
          error={errors.code}
          label="Verification code"
          placeholder="123456"
          registration={{ id: "verificationCode", inputMode: "numeric", ...register("code") }}
        />

        <Button className="w-full" disabled={isSubmitting} size="lg" type="submit">
          {isSubmitting ? "Verifying..." : "Verify email"}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </form>

      <div className="mt-6 flex flex-col items-center gap-2 text-sm text-muted-foreground sm:flex-row sm:justify-center">
        <button className="font-semibold text-primary hover:underline" type="button">
          Resend code
        </button>
        <span className="hidden sm:inline">-</span>
        <Link className="font-semibold text-primary hover:underline" to="/login">
          Back to login
        </Link>
      </div>
    </AuthLayout>
  );
}
