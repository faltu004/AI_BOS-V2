import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";
import { Button } from "@shared/ui/button";
import { Card } from "@shared/ui/card";
import { Input } from "@shared/ui/input";
import { Label } from "@shared/ui/label";
import { PasswordInput } from "@shared/ui/password-input";
import { createFirstOwner, fetchOwnerBootstrapStatus } from "./account-security.api";

const schema = z
  .object({
    fullName: z.string().min(2, "Enter Owner full name"),
    email: z.string().email("Enter a valid email"),
    password: z.string().min(12, "Password must be at least 12 characters"),
    confirmPassword: z.string().min(1, "Confirm password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type FormValues = z.infer<typeof schema>;

export function FirstOwnerSetupPage() {
  const navigate = useNavigate();
  const [available, setAvailable] = useState<boolean | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  useEffect(() => {
    fetchOwnerBootstrapStatus()
      .then((status) => setAvailable(status.available))
      .catch((error: Error) => {
        setAvailable(false);
        setMessage(error.message);
      });
  }, []);

  const onSubmit: SubmitHandler<FormValues> = async (values) => {
    setMessage(null);
    try {
      await createFirstOwner(values);
      setMessage("Owner account created. Sign in with the credentials entered here.");
      window.setTimeout(() => navigate("/login", { replace: true }), 1200);
    } catch (error) {
      setMessage((error as Error).message);
    }
  };

  return (
    <main className="min-h-screen bg-background px-4 py-10 text-foreground">
      <div className="mx-auto max-w-xl">
        <Button asChild className="mb-6" variant="ghost">
          <Link to="/login">
            <ArrowLeft className="h-4 w-4" />
            Admin login
          </Link>
        </Button>
        <div className="mb-6 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <ShieldCheck className="h-5 w-5" />
          </span>
          <h1 className="mt-4 text-2xl font-bold">First Owner setup</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            This local setup is available only until the first Owner account exists.
          </p>
        </div>

        <Card className="p-6">
          {available === false ? (
            <p className="text-sm text-muted-foreground">{message ?? "First Owner setup is closed."}</p>
          ) : (
            <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
              <div className="space-y-2">
                <Label htmlFor="ownerName">Owner full name</Label>
                <Input id="ownerName" {...register("fullName")} />
                {errors.fullName && <p className="text-xs text-destructive">{errors.fullName.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="ownerEmail">Email</Label>
                <Input id="ownerEmail" type="email" {...register("email")} />
                {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="ownerPassword">Password</Label>
                  <PasswordInput id="ownerPassword" {...register("password")} />
                  {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ownerConfirmPassword">Confirm password</Label>
                  <PasswordInput id="ownerConfirmPassword" {...register("confirmPassword")} />
                  {errors.confirmPassword && <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>}
                </div>
              </div>
              {message && <p className="rounded-lg border bg-muted px-3 py-2 text-sm">{message}</p>}
              <Button className="w-full" disabled={available !== true || isSubmitting} type="submit">
                {isSubmitting ? "Creating..." : "Create Owner"}
              </Button>
            </form>
          )}
        </Card>
      </div>
    </main>
  );
}
