import { useEffect, useMemo, useRef } from "react";
import { getSocketForToken } from "@shared/realtime/socket-client";
import type { Notification } from "./notification.schema";

export function useNotificationSocket(token: string | undefined, onNotificationNew: (notification: Notification) => void) {
 const handlerRef = useRef(onNotificationNew);
 handlerRef.current = onNotificationNew;

 const socket = useMemo(() => getSocketForToken(token), [token]);

 useEffect(() => {
 if (!socket) return;

 const handler = (notification: Notification) => handlerRef.current(notification);
 socket.on("notification:new", handler);

 return () => {
 socket.off("notification:new", handler);
 };
 }, [socket]);
}
