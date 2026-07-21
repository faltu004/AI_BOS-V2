import { z } from "zod";

export const sttRequestSchema = z.object({
  audio: z.instanceof(File).or(z.string()).optional(),
});

export const ttsRequestSchema = z.object({
  text: z.string().min(1, "Text is required").max(2000),
  voice: z.string().optional(),
});

export const voiceCommandSchema = z.object({
  text: z.string().min(1, "Command text is required").max(500),
});

export const createVoiceSessionSchema = z.object({
  deviceInfo: z.string().max(500).optional(),
});

export const voiceHistoryQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export type SttRequestInput = z.infer<typeof sttRequestSchema>;
export type TtsRequestInput = z.infer<typeof ttsRequestSchema>;
export type VoiceCommandInput = z.infer<typeof voiceCommandSchema>;
export type CreateVoiceSessionInput = z.infer<typeof createVoiceSessionSchema>;
export type VoiceHistoryQueryInput = z.infer<typeof voiceHistoryQuerySchema>;