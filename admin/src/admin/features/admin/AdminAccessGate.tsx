import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { getStoredAuthSession } from "@shared/auth/auth-service";
import { AccessDenied } from "@shared/auth/access-control";
import { fetchModuleAccess } from "@shared/lib/module-access.api";

/**
 * The Owner can disable the Administrator's Admin Panel access from the CEO portal.
 * Owner itself is never blocked by this — only Administrator is subject to the toggle.
 */
export function AdminAccessGate({ children }: { children: ReactNode }) {
  const session = getStoredAuthSession();
  const isOwner = session?.user.role === "Owner";
  const [status, setStatus] = useState<"checking" | "allowed" | "blocked">(isOwner ? "allowed" : "checking");

  useEffect(() => {
    if (isOwner) return;
    let cancelled = false;

    fetchModuleAccess().then((access) => {
      if (cancelled) return;
      setStatus(!access || access.adminPanelEnabled ? "allowed" : "blocked");
    });

    return () => {
      cancelled = true;
    };
  }, [isOwner]);

  if (status === "checking") {
    return <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">Checking access…</div>;
  }

  if (status === "blocked") {
    return <AccessDenied message="The Owner has disabled Administrator access to the Admin Panel. Contact the Owner to have it re-enabled." />;
  }

  return <>{children}</>;
}
