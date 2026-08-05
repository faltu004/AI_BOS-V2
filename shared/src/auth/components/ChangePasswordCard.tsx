import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type SubmitHandler } from "react-hook-form";
import { z } from "zod";
import { changePassword } from "@shared/auth/auth-service";
import { Button } from "@shared/ui/button";
import { Label } from "@shared/ui/label";
import { PasswordInput } from "@shared/ui/password-input";
import { useToast } from "@shared/ui/toast-context";

const changePasswordFormSchema = z
 .object({
 currentPassword: z.string().min(1, "Enter your current password"),
 newPassword: z
 .string()
 .min(12, "Password must be at least 12 characters")
 .regex(/[A-Z]/, "Password needs one uppercase letter")
 .regex(/[a-z]/, "Password needs one lowercase letter")
 .regex(/[0-9]/, "Password needs one number")
 .regex(/[^A-Za-z0-9]/, "Password needs one special character"),
 confirmPassword: z.string().min(1, "Confirm your new password"),
 })
 .refine((data) => data.newPassword === data.confirmPassword, {
 message: "Passwords do not match",
 path: ["confirmPassword"],
 });

type ChangePasswordFormValues = z.infer<typeof changePasswordFormSchema>;

export function ChangePasswordCard() {
 const { toast } = useToast();
 const {
 formState: { errors, isSubmitting },
 handleSubmit,
 register,
 reset,
 setError,
 } = useForm<ChangePasswordFormValues>({
 resolver: zodResolver(changePasswordFormSchema),
 defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
 });

 const onSubmit: SubmitHandler<ChangePasswordFormValues> = async (values) => {
 try {
 await changePassword(values.currentPassword, values.newPassword);
 toast({ title: "Password changed", description: "Use your new password next time you sign in.", type: "success" });
 reset();
 } catch (error) {
 const message = (error as Error).message;
 if (message.toLowerCase().includes("current password")) {
 setError("currentPassword", { message }, { shouldFocus: true });
 return;
 }
 toast({ title: "Could not change password", description: message, type: "error" });
 }
 };

 return (
 <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
 <div className="space-y-2">
 <Label htmlFor="currentPassword">Current password</Label>
 <PasswordInput id="currentPassword" {...register("currentPassword")} />
 {errors.currentPassword && <p className="text-xs font-medium text-destructive">{errors.currentPassword.message}</p>}
 </div>

 <div className="grid gap-4 sm:grid-cols-2">
 <div className="space-y-2">
 <Label htmlFor="newPassword">New password</Label>
 <PasswordInput id="newPassword" {...register("newPassword")} />
 {errors.newPassword && <p className="text-xs font-medium text-destructive">{errors.newPassword.message}</p>}
 </div>
 <div className="space-y-2">
 <Label htmlFor="confirmPassword">Confirm new password</Label>
 <PasswordInput id="confirmPassword" {...register("confirmPassword")} />
 {errors.confirmPassword && <p className="text-xs font-medium text-destructive">{errors.confirmPassword.message}</p>}
 </div>
 </div>

 <Button disabled={isSubmitting} type="submit">
 {isSubmitting ? "Changing..." : "Change password"}
 </Button>
 </form>
 );
}
