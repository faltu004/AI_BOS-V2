export type AIChatRole = "user" | "assistant";

export type AIChatMessage = {
  id: string;
  role: AIChatRole;
  content: string;
  createdAt: string;
};

export type AIChatRequestMessage = {
  role: AIChatRole;
  content: string;
};

export type AIChatResponse = {
  answer: string;
  role: string;
  scope: string;
  sources: string[];
  suggestions: string[];
  usedFallback: boolean;
};

export type AIContextResponse = {
  role: string;
  scope: string;
  sources: string[];
  suggestions: string[];
  preview: unknown;
};
