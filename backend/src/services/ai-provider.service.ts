import { env } from "../config/env.js";

type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type AIProviderResult = {
  answer: string;
  usedFallback: boolean;
};

/**
 * Never echo the raw context object back to the user here — `context` can carry
 * salary/tax fields for other employees (legitimately scoped for Owner/Administrator
 * by ai-context.service.ts), and a chat transcript is the wrong place to surface that
 * verbatim even when the viewer is allowed to see it elsewhere in the app.
 */
function fallbackAnswer() {
  return "The AI assistant's local model (Ollama) isn't running right now, so I can't generate an answer. Please try again once it's available, or contact your administrator.";
}

export class AIProviderService {
  async chat(messages: ChatMessage[]): Promise<AIProviderResult> {
    const ollamaBaseUrl = env.OLLAMA_BASE_URL;
    const model = env.OLLAMA_MODEL;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), env.AI_REQUEST_TIMEOUT_MS);
      const response = await fetch(`${ollamaBaseUrl}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          model,
          stream: false,
          messages,
          options: {
            temperature: 0.2,
            num_ctx: 8192,
          },
        }),
      });
      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error(`Ollama responded with ${response.status}`);
      }

      const json = (await response.json()) as { message?: { content?: string }; response?: string };
      const answer = json.message?.content ?? json.response;
      if (!answer?.trim()) throw new Error("Empty local model response");
      return { answer: answer.trim(), usedFallback: false };
    } catch {
      return { answer: fallbackAnswer(), usedFallback: true };
    }
  }
}

export const aiProviderService = new AIProviderService();
