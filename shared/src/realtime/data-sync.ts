import { useEffect } from "react";
import { authSessionChangedEvent, getStoredAuthSession } from "@shared/auth/auth-service";
import { getSocket } from "./socket-client";

export const backendDataChangedSocketEvent = "data:changed";
export const sharedDataChangedEvent = "ai_bos_data_changed";
export const sharedDataChangedStorageKey = "ai_bos_data_changed_at";
export const liveSyncIntervalMs = 10_000;

export type BackendDataChangedPayload = {
  at: string;
  method?: string;
  path?: string;
  resource?: string;
};

export function notifyLocalDataChanged(detail?: BackendDataChangedPayload | string) {
  if (typeof window === "undefined") return;

  const payload =
    typeof detail === "string"
      ? detail
      : JSON.stringify(detail ?? { at: new Date().toISOString(), source: "local" });

  window.localStorage.setItem(sharedDataChangedStorageKey, payload);
  window.dispatchEvent(new CustomEvent(sharedDataChangedEvent, { detail }));
}

export function useBackendDataBridge() {
  useEffect(() => {
    const onDataChanged = (payload: BackendDataChangedPayload) => {
      notifyLocalDataChanged(payload);
    };
    let detachSocket = () => undefined;

    const connect = () => {
      detachSocket();
      detachSocket = () => undefined;

      const session = getStoredAuthSession();
      if (!session?.accessToken) return;

      const socket = getSocket(session.accessToken);
      socket.on(backendDataChangedSocketEvent, onDataChanged);
      detachSocket = () => {
        socket.off(backendDataChangedSocketEvent, onDataChanged);
      };
    };

    connect();
    window.addEventListener(authSessionChangedEvent, connect);
    return () => {
      detachSocket();
      window.removeEventListener(authSessionChangedEvent, connect);
    };
  }, []);
}
