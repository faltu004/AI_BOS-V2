import { z } from "zod";
import { notificationCategories, notificationChannels } from "../constants/notification.js";

const channelPreferenceSchema = z.object(
  Object.fromEntries(notificationChannels.map((channel) => [channel, z.boolean()])) as Record<
    (typeof notificationChannels)[number],
    z.ZodBoolean
  >,
);

export const updateNotificationPreferenceSchema = z.object({
  category: z.enum(notificationCategories),
  channels: channelPreferenceSchema,
});

export type UpdateNotificationPreferenceInput = z.infer<typeof updateNotificationPreferenceSchema>;
