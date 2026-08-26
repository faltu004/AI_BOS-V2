import { getStoredAuthSession, isSessionExpired, refreshSession } from "@shared/auth/auth-service";
import { getApiBaseUrl } from "@shared/lib/env";
import { notifyLocalDataChanged } from "@shared/realtime/data-sync";

export type ProjectEpic = {
 id: string;
 title: string;
 description?: string;
 status: "Planned" | "In Progress" | "Done";
 ownerId?: string;
 startDate?: string;
 targetDate?: string;
};

export type ProjectSprint = {
 id: string;
 name: string;
 goal?: string;
 status: "Planned" | "Active" | "Closed";
 startDate: string;
 endDate: string;
};

export type ProjectAttachment = {
 name: string;
 url?: string;
 mimeType?: string;
 size?: number;
};

export type BackendProject = {
 id?: string;
 _id?: string;
 projectName: string;
 projectCode: string;
 description?: string;
 category?: string;
 status: string;
 priority: string;
 progress: number;
 startDate: string;
 endDate: string;
 budget?: number;
 estimatedHours?: number;
 client?: string;
 teamMembers?: string[];
 projectManager?: string;
 attachments?: ProjectAttachment[];
 notes?: string;
 tags?: string[];
 isArchived?: boolean;
 epics?: Array<ProjectEpic & { _id?: string }>;
 sprints?: Array<ProjectSprint & { _id?: string }>;
 createdAt?: string;
 updatedAt?: string;
};

export type ProjectSummary = {
 id: string;
 projectName: string;
 projectCode: string;
 description: string;
 category: string;
 status: string;
 priority: string;
 progress: number;
 startDate: string;
 endDate: string;
 budget: number;
 estimatedHours: number;
 client: string;
 teamMembers: string[];
 projectManager: string;
 attachments: ProjectAttachment[];
 notes: string;
 tags: string[];
 isArchived: boolean;
 epics: ProjectEpic[];
 sprints: ProjectSprint[];
 createdAt: string;
 updatedAt: string;
};

export type ProjectPagination = {
 page: number;
 limit: number;
 total: number;
 totalPages: number;
};

export type ProjectsListQuery = {
 page?: number;
 limit?: number;
 search?: string;
 status?: string;
 priority?: string;
 category?: string;
 sortBy?: string;
 sortOrder?: "asc" | "desc";
 archived?: boolean;
};

export type ProjectEpicInput = {
 _id?: string;
 title: string;
 description?: string;
 status?: "Planned" | "In Progress" | "Done";
 ownerId?: string;
 startDate?: string;
 targetDate?: string;
};

export type ProjectSprintInput = {
 _id?: string;
 name: string;
 goal?: string;
 status?: "Planned" | "Active" | "Closed";
 startDate: string;
 endDate: string;
};

export type CreateProjectInput = {
 projectName: string;
 description?: string;
 category?: string;
 priority?: string;
 status?: string;
 progress?: number;
 startDate: string;
 endDate: string;
 budget?: number;
 estimatedHours?: number;
 client?: string;
 teamMembers?: string[];
 projectManager: string;
 attachments?: ProjectAttachment[];
 epics?: ProjectEpicInput[];
 sprints?: ProjectSprintInput[];
 notes?: string;
 tags?: string[];
};

export type UpdateProjectInput = Partial<CreateProjectInput>;

export type ProjectsResult<T> = { status: "ok"; data: T } | { status: "forbidden" } | { status: "error"; message?: string };

async function getSessionHeader(): Promise<Record<string, string>> {
 let session = getStoredAuthSession();
 if (session && isSessionExpired(session)) {
 session = await refreshSession();
 }
 return session ? { Authorization: `Bearer ${session.accessToken}` } : {};
}

function toQueryString(query: Record<string, unknown>): string {
 const params = new URLSearchParams();
 for (const [key, value] of Object.entries(query)) {
 if (value === undefined || value === null || value === "") continue;
 params.set(key, String(value));
 }
 const serialized = params.toString();
 return serialized ? `?${serialized}` : "";
}

async function fetchJson<T>(endpoint: string): Promise<ProjectsResult<T>> {
 try {
 const response = await fetch(`${getApiBaseUrl()}${endpoint}`, {
 cache: "no-store",
 headers: await getSessionHeader(),
 });

 if (response.status === 403) return { status: "forbidden" };
 if (!response.ok) {
 const body = await response.json().catch(() => null);
 return { status: "error", message: body?.message };
 }

 const json = await response.json().catch(() => null);
 return json ? { status: "ok", data: json.data as T } : { status: "error" };
 } catch {
 return { status: "error" };
 }
}

