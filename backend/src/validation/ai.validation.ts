import { z } from "zod";

export const aiChatSchema = z.object({
  message: z.string().trim().min(1, "Message is required").max(1500),
  conversationId: z.string().trim().max(120).optional(),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().trim().min(1).max(1500),
      }),
    )
    .max(6)
    .optional()
    .default([]),
}).strict();

export const aiAlertParamsSchema = z.object({
  alertId: z.string().regex(/^[a-f\d]{24}$/i, "Invalid alert identifier"),
});

export const aiDeviceParamsSchema = z.object({
  deviceId: z.string().trim().min(1).max(100),
});

export const aiDeviceGuidanceSchema = z.object({
  question: z.string().trim().min(1).max(500).optional(),
}).strict();

export type AIChatInput = z.infer<typeof aiChatSchema>;
export type AIDeviceGuidanceInput = z.infer<typeof aiDeviceGuidanceSchema>;
