type DeviceSocketAuth = {
  deviceId: string;
  deviceToken: string;
};

import {
  io,
  type Socket,
} from "socket.io-client";

import {
  config,
} from "./config.js";

import type {
  ApprovedRemoteSupportSession,
} from "./remote-support-consent.js";

import type {
  RemoteScreenFrame,
} from "./remote-support-screen-producer.js";

export type RemoteSupportInputEvent =
  | {
      type: "mouse_move";
      x: number;
      y: number;
    }
  | {
      type: "mouse_button";
      button:
        | "left"
        | "right";
      action:
        | "down"
        | "up";
      x: number;
      y: number;
    }
  | {
      type: "mouse_wheel";
      delta: number;
    }
  | {
      type: "key";
      key: string;
      action:
        | "down"
        | "up";
    };

export type RemoteExclusiveControlState =
  | "active"
  | "declined"
  | "released"
  | "failed";

export type RemoteSupportTransportHandle = {
  stop:
    () => void;

  isReady:
    () => boolean;

  sendFrame: (
    frame:
      RemoteScreenFrame,
  ) => boolean;
};

/*
 * Host/port only, for safe diagnostic logging. Never logs auth tokens,
 * device credentials, or query strings.
 */
function safeHost(
  backendUrl: string,
): string {
  try {
    const parsed =
      new URL(
        backendUrl,
      );

    return parsed.host;
  } catch {
    return "unknown";
  }
}

type StartRemoteSupportTransportInput =
  ApprovedRemoteSupportSession & {
    deviceId?: string;
    deviceAuth?: DeviceSocketAuth;

    onInput?: (
      event:
        RemoteSupportInputEvent,
    ) =>
      void |
      Promise<void>;

    onExclusiveControlConsent?:
      () =>
        boolean |
        Promise<boolean>;

    onExclusiveControlSet?: (
      enabled: boolean,
    ) =>
      boolean |
      Promise<boolean>;

    onEnded?: (
      reason: string,
    ) =>
      void |
      Promise<void>;
  };

