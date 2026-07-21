import { z } from "zod";

export const copilotMessageSchema = z.object({
  message: z.string().min(1).max(12000),
  conversationId: z.string().optional(),
  pageContext: z.object({
    page: z.string().optional(),
    module: z.string().optional(),
    recordId: z.string().optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
  }).optional(),
  history: z.array(
    z.object({
      role: z.enum(["user", "assistant"]),
      content: z.string(),
    })
  ).default([]),
});

export const copilotContextSchema = z.object({
  page: z.string().optional(),
  module: z.string().optional(),
});

export const copilotSuggestionsSchema = z.object({
  page: z.string().optional(),
});

export type CopilotMessageInput = z.infer<typeof copilotMessageSchema>;
export type CopilotContextInput = z.infer<typeof copilotContextSchema>;
export type CopilotSuggestionsInput = z.infer<typeof copilotSuggestionsSchema>;
