import { AGENT_VERSION } from "./agent-version.js";
import {
  getDeviceAuthHeaders,
} from "./device-auth.js";
import axios from "axios";

import {
  config,
} from "./config.js";

import {
  getLiveSystemMetrics,
} from "./monitor.js";

import {
  getFreshSessionTelemetry,
} from "./session-telemetry.js";

type StartHeartbeatOptions = {
  deviceId: string;
};

export function startHeartbeat({
  deviceId,
}: StartHeartbeatOptions): () => Promise<void> {
  let stopped = false;
  let lastHeartbeatLatencyMs:
    number |
    undefined;

  let currentRequest:
    Promise<void> | null =
      null;

  async function sendHeartbeat():
    Promise<void> {
    if (stopped) {
      return;
    }

    try {
      const metrics =
        await getLiveSystemMetrics();

      const sessionTelemetry =
        getFreshSessionTelemetry();

      const startedAt =
        Date.now();

      await axios.post(
        config.backendUrl +
          "/api/v1/devices/heartbeat",
        {
          deviceId,
          appVersion: AGENT_VERSION,
          ...metrics,
          ...(lastHeartbeatLatencyMs !==
          undefined
            ? {
                lastHeartbeatLatencyMs,
              }
            : {}),
          sessionTelemetryStale:
            sessionTelemetry.stale,
          ...(sessionTelemetry.telemetry
            ? {
                currentUser:
                  sessionTelemetry
                    .telemetry
                    .currentUser,
                sessionState:
                  sessionTelemetry
                    .telemetry
                    .sessionState,
                currentApplication:
                  sessionTelemetry
                    .telemetry
                    .currentApplication,
                sessionTelemetryAt:
                  sessionTelemetry
                    .telemetry
                    .collectedAt,
              }
            : {
                currentUser:
                  "",
                sessionState:
                  "unavailable",
                currentApplication:
                  null,
              }),
        },
        {
          headers: {
            "Content-Type":
              "application/json",

            ...(await getDeviceAuthHeaders(deviceId)),
          },

          timeout:
            30_000,
        },
      );

      lastHeartbeatLatencyMs =
        Date.now() -
        startedAt;

      console.log(
        "[Heartbeat] Sent" +
          " | CPU " +
          metrics.cpuUsage +
          "%" +
          " | RAM " +
          metrics.ramUsage +
          "%" +
          " | Disk " +
          metrics.diskUsage +
          "%" +
          " | Session " +
          (
            sessionTelemetry.telemetry
              ?.sessionState ??
            "unavailable"
          ) +
          " | Latency " +
          lastHeartbeatLatencyMs +
          "ms",
      );
    } catch (error) {
      if (
        axios.isAxiosError(
          error,
        )
      ) {
        console.error(
          "[Heartbeat] Failed:",
          error.response?.data ??
            error.message,
        );

        return;
      }

      console.error(
        "[Heartbeat] Failed:",
        error,
      );
    }
  }

  function triggerHeartbeat(): void {
    if (
      stopped ||
      currentRequest
    ) {
      return;
    }

    currentRequest =
      sendHeartbeat()
        .finally(
          () => {
            currentRequest =
              null;
          },
        );
  }

  triggerHeartbeat();

  const timer =
    setInterval(
      triggerHeartbeat,
      config.heartbeatInterval,
    );

  return async () => {
    if (stopped) {
      return;
    }

    stopped =
      true;

    clearInterval(
      timer,
    );

    if (currentRequest) {
      await currentRequest;
    }
  };
}


