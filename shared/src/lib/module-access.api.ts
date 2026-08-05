import { getApiBaseUrl } from "./env";
import { getStoredAuthSession, isSessionExpired, refreshSession } from "../auth/auth-service";

export type ModuleAccess = {
 adminPanelEnabled: boolean;
};

async function authHeader(): Promise<Record<string, string>> {
 let session = getStoredAuthSession();
 if (session && isSessionExpired(session)) {
 session = await refreshSession();
 }
 return session ? { Authorization: `Bearer ${session.accessToken}` } : {};
}

/** Readable by any authenticated user — the admin portal needs this to know whether to block itself. */
export async function fetchModuleAccess(): Promise<ModuleAccess | null> {
 try {
 const response = await fetch(`${getApiBaseUrl()}/organization/settings`, {
 headers: await authHeader(),
 });
 if (!response.ok) return null;
 const json = await response.json().catch(() => null);
 return (json?.data?.moduleAccess as ModuleAccess | undefined) ?? { adminPanelEnabled: true };
 } catch {
 return null;
 }
}

/** Owner-only on the backend — Administrator's hasFullAccess does not bypass this route. */
export async function updateModuleAccess(input: ModuleAccess): Promise<boolean> {
 try {
 const response = await fetch(`${getApiBaseUrl()}/organization/settings/module-access`, {
 method: "PATCH",
 headers: { "Content-Type": "application/json", ...(await authHeader()) },
 body: JSON.stringify(input),
 });
 return response.ok;
 } catch {
 return false;
 }
}
