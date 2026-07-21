import { z } from "zod";

export const aiProviders = ["OpenAI", "Gemini", "Ollama", "Groq", "OpenRouter"] as const;

export type AIProvider = (typeof aiProviders)[number];

export const aiProviderMeta: Record<AIProvider, { description: string; models: string[]; embeddingModels: string[] }> = {
  OpenAI: {
    description: "Enterprise-grade reasoning, chat, embeddings, vision, and realtime AI.",
    models: ["gpt-4o", "gpt-4o-mini", "gpt-4.1", "o3-mini"],
    embeddingModels: ["text-embedding-3-small", "text-embedding-3-large"],
  },
  Gemini: {
    description: "Google AI models for multimodal reasoning and long context workflows.",
    models: ["gemini-1.5-pro", "gemini-1.5-flash", "gemini-2.0-flash"],
    embeddingModels: ["text-embedding-004", "gemini-embedding-exp"],
  },
  Ollama: {
    description: "Self-hosted local models for private deployments and offline automation.",
    models: ["llama3.1", "mistral", "qwen2.5", "deepseek-r1"],
    embeddingModels: ["nomic-embed-text", "mxbai-embed-large"],
  },
  Groq: {
    description: "Fast inference for operational assistants and streaming workflows.",
    models: ["llama-3.1-70b-versatile", "mixtral-8x7b-32768", "gemma2-9b-it"],
    embeddingModels: ["nomic-embed-text"],
  },
  OpenRouter: {
    description: "Multi-provider routing for model experimentation and fallback policies.",
    models: ["openai/gpt-4o-mini", "anthropic/claude-3.5-sonnet", "google/gemini-pro"],
    embeddingModels: ["openai/text-embedding-3-small"],
  },
};

export const aiConfigSchema = z.object({
  provider: z.enum(aiProviders),
  apiKeys: z.object({
    OpenAI: z.string().max(4000).optional(),
    Gemini: z.string().max(4000).optional(),
    Ollama: z.string().max(4000).optional(),
    Groq: z.string().max(4000).optional(),
    OpenRouter: z.string().max(4000).optional(),
  }),
  defaultModel: z.string().min(1, "Default model is required").max(120),
  embeddingModel: z.string().min(1, "Embedding model is required").max(120),
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

export type AIConfigForm = z.infer<typeof aiConfigSchema>;

export type AIConfigResponse = Omit<AIConfigForm, "apiKeys"> & {
  keyStatus: Record<AIProvider, boolean>;
  updatedAt?: string;
};

export const defaultAIConfig: AIConfigForm = {
  provider: "OpenAI",
  apiKeys: {},
  defaultModel: "gpt-4o-mini",
  embeddingModel: "text-embedding-3-small",
  temperature: 0.2,
  maxTokens: 4096,
  contextWindow: 128000,
  features: {
    streaming: true,
    memory: true,
    rag: true,
    ocr: false,
    voice: false,
  },
};
