/// <reference lib="webworker" />
import { BackgroundSyncPlugin } from "workbox-background-sync";
import { ExpirationPlugin } from "workbox-expiration";
import { createHandlerBoundToURL, precacheAndRoute } from "workbox-precaching";
import { NavigationRoute, registerRoute } from "workbox-routing";
import { NetworkFirst, NetworkOnly } from "workbox-strategies";

declare const self: ServiceWorkerGlobalScope & {
 __WB_MANIFEST: Array<{ revision: string | null; url: string }>;
};

const mutationMethods = ["POST", "PUT", "PATCH", "DELETE"] as const;

type BackgroundSyncNotifyMessage = {
 type: "bg-sync-replayed";
 count: number;
};

async function notifyClients(message: BackgroundSyncNotifyMessage) {
 const clientList = await self.clients.matchAll({ type: "window" });
 for (const client of clientList) {
 client.postMessage(message);
 }
}

/**
 * Core PWA service-worker behavior, shared by every portal's thin `src/sw.ts` entry.
 * Offline scope: app-shell + read-only network-first cache for GET /api/v1/**.
 * Background Sync: one global Workbox queue automatically replays any failed
 * mutating /api/v1/** request once connectivity returns — no per-feature wiring.
 */
export function initServiceWorker() {
 precacheAndRoute(self.__WB_MANIFEST);
 registerRoute(new NavigationRoute(createHandlerBoundToURL("/index.html")));

 self.addEventListener("message", (event) => {
 if ((event.data as { type?: string } | undefined)?.type === "SKIP_WAITING") {
 void self.skipWaiting();
 }
 });

 self.addEventListener("activate", (event) => {
 event.waitUntil(
 Promise.all([
 self.clients.claim(),
 caches.delete("api-get-cache"),
 ]),
 );
 });

 registerRoute(
 ({ url, request }) => request.method === "GET" && url.pathname.startsWith("/api/v1/"),
 new NetworkFirst({
 cacheName: "api-get-cache-v2",
 plugins: [new ExpirationPlugin({ maxEntries: 200, maxAgeSeconds: 24 * 60 * 60 })],
 }),
 );

 const backgroundSyncPlugin = new BackgroundSyncPlugin("api-mutation-queue", {
 maxRetentionTime: 24 * 60,
 async onSync({ queue }) {
 let replayedCount = 0;
 let entry = await queue.shiftRequest();
 while (entry) {
 try {
 await fetch(entry.request.clone());
 replayedCount += 1;
 } catch (error) {
 await queue.unshiftRequest(entry);
 throw error;
 }
 entry = await queue.shiftRequest();
 }
 if (replayedCount > 0) {
 await notifyClients({ type: "bg-sync-replayed", count: replayedCount });
 }
 },
 });

 const mutationMatch = ({ url }: { url: URL }) => url.pathname.startsWith("/api/v1/");
 const mutationHandler = new NetworkOnly({ plugins: [backgroundSyncPlugin] });
 for (const method of mutationMethods) {
 registerRoute(mutationMatch, mutationHandler, method);
 }

 // Push Notifications (future-ready): dormant until a subscription flow and VAPID
 // keys are wired up server-side — see backend/src/services/push.service.ts.
 self.addEventListener("push", (event) => {
 if (!event.data) return;
 const payload = event.data.json() as { title?: string; body?: string };
 event.waitUntil(
 self.registration.showNotification(payload.title ?? "AI BOS", {
 body: payload.body,
 icon: "/icons/icon-192.png",
 }),
 );
 });

 self.addEventListener("notificationclick", (event) => {
 event.notification.close();
 event.waitUntil(self.clients.openWindow("/"));
 });
}
