import { useEffect } from "react";
import { useToast } from "@shared/ui/toast-context";

type BackgroundSyncReplayedMessage = {
  type: "bg-sync-replayed";
  count: number;
};

function isBackgroundSyncReplayedMessage(data: unknown): data is BackgroundSyncReplayedMessage {
  return (
    typeof data === "object" &&
    data !== null &&
    (data as { type?: unknown }).type === "bg-sync-replayed"
  );
}

/** Surfaces a toast when the service worker replays requests that were queued while offline. */
export function useBackgroundSyncNotice() {
  const { toast } = useToast();

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    const onMessage = (event: MessageEvent) => {
      if (!isBackgroundSyncReplayedMessage(event.data)) return;
      const { count } = event.data;
      toast({
        title: "Back online",
        description: `${count} queued action${count === 1 ? "" : "s"} synced successfully.`,
        type: "success",
      });
    };

    navigator.serviceWorker.addEventListener("message", onMessage);
    return () => navigator.serviceWorker.removeEventListener("message", onMessage);
  }, [toast]);
}
