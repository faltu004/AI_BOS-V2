import type {
 CreateScheduledNotificationInput,
 Notification,
 NotificationCategory,
 NotificationPreferences,
 ScheduledNotification,
} from "./notification.schema";
import { getApiBaseUrl } from "@shared/lib/env";

const apiBaseUrl = getApiBaseUrl();

type ApiEnvelope<T> = {
 success: boolean;
 message: string;
 data: T;
};

function authHeaders(token?: string) {
 return {
 "Content-Type": "application/json",
 ...(token ? { Authorization: `Bearer ${token}` } : {}),
 };
}

async function request<T>(path: string, token: string | undefined, init?: RequestInit): Promise<T> {
 const response = await fetch(`${apiBaseUrl}${path}`, {
 ...init,
 cache: "no-store",
 headers: authHeaders(token),
 });
 if (!response.ok) {
 const body = (await response.json().catch(() => null)) as { message?: string } | null;
 throw new Error(body?.message ?? `Request failed (${response.status})`);
 }
 const body = (await response.json()) as ApiEnvelope<T>;
 return body.data;
}

export type NotificationFilters = {
 category?: NotificationCategory;
 isRead?: boolean;
 search?: string;
 limit?: number;
};

export function fetchNotifications(token?: string, filters: NotificationFilters = {}) {
 const params = new URLSearchParams();
 if (filters.category) params.set("category", filters.category);
 if (typeof filters.isRead === "boolean") params.set("isRead", String(filters.isRead));
 if (filters.search) params.set("search", filters.search);
 params.set("limit", String(filters.limit ?? 50));

 return request<Notification[]>(`/notifications?${params.toString()}`, token);
}

export function fetchUnreadNotificationCount(token?: string) {
 return request<{ count: number }>("/notifications/unread-count", token);
}

export function markNotificationRead(id: string, token?: string) {
 return request<Notification>(`/notifications/${id}/read`, token, { method: "PATCH" });
}

export function markAllNotificationsRead(token?: string) {
 return request<{ modified: number }>("/notifications/read-all", token, { method: "PATCH" });
}

export function fetchNotificationPreferences(token?: string) {
 return request<NotificationPreferences>("/notifications/preferences", token);
}

export function updateNotificationPreference(
 category: NotificationCategory,
 channels: NotificationPreferences[NotificationCategory],
 token?: string,
) {
 return request<NotificationPreferences>("/notifications/preferences", token, {
 method: "PATCH",
 body: JSON.stringify({ category, channels }),
 });
}

export function fetchScheduledNotifications(token?: string) {
 return request<ScheduledNotification[]>("/notifications/scheduled", token);
}

export function createScheduledNotification(input: CreateScheduledNotificationInput, token?: string) {
 return request<ScheduledNotification>("/notifications/scheduled", token, {
 method: "POST",
 body: JSON.stringify(input),
 });
}

export function cancelScheduledNotification(id: string, token?: string) {
 return request<ScheduledNotification>(`/notifications/scheduled/${id}/cancel`, token, { method: "PATCH" });
}
