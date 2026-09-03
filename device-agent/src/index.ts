import {
  startAgentUpdateWatcher,
} from "./agent-update-checker.js";
import {
  writeAgentHealthMarker,
} from "./agent-health.js";
import {
  acquireAgentInstanceLock,
  type AgentInstanceLock,
} from "./agent-instance-lock.js";
import {
  startDeviceCredentialRotationWatcher,
} from "./device-credential-rotation.js";
import {
  startDeviceBootstrapServer,
} from "./device-bootstrap-server.js";
import {
  recoverRejectedDeviceCredential,
} from "./device-credential-recovery.js";
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

let startupInProgress =
  false;

let immediateStartupRequested =
  false;

let stopBootstrapServer:
  StopHandler |
  null =
    null;

let instanceLock:
  AgentInstanceLock |
  null =
    null;

let credentialRecoveryRequired =
  false;

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

  if (stopBootstrapServer) {
    try {
      await stopBootstrapServer();
    } catch (error) {
      console.error(
        "[Agent] Enrollment handoff cleanup failed:",
        error,
      );
    }
    stopBootstrapServer = null;
  }

  if (instanceLock) {
    await instanceLock.release();

    instanceLock =
      null;
  }

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

function requestImmediateStartupRetry(): void {
  if (shuttingDown) {
    return;
  }

  if (startupInProgress) {
    immediateStartupRequested = true;
    return;
  }

  immediateStartupRequested = false;

  if (startupTimer) {
    clearTimeout(startupTimer);
  }

  startupTimer = setTimeout(() => {
    startupTimer = null;
    void start();
  }, 0);
}

async function start():
  Promise<void> {
  if (shuttingDown) {
    return;
  }

  if (startupInProgress) {
    return;
  }

  startupInProgress = true;

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

    credentialRecoveryRequired =
      false;

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
      credentialRecoveryRequired =
        error.reason ===
          "invalid_stored_credential";

      console.error(
        "[Agent] DEVICE_ENROLLMENT_REQUIRED: a valid local credential is unavailable; explicit authorized credential recovery is required.",
      );

      await stopAllComponents();
      scheduleStartupRetry();
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
  } finally {
    startupInProgress = false;

    if (immediateStartupRequested) {
      immediateStartupRequested = false;
      requestImmediateStartupRetry();
    }
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

async function launch():
  Promise<void> {
  /*
   * Acquired once, for the life of
   * this process, before the startup
   * retry loop is ever entered. This
   * is what prevents an orphaned
   * duplicate process from retrying
   * registration forever against a
   * backend that will correctly keep
   * rejecting it once a healthy
   * instance is running.
   */
  const lock =
    await acquireAgentInstanceLock();

  if (!lock) {
    console.error(
      "[Agent] Another instance of this agent is already running. Exiting without starting registration or heartbeat.",
    );

    process.exitCode =
      0;

    return;
  }

  instanceLock =
    lock;

  const bootstrapServer =
    await startDeviceBootstrapServer({
      onBootstrapStored:
        requestImmediateStartupRetry,
      isCredentialRecoveryRequired:
        () =>
          credentialRecoveryRequired,
      onCredentialRecoveryAuthorized:
        async (input) => {
          await recoverRejectedDeviceCredential(
            input,
          );
          credentialRecoveryRequired =
            false;
          requestImmediateStartupRetry();
        },
    });

  stopBootstrapServer =
    bootstrapServer.stop;

  void start();
}

void launch();
