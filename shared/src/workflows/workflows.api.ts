import { getStoredAuthSession, isSessionExpired, refreshSession } from "@shared/auth/auth-service";
import { getApiBaseUrl } from "@shared/lib/env";
import { notifyLocalDataChanged } from "@shared/realtime/data-sync";
import type { Workflow, WorkflowExecutionLog, WorkflowFormInput } from "./workflows.types";

type ApiResult<T> =
 | { status: "ok"; data: T }
 | { status: "forbidden" }
 | { status: "error"; message?: string };

type BackendReference = string | { id?: string; _id?: string };

type BackendWorkflow = Omit<Workflow, "id" | "createdBy" | "updatedBy" | "executionHistory"> & {
 id?: string;
 _id?: string;
 createdBy: BackendReference;
 updatedBy?: BackendReference;
};

type BackendWorkflowExecution = {
 id?: string;
 _id?: string;
 startedAt: string;
 finishedAt?: string;
 status: WorkflowExecutionLog["status"];
 triggeredBy?: BackendReference;
 inputPayload?: Record<string, unknown>;
 context?: Record<string, unknown>;
 error?: string;
 stepLogs?: Array<{
  stepId: string;
  startedAt: string;
  finishedAt?: string;
  status: WorkflowExecutionLog["stepLogs"][number]["status"];
  output?: Record<string, unknown>;
  error?: string;
 }>;
};

async function getSessionHeader(): Promise<Record<string, string>> {
 let session = getStoredAuthSession();
 if (session && isSessionExpired(session)) session = await refreshSession();
 return session ? { Authorization: `Bearer ${session.accessToken}` } : {};
}

function referenceId(reference?: BackendReference) {
 if (!reference) return undefined;
 return typeof reference === "string" ? reference : reference.id ?? reference._id;
}

function toWorkflow(record: BackendWorkflow): Workflow {
 return {
  ...record,
  id: record.id ?? record._id ?? "",
  description: record.description ?? "",
  createdBy: referenceId(record.createdBy) ?? "",
  updatedBy: referenceId(record.updatedBy),
  triggerConfig: record.triggerConfig ?? {},
  steps: record.steps ?? [],
  tags: record.tags ?? [],
 };
}

function toExecution(record: BackendWorkflowExecution): WorkflowExecutionLog {
 return {
  executionId: record.id ?? record._id ?? "",
  startedAt: record.startedAt,
  finishedAt: record.finishedAt,
  status: record.status,
  triggeredBy: referenceId(record.triggeredBy),
  inputPayload: record.inputPayload ?? {},
  outputPayload: record.context,
  error: record.error,
  stepLogs: record.stepLogs ?? [],
 };
}

async function fetchJson<T>(endpoint: string): Promise<ApiResult<T>> {
 try {
  const response = await fetch(`${getApiBaseUrl()}${endpoint}`, {
   cache: "no-store",
   headers: await getSessionHeader(),
  });
  const json = await response.json().catch(() => null);
  if (response.status === 403) return { status: "forbidden" };
  if (!response.ok) return { status: "error", message: json?.message };
  return json ? { status: "ok", data: json.data as T } : { status: "error" };
 } catch {
  return { status: "error", message: "Unable to reach the workflow service." };
 }
}

async function sendJson<T>(endpoint: string, method: "POST" | "PATCH" | "DELETE", body?: unknown) {
 const response = await fetch(`${getApiBaseUrl()}${endpoint}`, {
  method,
  cache: "no-store",
  headers: {
   "Content-Type": "application/json",
   ...(await getSessionHeader()),
  },
  body: body === undefined ? undefined : JSON.stringify(body),
 });
 const json = await response.json().catch(() => null);
 if (!response.ok) throw new Error(json?.message ?? "Workflow request failed.");
 notifyLocalDataChanged({ at: new Date().toISOString(), method, path: endpoint, resource: "workflows" });
 return json.data as T;
}

function toWorkflowPayload(input: WorkflowFormInput) {
 const { id: _id, ...payload } = input;
 return payload;
}

export async function fetchWorkflows() {
 const result = await fetchJson<{ items: BackendWorkflow[] }>("/workflows?limit=100");
 if (result.status !== "ok") return result;
 return { status: "ok", data: result.data.items.map(toWorkflow) } satisfies ApiResult<Workflow[]>;
}

export async function fetchWorkflowExecutions(id: string) {
 const result = await fetchJson<BackendWorkflowExecution[]>(`/workflows/${id}/executions?limit=50`);
 if (result.status !== "ok") return result;
 return { status: "ok", data: result.data.map(toExecution) } satisfies ApiResult<WorkflowExecutionLog[]>;
}

export async function createWorkflow(input: WorkflowFormInput) {
 return toWorkflow(await sendJson<BackendWorkflow>("/workflows", "POST", toWorkflowPayload(input)));
}

export async function updateWorkflow(id: string, input: WorkflowFormInput) {
 return toWorkflow(await sendJson<BackendWorkflow>(`/workflows/${id}`, "PATCH", toWorkflowPayload(input)));
}

export async function duplicateWorkflow(id: string, name: string) {
 return toWorkflow(await sendJson<BackendWorkflow>(`/workflows/${id}/duplicate`, "PATCH", { name }));
}

export async function toggleWorkflowStatus(id: string) {
 return toWorkflow(await sendJson<BackendWorkflow>(`/workflows/${id}/toggle`, "PATCH"));
}

export async function executeWorkflow(id: string) {
 return toExecution(await sendJson<BackendWorkflowExecution>(`/workflows/${id}/execute`, "POST", { inputPayload: {} }));
}

export async function deleteWorkflow(id: string) {
 await sendJson<{ deleted: boolean }>(`/workflows/${id}`, "DELETE");
}
