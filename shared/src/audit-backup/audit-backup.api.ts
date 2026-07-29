import type { AuditCategory, AuditLogEntry, BackupRecord, BackupSchedule, BackupType } from "./audit-backup.schema";

const viteEnv = (import.meta as unknown as { env?: Record<string, string | undefined> }).env;
const apiBaseUrl = viteEnv?.VITE_API_BASE_URL ?? "http://127.0.0.1:5000/api/v1";

type ApiEnvelope<T> = { success: boolean; message: string; data: T };
type Paginated<T> = { items: T[]; pagination: { page: number; limit: number; total: number; totalPages: number } };

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

export type AuditLogFilters = { category?: AuditCategory; search?: string; page?: number; limit?: number };

export function fetchAuditLogs(filters: AuditLogFilters, token?: string) {
  const params = new URLSearchParams();
  if (filters.category) params.set("category", filters.category);
  if (filters.search) params.set("search", filters.search);
  params.set("page", String(filters.page ?? 1));
  params.set("limit", String(filters.limit ?? 50));
  return request<Paginated<AuditLogEntry>>(`/audit/logs?${params.toString()}`, token);
}

export function auditLogExportUrl(filters: AuditLogFilters) {
  const params = new URLSearchParams();
  if (filters.category) params.set("category", filters.category);
  if (filters.search) params.set("search", filters.search);
  return `${apiBaseUrl}/audit/logs/export?${params.toString()}`;
}

export function fetchBackupHistory(token?: string) {
  return request<BackupRecord[]>("/backup/history", token);
}

export function runBackup(type: BackupType, token?: string) {
  return request<BackupRecord>("/backup/run", token, { method: "POST", body: JSON.stringify({ type }) });
}

export function restoreBackup(id: string, token?: string) {
  return request<{ summary: string }>(`/backup/${id}/restore`, token, {
    method: "POST",
    body: JSON.stringify({ confirm: true }),
  });
}

export function fetchBackupSchedule(token?: string) {
  return request<BackupSchedule[]>("/backup/schedule", token);
}

export function updateBackupSchedule(
  type: BackupType,
  input: { frequency?: "daily" | "weekly"; isEnabled?: boolean; retentionDays?: number },
  token?: string,
) {
  return request<BackupSchedule>(`/backup/schedule/${type}`, token, { method: "PATCH", body: JSON.stringify(input) });
}
