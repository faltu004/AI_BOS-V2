import { io, type Socket } from "socket.io-client";

const viteEnv = (import.meta as unknown as { env?: Record<string, string | undefined> }).env;
const apiBaseUrl = viteEnv?.VITE_API_BASE_URL ?? "http://127.0.0.1:5000/api/v1";

export function apiOrigin() {
 return apiBaseUrl.replace(/\/api\/v1\/?$/, "");
}

let socket: Socket | null = null;
let socketToken: string | null = null;

export function getSocket(token: string): Socket {
 // Reuse the existing client whenever the token matches, even mid-connect or
 // briefly disconnected — socket.io queues emits and reconnects on its own.
 // Multiple hook instances (NotificationBell, CollaborationHub) call this in
 // quick succession during mount; requiring `.connected` here would tear down
 // a still-connecting socket every time, orphaning whichever caller got it first.
 if (socket && socketToken === token) {
 return socket;
 }

 if (socket) {
 socket.disconnect();
 }

 socketToken = token;
 socket = io(apiOrigin(), {
 auth: { token },
 transports: ["websocket", "polling"],
 autoConnect: true,
 });

 return socket;
}

export function disconnectSocket() {
 socket?.disconnect();
 socket = null;
 socketToken = null;
}
