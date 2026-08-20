import {
  startAgentUpdateWatcher,
} from "./agent-update-checker.js";
import {
  writeAgentHealthMarker,
} from "./agent-health.js";
import {
  startDeviceCredentialRotationWatcher,
} from "./device-credential-rotation.js";
import {
  isDeviceEnrollmentRequiredError,
  prepareDeviceIdentity,
} from "./device-enrollment.js";
import axios from "axios";
import os from "node:os";

import {
  config,
} from "./config.js";

import {
  startHeartbeat,
} from "./heartbeat.js";

import {
  startSessionTelemetryServer,
} from "./session-telemetry-server.js";

import {
  startDeviceCommandPoller,
} from "./command-poller.js";

import {
  getInventory,
} from "./inventory.js";

type StopHandler =
  () =>
    void |
    Promise<void>;

const STARTUP_RETRY_DELAY =
  15_000;

const MAX_STARTUP_RETRY_DELAY =
  5 * 60_000;

const stopHandlers:
  StopHandler[] =
    [];

let shuttingDown =
  false;

let startupTimer:
  ReturnType<typeof setTimeout> |
  null =
    null;

let startupRetryDelay =
  STARTUP_RETRY_DELAY;

async function stopAllComponents():
  Promise<void> {
  const handlers =
    stopHandlers
      .splice(
        0,
        stopHandlers.length,
      )
      .reverse();

  for (
    const stop of handlers
  ) {
    try {
      await stop();
    } catch (error) {
      console.error(
        "[Agent] Cleanup failed:",
        error,
      );
    }
  }
}

async function shutdown(
  signal: string,
): Promise<void> {
  if (shuttingDown) {
    return;
  }

  shuttingDown =
    true;

  console.log("");
  console.log(
    "[Agent] Shutdown requested: " +
      signal,
  );

  if (startupTimer) {
    clearTimeout(
      startupTimer,
    );

    startupTimer =
      null;
  }

  await stopAllComponents();

  console.log(
    "[Agent] Shutdown complete.",
  );

  process.exitCode =
    0;
}

function scheduleStartupRetry():
  void {
  if (
    shuttingDown ||
    startupTimer
  ) {
    return;
  }

  console.log(
    "[Agent] Retrying startup in " +
      startupRetryDelay /
        1000 +
      " seconds...",
  );

  const delay =
    startupRetryDelay;

  startupRetryDelay =
    Math.min(
      MAX_STARTUP_RETRY_DELAY,
      startupRetryDelay * 2,
    );

  startupTimer =
    setTimeout(
      () => {
        startupTimer =
          null;

        void start();
      },
      delay,
    );
}

async function start():
  Promise<void> {
  if (shuttingDown) {
    return;
  }

  console.log(
    "=================================",
  );

  console.log(
    "AI BOS Device Agent",
  );

  console.log(
    "=================================",
  );

  try {
    const healthResponse =
      await axios.get(
        config.backendUrl +
          "/health",
        {
          timeout:
            10_000,
        },
      );

    if (shuttingDown) {
      return;
    }

    console.log(
      "Backend Connected",
    );

    console.log(
      healthResponse.data,
    );

    console.log("");
    console.log(
      "Collecting device inventory...",
    );

    const deviceId =
      await prepareDeviceIdentity();

    if (shuttingDown) {
      return;
    }

    /*
     * Credential lifecycle belongs to the
     * background service process.
     *
     * Session Helper consumes the same
     * persisted credential but does not
     * independently perform rotation.
     */
    stopHandlers.push(
      startDeviceCredentialRotationWatcher({
        deviceId,
      }),
    );
    stopHandlers.push(
      startAgentUpdateWatcher({
        deviceId,
      }),
    );

    console.log("");
    console.log(
      "Device identity prepared successfully",
    );

    console.log({
      deviceId,
    });
console.log("");
    console.log(
      "Starting heartbeat every " +
        config.heartbeatInterval /
          1000 +
        " seconds...",
    );

    stopHandlers.push(
      startSessionTelemetryServer({
        deviceId,
      }),
    );

    stopHandlers.push(
      startHeartbeat({
        deviceId,
      }),
    );

    console.log(
      "[Agent] Interactive application collection is owned by Session Helper.",
    );

    console.log(
      "Starting device command polling...",
    );

    stopHandlers.push(
      startDeviceCommandPoller({
        deviceId,
      }),
    );

    await writeAgentHealthMarker();

    console.log(
      "[Agent] Startup complete.",
    );

    startupRetryDelay =
      STARTUP_RETRY_DELAY;
  } catch (error) {
    if (
      isDeviceEnrollmentRequiredError(
        error,
      )
    ) {
      console.error(
        "[Agent] DEVICE_ENROLLMENT_REQUIRED: stored device credential is invalid and no protected bootstrap enrollment artifact is available.",
      );

      await stopAllComponents();

      return;
    }

    if (
      axios.isAxiosError(
        error,
      )
    ) {
      console.error(
        "[Agent] Startup failed:",
        error.response?.data ??
          error.message,
      );
    } else {
      console.error(
        "[Agent] Startup failed:",
        error,
      );
    }

    await stopAllComponents();

    scheduleStartupRetry();
  }
}

process.once(
  "SIGINT",
  () => {
    void shutdown(
      "SIGINT",
    );
  },
);

process.once(
  "SIGTERM",
  () => {
    void shutdown(
      "SIGTERM",
    );
  },
);

void start();




