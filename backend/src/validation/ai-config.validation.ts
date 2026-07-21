import { z } from "zod";
import { aiProviders } from "../constants/ai-config.js";

const apiKeysSchema = z.object({
  OpenAI: z.string().max(4000).optional(),
  Gemini: z.string().max(4000).optional(),
  Ollama: z.string().max(4000).optional(),
  Groq: z.string().max(4000).optional(),
  OpenRouter: z.string().max(4000).optional(),
});

export const updateAIConfigSchema = z.object({
  provider: z.enum(aiProviders),
  apiKeys: apiKeysSchema.default({}),
  defaultModel: z.string().min(1).max(120),
  embeddingModel: z.string().min(1).max(120),
  temperature: z.number().min(0).max(2),
  maxTokens: z.number().int().min(256).max(200000),
  contextWindow: z.number().int().min(1024).max(2000000),
  features: z.object({
    streaming: z.boolean(),
    memory: z.boolean(),
    rag: z.boolean(),
    ocr: z.boolean(),
    voice: z.boolean(),
  }),
});

export type UpdateAIConfigInput = z.infer<typeof updateAIConfigSchema>;
