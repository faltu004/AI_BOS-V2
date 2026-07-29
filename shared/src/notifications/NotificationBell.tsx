import { AtSign, Bell, CalendarClock, Megaphone, ShieldCheck, Sparkles, Info } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getStoredAuthSession } from "@shared/auth/auth-service";
import { cn } from "@shared/lib/utils";
import {
  fetchNotifications,
  fetchUnreadNotificationCount,
  markAllNotificationsRead,
  markNotificationRead,
} from "./notification.api";
import type { Notification, NotificationCategory } from "./notification.schema";
import { useNotificationSocket } from "./useNotifications";

const categoryIcons: Record<NotificationCategory, typeof Bell> = {
  mention: AtSign,
  approval: ShieldCheck,
  reminder: CalendarClock,
  ai_generated: Sparkles,
  system: Info,
  broadcast: Megaphone,
};

const priorityDot: Record<Notification["priority"], string> = {
  Low: "bg-muted-foreground",
  Medium: "bg-primary",
  High: "bg-amber-500",
  Critical: "bg-destructive",
};

export function NotificationBell() {
  const session = useMemo(() => getStoredAuthSession(), []);
  const token = session?.accessToken;

  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useNotificationSocket(token, (notification) => {
    setNotifications((current) => [notification, ...current].slice(0, 30));
    setUnreadCount((count) => count + 1);
  });

  useEffect(() => {
    if (!token) return;
    fetchUnreadNotificationCount(token)
      .then((result) => setUnreadCount(result.count))
      .catch(() => undefined);
  }, [token]);

  useEffect(() => {
    if (!open || !token) return;
    fetchNotifications(token, { limit: 10 })
      .then(setNotifications)
      .catch(() => undefined);
  }, [open, token]);

  if (!token) return null;

  async function handleMarkAllRead() {
    if (!token) return;
    await markAllNotificationsRead(token).catch(() => undefined);
    setNotifications((current) => current.map((item) => ({ ...item, isRead: true })));
    setUnreadCount(0);
  }

  async function handleMarkRead(id: string) {
    if (!token) return;
    await markNotificationRead(id, token).catch(() => undefined);
    setNotifications((current) => current.map((item) => (item._id === id ? { ...item, isRead: true } : item)));
    setUnreadCount((count) => Math.max(0, count - 1));
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="relative flex h-9 w-9 items-center justify-center rounded-lg hover:bg-muted"
        aria-label="Notifications"
      >
        <Bell className="h-4 w-4 text-primary" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 rounded-lg border bg-popover p-2 shadow-xl">
          <div className="flex items-center justify-between px-1 pb-2">
            <p className="text-sm font-semibold">Notifications</p>
            <button type="button" onClick={handleMarkAllRead} className="text-xs text-primary hover:underline">
              Mark all read
            </button>
          </div>
          <div className="max-h-80 space-y-1 overflow-y-auto">
            {notifications.length === 0 && <p className="p-3 text-center text-xs text-muted-foreground">No notifications yet.</p>}
            {notifications.map((notification) => {
              const Icon = categoryIcons[notification.category] ?? Bell;
              return (
                <button
                  key={notification._id}
                  type="button"
                  onClick={() => handleMarkRead(notification._id)}
                  className={cn(
                    "flex w-full items-start gap-2 rounded-md p-2 text-left text-xs transition-colors hover:bg-muted",
                    !notification.isRead && "bg-primary/5",
                  )}
                >
                  <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5 font-medium">
                      <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", priorityDot[notification.priority])} />
                      {notification.title}
                    </span>
                    <span className="block truncate text-muted-foreground">{notification.body}</span>
                  </span>
                </button>
              );
            })}
          </div>
          <Link
            to="/notifications"
            onClick={() => setOpen(false)}
            className="mt-2 block rounded-md px-2 py-1.5 text-center text-xs font-semibold text-primary hover:bg-muted"
          >
            View all
          </Link>
        </div>
      )}
    </div>
  );
}
