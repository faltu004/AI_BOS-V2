import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { AlertTriangle, LockKeyhole } from "lucide-react";
import { Button } from "@shared/ui/button";
import { Card, CardContent } from "@shared/ui/card";
import { getStoredAuthSession } from "./auth-service";
import type { AuthRole } from "./types";

export const fullAccessRoles: readonly AuthRole[] = ["Owner", "Administrator"];

export function roleHasAccess(role: AuthRole | undefined, allowedRoles: readonly AuthRole[]) {
  if (!role) return false;
  return fullAccessRoles.includes(role) || allowedRoles.includes(role);
}

export function filterByRole<T extends { roles?: readonly AuthRole[] }>(items: readonly T[], role?: AuthRole) {
  return items.filter((item) => !item.roles || roleHasAccess(role, item.roles));
}

export function getStoredAuthRole() {
  return getStoredAuthSession()?.user.role;
}

export function RequireAuth({
  allowedRoles,
  children,
  fallbackPath = "/dashboard",
  loginPath = "/login",
}: {
  allowedRoles: readonly AuthRole[];
  children: ReactNode;
  fallbackPath?: string;
  loginPath?: string;
}) {
  const location = useLocation();
  const session = getStoredAuthSession();

  if (!session) {
    return <Navigate replace state={{ from: location.pathname }} to={loginPath} />;
  }

  if (!roleHasAccess(session.user.role, allowedRoles)) {
    if (fallbackPath === location.pathname) {
      return <AccessDenied />;
    }
    return <Navigate replace to={fallbackPath} />;
  }

  return <>{children}</>;
}

export function AccessDenied({
  message = "Your role has limited access to this area.",
}: {
  message?: string;
}) {
  return (
    <main className="min-h-screen bg-background px-4 py-10 text-foreground">
      <div className="mx-auto flex min-h-[70vh] max-w-lg items-center">
        <Card className="w-full rounded-lg">
          <CardContent className="p-6 text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
              <LockKeyhole className="h-5 w-5" />
            </span>
            <h1 className="mt-5 text-2xl font-bold">Access limited</h1>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{message}</p>
            <Button className="mt-5" onClick={() => window.history.back()} type="button" variant="outline">
              <AlertTriangle className="h-4 w-4" />
              Go back
            </Button>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