export function startRemoteSupportTransport(
  input:
    StartRemoteSupportTransportInput,
): RemoteSupportTransportHandle {
  let stopped =
    false;

  let ready =
    false;

  let exclusiveRequestVersion =
    0;

  let exclusiveConsentPending =
    false;

  let expiryTimer:
    ReturnType<typeof setTimeout> |
    null =
      null;

  let lastFrameLogAt =
    0;

  const remoteSupportNamespace =
    "/remote-support";

  const socketEndpointUrl =
    config.backendUrl +
    remoteSupportNamespace;

  /*
   * Bounded connect timeout so a stuck TLS/WebSocket upgrade at the
   * gateway surfaces as a diagnosable connect_error instead of hanging
   * indefinitely (socket.io-client has no connect timeout by default).
   */
  const CONNECT_TIMEOUT_MS =
    8_000;

  console.log(
    "[Remote Transport] endpoint host=" +
      safeHost(
        config.backendUrl,
      ),
  );

  console.log(
    "[Remote Transport] socket path=/socket.io",
  );

  console.log(
    "[Remote Transport] namespace=" +
      remoteSupportNamespace,
  );

  console.log(
    "[Remote Transport] connecting",
  );

  const socket:
    Socket =
    io(
      socketEndpointUrl,
      {
        transports: [
          "websocket",
          "polling",
        ],

        reconnection:
          true,

        timeout:
          CONNECT_TIMEOUT_MS,

        auth: {
          sessionId:
            input.sessionId,

          role:
            "endpoint",

          participantToken:
            input.endpointToken,

          ...(input.deviceAuth ?? {}),
        },
      },
    );

  function emitExclusiveControlState(
    state:
      RemoteExclusiveControlState,
  ): void {
    if (
      stopped ||
      !socket.connected
    ) {
      return;
    }

    socket.emit(
      "remote:exclusive-control:state",
      {
        state,
      },
    );
  }

  function notifyEnded(
    reason: string,
  ): void {
    if (input.onEnded) {
      void Promise.resolve(
        input.onEnded(
          reason,
        ),
      ).catch(
        (error) => {
          console.error(
            "[Remote Support] End handler failed:",
            error,
          );
        },
      );
    }
  }

  function scheduleExpiry(
    expiresAt: unknown,
  ): void {
    const expiry =
      typeof expiresAt ===
        "string"
        ? Date.parse(
            expiresAt,
          )
        : Number.NaN;

    if (!Number.isFinite(expiry)) {
      return;
    }

    if (expiryTimer) {
      clearTimeout(
        expiryTimer,
      );
    }

    const delay =
      Math.max(
        0,
        expiry - Date.now(),
      );

    expiryTimer =
      setTimeout(
        () => {
          expiryTimer =
            null;

          if (stopped) {
            return;
          }

          ready =
            false;

          const reason =
            "Remote support transport expired";

          notifyEnded(
            reason,
          );

          stop();
        },
        delay,
      );
  }

  scheduleExpiry(
    input.expiresAt,
  );

  async function setExclusiveControlLocally(
    enabled: boolean,
  ): Promise<boolean> {
    if (
      !input.onExclusiveControlSet
    ) {
      return false;
    }

    try {
      return Boolean(
        await input
          .onExclusiveControlSet(
            enabled,
          ),
      );
    } catch (
      error
    ) {
      console.error(
        "[Remote Support] Exclusive Control state change failed:",
        error,
      );

      return false;
    }
  }

  async function releaseExclusiveControl(
    reportState:
      boolean,
  ): Promise<void> {
    exclusiveRequestVersion +=
      1;

    const released =
      await setExclusiveControlLocally(
        false,
      );

    if (reportState) {
      emitExclusiveControlState(
        released
          ? "released"
          : "failed",
      );
    }
  }

  socket.on(
    "connect",
    () => {
      console.log(
        "[Remote Support] Transport connected.",
      );

      console.log(
        "[Remote Transport] connected transport=" +
          (
            socket.io.engine?.transport
              ?.name ??
            "unknown"
          ),
      );
    },
  );

  socket.on(
    "remote:joined",
    () => {
      console.log(
        "[Remote Support] Consented endpoint joined secure session.",
      );
    },
  );

  socket.on(
    "remote:status",
    (
      payload: {
        status?: string;
        expiresAt?: string;
      },
    ) => {
      ready =
        payload?.status ===
          "active";

      console.log(
        "[Remote Support] Session status: " +
          (
            payload?.status ??
            "unknown"
          ),
      );

      if (!ready) {
        void releaseExclusiveControl(
          false,
        );
      }


      scheduleExpiry(
        payload?.expiresAt,
      );
    },
  );

  socket.on(
    "remote:input",
    (
      event:
        RemoteSupportInputEvent,
    ) => {
      if (
        stopped ||
        !ready ||
        !input.capabilities
          .remoteControl
      ) {
        return;
      }

      if (input.onInput) {
        void Promise.resolve(
          input.onInput(
            event,
          ),
        ).catch(
          (
            error,
          ) => {
            console.error(
              "[Remote Support] Input handler failed:",
              error,
            );
          },
        );
      }
    },
  );

  socket.on(
    "remote:exclusive-control:request",
    () => {
      if (
        stopped ||
        !ready ||
        !socket.connected ||
        !input.capabilities
          .remoteControl
      ) {
        emitExclusiveControlState(
          "failed",
        );

        return;
      }

      if (
        exclusiveConsentPending
      ) {
        return;
      }

      if (
        !input.onExclusiveControlConsent ||
        !input.onExclusiveControlSet
      ) {
        emitExclusiveControlState(
          "failed",
        );

        return;
      }

      const requestVersion =
        ++exclusiveRequestVersion;

      exclusiveConsentPending =
        true;

      void (async () => {
        try {
          const allowed =
            Boolean(
              await input
                .onExclusiveControlConsent?.(),
            );

          if (
            stopped ||
            requestVersion !==
              exclusiveRequestVersion ||
            !ready ||
            !socket.connected
          ) {
            return;
          }

          if (!allowed) {
            emitExclusiveControlState(
              "declined",
            );

            return;
          }

          const enabled =
            await setExclusiveControlLocally(
              true,
            );

          if (
            stopped ||
            requestVersion !==
              exclusiveRequestVersion ||
            !ready ||
            !socket.connected
          ) {
            if (enabled) {
              await setExclusiveControlLocally(
                false,
              );
            }

            return;
          }

          emitExclusiveControlState(
            enabled
              ? "active"
              : "failed",
          );
        } catch (
          error
        ) {
          console.error(
            "[Remote Support] Exclusive Control request failed:",
            error,
          );

          await setExclusiveControlLocally(
            false,
          );

          emitExclusiveControlState(
            "failed",
          );
        } finally {
          exclusiveConsentPending =
            false;
        }
      })();
    },
  );

  socket.on(
    "remote:exclusive-control:release",
    () => {
      void releaseExclusiveControl(
        true,
      );
    },
  );

  socket.on(
    "remote:ended",
    (
      payload: {
        reason?: string;
      },
    ) => {
      ready =
        false;

      exclusiveRequestVersion +=
        1;

      void setExclusiveControlLocally(
        false,
      );

      console.log(
        "[Remote Support] Session ended: " +
          (
            payload?.reason ??
            "Remote support session ended"
          ),
      );

      const reason =
        payload?.reason ??
        "Remote support session ended";

      notifyEnded(
        reason,
      );

      stop();
    },
  );

  socket.on(
    "remote:error",
    (
      payload: {
        message?: string;
      },
    ) => {
      const message =
        payload?.message ??
        "Unknown error";

      console.error(
        "[Remote Support] Transport error:",
        message,
      );

      if (
        /expired/i.test(
          message,
        )
      ) {
        notifyEnded(
          "Remote support transport expired",
        );

        stop();
      }
    },
  );

  socket.on(
    "disconnect",
    (
      reason,
    ) => {
      ready =
        false;

      exclusiveRequestVersion +=
        1;

      void setExclusiveControlLocally(
        false,
      );

      console.log(
        "[Remote Transport] disconnected reason=" +
          reason,
      );
    },
  );

  socket.on(
    "connect_error",
    (
      error,
    ) => {
      ready =
        false;

      exclusiveRequestVersion +=
        1;

      void setExclusiveControlLocally(
        false,
      );

      console.error(
        "[Remote Support] Connection failed:",
        error.message,
      );

      /*
       * Safe reason only. Never logs auth tokens, device credentials,
       * or raw error objects that may carry request headers.
       */
      console.error(
        "[Remote Transport] connect_error=" +
          (
            error.message ||
            "unknown"
          ),
      );

      if (
        /expired/i.test(
          error.message,
        )
      ) {
        notifyEnded(
          "Remote support transport expired",
        );

        stop();
      }
    },
  );

  function sendFrame(
    frame:
      RemoteScreenFrame,
  ): boolean {
    if (
      stopped ||
      !ready ||
      !socket.connected
    ) {
      return false;
    }

    socket.emit(
      "remote:frame",
      frame,
    );

    const now =
      Date.now();

    if (
      lastFrameLogAt === 0 ||
      now - lastFrameLogAt >=
        30_000
    ) {
      console.log(
        "[Remote Screen] Frame emitted: session=" +
          input.sessionId,
      );

      lastFrameLogAt =
        now;
    }

    return true;
  }

  function isReady():
    boolean {
    return (
      !stopped &&
      ready &&
      socket.connected
    );
  }

  function stop():
    void {
    if (stopped) {
      return;
    }

    exclusiveRequestVersion +=
      1;

    void setExclusiveControlLocally(
      false,
    );

    stopped =
      true;

    ready =
      false;

    if (expiryTimer) {
      clearTimeout(
        expiryTimer,
      );

      expiryTimer =
        null;
    }

    socket.removeAllListeners();
    socket.disconnect();
  }

  return {
    stop,
    isReady,
    sendFrame,
  };
}

