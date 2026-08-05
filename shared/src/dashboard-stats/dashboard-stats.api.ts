import { getStoredAuthSession, isSessionExpired, refreshSession } from "@shared/auth/auth-service";
import { getApiBaseUrl } from "@shared/lib/env";

export type DashboardStatsResult<T> = { status: "ok"; data: T } | { status: "forbidden" } | { status: "error" };

export type ProjectStats = {
 total: number;
 active: number;
 completed: number;
 delayed: number;
 upcomingDeadlines: number;
};

export type LeadStats = {
 total: number;
 byStatus: { status: string; count: number }[];
 totalValue: number;
 wonValue: number;
};

export type WorkflowStats = {
 total: number;
 active: number;
 paused: number;
 templates: number;
 totalExecutions: number;
};

export type OrgCounts = {
 departments: number;
 branches: number;
 teams: number;
 policies: number;
};

export type RecentProject = { id: string; projectName: string; status: string; updatedAt: string };
export type RecentTask = { id: string; title: string; status: string; dueDate?: string; updatedAt: string };
export type RecentLead = { id: string; name: string; company?: string; status: string; value: number; updatedAt: string };

async function getSessionHeader(): Promise<Record<string, string>> {
 let session = getStoredAuthSession();
 if (session && isSessionExpired(session)) {
 session = await refreshSession();
 }
 return session ? { Authorization: `Bearer ${session.accessToken}` } : {};
}

async function fetchJson<T>(endpoint: string): Promise<DashboardStatsResult<T>> {
 try {
 const response = await fetch(`${getApiBaseUrl()}${endpoint}`, {
 cache: "no-store",
 headers: await getSessionHeader(),
 });

 if (response.status === 403) return { status: "forbidden" };
 if (!response.ok) return { status: "error" };

 const json = await response.json().catch(() => null);
 return json ? { status: "ok", data: json.data as T } : { status: "error" };
 } catch {
 return { status: "error" };
 }
}

export function fetchProjectStats() {
 return fetchJson<ProjectStats>("/projects/stats");
}

export function fetchLeadStats() {
 return fetchJson<LeadStats>("/leads/stats");
}

export function fetchWorkflowStats() {
 return fetchJson<WorkflowStats>("/workflows/stats");
}

export async function fetchOrgCounts(): Promise<DashboardStatsResult<OrgCounts>> {
 const [departments, branches, teams, policies] = await Promise.all([
 fetchJson<{ pagination: { total: number } }>("/organization/departments?limit=1"),
 fetchJson<{ pagination: { total: number } }>("/organization/branches?limit=1"),
 fetchJson<{ pagination: { total: number } }>("/organization/teams?limit=1"),
 fetchJson<{ pagination: { total: number } }>("/organization/policies?limit=1"),
 ]);

 if ([departments, branches, teams, policies].every((r) => r.status === "forbidden")) {
 return { status: "forbidden" };
 }

 return {
 status: "ok",
 data: {
 departments: departments.status === "ok" ? departments.data.pagination.total : 0,
 branches: branches.status === "ok" ? branches.data.pagination.total : 0,
 teams: teams.status === "ok" ? teams.data.pagination.total : 0,
 policies: policies.status === "ok" ? policies.data.pagination.total : 0,
 },
 };
}

export async function fetchRecentProjects(limit = 5) {
 const result = await fetchJson<{
 items: { id?: string; _id?: string; projectName: string; status: string; updatedAt: string }[];
 }>(`/projects?limit=${limit}&sortBy=createdAt&sortOrder=desc`);
 if (result.status !== "ok") return result;
 return {
 status: "ok",
 data: result.data.items.map((item) => ({
 id: item.id ?? item._id ?? "",
 projectName: item.projectName,
 status: item.status,
 updatedAt: item.updatedAt,
 })),
 } satisfies DashboardStatsResult<RecentProject[]>;
}

export async function fetchRecentTasks(limit = 5) {
 const result = await fetchJson<{
 items: { id?: string; _id?: string; title: string; status: string; dueDate?: string; updatedAt: string }[];
 }>(`/tasks?limit=${limit}&sortBy=createdAt&sortOrder=desc`);
 if (result.status !== "ok") return result;
 return {
 status: "ok",
 data: result.data.items.map((item) => ({
 id: item.id ?? item._id ?? "",
 title: item.title,
 status: item.status,
 dueDate: item.dueDate,
 updatedAt: item.updatedAt,
 })),
 } satisfies DashboardStatsResult<RecentTask[]>;
}

export async function fetchRecentLeads(limit = 5) {
 type LeadWire = { id?: string; _id?: string; name: string; company?: string; status: string; value?: number; updatedAt: string };
 const result = await fetchJson<{ items?: LeadWire[] } | LeadWire[]>(`/leads?limit=${limit}`);
 if (result.status !== "ok") return result;
 const items = Array.isArray(result.data) ? result.data : result.data.items ?? [];
 return {
 status: "ok",
 data: items.map((item) => ({
 id: item.id ?? item._id ?? "",
 name: item.name,
 company: item.company,
 status: item.status,
 value: item.value ?? 0,
 updatedAt: item.updatedAt,
 })),
 } satisfies DashboardStatsResult<RecentLead[]>;
}
