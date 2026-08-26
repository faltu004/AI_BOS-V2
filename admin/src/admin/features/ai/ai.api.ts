import { getStoredAuthSession, isSessionExpired, refreshSession } from "@shared/auth/auth-service";
import { getApiBaseUrl } from "@shared/lib/env";

export type AIProviderStatus = {
  configured: boolean;
  provider: "disabled" | "ollama" | "openai-compatible";
  model?: string;
  reason?: string;
};

export type AICapabilities = {
  naturalLanguageQueries: boolean;
  monitoring: boolean;
  alertExplanations: boolean;
  deviceTroubleshooting: boolean;
};

export type AIStatus = AIProviderStatus & {
  role: string;
  capabilities: AICapabilities;
};

export type AIWorkspaceContext = {
  role: string;
  scope: string;
  generatedAt: string;
  provider: AIProviderStatus;
  capabilities: AICapabilities;
  sources: string[];
  suggestions: string[];
  catalog: {
    alerts: Array<{ id: string; label: string; severity: "critical" | "warning" }>;
    devices: Array<{ deviceId: string; hostname: string; status: string }>;
  };
};

export type AIHistoryMessage = {
  role: "user" | "assistant";
  content: string;
};

export type AIOperationResult = {
  operation: string;
  answer: string;
  generatedAt: string;
  role: string;
  scope: string;
  sources: string[];
  provider: { name: string; model: string };
};

type ApiEnvelope<T> = {
  success: boolean;
  message: string;
  data: T;
};

async function requestToken() {
  let session = getStoredAuthSession();
  if (session && isSessionExpired(session)) session = await refreshSession();
  return session?.accessToken;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await requestToken();
  const perform = (accessToken?: string) =>
    fetch(`${getApiBaseUrl()}${path}`, {
      ...init,
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        ...init.headers,
      },
    });

  let response = await perform(token);
  if (response.status === 401) {
    const session = await refreshSession();
    if (session) response = await perform(session.accessToken);
  }

  const body = (await response.json().catch(() => null)) as ApiEnvelope<T> | { message?: string } | null;
  if (!response.ok) {
    throw new Error(body?.message ?? `AI request failed (${response.status})`);
  }

  return (body as ApiEnvelope<T>).data;
}

export function fetchAIStatus() {
  return request<AIStatus>("/ai/status");
}

export function fetchAIWorkspaceContext() {
  return request<AIWorkspaceContext>("/ai/context");
}

export function runOperationalQuery(message: string, history: AIHistoryMessage[]) {
  return request<AIOperationResult>("/ai/query", {
    method: "POST",
    body: JSON.stringify({ message, history: history.slice(-6) }),
  });
}

export function generateMonitoringSummary() {
  return request<AIOperationResult>("/ai/monitoring/summary", { method: "POST" });
}

export function prioritizeOpenAlerts() {
  return request<AIOperationResult>("/ai/alerts/prioritize", { method: "POST" });
}

export function explainOpenAlert(alertId: string) {
  return request<AIOperationResult>(`/ai/alerts/${encodeURIComponent(alertId)}/explain`, { method: "POST" });
}

export function getDeviceTroubleshooting(deviceId: string, question?: string) {
  return request<AIOperationResult>(`/ai/devices/${encodeURIComponent(deviceId)}/troubleshoot`, {
    method: "POST",
    body: JSON.stringify(question?.trim() ? { question: question.trim() } : {}),
  });
}
