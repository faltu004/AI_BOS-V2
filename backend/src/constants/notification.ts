export const notificationCategories = ["mention", "approval", "reminder", "ai_generated", "system", "broadcast"] as const;
export type NotificationCategory = (typeof notificationCategories)[number];

export const notificationPriorities = ["Low", "Medium", "High", "Critical"] as const;
export type NotificationPriority = (typeof notificationPriorities)[number];

export const notificationChannels = ["inApp", "email", "whatsapp", "push"] as const;
export type NotificationChannel = (typeof notificationChannels)[number];

export const recurrenceFrequencies = ["daily", "weekly", "monthly"] as const;
export type RecurrenceFrequency = (typeof recurrenceFrequencies)[number];

export type ChannelPreference = Record<NotificationChannel, boolean>;

export const defaultChannelPreference: ChannelPreference = {
  inApp: true,
  email: true,
  whatsapp: false,
  push: false,
};
