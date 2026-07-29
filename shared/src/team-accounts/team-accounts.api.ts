import { getApiBaseUrl } from "@shared/lib/env";
import { getStoredAuthSession, isSessionExpired, refreshSession } from "@shared/auth/auth-service";
import type { AuthRole } from "@shared/auth/types";
import type { CreateProfileFormValues, TeamAccount } from "./team-accounts.schema";

export type TeamAccountsResult<T> =
  | { status: "ok"; data: T }
  /** The caller's role genuinely lacks permission — safe to show a permanent "no access" state. */
  | { status: "forbidden" }
  /** Network error, timeout, or an unexpected server error — transient, should be retryable rather than read as "no access". */
  | { status: "error" };

async function fetchWithStatus<T>(endpoint: string): Promise<TeamAccountsResult<T>> {
  let session = getStoredAuthSession();
  if (session && isSessionExpired(session)) {
    session = await refreshSession();
  }

  try {
    const response = await fetch(`${getApiBaseUrl()}${endpoint}`, {
      headers: session ? { Authorization: `Bearer ${session.accessToken}` } : {},
    });

    if (response.status === 403) return { status: "forbidden" };
    if (!response.ok) return { status: "error" };

    const json = await response.json().catch(() => null);
    if (!json) return { status: "error" };

    return { status: "ok", data: json.data as T };
  } catch {
    return { status: "error" };
  }
}

export function fetchAssignableRoles() {
  return fetchWithStatus<AuthRole[]>("/users/assignable-roles");
}

export function fetchTeamAccounts() {
  return fetchWithStatus<TeamAccount[]>("/users");
}

export async function createProfile(input: CreateProfileFormValues): Promise<TeamAccount> {
  const session = getStoredAuthSession();
  const response = await fetch(`${getApiBaseUrl()}/users`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(session ? { Authorization: `Bearer ${session.accessToken}` } : {}),
    },
    body: JSON.stringify(input),
  });

  const json = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(json?.message ?? "Unable to create this profile.");
  }

  return json.data as TeamAccount;
}
