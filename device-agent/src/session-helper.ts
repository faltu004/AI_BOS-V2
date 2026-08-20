import axios from "axios";

import {
  config,
} from "./config.js";

import {
  startSessionTelemetryPublisher,
} from "./session-telemetry-publisher.js";
import {
  startRemoteSupportConsentWatcher,
} from "./remote-support-consent.js";
import {
  startRemoteSupportTransport,
} from "./remote-support-transport.js";
import {
  startRemoteSupportScreenProducer,
} from "./remote-support-screen-producer.js";
import {
  startRemoteSupportIndicator,
} from "./remote-support-indicator.js";
import {
  startRemoteSupportInputExecutor,
  type RemoteSupportInputExecutor,
} from "./remote-support-input-executor.js";
import {
  requestRemoteSupportExclusiveControlConsent,
} from "./remote-support-exclusive-consent.js";
import {
  createLocalRemoteSupportConsentApi,
  endRemoteSupportViaLocalAgent,
} from "./remote-support-local-client.js";
import {
  startApplicationReporter,
} from "./application-reporter.js";
import {
  startApplicationSessionReporter,
} from "./application-session-reporter.js";
import {
  startApplicationPolicyEnforcer,
} from "./application-policy-enforcer.js";
import {
  createLocalAgentApplicationClient,
} from "./local-agent-application-client.js";

type StopHandler =
  () =>
    void |
    Promise<void>;

const RETRY_DELAY_MS =
  15_000;

const stopHandlers:
  StopHandler[] =
    [];

let shuttingDown =
  false;

let retryTimer:
  ReturnType<typeof setTimeout> |
  null =
    null;

async function stopComponents():
  Promise<void> {
  const handlers =
    stopHandlers
      .splice(
        0,
        stopHandlers.length,
      )
      .reverse();

  for (const stop of handlers) {
    try {
      await stop();
    } catch (error) {
      console.error(
        "[Session Helper] Cleanup failed:",
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

  console.log(
    "[Session Helper] Shutdown requested: " +
      signal,
  );

  if (retryTimer) {
    clearTimeout(
      retryTimer,
    );

    retryTimer =
      null;
  }

  await stopComponents();

  console.log(
    "[Session Helper] Shutdown complete.",
  );

  process.exitCode =
    0;
}

function scheduleRetry():
  void {
  if (
    shuttingDown ||
    retryTimer
  ) {
    return;
  }

  console.log(
    "[Session Helper] Retrying in 15 seconds...",
  );

  retryTimer =
    setTimeout(
      () => {
        retryTimer =
          null;

        void start();
      },
      RETRY_DELAY_MS,
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
    "AI BOS User Session Helper",
  );

  console.log(
    "=================================",
  );

  try {
    await axios.get(
      config.backendUrl +
        "/health",
      {
        timeout:
          10_000,
      },
    );

    console.log(
      "[Session Helper] Backend Connected",
    );

    console.log(
      "[Session Helper] Running with limited user privileges; protected Agent credential enrollment is owned by the Windows service.",
    );

    console.log(
      "[Session Helper] Starting local Agent telemetry publisher...",
    );

    stopHandlers.push(
      startSessionTelemetryPublisher({}),
    );

    const localApplicationClient =
      createLocalAgentApplicationClient();

    console.log(
      "[Session Helper] Starting interactive application snapshot reporter...",
    );

    stopHandlers.push(
      startApplicationReporter({
        deviceId: "local-session",
        reporterSource: "session-helper",
        includeInstalledApplications: true,
        publishSnapshot:
          localApplicationClient.publishSnapshot,
      }),
    );

    console.log(
      "[Session Helper] Starting foreground application usage reporter...",
    );

    stopHandlers.push(
      startApplicationSessionReporter({
        deviceId: "local-session",
        publishSession:
          localApplicationClient.publishSession,
      }),
    );

    console.log(
      "[Session Helper] Starting application restriction enforcement...",
    );

    stopHandlers.push(
      startApplicationPolicyEnforcer({
        deviceId: "local-session",
        fetchPolicy:
          localApplicationClient.fetchPolicy,
        reportPolicyStatus:
          localApplicationClient.reportPolicyStatus,
      }),
    );

    console.log(
      "[Session Helper] Starting remote support consent watcher...",
    );

    stopHandlers.push(
      startRemoteSupportConsentWatcher({
        api:
          createLocalRemoteSupportConsentApi(),

        onApproved:
          (session) => {
            console.log(
              "[Session Helper] Starting authorized remote transport...",
            );

            let inputExecutor:
              RemoteSupportInputExecutor |
              null =
                null;

            let stopProducer:
              () => void =
                () => {};

            let indicator =
              null as
                ReturnType<
                  typeof startRemoteSupportIndicator
                > |
                null;

            let localEnded =
              false;

            const stopLocalSession =
              () => {
                if (
                  localEnded
                ) {
                  return;
                }

                localEnded =
                  true;

                inputExecutor?.stop();
                stopProducer();
                transport.stop();
                indicator?.stop();
              };

            const transport =
              startRemoteSupportTransport({
                ...session,

                onInput:
                  (event) => {
                    inputExecutor?.handle(
                      event,
                    );
                  },

                onExclusiveControlConsent:
                  () =>
                    requestRemoteSupportExclusiveControlConsent(),

                onExclusiveControlSet:
                  (enabled) =>
                    Boolean(
                      inputExecutor?.setExclusiveControl(
                        enabled,
                      ),
                    ),

                onEnded:
                  () => {
                    stopLocalSession();
                  },
              });

            indicator =
              startRemoteSupportIndicator({
                sessionId:
                  session.sessionId,

                onDisconnect:
                  async () => {
                    try {
                      await endRemoteSupportViaLocalAgent({
                        sessionId:
                          session.sessionId,

                        reason:
                          "Device user disconnected remote support",
                      });
                    } finally {
                      stopLocalSession();
                    }
                  },
              });

            inputExecutor =
              startRemoteSupportInputExecutor({
                isAuthorized:
                  () =>
                    Boolean(
                      indicator?.isVisible(),
                    ) &&
                    transport.isReady(),
              });

            stopProducer =
              startRemoteSupportScreenProducer({
                isReady:
                  () =>
                    Boolean(
                      indicator?.isVisible(),
                    ) &&
                    transport.isReady(),

                sendFrame:
                  transport.sendFrame,
              });

            stopHandlers.push(
              stopLocalSession,
            );
          },
      }),
    );

    console.log(
      "[Session Helper] Startup complete.",
    );
  } catch (error) {
    if (
      axios.isAxiosError(
        error,
      )
    ) {
      console.error(
        "[Session Helper] Startup failed:",
        error.response?.data ??
          error.message,
      );
    } else {
      console.error(
        "[Session Helper] Startup failed:",
        error,
      );
    }

    await stopComponents();

    scheduleRetry();
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
