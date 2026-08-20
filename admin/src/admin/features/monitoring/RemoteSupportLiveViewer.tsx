import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  io,
  type Socket,
} from "socket.io-client";

import {
  getMonitoringSocketUrl,
} from "./monitoring.api";

import {
  remoteFrameToImageSource,
  type RemoteScreenFrame,
} from "./remote-support-frame";

type RemoteSupportLiveViewerProps = {
  sessionId: string;
  viewerToken: string;
  token: string | undefined;
};

type ExclusiveControlUiState =
  | "idle"
  | "pending"
  | "active"
  | "declined"
  | "failed"
  | "releasing";

type RemoteInputEvent =
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

const allowedKeys =
  new Set([
    "Enter",
    "Escape",
    "Tab",
    "Backspace",
    "Delete",
    "ArrowUp",
    "ArrowDown",
    "ArrowLeft",
    "ArrowRight",
    "Home",
    "End",
    "PageUp",
    "PageDown",
    " ",
    "Control",
    "Shift",
    "Alt",
  ]);

function serverKey(
  key: string,
): string {
  return key === " "
    ? "Space"
    : key;
}

export function RemoteSupportLiveViewer({
  sessionId,
  viewerToken,
  token,
}: RemoteSupportLiveViewerProps) {
  const socketRef =
    useRef<Socket | null>(
      null,
    );

  const screenRef =
    useRef<HTMLDivElement | null>(
      null,
    );

  const imageRef =
    useRef<HTMLImageElement | null>(
      null,
    );

  const lastMouseMoveAtRef =
    useRef(0);

  const [
    status,
    setStatus,
  ] =
    useState(
      "Connecting secure transport...",
    );

  const [
    active,
    setActive,
  ] =
    useState(false);

  const [
    controlEnabled,
    setControlEnabled,
  ] =
    useState(false);

  const [
    exclusiveControlState,
    setExclusiveControlState,
  ] =
    useState<ExclusiveControlUiState>(
      "idle",
    );

  const [
    imageSource,
    setImageSource,
  ] =
    useState<string | null>(
      null,
    );

  const lastFrameLogAtRef =
    useRef(0);

  const [
    fullscreen,
    setFullscreen,
  ] =
    useState(false);

  useEffect(
    () => {
      if (!token) {
        setStatus(
          "Login session missing.",
        );

        return;
      }

      const socket:
        Socket =
        io(
          getMonitoringSocketUrl() +
            "/remote-support",
          {
            transports: [
              "websocket",
              "polling",
            ],

            auth: {
              sessionId,

              role:
                "viewer",

              participantToken:
                viewerToken,

              accessToken:
                token,
            },
          },
        );

      socketRef.current =
        socket;

      socket.on(
        "connect",
        () => {
          setStatus(
            "Secure transport connected.",
          );
        },
      );

      socket.on(
        "remote:status",
        (
          payload: {
            status?: string;
          },
        ) => {
          const isActive =
            payload?.status ===
              "active";

          setActive(
            isActive,
          );

          if (isActive) {
            setStatus(
              "Remote session active.",
            );
          }
        },
      );

      socket.on(
        "remote:frame",
        (
          frame:
            RemoteScreenFrame,
        ) => {
          const nextImageSource =
            remoteFrameToImageSource(
              frame,
            );

          if (!nextImageSource) {
            return;
          }

          setImageSource(
            nextImageSource,
          );

          const now =
            Date.now();

          if (
            lastFrameLogAtRef.current ===
              0 ||
            now -
                lastFrameLogAtRef.current >=
              30_000
          ) {
            console.info(
              "[Remote Screen] Viewer frame received",
            );

            lastFrameLogAtRef.current =
              now;
          }

          setStatus(
            "Live screen active.",
          );

          setActive(
            true,
          );
        },
      );

      socket.on(
        "remote:exclusive-control:state",
        (
          payload: {
            state?: string;
          },
        ) => {
          switch (
            payload?.state
          ) {
            case "active":
              setExclusiveControlState(
                "active",
              );

              setStatus(
                "Exclusive Control active. Local device mouse and keyboard are temporarily disabled with user consent.",
              );
              break;

            case "released":
              setExclusiveControlState(
                "idle",
              );

              setStatus(
                "Exclusive Control released. Local device input restored.",
              );
              break;

            case "declined":
              setExclusiveControlState(
                "declined",
              );

              setStatus(
                "Device user declined Exclusive Control.",
              );
              break;

            case "failed":
              setExclusiveControlState(
                "failed",
              );

              setStatus(
                "Exclusive Control could not be activated or released safely.",
              );
              break;

            default:
              break;
          }
        },
      );
      socket.on(
        "remote:ended",
        (
          payload: {
            reason?: string;
          },
        ) => {
          setActive(
            false,
          );

          setControlEnabled(
            false,
          );

          setExclusiveControlState(
            "idle",
          );

          setImageSource(
            null,
          );

          setStatus(
            payload?.reason ??
              "Remote session ended.",
          );

          if (
            document.fullscreenElement ===
              screenRef.current
          ) {
            void document
              .exitFullscreen()
              .catch(
                () => {},
              );
          }
        },
      );

      socket.on(
        "remote:error",
        (
          payload: {
            message?: string;
          },
        ) => {
          setStatus(
            payload?.message ??
              "Remote transport error.",
          );
        },
      );

      socket.on(
        "connect_error",
        (
          error,
        ) => {
          setActive(
            false,
          );

          setControlEnabled(
            false,
          );

          setExclusiveControlState(
            "idle",
          );

          setStatus(
            "Connection failed: " +
              error.message,
          );
        },
      );

      return () => {
        socketRef.current =
          null;

        socket.removeAllListeners();
        socket.disconnect();
      };
    },
    [
      sessionId,
      viewerToken,
      token,
    ],
  );

  useEffect(
    () => {
      const handleFullscreenChange =
        () => {
          const isFullscreen =
            document.fullscreenElement ===
              screenRef.current;

          setFullscreen(
            isFullscreen,
          );

          if (isFullscreen) {
            requestAnimationFrame(
              () => {
                screenRef.current
                  ?.focus();
              },
            );
          }
        };

      document.addEventListener(
        "fullscreenchange",
        handleFullscreenChange,
      );

      return () => {
        document.removeEventListener(
          "fullscreenchange",
          handleFullscreenChange,
        );
      };
    },
    [],
  );

  useEffect(
    () => {
      if (
        !active ||
        !controlEnabled
      ) {
        return;
      }

      const sendKeyboardEvent =
        (
          event:
            KeyboardEvent,
          action:
            | "down"
            | "up",
        ) => {
          if (
            document.fullscreenElement ===
              screenRef.current &&
            event.key ===
              "Escape"
          ) {
            return;
          }

          if (
            !allowedKeys.has(
              event.key,
            )
          ) {
            return;
          }

          event.preventDefault();
          event.stopPropagation();

          emitInput({
            type:
              "key",

            key:
              serverKey(
                event.key,
              ),

            action,
          });
        };

      const handleKeyDown =
        (
          event:
            KeyboardEvent,
        ) => {
          sendKeyboardEvent(
            event,
            "down",
          );
        };

      const handleKeyUp =
        (
          event:
            KeyboardEvent,
        ) => {
          sendKeyboardEvent(
            event,
            "up",
          );
        };

      window.addEventListener(
        "keydown",
        handleKeyDown,
        true,
      );

      window.addEventListener(
        "keyup",
        handleKeyUp,
        true,
      );

      return () => {
        window.removeEventListener(
          "keydown",
          handleKeyDown,
          true,
        );

        window.removeEventListener(
          "keyup",
          handleKeyUp,
          true,
        );
      };
    },
    [
      active,
      controlEnabled,
    ],
  );
  function emitInput(
    event:
      RemoteInputEvent,
  ): void {
    const socket =
      socketRef.current;

    if (
      !active ||
      !controlEnabled ||
      !socket?.connected
    ) {
      return;
    }

    socket.emit(
      "remote:input",
      event,
    );
  }

  function renderedImageRect() {
    const image =
      imageRef.current;

    if (!image) {
      return null;
    }

    const box =
      image.getBoundingClientRect();

    const naturalWidth =
      image.naturalWidth;

    const naturalHeight =
      image.naturalHeight;

    if (
      box.width <= 0 ||
      box.height <= 0 ||
      naturalWidth <= 0 ||
      naturalHeight <= 0
    ) {
      return null;
    }

    const scale =
      Math.min(
        box.width /
          naturalWidth,
        box.height /
          naturalHeight,
      );

    const width =
      naturalWidth *
      scale;

    const height =
      naturalHeight *
      scale;

    return {
      left:
        box.left +
        (
          box.width -
          width
        ) /
          2,

      top:
        box.top +
        (
          box.height -
          height
        ) /
          2,

      width,
      height,
    };
  }

  function coordinates(
    event:
      React.MouseEvent<HTMLDivElement>,
  ) {
    const rect =
      renderedImageRect();

    if (!rect) {
      return null;
    }

    if (
      event.clientX <
        rect.left ||
      event.clientX >
        rect.left +
          rect.width ||
      event.clientY <
        rect.top ||
      event.clientY >
        rect.top +
          rect.height
    ) {
      return null;
    }

    const x =
      Math.min(
        1,
        Math.max(
          0,
          (
            event.clientX -
            rect.left
          ) /
            rect.width,
        ),
      );

    const y =
      Math.min(
        1,
        Math.max(
          0,
          (
            event.clientY -
            rect.top
          ) /
            rect.height,
        ),
      );

    return {
      x,
      y,
    };
  }

  function handleMouseMove(
    event:
      React.MouseEvent<HTMLDivElement>,
  ): void {
    const now =
      performance.now();

    if (
      now -
        lastMouseMoveAtRef.current <
      33
    ) {
      return;
    }

    lastMouseMoveAtRef.current =
      now;

    const point =
      coordinates(
        event,
      );

    if (!point) {
      return;
    }

    emitInput({
      type:
        "mouse_move",

      ...point,
    });
  }

  function handleMouseButton(
    event:
      React.MouseEvent<HTMLDivElement>,
    action:
      | "down"
      | "up",
  ): void {
    const point =
      coordinates(
        event,
      );

    if (!point) {
      return;
    }

    const button =
      event.button === 2
        ? "right"
        : event.button === 0
          ? "left"
          : null;

    if (!button) {
      return;
    }

    event.preventDefault();

    screenRef.current
      ?.focus();

    emitInput({
      type:
        "mouse_button",

      button,
      action,

      ...point,
    });
  }

  function handleWheel(
    event:
      React.WheelEvent<HTMLDivElement>,
  ): void {
    if (
      !controlEnabled
    ) {
      return;
    }

    event.preventDefault();

    const delta =
      Math.max(
        -1200,
        Math.min(
          1200,
          Math.round(
            -event.deltaY,
          ),
        ),
      );

    emitInput({
      type:
        "mouse_wheel",

      delta,
    });
  }

  function handleKey(
    event:
      React.KeyboardEvent<HTMLDivElement>,
    action:
      | "down"
      | "up",
  ): void {
    if (
      !allowedKeys.has(
        event.key,
      )
    ) {
      return;
    }

    event.preventDefault();

    emitInput({
      type:
        "key",

      key:
        serverKey(
          event.key,
        ),

      action,
    });
  }

  function requestExclusiveControl():
    void {
    const socket =
      socketRef.current;

    if (
      !active ||
      !controlEnabled ||
      !socket?.connected ||
      exclusiveControlState ===
        "pending" ||
      exclusiveControlState ===
        "releasing" ||
      exclusiveControlState ===
        "active"
    ) {
      return;
    }

    setExclusiveControlState(
      "pending",
    );

    setStatus(
      "Waiting for the device user to approve Exclusive Control...",
    );

    socket.emit(
      "remote:exclusive-control:request",
    );
  }

  function releaseExclusiveControl():
    void {
    const socket =
      socketRef.current;

    if (
      !socket?.connected
    ) {
      setExclusiveControlState(
        "idle",
      );

      return;
    }

    if (
      exclusiveControlState !==
        "active" &&
      exclusiveControlState !==
        "pending"
    ) {
      return;
    }

    setExclusiveControlState(
      "releasing",
    );

    setStatus(
      "Releasing Exclusive Control...",
    );

    socket.emit(
      "remote:exclusive-control:release",
    );
  }

  function exclusiveControlLabel():
    string {
    switch (
      exclusiveControlState
    ) {
      case "pending":
        return "Waiting for User...";

      case "active":
        return "Release Exclusive Control";

      case "releasing":
        return "Releasing...";

      case "declined":
        return "Request Exclusive Control Again";

      case "failed":
        return "Retry Exclusive Control";

      default:
        return "Request Exclusive Control";
    }
  }

  function toggleExclusiveControl():
    void {
    if (
      exclusiveControlState ===
        "active"
    ) {
      releaseExclusiveControl();

      return;
    }

    requestExclusiveControl();
  }
  function toggleControl():
    void {
    const next =
      !controlEnabled;

    if (
      !next &&
      (
        exclusiveControlState ===
          "active" ||
        exclusiveControlState ===
          "pending"
      )
    ) {
      releaseExclusiveControl();
    }

    setControlEnabled(
      next,
    );

    if (next) {
      requestAnimationFrame(
        () => {
          screenRef.current
            ?.focus();
        },
      );
    }
  }

  async function toggleFullscreen():
    Promise<void> {
    const screen =
      screenRef.current;

    if (!screen) {
      return;
    }

    try {
      if (
        document.fullscreenElement ===
          screen
      ) {
        await document
          .exitFullscreen();

        return;
      }

      await screen
        .requestFullscreen();

      screen.focus();
    } catch (
      error
    ) {
      setStatus(
        error instanceof Error
          ? "Full screen failed: " +
              error.message
          : "Full screen failed.",
      );
    }
  }

  return (
    <div className="space-y-3 rounded-lg border p-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="font-medium">
            Secure Remote Session
          </div>

          <div className="text-xs text-muted-foreground">
            {status}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            className="rounded-md border px-3 py-1.5 text-sm disabled:opacity-50"
            disabled={
              !active
            }
            onClick={
              toggleControl
            }
            type="button"
          >
            {controlEnabled
              ? "Disable Control"
              : "Enable Control"}
          </button>

          <button
            className="rounded-md border px-3 py-1.5 text-sm disabled:opacity-50"
            disabled={
              !active ||
              !controlEnabled ||
              exclusiveControlState ===
                "pending" ||
              exclusiveControlState ===
                "releasing"
            }
            onClick={
              toggleExclusiveControl
            }
            type="button"
          >
            {exclusiveControlLabel()}
          </button>

          <button
            className="rounded-md border px-3 py-1.5 text-sm disabled:opacity-50"
            disabled={
              !active ||
              !imageSource
            }
            onClick={
              () => {
                void toggleFullscreen();
              }
            }
            type="button"
          >
            Full Screen
          </button>
        </div>
      </div>

      <div
        className={
          (
            fullscreen
              ? "relative flex h-screen w-screen items-center justify-center overflow-hidden bg-black outline-none "
              : "relative flex min-h-[220px] items-center justify-center overflow-hidden rounded-md border outline-none "
          ) +
          (
            controlEnabled
              ? "cursor-default ring-2 ring-primary/30"
              : ""
          )
        }
        onContextMenu={(
          event,
        ) => {
          if (
            controlEnabled
          ) {
            event.preventDefault();
          }
        }}

        onMouseDown={(
          event,
        ) =>
          handleMouseButton(
            event,
            "down",
          )
        }
        onMouseMove={
          handleMouseMove
        }
        onMouseUp={(
          event,
        ) =>
          handleMouseButton(
            event,
            "up",
          )
        }
        onWheel={
          handleWheel
        }
        ref={
          screenRef
        }
        role="application"
        tabIndex={0}
      >
        {fullscreen && (
          <div
            className="absolute right-4 top-4 z-20 flex items-center gap-2 rounded-md bg-background/90 p-2 shadow-lg"
            onContextMenu={(
              event,
            ) =>
              event.stopPropagation()
            }
            onMouseDown={(
              event,
            ) =>
              event.stopPropagation()
            }
            onMouseMove={(
              event,
            ) =>
              event.stopPropagation()
            }
            onMouseUp={(
              event,
            ) =>
              event.stopPropagation()
            }
            onWheel={(
              event,
            ) =>
              event.stopPropagation()
            }
          >
            <span className="max-w-[260px] truncate text-xs">
              {status}
            </span>

            <button
              className="rounded-md border px-3 py-1.5 text-sm"
              onClick={
                toggleControl
              }
              type="button"
            >
              {controlEnabled
                ? "Disable Control"
                : "Enable Control"}
            </button>

            <button
              className="rounded-md border px-3 py-1.5 text-sm disabled:opacity-50"
              disabled={
                !controlEnabled ||
                exclusiveControlState ===
                  "pending" ||
                exclusiveControlState ===
                  "releasing"
              }
              onClick={
                toggleExclusiveControl
              }
              type="button"
            >
              {exclusiveControlLabel()}
            </button>

            <button
              className="rounded-md border px-3 py-1.5 text-sm"
              onClick={
                () => {
                  void toggleFullscreen();
                }
              }
              type="button"
            >
              Exit Full Screen
            </button>
          </div>
        )}

        {imageSource ? (
          <img
            alt="Authorized remote device screen"
            ref={
              imageRef
            }
            className={
              fullscreen
                ? "h-full w-full select-none object-contain"
                : "block max-h-[620px] w-full select-none object-contain"
            }
            draggable={
              false
            }
            src={
              imageSource
            }
          />
        ) : (
          <div className="flex min-h-[220px] items-center justify-center p-6 text-sm text-muted-foreground">
            Waiting for the consented device screen.
          </div>
        )}
      </div>

      <div className="text-xs text-muted-foreground">
        Remote control must be explicitly enabled here and remains limited to the consented active session.
        Full screen mode keeps aspect-ratio-aware mouse mapping.
        Exclusive Control requires a separate visible device-user approval and temporarily disables local mouse and keyboard only after approval.
        No text capture, clipboard access, arbitrary commands, or recording is enabled.
      </div>
    </div>
  );
}


