import { AnimatePresence, motion } from "framer-motion";
import { AtSign, Bell, CalendarClock, Info, Megaphone, ShieldCheck, Sparkles, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { authSessionChangedEvent, getStoredAuthSession } from "@shared/auth/auth-service";
import type { JwtReadySession } from "@shared/auth/types";
import { cn } from "@shared/lib/utils";
import type { Notification as AppNotification, NotificationCategory } from "./notification.schema";
import { useNotificationSocket } from "./useNotifications";

const categoryIcons: Record<NotificationCategory, typeof Bell> = {
 mention: AtSign,
 approval: ShieldCheck,
 reminder: CalendarClock,
 ai_generated: Sparkles,
 system: Info,
 broadcast: Megaphone,
};

const priorityAccent: Record<AppNotification["priority"], string> = {
 Low: "border-l-muted-foreground",
 Medium: "border-l-primary",
 High: "border-l-amber-500",
 Critical: "border-l-destructive",
};

type PopupItem = AppNotification & { popupId: string };

const AUTO_DISMISS_MS = 8000;
const MAX_VISIBLE = 4;

/** Requests the OS notification permission once, silently, so native Windows/macOS toasts can fire alongside the in-app popup. */
function requestNativePermissionOnce() {
 if (typeof window === "undefined" || typeof window.Notification === "undefined") return;
 if (window.Notification.permission === "default") {
 window.Notification.requestPermission().catch(() => undefined);
 }
}

/** Only fires the native OS toast when the app isn't already visible — the in-app popup covers the foreground case. */
function showNativeNotification(notification: AppNotification, onActivate: () => void) {
 if (typeof window === "undefined" || typeof window.Notification === "undefined") return;
 if (window.Notification.permission !== "granted") return;
 if (document.visibilityState === "visible" && document.hasFocus()) return;

 try {
 const native = new window.Notification(notification.title, {
 body: notification.body,
 tag: notification._id,
 });
 native.onclick = () => {
 window.focus();
 onActivate();
 native.close();
 };
 } catch {
 // Some Electron/browser combinations can still throw even after a granted permission; the in-app popup already covers this notification.
 }
}

export function NotificationPopupListener() {
 const [session, setSession] = useState<JwtReadySession | null>(() => getStoredAuthSession());
 const token = session?.accessToken;
 const [popups, setPopups] = useState<PopupItem[]>([]);
 const timerRefs = useRef<Map<string, number>>(new Map());
 const navigate = useNavigate();

 const clearPopupTimer = useCallback((popupId: string) => {
 const timer = timerRefs.current.get(popupId);
 if (timer !== undefined) window.clearTimeout(timer);
 timerRefs.current.delete(popupId);
 }, []);

 const clearAllPopups = useCallback(() => {
 timerRefs.current.forEach((timer) => window.clearTimeout(timer));
 timerRefs.current.clear();
 setPopups([]);
 }, []);

 useEffect(() => {
 function refreshSession() {
 setSession(getStoredAuthSession());
 }
 window.addEventListener(authSessionChangedEvent, refreshSession);
 window.addEventListener("storage", refreshSession);
 return () => {
 window.removeEventListener(authSessionChangedEvent, refreshSession);
 window.removeEventListener("storage", refreshSession);
 };
 }, []);

 useEffect(() => {
 if (token) requestNativePermissionOnce();
 }, [token]);

 useEffect(() => {
 if (!token) clearAllPopups();
 return clearAllPopups;
 }, [token, clearAllPopups]);

 const dismiss = useCallback((popupId: string) => {
 clearPopupTimer(popupId);
 setPopups((current) => current.filter((item) => item.popupId !== popupId));
 }, [clearPopupTimer]);

 const openNotification = useCallback(
 (notification: AppNotification) => {
 if (notification.actionUrl) navigate(notification.actionUrl);
 },
 [navigate],
 );

 useNotificationSocket(token, (notification) => {
 const popupId = `${notification._id}-${Date.now()}`;
 setPopups((current) => [{ ...notification, popupId }, ...current].slice(0, MAX_VISIBLE));
 const timer = window.setTimeout(() => dismiss(popupId), AUTO_DISMISS_MS);
 timerRefs.current.set(popupId, timer);
 showNativeNotification(notification, () => openNotification(notification));
 });

 if (!token || popups.length === 0) return null;

 return (
 <div
 aria-live="polite"
 className="pointer-events-none fixed right-4 top-16 z-[100] flex w-[calc(100vw-2rem)] max-w-sm flex-col gap-2.5 sm:right-6"
 role="status"
 >
 <AnimatePresence>
 {popups.map((item) => {
 const Icon = categoryIcons[item.category] ?? Bell;
 return (
 <motion.div
 animate={{ opacity: 1, x: 0, scale: 1 }}
 className={cn(
 "pointer-events-auto cursor-pointer overflow-hidden rounded-lg border border-l-4 bg-background p-3.5 shadow-2xl shadow-foreground/20 dark:bg-slate-950",
 priorityAccent[item.priority],
 )}
 exit={{ opacity: 0, x: 40, scale: 0.96 }}
 initial={{ opacity: 0, x: 40, scale: 0.96 }}
 key={item.popupId}
 layout
 onClick={() => {
 openNotification(item);
 dismiss(item.popupId);
 }}
 role="button"
 tabIndex={0}
 >
 <div className="flex items-start gap-3">
 <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
 <Icon className="h-4 w-4" />
 </span>
 <div className="min-w-0 flex-1">
 <p className="truncate text-sm font-semibold">{item.title}</p>
 <p className="mt-0.5 line-clamp-2 text-xs leading-5 text-muted-foreground">{item.body}</p>
 </div>
 <button
 aria-label="Dismiss notification"
 className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
 onClick={(event) => {
 event.stopPropagation();
 dismiss(item.popupId);
 }}
 type="button"
 >
 <X className="h-3.5 w-3.5" />
 </button>
 </div>
 </motion.div>
 );
 })}
 </AnimatePresence>
 </div>
 );
}
