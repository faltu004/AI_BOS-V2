import type {
 PermissionAuditLogEntry,
 PermissionCatalogEntry,
 PermissionGroup,
 PermissionGroupFormInput,
 Role,
 RoleFormInput,
 RoleHistoryEntry,
 RoleTemplate,
 RoleTemplateFormInput,
} from "./rbac.schema";

const viteEnv = (import.meta as unknown as { env?: Record<string, string | undefined> }).env;
const apiBaseUrl = viteEnv?.VITE_API_BASE_URL ?? "http://127.0.0.1:5000/api/v1";

type ApiEnvelope<T> = {
 success: boolean;
 message: string;
 data: T;
};

type Paginated<T> = {
 items: T[];
 pagination: { page: number; limit: number; total: number; totalPages: number };
};

function authHeaders(token?: string) {
 return {
 "Content-Type": "application/json",
 ...(token ? { Authorization: `Bearer ${token}` } : {}),
 };
}

async function request<T>(path: string, token: string | undefined, init?: RequestInit): Promise<T> {
 const response = await fetch(`${apiBaseUrl}${path}`, {
 ...init,
 headers: authHeaders(token),
 });
 if (!response.ok) {
 const body = (await response.json().catch(() => null)) as { message?: string } | null;
 throw new Error(body?.message ?? `Request failed (${response.status})`);
 }
 const body = (await response.json()) as ApiEnvelope<T>;
 return body.data;
}

export function fetchPermissionCatalog(token?: string) {
 return request<PermissionCatalogEntry[]>("/rbac/permissions", token);
}

export function fetchRoles(token?: string) {
 return request<Paginated<Role>>("/rbac/roles?limit=100", token);
}

export function createRole(input: RoleFormInput, token?: string) {
 return request<Role>("/rbac/roles", token, {
 method: "POST",
 body: JSON.stringify({ ...input, templateId: input.templateId || undefined }),
 });
}

export function updateRole(id: string, input: Partial<RoleFormInput>, token?: string) {
 return request<Role>(`/rbac/roles/${id}`, token, {
 method: "PATCH",
 body: JSON.stringify(input),
 });
}

export function deleteRole(id: string, token?: string) {
 return request<{ deleted: boolean }>(`/rbac/roles/${id}`, token, { method: "DELETE" });
}

export function fetchPermissionGroups(token?: string) {
 return request<Paginated<PermissionGroup>>("/rbac/permission-groups?limit=100", token);
}

export function createPermissionGroup(input: PermissionGroupFormInput, token?: string) {
 return request<PermissionGroup>("/rbac/permission-groups", token, {
 method: "POST",
 body: JSON.stringify(input),
 });
}

export function deletePermissionGroup(id: string, token?: string) {
 return request<{ deleted: boolean }>(`/rbac/permission-groups/${id}`, token, { method: "DELETE" });
}

export function fetchRoleTemplates(token?: string) {
 return request<Paginated<RoleTemplate>>("/rbac/role-templates?limit=100", token);
}

export function createRoleTemplate(input: RoleTemplateFormInput, token?: string) {
 return request<RoleTemplate>("/rbac/role-templates", token, {
 method: "POST",
 body: JSON.stringify(input),
 });
}

export function deleteRoleTemplate(id: string, token?: string) {
 return request<{ deleted: boolean }>(`/rbac/role-templates/${id}`, token, { method: "DELETE" });
}

export function fetchAuditLog(token?: string) {
 return request<Paginated<PermissionAuditLogEntry>>("/rbac/audit-log?limit=50", token);
}

export function fetchRoleHistory(roleId: string, token?: string) {
 return request<Paginated<RoleHistoryEntry>>(`/rbac/role-history/${roleId}`, token);
}
