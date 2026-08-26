import { env } from "../config/env.js";
import { AppError } from "../utils/app-error.js";

export type AIChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type AIProviderStatus = {
  configured: boolean;
  provider: "disabled" | "ollama" | "openai-compatible";
  model?: string;
  reason?: string;
};

export type AIProviderResult = {
  answer: string;
  provider: Exclude<AIProviderStatus["provider"], "disabled">;
  model: string;
};

function endpoint(baseUrl: string, path: string) {
  return `${baseUrl.replace(/\/+$/, "")}${path}`;
}

function providerStatus(): AIProviderStatus {
  if (env.AI_PROVIDER === "disabled") {
    return {
      configured: false,
      provider: "disabled",
      reason: "AI provider is not configured on the backend.",
    };
  }

  if (!env.AI_PROVIDER_BASE_URL || !env.AI_PROVIDER_MODEL) {
    return {
      configured: false,
      provider: env.AI_PROVIDER,
      reason: "AI provider URL and model must be configured on the backend.",
    };
  }

  if (env.AI_PROVIDER === "openai-compatible" && !env.AI_PROVIDER_API_KEY) {
    return {
      configured: false,
      provider: env.AI_PROVIDER,
      model: env.AI_PROVIDER_MODEL,
      reason: "The configured AI provider requires a backend API key.",
    };
  }

  return {
    configured: true,
    provider: env.AI_PROVIDER,
    model: env.AI_PROVIDER_MODEL,
  };
}

export class AIProviderService {
  getStatus(): AIProviderStatus {
    return providerStatus();
  }

  async chat(messages: AIChatMessage[]): Promise<AIProviderResult> {
    const status = this.getStatus();

    if (!status.configured || status.provider === "disabled" || !status.model || !env.AI_PROVIDER_BASE_URL) {
      throw new AppError(status.reason ?? "AI provider is not configured on the backend.", 503);
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), env.AI_REQUEST_TIMEOUT_MS);

    try {
      const isOllama = status.provider === "ollama";
      const response = await fetch(
        endpoint(env.AI_PROVIDER_BASE_URL, isOllama ? "/api/chat" : "/chat/completions"),
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(!isOllama && env.AI_PROVIDER_API_KEY
              ? { Authorization: `Bearer ${env.AI_PROVIDER_API_KEY}` }
              : {}),
          },
          signal: controller.signal,
          body: JSON.stringify(
            isOllama
              ? {
                  model: status.model,
                  stream: false,
                  think: false,
                  keep_alive: "30m",
                  messages,
                  options: {
                    temperature: 0.1,
                    num_ctx: 8192,
                    num_predict: env.AI_MAX_OUTPUT_TOKENS,
                  },
                }
              : {
                  model: status.model,
                  messages,
                  temperature: 0.1,
                  max_tokens: env.AI_MAX_OUTPUT_TOKENS,
                },
          ),
        },
      );

      if (!response.ok) {
        throw new AppError("The AI provider rejected the request.", 502);
      }

      const json = (await response.json()) as {
        message?: { content?: string };
        response?: string;
        choices?: Array<{ message?: { content?: string } }>;
      };
      const answer = isOllama
        ? json.message?.content ?? json.response
        : json.choices?.[0]?.message?.content;

      if (!answer?.trim()) {
        throw new AppError("The AI provider returned an empty response.", 502);
      }

      return {
        answer: answer.trim(),
        provider: status.provider,
        model: status.model,
      };
    } catch (error) {
      if (error instanceof AppError) throw error;

      if (error instanceof Error && error.name === "AbortError") {
        throw new AppError("The AI provider request timed out.", 504);
      }

      throw new AppError("The AI provider is currently unavailable.", 503);
    } finally {
      clearTimeout(timeout);
    }
  }
}

export const aiProviderService = new AIProviderService();
