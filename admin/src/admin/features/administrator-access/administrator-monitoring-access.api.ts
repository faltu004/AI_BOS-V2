import {
  getApiBaseUrl,
} from "@shared/lib/env";
import {
  getStoredAuthSession,
} from "@shared/auth/auth-service";

export const administratorMonitoringPermissionKeys = [
  "device.monitoring.view",
  "device.command.view",
  "device.command.execute",
  "device.command.power",
  "device.software.manage",
  "device.restriction.manage",
  "device.remote_support.create",
  "device.remote_support.control",
] as const;

export type AdministratorMonitoringPermissionKey =
  (typeof administratorMonitoringPermissionKeys)[number];

export type AdministratorMonitoringAccess = {
  administratorUserId?: string;
  fullName?: string;
  email?: string;
  isActive?: boolean;
  enabled: boolean;
  permissionKeys: string[];
  ownerAuthority?: boolean;
  changedBy?:
    | string
    | {
        id: string;
        fullName?: string;
        email?: string;
      };
  changedAt?: string;
};

type ApiEnvelope<T> = {
  data: T;
  message?: string;
};

async function request<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const session =
    getStoredAuthSession();

  const response =
    await fetch(
      getApiBaseUrl() +
        path,
      {
        ...init,
        headers: {
          "Content-Type":
            "application/json",
          ...(session
            ? {
                Authorization:
                  "Bearer " +
                  session.accessToken,
              }
            : {}),
          ...init?.headers,
        },
      },
    );

  const body =
    (await response
      .json()
      .catch(
        () => null,
      )) as
      | ApiEnvelope<T>
      | null;

  if (!response.ok) {
    throw new Error(
      body?.message ??
        "Request failed (" +
          response.status +
          ")",
    );
  }

  return body!.data;
}

export function fetchMyAdministratorMonitoringAccess() {
  return request<AdministratorMonitoringAccess>(
    "/administrator-monitoring-access/me",
  );
}

export function fetchAdministratorMonitoringAccessList() {
  return request<
    AdministratorMonitoringAccess[]
  >(
    "/administrator-monitoring-access",
  );
}

export function updateAdministratorMonitoringAccess(
  administratorUserId: string,
  input: {
    enabled: boolean;
    permissionKeys: string[];
  },
) {
  return request<AdministratorMonitoringAccess>(
    "/administrator-monitoring-access/" +
      encodeURIComponent(
        administratorUserId,
      ),
    {
      method: "PUT",
      body: JSON.stringify(
        input,
      ),
    },
  );
}