async function sendJson<T>(endpoint: string, method: "POST" | "PATCH" | "DELETE", body?: unknown): Promise<T> {
 const response = await fetch(`${getApiBaseUrl()}${endpoint}`, {
 method,
 cache: "no-store",
 headers: {
 "Content-Type": "application/json",
 ...(await getSessionHeader()),
 },
 body: body !== undefined ? JSON.stringify(body) : undefined,
 });

 const json = await response.json().catch(() => null);
 if (!response.ok) {
 throw new Error(json?.message ?? "Request failed.");
 }

 notifyLocalDataChanged({ at: new Date().toISOString(), method, path: endpoint, resource: "projects" });
 return json.data as T;
}

async function fetchBlob(endpoint: string): Promise<Blob> {
 const response = await fetch(`${getApiBaseUrl()}${endpoint}`, {
 cache: "no-store",
 headers: await getSessionHeader(),
 });

 if (!response.ok) {
 throw new Error("Export failed.");
 }

 return response.blob();
}

function toDateOnly(value?: string) {
 return value ? new Date(value).toISOString().slice(0, 10) : "";
}

function toProject(record: BackendProject): ProjectSummary {
 return {
 id: record.id ?? record._id ?? "",
 projectName: record.projectName,
 projectCode: record.projectCode,
 description: record.description ?? "",
 category: record.category ?? "Internal",
 status: record.status,
 priority: record.priority,
 progress: record.progress,
 startDate: toDateOnly(record.startDate),
 endDate: toDateOnly(record.endDate),
 budget: record.budget ?? 0,
 estimatedHours: record.estimatedHours ?? 0,
 client: record.client ?? "",
 teamMembers: record.teamMembers ?? [],
 projectManager: record.projectManager ?? "",
 attachments: record.attachments ?? [],
 notes: record.notes ?? "",
 tags: record.tags ?? [],
 isArchived: record.isArchived ?? false,
 epics: (record.epics ?? []).map((epic) => ({
 id: epic.id ?? epic._id ?? "",
 title: epic.title,
 description: epic.description,
 status: epic.status,
 ownerId: epic.ownerId,
 startDate: toDateOnly(epic.startDate),
 targetDate: toDateOnly(epic.targetDate),
 })),
 sprints: (record.sprints ?? []).map((sprint) => ({
 id: sprint.id ?? sprint._id ?? "",
 name: sprint.name,
 goal: sprint.goal,
 status: sprint.status,
 startDate: toDateOnly(sprint.startDate),
 endDate: toDateOnly(sprint.endDate),
 })),
 createdAt: record.createdAt ?? "",
 updatedAt: record.updatedAt ?? "",
 };
}

export async function fetchProjectById(id: string) {
 const result = await fetchJson<BackendProject>(`/projects/${id}`);
 if (result.status !== "ok") return result;
 return { status: "ok", data: toProject(result.data) } satisfies ProjectsResult<ProjectSummary>;
}

export async function fetchProjects(query: ProjectsListQuery = {}) {
 const result = await fetchJson<{ items: BackendProject[]; pagination: ProjectPagination }>(
 `/projects${toQueryString({ limit: 100, ...query })}`,
 );
 if (result.status !== "ok") return result;
 return { status: "ok", data: result.data.items.map(toProject) } satisfies ProjectsResult<ProjectSummary[]>;
}

export async function fetchProjectsPage(query: ProjectsListQuery = {}) {
 const result = await fetchJson<{ items: BackendProject[]; pagination: ProjectPagination }>(
 `/projects${toQueryString(query)}`,
 );
 if (result.status !== "ok") return result;
 return {
 status: "ok",
 data: { items: result.data.items.map(toProject), pagination: result.data.pagination },
 } satisfies ProjectsResult<{ items: ProjectSummary[]; pagination: ProjectPagination }>;
}

export async function createProject(input: CreateProjectInput) {
 const project = await sendJson<BackendProject>("/projects", "POST", input);
 return toProject(project);
}

export async function updateProject(id: string, input: UpdateProjectInput) {
 const project = await sendJson<BackendProject>(`/projects/${id}`, "PATCH", input);
 return toProject(project);
}

export async function deleteProject(id: string) {
 await sendJson<null>(`/projects/${id}`, "DELETE");
}

export async function archiveProject(id: string) {
 const project = await sendJson<BackendProject>(`/projects/${id}/archive`, "PATCH");
 return toProject(project);
}

export async function duplicateProject(id: string) {
 const project = await sendJson<BackendProject>(`/projects/${id}/duplicate`, "POST");
 return toProject(project);
}

export async function bulkDeleteProjects(ids: string[]) {
 await sendJson<null>("/projects/bulk", "DELETE", { ids });
}

export async function bulkUpdateProjects(ids: string[], updates: { status?: string; priority?: string; isArchived?: boolean; tags?: string[] }) {
 await sendJson<null>("/projects/bulk", "PATCH", { ids, updates });
}

export async function exportProjectsCsv(query: ProjectsListQuery = {}) {
 return fetchBlob(`/projects/export/csv${toQueryString(query)}`);
}

export async function exportProjectsPdf(query: ProjectsListQuery = {}) {
 return fetchBlob(`/projects/export/pdf${toQueryString(query)}`);
}
