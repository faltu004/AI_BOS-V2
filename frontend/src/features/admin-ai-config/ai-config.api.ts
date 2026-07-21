import type { AIConfigForm, AIConfigResponse, AIProvider } from "./ai-config.schema";

const viteEnv = (import.meta as unknown as { env?: Record<string, string | undefined> }).env;
const apiBaseUrl = viteEnv?.VITE_API_BASE_URL ?? "http://127.0.0.1:5000/api/v1";
const localSettingsKey = "ai-bos-ai-config-non-secret";

type ApiEnvelope<T> = {
  success: boolean;
  message: string;
  data: T;
};

function authHeaders(token?: string) {
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function fetchAIConfig(token?: string): Promise<AIConfigResponse> {
  const response = await fetch(`${apiBaseUrl}/ai-config`, {
    headers: authHeaders(token),
  });
  if (!response.ok) {
    throw new Error("Unable to load secure AI configuration");
  }
  const body = (await response.json()) as ApiEnvelope<AIConfigResponse>;
  return body.data;
}

export async function saveAIConfig(input: AIConfigForm, token?: string): Promise<AIConfigResponse> {
  const response = await fetch(`${apiBaseUrl}/ai-config`, {
    method: "PATCH",
    headers: authHeaders(token),
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    throw new Error("Unable to save secure AI configuration");
  }
  const body = (await response.json()) as ApiEnvelope<AIConfigResponse>;
  return body.data;
}

export function saveNonSecretFallback(input: AIConfigForm) {
  const providers: AIProvider[] = ["OpenAI", "Gemini", "Ollama", "Groq", "OpenRouter"];
  const keyStatus = Object.fromEntries(providers.map((provider) => [provider, false])) as Record<AIProvider, boolean>;

  const nonSecret: AIConfigResponse = {
    provider: input.provider,
    defaultModel: input.defaultModel,
    embeddingModel: input.embeddingModel,
    temperature: input.temperature,
    maxTokens: input.maxTokens,
    contextWindow: input.contextWindow,
    features: input.features,
    keyStatus,
    updatedAt: new Date().toISOString(),
  };

  localStorage.setItem(localSettingsKey, JSON.stringify(nonSecret));
  return nonSecret;
}

export function readNonSecretFallback(): AIConfigResponse | null {
  const raw = localStorage.getItem(localSettingsKey);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AIConfigResponse;
  } catch {
    return null;
  }
}
