import { z } from "zod";
import { notificationCategories } from "../constants/notification.js";

export const notificationIdParamsSchema = z.object({
  id: z.string().min(1),
});

export const listNotificationsQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(100).optional(),
  category: z.enum(notificationCategories).optional(),
  isRead: z.coerce.boolean().optional(),
  search: z.string().max(200).optional(),
});

export type ListNotificationsQuery = z.infer<typeof listNotificationsQuerySchema>;
