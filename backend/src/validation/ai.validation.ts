import { z } from "zod";

export const aiChatSchema = z.object({
  message: z.string().trim().min(1, "Message is required").max(4000),
  conversationId: z.string().trim().max(120).optional(),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().trim().max(4000),
      }),
    )
    .max(12)
    .optional()
    .default([]),
});

export type AIChatInput = z.infer<typeof aiChatSchema>;
