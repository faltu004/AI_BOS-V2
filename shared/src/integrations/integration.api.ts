import type { IntegrationCardData, IntegrationFamily, IntegrationLogEntry, ProviderConfigStatus } from "./integration.schema";

const viteEnv = (import.meta as unknown as { env?: Record<string, string | undefined> }).env;
const apiBaseUrl = viteEnv?.VITE_API_BASE_URL ?? "http://127.0.0.1:5000/api/v1";

type ApiEnvelope<T> = { success: boolean; message: string; data: T };

function authHeaders(token?: string) {
 return { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}

async function request<T>(path: string, token: string | undefined, init?: RequestInit): Promise<T> {
 const response = await fetch(`${apiBaseUrl}${path}`, { ...init, headers: authHeaders(token) });
 if (!response.ok) {
 const body = (await response.json().catch(() => null)) as { message?: string } | null;
 throw new Error(body?.message ?? `Request failed (${response.status})`);
 }
 const body = (await response.json()) as ApiEnvelope<T>;
 return body.data;
}

export function fetchIntegrations(token?: string) {
 return request<IntegrationCardData[]>("/integrations", token);
}

export function getConnectUrl(key: string, token?: string) {
 const returnOrigin = encodeURIComponent(window.location.origin);
 return request<{ authorizationUrl: string }>(`/integrations/${key}/connect?returnOrigin=${returnOrigin}`, token);
}

export function disconnectIntegration(key: string, token?: string) {
 return request<{ disconnected: boolean }>(`/integrations/${key}/disconnect`, token, { method: "POST" });
}

export function testIntegrationConnection(key: string, token?: string) {
 return request<{ ok: boolean; detail: string }>(`/integrations/${key}/test`, token, { method: "POST" });
}

export function syncIntegration(key: string, token?: string) {
 return request<{ itemsSynced: number; summary: string }>(`/integrations/${key}/sync`, token, { method: "POST" });
}

export function updateIntegrationSettings(key: string, input: { autoSyncEnabled?: boolean; syncFrequency?: string }, token?: string) {
 return request<IntegrationCardData>(`/integrations/${key}/settings`, token, {
 method: "PATCH",
 body: JSON.stringify(input),
 });
}

export function fetchIntegrationLogs(key: string, token?: string) {
 return request<IntegrationLogEntry[]>(`/integrations/${key}/logs`, token);
}

export function fetchProviderConfigs(token?: string) {
 return request<ProviderConfigStatus[]>("/integrations/admin/providers", token);
}

export function updateProviderConfig(
 family: IntegrationFamily,
 input: { clientId?: string; clientSecret?: string; redirectUri?: string; isEnabled?: boolean },
 token?: string,
) {
 return request<ProviderConfigStatus[]>(`/integrations/admin/providers/${family}`, token, {
 method: "PATCH",
 body: JSON.stringify(input),
 });
}
