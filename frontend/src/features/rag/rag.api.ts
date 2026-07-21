import type { KnowledgeFile, KnowledgePermissions, RagAskResponse, RagSource } from "./rag.types";

const viteEnv = (import.meta as unknown as { env?: Record<string, string | undefined> }).env;
const aiServiceUrl = viteEnv?.VITE_AI_SERVICE_URL ?? "http://127.0.0.1:8000/api/v1";

type ApiEnvelope<T> = {
  success: boolean;
  message: string;
  data: T;
};

function authHeaders(token?: string): Record<string, string> {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function parseResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "RAG request failed");
  }
  const body = (await response.json()) as ApiEnvelope<T>;
  return body.data;
}

export async function listKnowledgeFiles(token?: string) {
  const response = await fetch(`${aiServiceUrl}/rag/files`, {
    headers: authHeaders(token),
  });
  return parseResponse<KnowledgeFile[]>(response);
}

export async function uploadKnowledgeFile(
  file: File,
  permissions: KnowledgePermissions,
  token?: string,
) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("visibility", permissions.visibility);
  formData.append("allowed_roles", permissions.allowed_roles.join(","));
  formData.append("allowed_user_ids", permissions.allowed_user_ids.join(","));

  const response = await fetch(`${aiServiceUrl}/rag/upload`, {
    method: "POST",
    headers: authHeaders(token),
    body: formData,
  });
  return parseResponse<KnowledgeFile>(response);
}

export async function deleteKnowledgeFile(documentId: string, token?: string) {
  const response = await fetch(`${aiServiceUrl}/rag/files/${documentId}`, {
    method: "DELETE",
    headers: authHeaders(token),
  });
  return parseResponse<{ deleted: boolean }>(response);
}

export async function semanticSearch(query: string, documentIds: string[], token?: string) {
  const response = await fetch(`${aiServiceUrl}/rag/query`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(token),
    },
    body: JSON.stringify({ query, document_ids: documentIds, top_k: 8 }),
  });
  const data = await parseResponse<{ documents: RagSource[] }>(response);
  return data.documents;
}

export async function askKnowledge(
  question: string,
  mode: "answer" | "summarize" | "explain",
  documentIds: string[],
  token?: string,
) {
  const endpoint = mode === "answer" ? "ask" : mode;
  const response = await fetch(`${aiServiceUrl}/rag/${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(token),
    },
    body: JSON.stringify({ question, mode, document_ids: documentIds, top_k: 8 }),
  });
  return parseResponse<RagAskResponse>(response);
}
