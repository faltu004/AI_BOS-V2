export const aiProviders = ["OpenAI", "Gemini", "Ollama", "Groq", "OpenRouter"] as const;

export type AIProvider = (typeof aiProviders)[number];

export const aiConfigScope = "global";
