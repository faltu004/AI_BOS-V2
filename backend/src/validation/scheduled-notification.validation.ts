import { z } from "zod";
import { notificationCategories, notificationPriorities, recurrenceFrequencies } from "../constants/notification.js";

const recurrenceSchema = z.object({
  frequency: z.enum(recurrenceFrequencies),
  interval: z.number().int().min(1).default(1),
  endDate: z.coerce.date().optional(),
});

export const createScheduledNotificationSchema = z.object({
  recipientUserIds: z.array(z.string().min(1)).default([]),
  recipientRoles: z.array(z.string().min(1)).default([]),
  title: z.string().min(2).max(200),
  body: z.string().max(500).default(""),
  category: z.enum(notificationCategories).default("reminder"),
  priority: z.enum(notificationPriorities).default("Medium"),
  actionUrl: z.string().max(300).optional(),
  scheduledFor: z.coerce.date(),
  recurrence: recurrenceSchema.optional(),
});

export const scheduledNotificationIdParamsSchema = z.object({
  id: z.string().min(1),
});

export type CreateScheduledNotificationInput = z.infer<typeof createScheduledNotificationSchema>;
