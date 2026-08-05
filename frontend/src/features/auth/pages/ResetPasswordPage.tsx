import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { Link } from "react-router-dom";
import { Button } from "@shared/ui/button";
import { AuthFormField } from "@shared/auth/components/AuthFormField";
import { AuthLayout } from "@shared/auth/components/AuthLayout";
import { resetPasswordSchema, type ResetPasswordFormValues } from "@shared/auth/schemas";

export function ResetPasswordPage() {
 const [isReset, setIsReset] = useState(false);
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

 const onSubmit: SubmitHandler<ResetPasswordFormValues> = async () => {
 await new Promise((resolve) => setTimeout(resolve, 450));
 setIsReset(true);
 };

 return (
 <AuthLayout
 eyebrow="Reset Password"
 subtitle="Create a strong password for your AI BOS account."
 title="Set a new password"
 >
 {isReset && (
 <motion.div
 animate={{ opacity: 1, y: 0 }}
 className="mb-5 flex items-start gap-3 rounded-md border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-300"
 initial={{ opacity: 0, y: -8 }}
 >
 <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
 <span>Your password has been updated and is ready for login.</span>
 </motion.div>
 )}

 <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
 <AuthFormField
 autoComplete="new-password"
 error={errors.password}
 label="New password"
 placeholder="Create password"
 registration={{ id: "resetPassword", ...register("password") }}
 type="password"
 />

 <AuthFormField
 autoComplete="new-password"
 error={errors.confirmPassword}
 label="Confirm password"
 placeholder="Repeat password"
 registration={{ id: "resetConfirmPassword", ...register("confirmPassword") }}
 type="password"
 />

 <Button className="w-full" disabled={isSubmitting} size="lg" type="submit">
 {isSubmitting ? "Updating..." : "Update password"}
 <ArrowRight className="h-4 w-4" />
 </Button>
 </form>

 <p className="mt-6 text-center text-sm text-muted-foreground">
 Go back to{" "}
 <Link className="font-semibold text-primary hover:underline" to="/login">
 login
 </Link>
 </p>
 </AuthLayout>
 );
}
