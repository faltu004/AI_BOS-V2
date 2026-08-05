import { AtSign, Bell, CalendarClock, Megaphone, ShieldCheck, Sparkles, Info, Send, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { getStoredAuthSession } from "@shared/auth/auth-service";
import { authRoles } from "@shared/auth/types";
import { decodeUserIdFromToken } from "@shared/auth/decode-jwt";
import { cn } from "@shared/lib/utils";
import { formatDateTime } from "@shared/lib/utils-helpers";
import { Button } from "@shared/ui/button";
import { Card } from "@shared/ui/card";
import { EmptyState } from "@shared/ui/empty-state";
import { FilterBar } from "@shared/ui/filter-bar";
import { Input } from "@shared/ui/input";
import { Label } from "@shared/ui/label";
import { ToggleRow } from "@shared/ui/toggle-row";
import { useToast } from "@shared/ui/toast-context";
import {
 cancelScheduledNotification,
 createScheduledNotification,
 fetchNotificationPreferences,
 fetchNotifications,
 fetchScheduledNotifications,
 markAllNotificationsRead,
 markNotificationRead,
 updateNotificationPreference,
} from "./notification.api";
import {
 notificationCategories,
 notificationPriorities,
 type ChannelPreference,
 type Notification,
 type NotificationCategory,
 type NotificationChannelKey,
 type NotificationPreferences,
 type NotificationPriority,
 type ScheduledNotification,
} from "./notification.schema";
import { useNotificationSocket } from "./useNotifications";

const categoryIcons: Record<NotificationCategory, typeof Bell> = {
 mention: AtSign,
 approval: ShieldCheck,
 reminder: CalendarClock,
 ai_generated: Sparkles,
 system: Info,
 broadcast: Megaphone,
};

const priorityStyles: Record<NotificationPriority, string> = {
 Low: "bg-muted text-muted-foreground",
 Medium: "bg-primary/10 text-primary",
 High: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
 Critical: "bg-destructive/10 text-destructive",
};

const channelLabels: Record<NotificationChannelKey, string> = {
 inApp: "In-App",
 email: "Email",
 whatsapp: "WhatsApp (future-ready)",
 push: "Push (future-ready)",
};

function formatTime(iso: string) {
 return formatDateTime(iso);
}

type Tab = "history" | "preferences" | "compose";

const emptyChannels: ChannelPreference = { inApp: true, email: true, whatsapp: false, push: false };

export function NotificationCenterPage() {
 const { toast } = useToast();
 const session = useMemo(() => getStoredAuthSession(), []);
 const token = session?.accessToken;
 const currentUserId = useMemo(() => (token ? decodeUserIdFromToken(token) : null), [token]);
 const canBroadcast = ["Owner", "Administrator", "Manager", "HR"].includes(session?.user.role ?? "");

 const [tab, setTab] = useState<Tab>("history");
 const [notifications, setNotifications] = useState<Notification[]>([]);
 const [search, setSearch] = useState("");
 const [categoryFilter, setCategoryFilter] = useState<NotificationCategory | "">("");
 const [readFilter, setReadFilter] = useState<"" | "read" | "unread">("");
 const [loading, setLoading] = useState(true);

 const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);

 const [scheduled, setScheduled] = useState<ScheduledNotification[]>([]);
 const [composeTitle, setComposeTitle] = useState("");
 const [composeBody, setComposeBody] = useState("");
 const [composeCategory, setComposeCategory] = useState<NotificationCategory>("reminder");
 const [composePriority, setComposePriority] = useState<NotificationPriority>("Medium");
 const [composeScheduledFor, setComposeScheduledFor] = useState("");
 const [composeRoles, setComposeRoles] = useState<string[]>([]);
 const [composeRecurring, setComposeRecurring] = useState(false);
 const [composeFrequency, setComposeFrequency] = useState<"daily" | "weekly" | "monthly">("weekly");

 useNotificationSocket(token, (notification) => {
 setNotifications((current) => [notification, ...current]);
 });

 function loadHistory() {
 if (!token) return;
 setLoading(true);
 fetchNotifications(token, {
 category: categoryFilter || undefined,
 isRead: readFilter === "" ? undefined : readFilter === "read",
 search: search || undefined,
 })
 .then(setNotifications)
 .catch((error: Error) => toast({ title: "Could not load notifications", description: error.message, type: "error" }))
 .finally(() => setLoading(false));
 }

 useEffect(() => {
 loadHistory();
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [token, categoryFilter, readFilter]);

 useEffect(() => {
 if (!token || tab !== "preferences") return;
 fetchNotificationPreferences(token).then(setPreferences).catch(() => undefined);
 }, [token, tab]);

 useEffect(() => {
 if (!token || tab !== "compose" || !canBroadcast) return;
 fetchScheduledNotifications(token).then(setScheduled).catch(() => undefined);
 }, [token, tab, canBroadcast]);

 async function handleMarkRead(id: string) {
 if (!token) return;
 await markNotificationRead(id, token).catch(() => undefined);
 setNotifications((current) => current.map((item) => (item._id === id ? { ...item, isRead: true } : item)));
 }

 async function handleMarkAllRead() {
 if (!token) return;
 await markAllNotificationsRead(token).catch(() => undefined);
 setNotifications((current) => current.map((item) => ({ ...item, isRead: true })));
 }

 async function handlePreferenceChange(category: NotificationCategory, channel: NotificationChannelKey, value: boolean) {
 if (!token || !preferences) return;
 const nextChannels = { ...(preferences[category] ?? emptyChannels), [channel]: value };
 setPreferences({ ...preferences, [category]: nextChannels });
 try {
 const updated = await updateNotificationPreference(category, nextChannels, token);
 setPreferences(updated);
 } catch (error) {
 toast({ title: "Could not save preference", description: (error as Error).message, type: "error" });
 }
 }

 async function handleCompose() {
 if (!token || !composeTitle.trim() || !composeScheduledFor) return;
 try {
 await createScheduledNotification(
 {
 recipientUserIds: [],
 recipientRoles: composeRoles,
 title: composeTitle.trim(),
 body: composeBody.trim(),
 category: composeCategory,
 priority: composePriority,
 scheduledFor: new Date(composeScheduledFor).toISOString(),
 recurrence: composeRecurring ? { frequency: composeFrequency, interval: 1 } : undefined,
 },
 token,
 );
 toast({ title: "Notification scheduled", type: "success" });
 setComposeTitle("");
 setComposeBody("");
 setComposeRoles([]);
 const updated = await fetchScheduledNotifications(token);
 setScheduled(updated);
 } catch (error) {
 toast({ title: "Could not schedule notification", description: (error as Error).message, type: "error" });
 }
 }

 async function handleCancelScheduled(id: string) {
 if (!token) return;
 await cancelScheduledNotification(id, token).catch(() => undefined);
 setScheduled((current) => current.map((item) => (item._id === id ? { ...item, isActive: false } : item)));
 }

 if (!token) {
 return (
 <div className="p-6">
 <EmptyState icon={Bell} title="Sign in required" description="Sign in to view your notifications." />
 </div>
 );
 }

 return (
 <div className="space-y-6 p-4 lg:p-6">
 <div>
 <p className="text-sm font-semibold text-primary">Notification Center</p>
 <h1 className="text-2xl font-bold">Stay on top of everything</h1>
 <p className="text-sm text-muted-foreground">In-app, email, and future-ready WhatsApp/push delivery — all in one place.</p>
 </div>

 <div className="flex gap-1 border-b">
 {(["history", "preferences", ...(canBroadcast ? (["compose"] as const) : [])] as Tab[]).map((item) => (
 <button
 key={item}
 type="button"
 onClick={() => setTab(item)}
 className={cn(
 "border-b-2 px-4 py-2 text-sm font-semibold capitalize transition-colors",
 tab === item ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground",
 )}
 >
 {item}
 </button>
 ))}
 </div>

 {tab === "history" && (
 <div className="space-y-4">
 <FilterBar
 search={search}
 onSearchChange={setSearch}
 placeholder="Search notifications..."
 filters={
 <>
 <select
 value={categoryFilter}
 onChange={(event) => setCategoryFilter(event.target.value as NotificationCategory | "")}
 className="h-10 rounded-lg border border-input bg-background px-3 text-sm"
 >
 <option value="">All categories</option>
 {notificationCategories.map((category) => (
 <option key={category} value={category}>
 {category.replace("_", " ")}
 </option>
 ))}
 </select>
 <select
 value={readFilter}
 onChange={(event) => setReadFilter(event.target.value as "" | "read" | "unread")}
 className="h-10 rounded-lg border border-input bg-background px-3 text-sm"
 >
 <option value="">Read & unread</option>
 <option value="unread">Unread only</option>
 <option value="read">Read only</option>
 </select>
 </>
 }
 actions={
 <div className="flex gap-2">
 <Button variant="outline" onClick={loadHistory} type="button">
 Search
 </Button>
 <Button variant="outline" onClick={handleMarkAllRead} type="button">
 Mark all read
 </Button>
 </div>
 }
 />

 {loading ? (
 <p className="text-sm text-muted-foreground">Loading…</p>
 ) : notifications.length === 0 ? (
 <EmptyState icon={Bell} title="No notifications" description="You're all caught up." />
 ) : (
 <div className="space-y-2">
 {notifications.map((notification) => {
 const Icon = categoryIcons[notification.category] ?? Bell;
 return (
 <Card
 key={notification._id}
 className={cn("flex items-start gap-3 p-4", !notification.isRead && "border-primary/40 bg-primary/5")}
 >
 <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
 <div className="min-w-0 flex-1">
 <div className="flex flex-wrap items-center gap-2">
 <p className="font-semibold">{notification.title}</p>
 <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold uppercase", priorityStyles[notification.priority])}>
 {notification.priority}
 </span>
 <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] uppercase text-muted-foreground">
 {notification.category.replace("_", " ")}
 </span>
 </div>
 <p className="mt-1 text-sm text-muted-foreground">{notification.body}</p>
 <p className="mt-1 text-xs text-muted-foreground">{formatTime(notification.createdAt)}</p>
 </div>
 {!notification.isRead && (
 <Button size="sm" variant="outline" onClick={() => handleMarkRead(notification._id)}>
 Mark read
 </Button>
 )}
 </Card>
 );
 })}
 </div>
 )}
 </div>
 )}

 {tab === "preferences" && (
 <div className="space-y-4">
 {!preferences ? (
 <p className="text-sm text-muted-foreground">Loading…</p>
 ) : (
 notificationCategories.map((category) => (
 <Card key={category} className="p-4">
 <p className="mb-3 font-semibold capitalize">{category.replace("_", " ")}</p>
 <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
 {(Object.keys(channelLabels) as NotificationChannelKey[]).map((channel) => (
 <ToggleRow
 key={channel}
 label={channelLabels[channel]}
 checked={preferences[category]?.[channel] ?? emptyChannels[channel]}
 onChange={(value) => handlePreferenceChange(category, channel, value)}
 />
 ))}
 </div>
 </Card>
 ))
 )}
 </div>
 )}

 {tab === "compose" && canBroadcast && (
 <div className="grid gap-6 lg:grid-cols-2">
 <Card className="space-y-3 p-4">
 <p className="font-semibold">Compose a scheduled notification</p>
 <div className="space-y-1">
 <Label>Title</Label>
 <Input value={composeTitle} onChange={(event) => setComposeTitle(event.target.value)} placeholder="Notification title" />
 </div>
 <div className="space-y-1">
 <Label>Message</Label>
 <textarea
 value={composeBody}
 onChange={(event) => setComposeBody(event.target.value)}
 className="min-h-24 w-full rounded-md border bg-background p-2 text-sm"
 />
 </div>
 <div className="grid grid-cols-2 gap-3">
 <div className="space-y-1">
 <Label>Category</Label>
 <select
 value={composeCategory}
 onChange={(event) => setComposeCategory(event.target.value as NotificationCategory)}
 className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
 >
 {notificationCategories.map((category) => (
 <option key={category} value={category}>
 {category.replace("_", " ")}
 </option>
 ))}
 </select>
 </div>
 <div className="space-y-1">
 <Label>Priority</Label>
 <select
 value={composePriority}
 onChange={(event) => setComposePriority(event.target.value as NotificationPriority)}
 className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
 >
 {notificationPriorities.map((priority) => (
 <option key={priority} value={priority}>
 {priority}
 </option>
 ))}
 </select>
 </div>
 </div>
 <div className="space-y-1">
 <Label>Send at</Label>
 <Input
 type="datetime-local"
 value={composeScheduledFor}
 onChange={(event) => setComposeScheduledFor(event.target.value)}
 />
 </div>
 <div className="space-y-1">
 <Label>Target roles (empty = everyone)</Label>
 <div className="flex flex-wrap gap-2">
 {authRoles.map((role) => (
 <button
 key={role}
 type="button"
 onClick={() =>
 setComposeRoles((current) =>
 current.includes(role) ? current.filter((item) => item !== role) : [...current, role],
 )
 }
 className={cn(
 "rounded-full border px-3 py-1 text-xs font-semibold",
 composeRoles.includes(role) ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground",
 )}
 >
 {role}
 </button>
 ))}
 </div>
 </div>
 <ToggleRow label="Recurring" checked={composeRecurring} onChange={setComposeRecurring} />
 {composeRecurring && (
 <select
 value={composeFrequency}
 onChange={(event) => setComposeFrequency(event.target.value as "daily" | "weekly" | "monthly")}
 className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
 >
 <option value="daily">Daily</option>
 <option value="weekly">Weekly</option>
 <option value="monthly">Monthly</option>
 </select>
 )}
 <Button onClick={handleCompose} className="w-full">
 <Send className="h-4 w-4" />
 Schedule
 </Button>
 </Card>

 <Card className="space-y-2 p-4">
 <p className="font-semibold">Scheduled & recurring</p>
 {scheduled.length === 0 && <p className="text-sm text-muted-foreground">Nothing scheduled yet.</p>}
 {scheduled.map((item) => (
 <div key={item._id} className="flex items-start justify-between gap-2 rounded-lg border p-3 text-sm">
 <div>
 <p className="font-semibold">{item.title}</p>
 <p className="text-xs text-muted-foreground">
 {item.recurrence ? `Recurring ${item.recurrence.frequency}` : "One-off"} · next {formatTime(item.nextFireAt)}
 </p>
 <p className="text-xs text-muted-foreground">
 {item.recipientRoles.length
 ? item.recipientRoles.join(", ")
 : item.recipientUserIds.length === 1 && item.recipientUserIds[0] === currentUserId
 ? "Just you"
 : item.recipientUserIds.length > 0
 ? `${item.recipientUserIds.length} people`
 : "Everyone"}
 </p>
 </div>
 {item.isActive ? (
 <Button size="icon" variant="outline" onClick={() => handleCancelScheduled(item._id)} aria-label="Cancel">
 <X className="h-4 w-4" />
 </Button>
 ) : (
 <span className="text-xs text-muted-foreground">Cancelled</span>
 )}
 </div>
 ))}
 </Card>
 </div>
 )}
 </div>
 );
}
