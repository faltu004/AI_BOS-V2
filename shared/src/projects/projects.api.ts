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

export type BackendProject = {
 id?: string;
 _id?: string;
 projectName: string;
 projectCode: string;
 description?: string;
 status: string;
 priority: string;
 progress: number;
 startDate: string;
 endDate: string;
 epics?: Array<ProjectEpic & { _id?: string }>;
 sprints?: Array<ProjectSprint & { _id?: string }>;
};

export type ProjectSummary = {
 id: string;
 projectName: string;
 projectCode: string;
 description?: string;
 status: string;
 priority: string;
 progress: number;
 startDate: string;
 endDate: string;
 epics: ProjectEpic[];
 sprints: ProjectSprint[];
};

export type ProjectsResult<T> = { status: "ok"; data: T } | { status: "forbidden" } | { status: "error" };

async function getSessionHeader(): Promise<Record<string, string>> {
 let session = getStoredAuthSession();
 if (session && isSessionExpired(session)) {
 session = await refreshSession();
 }
 return session ? { Authorization: `Bearer ${session.accessToken}` } : {};
}

async function fetchJson<T>(endpoint: string): Promise<ProjectsResult<T>> {
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

async function sendJson<T>(endpoint: string, method: "PATCH", body: unknown): Promise<T> {
 const response = await fetch(`${getApiBaseUrl()}${endpoint}`, {
 method,
 cache: "no-store",
 headers: {
 "Content-Type": "application/json",
 ...(await getSessionHeader()),
 },
 body: JSON.stringify(body),
 });

 const json = await response.json().catch(() => null);
 if (!response.ok) {
 throw new Error(json?.message ?? "Request failed.");
 }

 notifyLocalDataChanged({ at: new Date().toISOString(), method, path: endpoint, resource: "projects" });
 return json.data as T;
}

function toDateOnly(value?: string) {
 return value ? new Date(value).toISOString().slice(0, 10) : "";
}

function toProject(record: BackendProject): ProjectSummary {
 return {
 id: record.id ?? record._id ?? "",
 projectName: record.projectName,
 projectCode: record.projectCode,
 description: record.description,
 status: record.status,
 priority: record.priority,
 progress: record.progress,
 startDate: toDateOnly(record.startDate),
 endDate: toDateOnly(record.endDate),
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
 };
}

export async function fetchProjects() {
 const result = await fetchJson<{ items: BackendProject[] }>("/projects?limit=100");
 if (result.status !== "ok") return result;
 return { status: "ok", data: result.data.items.map(toProject) } satisfies ProjectsResult<ProjectSummary[]>;
}

export async function updateProject(id: string, input: Record<string, unknown>) {
 const project = await sendJson<BackendProject>(`/projects/${id}`, "PATCH", input);
 return toProject(project);
}
