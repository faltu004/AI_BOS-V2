import { getStoredAuthSession, isSessionExpired, refreshSession } from "@shared/auth/auth-service";
import { getApiBaseUrl } from "@shared/lib/env";

export type TaskCommentsResult<T> = { status: "ok"; data: T } | { status: "forbidden" } | { status: "error" };

export type BackendComment = {
 id?: string;
 _id?: string;
 resourceType: "Task" | "Project";
 resourceId: string;
 authorId: { id?: string; _id?: string; fullName?: string; email?: string } | string;
 body: string;
 editedAt?: string;
 createdAt: string;
 updatedAt: string;
};

export type Comment = {
 id: string;
 author: string;
 body: string;
 editedAt?: string;
 createdAt: string;
};

async function getSessionHeader(): Promise<Record<string, string>> {
 let session = getStoredAuthSession();
 if (session && isSessionExpired(session)) {
 session = await refreshSession();
 }
 return session ? { Authorization: `Bearer ${session.accessToken}` } : {};
}

async function fetchJson<T>(endpoint: string): Promise<TaskCommentsResult<T>> {
 try {
 const response = await fetch(`${getApiBaseUrl()}${endpoint}`, {
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

async function sendJson<T>(endpoint: string, method: "POST" | "PATCH" | "DELETE", body?: unknown): Promise<T> {
 const response = await fetch(`${getApiBaseUrl()}${endpoint}`, {
 method,
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

 return json.data as T;
}

function toComment(record: BackendComment): Comment {
 const author = typeof record.authorId === "string" ? record.authorId : record.authorId.fullName ?? "Unknown";
 return {
 id: record.id ?? record._id ?? "",
 author,
 body: record.body,
 editedAt: record.editedAt,
 createdAt: record.createdAt,
 };
}

export async function fetchTaskComments(taskId: string) {
 const result = await fetchJson<{ items: BackendComment[] }>(`/tasks/${taskId}/comments`);
 if (result.status !== "ok") return result;
 return { status: "ok", data: result.data.items.map(toComment) } satisfies TaskCommentsResult<Comment[]>;
}

export async function postTaskComment(taskId: string, body: string) {
 const record = await sendJson<BackendComment>(`/tasks/${taskId}/comments`, "POST", { body });
 return toComment(record);
}

export async function updateTaskComment(taskId: string, commentId: string, body: string) {
 const record = await sendJson<BackendComment>(`/tasks/${taskId}/comments/${commentId}`, "PATCH", { body });
 return toComment(record);
}

export async function deleteTaskComment(taskId: string, commentId: string) {
 return sendJson<{ deleted: boolean }>(`/tasks/${taskId}/comments/${commentId}`, "DELETE");
}

export async function fetchProjectComments(projectId: string) {
 const result = await fetchJson<{ items: BackendComment[] }>(`/projects/${projectId}/comments`);
 if (result.status !== "ok") return result;
 return { status: "ok", data: result.data.items.map(toComment) } satisfies TaskCommentsResult<Comment[]>;
}

export async function postProjectComment(projectId: string, body: string) {
 const record = await sendJson<BackendComment>(`/projects/${projectId}/comments`, "POST", { body });
 return toComment(record);
}

export async function updateProjectComment(projectId: string, commentId: string, body: string) {
 const record = await sendJson<BackendComment>(`/projects/${projectId}/comments/${commentId}`, "PATCH", { body });
 return toComment(record);
}

export async function deleteProjectComment(projectId: string, commentId: string) {
 return sendJson<{ deleted: boolean }>(`/projects/${projectId}/comments/${commentId}`, "DELETE");
}
