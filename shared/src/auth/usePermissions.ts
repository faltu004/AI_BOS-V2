import { useEffect, useState } from "react";
import { authSessionChangedEvent, getStoredAuthSession } from "./auth-service";
import type { AuthRole, JwtReadySession } from "./types";

export type UsePermissionsReturn = {
  role: AuthRole | null;
  permissions: string[];
  hasPermission: (key: string) => boolean;
  hasAnyPermission: (...keys: string[]) => boolean;
  hasAllPermissions: (...keys: string[]) => boolean;
};

export function usePermissions(): UsePermissionsReturn {
  const [session, setSession] = useState<JwtReadySession | null>(() => getStoredAuthSession());

  useEffect(() => {
    const handleAuthChange = () => {
      setSession(getStoredAuthSession());
    };

    window.addEventListener(authSessionChangedEvent, handleAuthChange);
    window.addEventListener("storage", handleAuthChange);
    return () => {
      window.removeEventListener(authSessionChangedEvent, handleAuthChange);
      window.removeEventListener("storage", handleAuthChange);
    };
  }, []);

  const role = session?.user?.role ?? null;
  const permissions = session?.user?.permissions ?? [];
  const isFullAccessRole = role === "Owner" || role === "Administrator";

  const hasPermission = (key: string): boolean => {
    if (!role) return false;
    if (isFullAccessRole) return true;
    return permissions.includes(key);
  };

  const hasAnyPermission = (...keys: string[]): boolean => {
    if (!role) return false;
    if (isFullAccessRole) return true;
    return keys.some((k) => permissions.includes(k));
  };

  const hasAllPermissions = (...keys: string[]): boolean => {
    if (!role) return false;
    if (isFullAccessRole) return true;
    return keys.every((k) => permissions.includes(k));
  };

  return {
    role,
    permissions,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
  };
}
