import { useEffect, useState } from "react";

import {
  authSessionChangedEvent,
  getStoredAuthSession,
} from "@shared/auth/auth-service";
import type { JwtReadySession } from "@shared/auth/types";

const RETRY_DELAY_MS = 15_000;
const PENDING_POLL_MS = 5_000;

/**
 * Employee desktop-only bridge. The access token and one-time enrollment
 * bootstrap remain in Electron main; this renderer receives status only.
 */
export function DeviceEnrollmentBootstrap() {
  const [session, setSession] = useState<JwtReadySession | null>(() => getStoredAuthSession());

  useEffect(() => {
    const refresh = () => setSession(getStoredAuthSession());
    window.addEventListener(authSessionChangedEvent, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(authSessionChangedEvent, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  useEffect(() => {
    const ensureEnrollment = window.electronAPI?.ensureDeviceEnrollment;
    if (!ensureEnrollment || !session?.accessToken || session.user.mustChangePassword) {
      return;
    }

    let cancelled = false;
    let timer: number | undefined;

    const attempt = async () => {
      try {
        const result = await ensureEnrollment(session.accessToken);
        if (!cancelled) {
          timer = window.setTimeout(
            attempt,
            result.state === "enrolled"
              ? RETRY_DELAY_MS
              : PENDING_POLL_MS,
          );
        }
      } catch {
        if (!cancelled) {
          timer = window.setTimeout(attempt, RETRY_DELAY_MS);
        }
      }
    };

    void attempt();
    return () => {
      cancelled = true;
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, [session?.accessToken, session?.user.mustChangePassword]);

  return null;
}
