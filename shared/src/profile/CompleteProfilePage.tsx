import { zodResolver } from "@hookform/resolvers/zod";
import { ClipboardCheck } from "lucide-react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { getStoredAuthSession, refreshSession } from "@shared/auth/auth-service";
import { Button } from "@shared/ui/button";
import { Card } from "@shared/ui/card";
import { Input } from "@shared/ui/input";
import { Label } from "@shared/ui/label";
import { useToast } from "@shared/ui/toast-context";
import { completeProfile } from "./complete-profile.api";
import { completeProfileSchema, type CompleteProfileFormValues } from "./complete-profile.schema";

export function CompleteProfilePage() {
 const { toast } = useToast();
 const navigate = useNavigate();
 const session = getStoredAuthSession();

 const {
 formState: { errors, isSubmitting },
 handleSubmit,
 register,
 } = useForm<CompleteProfileFormValues>({
 resolver: zodResolver(completeProfileSchema),
 defaultValues: {
 designation: "",
 employmentType: "Full Time",
 joiningDate: "",
 dateOfBirth: "",
 gender: "Prefer not to say",
 address: "",
 emergencyContact: "",
 },
 });

 const onSubmit: SubmitHandler<CompleteProfileFormValues> = async (values) => {
 try {
 await completeProfile(values);
 await refreshSession();
 toast({ title: "Profile completed", description: "Welcome aboard! Taking you to your dashboard.", type: "success" });
 navigate("/dashboard", { replace: true });
 } catch (error) {
 toast({ title: "Could not save your profile", description: (error as Error).message, type: "error" });
 }
 };

 return (
 <main className="min-h-screen bg-background px-4 py-10 text-foreground">
 <div className="mx-auto max-w-2xl">
 <div className="mb-6 text-center">
 <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
 <ClipboardCheck className="h-5 w-5" />
 </span>
 <h1 className="mt-4 text-2xl font-bold">Complete your profile</h1>
 <p className="mt-2 text-sm text-muted-foreground">
 {session ? `Welcome, ${session.user.fullName}. ` : ""}
 Finish setting up your profile before you can access your dashboard.
 </p>
 </div>

 <Card className="p-6">
 <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
 <div className="grid gap-4 sm:grid-cols-2">
 <div className="space-y-2">
 <Label htmlFor="designation">Designation</Label>
 <Input id="designation" {...register("designation")} />
 {errors.designation && <p className="text-xs font-medium text-destructive">{errors.designation.message}</p>}
 </div>
 <div className="space-y-2">
 <Label htmlFor="employmentType">Employment type</Label>
 <select
 className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
 id="employmentType"
 {...register("employmentType")}
 >
 {["Full Time", "Part Time", "Contract", "Intern"].map((item) => (
 <option key={item} value={item}>
 {item}
 </option>
 ))}
 </select>
 {errors.employmentType && <p className="text-xs font-medium text-destructive">{errors.employmentType.message}</p>}
 </div>
 </div>

 <div className="grid gap-4 sm:grid-cols-2">
 <div className="space-y-2">
 <Label htmlFor="joiningDate">Joining date</Label>
 <Input id="joiningDate" type="date" {...register("joiningDate")} />
 {errors.joiningDate && <p className="text-xs font-medium text-destructive">{errors.joiningDate.message}</p>}
 </div>
 <div className="space-y-2">
 <Label htmlFor="dateOfBirth">Date of birth</Label>
 <Input id="dateOfBirth" type="date" {...register("dateOfBirth")} />
 {errors.dateOfBirth && <p className="text-xs font-medium text-destructive">{errors.dateOfBirth.message}</p>}
 </div>
 </div>

 <div className="space-y-2">
 <Label htmlFor="gender">Gender</Label>
 <select
 className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
 id="gender"
 {...register("gender")}
 >
 {["Male", "Female", "Other", "Prefer not to say"].map((item) => (
 <option key={item} value={item}>
 {item}
 </option>
 ))}
 </select>
 {errors.gender && <p className="text-xs font-medium text-destructive">{errors.gender.message}</p>}
 </div>

 <div className="space-y-2">
 <Label htmlFor="address">Address</Label>
 <Input id="address" {...register("address")} />
 {errors.address && <p className="text-xs font-medium text-destructive">{errors.address.message}</p>}
 </div>

 <div className="space-y-2">
 <Label htmlFor="emergencyContact">Emergency contact</Label>
 <Input id="emergencyContact" placeholder="Name and phone number" {...register("emergencyContact")} />
 {errors.emergencyContact && <p className="text-xs font-medium text-destructive">{errors.emergencyContact.message}</p>}
 </div>

 <Button className="w-full" disabled={isSubmitting} type="submit">
 {isSubmitting ? "Saving…" : "Complete profile & continue"}
 </Button>
 </form>
 </Card>
 </div>
 </main>
 );
}
