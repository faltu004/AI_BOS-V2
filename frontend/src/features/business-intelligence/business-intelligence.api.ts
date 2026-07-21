import type { BIQueryResponse, BusinessSnapshot } from "./business-intelligence.types";

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
    throw new Error(text || "Business intelligence request failed");
  }
  const body = (await response.json()) as ApiEnvelope<T>;
  return body.data;
}

export async function askBusinessIntelligence(
  question: string,
  snapshot: BusinessSnapshot,
  token?: string,
) {
  const response = await fetch(`${aiServiceUrl}/business-intelligence/query`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(token),
    },
    body: JSON.stringify({
      question,
      client_context: snapshot,
      include_backend_context: true,
    }),
  });
  return parseResponse<BIQueryResponse>(response);
}
