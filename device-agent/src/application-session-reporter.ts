import axios from "axios";

import {
  config,
} from "./config.js";

import {
  startForegroundActivityTracker,
  type ForegroundActivitySession,
} from "./foreground-tracker.js";

export type ApplicationSessionPayload = ForegroundActivitySession & {
  deviceId: string;
};

type StartApplicationSessionReporterOptions = {
  deviceId: string;
  publishSession?: (payload: ApplicationSessionPayload) => Promise<void>;
};

async function publishToBackend(
  deviceId: string,
  payload: ApplicationSessionPayload,
): Promise<void> {
  const { getDeviceAuthHeaders } = await import("./device-auth.js");

  await axios.post(
    config.backendUrl + "/api/v1/devices/applications/session",
    payload,
    {
      headers: {
        "Content-Type": "application/json",
        ...(await getDeviceAuthHeaders(deviceId)),
      },
      timeout: 15_000,
    },
  );
}

export function startApplicationSessionReporter({
  deviceId,
  publishSession,
}: StartApplicationSessionReporterOptions): () => Promise<void> {
  let stopped = false;
  let sendQueue = Promise.resolve();

  async function sendSession(
    session: ForegroundActivitySession,
  ): Promise<void> {
    try {
      const payload: ApplicationSessionPayload = {
        deviceId,
        processName: session.processName,
        pid: session.pid,
        startedAt: session.startedAt,
        endedAt: session.endedAt,
        durationSeconds: session.durationSeconds,
      };

      if (publishSession) {
        await publishSession(payload);
      } else {
        await publishToBackend(deviceId, payload);
      }

      console.log(
        "[App Usage] Session sent | " +
          session.processName +
          " | " +
          session.durationSeconds +
          " sec",
      );
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error(
          "[App Usage] Session failed:",
          error.response?.data ?? error.message,
        );
      } else {
        console.error("[App Usage] Session failed:", error);
      }
    }
  }

  const stopTracker = startForegroundActivityTracker({
    pollIntervalMs: 2_000,
    onSessionCompleted: (session) => {
      sendQueue = sendQueue
        .then(() => sendSession(session))
        .catch((error: unknown) => {
          console.error("[App Usage] Queue failed:", error);
        });
    },
  });

  console.log(
    "[App Usage] Foreground tracking started every 2 seconds.",
  );

  return async () => {
    if (stopped) {
      await sendQueue;
      return;
    }

    stopped = true;
    stopTracker();
    await sendQueue;
  };
}
