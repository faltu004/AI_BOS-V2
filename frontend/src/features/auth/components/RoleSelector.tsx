import type { FieldError, UseFormRegisterReturn } from "react-hook-form";
import { BriefcaseBusiness, Crown, Shield, UserRound } from "lucide-react";
import { authRoles, type AuthRole } from "../types";
import { cn } from "@/lib/utils";

const roleIcons = {
  Admin: Shield,
  CEO: Crown,
  Manager: BriefcaseBusiness,
  Employee: UserRound,
} satisfies Record<AuthRole, typeof Shield>;

type RoleSelectorProps = {
  error?: FieldError;
  registration: UseFormRegisterReturn<"role">;
  selectedRole?: AuthRole;
};

export function RoleSelector({ error, registration, selectedRole }: RoleSelectorProps) {
  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-medium">Role</p>
        <p className="mt-1 text-xs text-muted-foreground">Choose how you will access AI BOS.</p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {authRoles.map((role) => {
          const Icon = roleIcons[role];
          const isSelected = selectedRole === role;

          return (
            <label
              className={cn(
                "flex cursor-pointer items-center gap-3 rounded-md border bg-background/65 p-3 text-sm font-semibold transition-all hover:-translate-y-0.5 hover:border-primary/40",
                isSelected && "border-primary bg-primary/10 text-primary shadow-sm",
              )}
              key={role}
            >
              <input className="sr-only" type="radio" value={role} {...registration} />
              <Icon className="h-4 w-4 shrink-0" />
              <span>{role}</span>
            </label>
          );
        })}
      </div>
      {error && <p className="text-xs font-medium text-destructive">{error.message}</p>}
    </div>
  );
}
