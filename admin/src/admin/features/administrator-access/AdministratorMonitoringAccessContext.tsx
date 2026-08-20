import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  authSessionChangedEvent,
  getStoredAuthSession,
} from "@shared/auth/auth-service";
import {
  fetchMyAdministratorMonitoringAccess,
  administratorMonitoringPermissionKeys,
  type AdministratorMonitoringAccess,
  type AdministratorMonitoringPermissionKey,
} from "./administrator-monitoring-access.api";

type AccessContextValue = {
  access: AdministratorMonitoringAccess;
  loading: boolean;
  refresh: () => Promise<void>;
  hasPermission: (
    permission:
      AdministratorMonitoringPermissionKey,
  ) => boolean;
};

const deniedAccess:
  AdministratorMonitoringAccess = {
    enabled: false,
    permissionKeys: [],
    ownerAuthority: false,
  };

const ownerAccess:
  AdministratorMonitoringAccess = {
    enabled: true,
    permissionKeys: [
      ...administratorMonitoringPermissionKeys,
    ],
    ownerAuthority: true,
  };

const AdministratorMonitoringAccessContext =
  createContext<AccessContextValue | null>(
    null,
  );

export function AdministratorMonitoringAccessProvider({
  children,
}: {
  children: ReactNode;
}) {
  const session =
    getStoredAuthSession();

  const isOwner =
    session?.user.role ===
    "Owner";

  const [access, setAccess] =
    useState<AdministratorMonitoringAccess>(
      isOwner
        ? ownerAccess
        : deniedAccess,
    );

  const [loading, setLoading] =
    useState(
      !isOwner &&
        session?.user.role ===
          "Administrator",
    );

  const refresh =
    useCallback(
      async () => {
        const current =
          getStoredAuthSession();

        if (
          current?.user.role ===
          "Owner"
        ) {
          setAccess(
            ownerAccess,
          );
          setLoading(
            false,
          );
          return;
        }

        if (
          current?.user.role !==
          "Administrator"
        ) {
          setAccess(
            deniedAccess,
          );
          setLoading(
            false,
          );
          return;
        }

        setLoading(
          true,
        );

        try {
          setAccess(
            await fetchMyAdministratorMonitoringAccess(),
          );
        } catch {
          setAccess(
            deniedAccess,
          );
        } finally {
          setLoading(
            false,
          );
        }
      },
      [],
    );

  useEffect(
    () => {
      void refresh();

      const refreshAccess =
        () => {
          void refresh();
        };

      window.addEventListener(
        "focus",
        refreshAccess,
      );
      window.addEventListener(
        authSessionChangedEvent,
        refreshAccess,
      );

      const timer =
        window.setInterval(
          refreshAccess,
          15_000,
        );

      return () => {
        window.clearInterval(
          timer,
        );
        window.removeEventListener(
          "focus",
          refreshAccess,
        );
        window.removeEventListener(
          authSessionChangedEvent,
          refreshAccess,
        );
      };
    },
    [refresh],
  );

  const value =
    useMemo<AccessContextValue>(
      () => ({
        access,
        loading,
        refresh,
        hasPermission:
          (permission) =>
            Boolean(
              access.enabled &&
                access.permissionKeys.includes(
                  permission,
                ),
            ),
      }),
      [
        access,
        loading,
        refresh,
      ],
    );

  return (
    <AdministratorMonitoringAccessContext.Provider
      value={value}
    >
      {children}
    </AdministratorMonitoringAccessContext.Provider>
  );
}

export function useAdministratorMonitoringAccess() {
  const context =
    useContext(
      AdministratorMonitoringAccessContext,
    );

  if (!context) {
    throw new Error(
      "AdministratorMonitoringAccessProvider is required",
    );
  }

  return context;
}
