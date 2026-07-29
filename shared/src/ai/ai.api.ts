import { getStoredAuthSession, isSessionExpired, refreshSession } from "@shared/auth/auth-service";
import { getApiBaseUrl } from "@shared/lib/env";
import type { AIChatRequestMessage, AIChatResponse, AIContextResponse } from "./ai.types";

type ApiEnvelope<T> = {
  success: boolean;
  message: string;
  data: T;
};

async function getRequestToken() {
  let session = getStoredAuthSession();
  if (session && isSessionExpired(session)) {
    session = await refreshSession();
  }
  return session?.accessToken;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await getRequestToken();
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  });

  const finalResponse =
    response.status === 401
      ? await refreshSession().then((session) =>
          session
            ? fetch(`${getApiBaseUrl()}${path}`, {
                ...init,
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${session.accessToken}`,
                  ...init.headers,
                },
              })
            : response,
        )
      : response;

  const body = (await finalResponse.json().catch(() => null)) as ApiEnvelope<T> | { message?: string } | null;

  if (!finalResponse.ok) {
    throw new Error(body?.message ?? `AI request failed (${finalResponse.status})`);
  }

  return (body as ApiEnvelope<T>).data;
}

export function fetchAIContext() {
  return request<AIContextResponse>("/ai/context");
}

export function sendAIMessage(message: string, history: AIChatRequestMessage[]) {
  return request<AIChatResponse>("/ai/chat", {
    method: "POST",
    body: JSON.stringify({ message, history }),
  });
}
