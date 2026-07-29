import { z } from "zod";

export const roomIdParamsSchema = z.object({
  id: z.string().min(1),
});

export const teamIdParamsSchema = z.object({
  teamId: z.string().min(1),
});

export const projectIdParamsSchema = z.object({
  projectId: z.string().min(1),
});

export const entityParamsSchema = z.object({
  entityType: z.string().min(1).max(60),
  entityId: z.string().min(1).max(120),
});

export const createDirectRoomSchema = z.object({
  participantIds: z.array(z.string().min(1)).min(1),
});

export type CreateDirectRoomInput = z.infer<typeof createDirectRoomSchema>;
