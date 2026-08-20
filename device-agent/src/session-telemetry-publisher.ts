import axios from "axios";

import {
  collectSessionTelemetry,
  type SessionTelemetry,
} from "./session-telemetry.js";
import {
  getSessionTelemetryEndpoint,
} from "./session-telemetry-server.js";

export type StartSessionTelemetryPublisherOptions = {
  deviceId?: string;
  intervalMs?: number;
  endpoint?: string;
  collectTelemetry?: (
    deviceId?: string,
  ) => Promise<SessionTelemetry>;
};

export function startSessionTelemetryPublisher({
  deviceId,
  intervalMs = 5_000,
  endpoint = getSessionTelemetryEndpoint(),
  collectTelemetry = collectSessionTelemetry,
}: StartSessionTelemetryPublisherOptions): () => Promise<void> {
  let stopped = false;
  let requestRunning = false;
  let connected = false;
  let loggedUser:
    string |
    null =
      null;

  async function publish():
    Promise<void> {
    if (
      stopped ||
      requestRunning
    ) {
      return;
    }

    requestRunning = true;

    try {
      const telemetry =
        await collectTelemetry(
          deviceId,
        );

      if (
        loggedUser !==
        telemetry.currentUser
      ) {
        loggedUser =
          telemetry.currentUser;

        console.log(
          "[Session Helper] session user detected" +
            " | " +
            telemetry.currentUser,
        );
      }

      await axios.post(
        endpoint,
        {
          ...telemetry,
          publishedAt:
            new Date()
              .toISOString(),
        },
        {
          headers: {
            "Content-Type":
              "application/json",
            ...(deviceId
              ? {
                  "x-aibos-device-id":
                    deviceId,
                }
              : {}),
          },
          timeout:
            5_000,
        },
      );

      if (!connected) {
        connected = true;
        console.log(
          "[Session Helper] connected to local Agent",
        );
      }

      console.log(
        "[Session Helper] telemetry published" +
          " | state " +
          telemetry.sessionState +
          (
            telemetry.currentApplication
              ? " | app " +
                telemetry.currentApplication
                  .processName
              : ""
          ),
      );
    } catch (error) {
      if (connected) {
        connected = false;
        console.error(
          "[Session Helper] disconnected from local Agent",
        );
      }

      if (axios.isAxiosError(error)) {
        console.error(
          "[Session Helper] telemetry publish failed:",
          error.response?.data ??
            error.message,
        );
      } else {
        console.error(
          "[Session Helper] telemetry publish failed:",
          error,
        );
      }
    } finally {
      requestRunning = false;
    }
  }

  void publish();

  const timer =
    setInterval(
      () => {
        void publish();
      },
      intervalMs,
    );

  return async () => {
    stopped = true;
    clearInterval(timer);

    while (requestRunning) {
      await new Promise<void>(
        (resolve) =>
          setTimeout(resolve, 25),
      );
    }
  };
}
