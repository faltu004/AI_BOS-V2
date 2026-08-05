export type NotificationCategory = "mention" | "approval" | "reminder" | "ai_generated" | "system" | "broadcast";
export type NotificationPriority = "Low" | "Medium" | "High" | "Critical";
export type NotificationChannelKey = "inApp" | "email" | "whatsapp" | "push";
export type RecurrenceFrequency = "daily" | "weekly" | "monthly";

export const notificationCategories: NotificationCategory[] = [
 "mention",
 "approval",
 "reminder",
 "ai_generated",
 "system",
 "broadcast",
];

export const notificationPriorities: NotificationPriority[] = ["Low", "Medium", "High", "Critical"];

export type ChannelPreference = Record<NotificationChannelKey, boolean>;

export type Notification = {
 _id: string;
 recipientUserId: string;
 actorUserId?: string;
 type: string;
 category: NotificationCategory;
 priority: NotificationPriority;
 title: string;
 body: string;
 actionUrl?: string;
 sourceType?: string;
 sourceId?: string;
 metadata?: Record<string, unknown>;
 channels: ChannelPreference;
 isRead: boolean;
 createdAt: string;
};

export type NotificationPreferences = Record<NotificationCategory, ChannelPreference>;

export type ScheduledNotification = {
 _id: string;
 createdBy: string;
 recipientUserIds: string[];
 recipientRoles: string[];
 title: string;
 body: string;
 category: NotificationCategory;
 priority: NotificationPriority;
 actionUrl?: string;
 scheduledFor: string;
 recurrence?: { frequency: RecurrenceFrequency; interval: number; endDate?: string };
 isActive: boolean;
 lastFiredAt?: string;
 nextFireAt: string;
 timesFired: number;
 createdAt: string;
};

export type CreateScheduledNotificationInput = {
 recipientUserIds: string[];
 recipientRoles: string[];
 title: string;
 body: string;
 category: NotificationCategory;
 priority: NotificationPriority;
 actionUrl?: string;
 scheduledFor: string;
 recurrence?: { frequency: RecurrenceFrequency; interval: number; endDate?: string };
};
