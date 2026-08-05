import { z } from "zod";

export const commentResourceParamsSchema = z.object({
  id: z.string().min(1),
});

export const commentIdParamsSchema = z.object({
  id: z.string().min(1),
  commentId: z.string().min(1),
});

export const createCommentSchema = z.object({
  body: z.string().min(1).max(3000),
});

export const updateCommentSchema = z.object({
  body: z.string().min(1).max(3000),
});

export const listCommentsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
});

export type CreateCommentInput = z.infer<typeof createCommentSchema>;
export type UpdateCommentInput = z.infer<typeof updateCommentSchema>;
export type ListCommentsQuery = z.infer<typeof listCommentsQuerySchema>;
