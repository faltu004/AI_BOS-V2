import { z } from "zod";

export const messageIdParamsSchema = z.object({
  id: z.string().min(1),
});

export const roomIdParamsSchema = z.object({
  roomId: z.string().min(1),
});

const attachmentSchema = z.object({
  fileName: z.string().min(1).max(200),
  storedPath: z.string().min(1),
  mimeType: z.string().min(1),
  size: z.number().min(0),
  url: z.string().min(1),
});

export const sendMessageSchema = z.object({
  body: z.string().max(4000).default(""),
  attachments: z.array(attachmentSchema).default([]),
});

export const editMessageSchema = z.object({
  body: z.string().min(1).max(4000),
});

export const reactMessageSchema = z.object({
  emoji: z.string().min(1).max(8),
});

export const pinMessageSchema = z.object({
  pinned: z.boolean(),
});

export const listMessagesQuerySchema = z.object({
  before: z.string().datetime().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
});

export const searchMessagesQuerySchema = z.object({
  q: z.string().min(1).max(200),
});

export type SendMessageInput = z.infer<typeof sendMessageSchema>;
export type EditMessageInput = z.infer<typeof editMessageSchema>;
export type ReactMessageInput = z.infer<typeof reactMessageSchema>;
export type PinMessageInput = z.infer<typeof pinMessageSchema>;
