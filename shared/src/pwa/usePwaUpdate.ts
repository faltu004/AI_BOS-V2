import { useCallback, useEffect, useState } from "react";
// Provided by vite-plugin-pwa per-portal at build time; see each portal's vite.config.ts.
import { registerSW } from "virtual:pwa-register";

let updateServiceWorker: ((reloadPage?: boolean) => Promise<void>) | null = null;

export function usePwaUpdate() {
  const [needsRefresh, setNeedsRefresh] = useState(false);
  const [offlineReady, setOfflineReady] = useState(false);

  useEffect(() => {
    if (updateServiceWorker) return;
    updateServiceWorker = registerSW({
      immediate: true,
      onNeedRefresh() {
        setNeedsRefresh(true);
      },
      onOfflineReady() {
        setOfflineReady(true);
      },
    });
  }, []);

  const applyUpdate = useCallback(async () => {
    if (!updateServiceWorker) return;
    await updateServiceWorker(true);
    setNeedsRefresh(false);
  }, []);

  const dismissOfflineReady = useCallback(() => setOfflineReady(false), []);

  return { needsRefresh, offlineReady, applyUpdate, dismissOfflineReady };
}
