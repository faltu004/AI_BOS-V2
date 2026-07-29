import { z } from "zod";

export const roomIdParamsSchema = z.object({
  roomId: z.string().min(1),
});

export const updateNoteSchema = z.object({
  title: z.string().max(180).default("Shared notes"),
  body: z.string().max(20000).default(""),
});

export type UpdateNoteInput = z.infer<typeof updateNoteSchema>;
