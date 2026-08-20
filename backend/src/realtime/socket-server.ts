import {
  migrationCompatibilityEnabled,
  secureSecretEqual,
} from "../utils/secure-secret.js";
import type { Server as HttpServer } from "node:http";
import { Server, type Socket } from "socket.io";
import { appConfig } from "../config/app.js";
import { collaborationMessageService } from "../services/collaboration-message.service.js";
import { collaborationNoteService } from "../services/collaboration-note.service.js";
import {
  collaborationRoomService,
  resolveCollaborationUser,
} from "../services/collaboration-room.service.js";
import { permissionService } from "../services/permission.service.js";
import { verifyAccessToken } from "../utils/jwt.js";
import {
  remoteSupportTransportService,
} from "../services/remote-support-transport.service.js";
import {
  administratorMonitoringAccessService,
} from "../services/administrator-monitoring-access.service.js";

import {
  deviceCredentialService,
} from "../services/device-credential.service.js";

type SocketUser = { id: string; role: string };
type SocketAck<TData = unknown> = (response: { ok: boolean; error?: string; data?: TData }) => void;

let ioInstance: Server | null = null;

export function getIO(): Server | null {
  return ioInstance;
}

export function personalRoom(userId: string) {
  return `user:${userId}`;
}

function ackError(ack: SocketAck | undefined, error: unknown) {
  const message = error instanceof Error ? error.message : "Something went wrong";
  ack?.({ ok: false, error: message });
}

export function initSocketServer(httpServer: HttpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: appConfig.clientOrigins,
      credentials: true,
    },
  });

  ioInstance = io;

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token as string | undefined;
      if (!token) {
        next(new Error("Authentication required"));
        return;
      }

      const payload = verifyAccessToken(token);
      socket.data.user = { id: payload.sub, role: payload.role } satisfies SocketUser;
      next();
    } catch {
      next(new Error("Invalid or expired token"));
    }
  });

  io.on("connection", (socket: Socket) => {
    void (async () => {
      const user = socket.data.user as SocketUser;
      socket.join(personalRoom(user.id));

      const fullUser = await resolveCollaborationUser(user.id);
      const workspaceRoom = await collaborationRoomService.getWorkspaceRoom(user.id);
      socket.join((workspaceRoom._id as { toString(): string }).toString());

      for (const teamId of fullUser.teamIds ?? []) {
        const teamRoom = await collaborationRoomService.getTeamRoom(user.id, teamId.toString());
        socket.join((teamRoom._id as { toString(): string }).toString());
      }
    })();

    socket.on("room:join", (roomId: string, ack?: SocketAck) => {
      void (async () => {
        try {
          const user = socket.data.user as SocketUser;
          await collaborationRoomService.requireRoomAccess(user.id, roomId);
          socket.join(roomId);
          ack?.({ ok: true });
        } catch (error) {
          ackError(ack, error);
        }
      })();
    });

    socket.on(
      "message:send",
      (
        payload: { roomId: string; body: string; attachments?: unknown[] },
        ack?: SocketAck,
      ) => {
        void (async () => {
          try {
            const user = socket.data.user as SocketUser;
            const { message, notifications } = await collaborationMessageService.send(
              user.id,
              payload.roomId,
              payload.body,
              (payload.attachments as never[]) ?? [],
            );

            io.to(payload.roomId).emit("message:new", message);
            for (const notification of notifications) {
              io.to(personalRoom(notification.recipientUserId.toString())).emit("notification:new", notification);
            }

            ack?.({ ok: true, data: message });
          } catch (error) {
            ackError(ack, error);
          }
        })();
      },
    );

    socket.on(
      "message:react",
      (
        payload: { messageId: string; emoji: string },
        ack?: SocketAck,
      ) => {
        void (async () => {
          try {
            const user = socket.data.user as SocketUser;
            const message = await collaborationMessageService.react(user.id, payload.messageId, payload.emoji);
            io.to(message.roomId.toString()).emit("message:updated", message);
            ack?.({ ok: true });
          } catch (error) {
            ackError(ack, error);
          }
        })();
      },
    );

    socket.on(
      "message:pin",
      (
        payload: { messageId: string; pinned: boolean },
        ack?: SocketAck,
      ) => {
        void (async () => {
          try {
            const user = socket.data.user as SocketUser;
            const canModerate = await permissionService.hasPermission(user.role, "collaboration.moderate");
            const message = await collaborationMessageService.pin(user.id, payload.messageId, payload.pinned, canModerate);
            if (message) {
              io.to(message.roomId.toString()).emit("message:updated", message);
            }
            ack?.({ ok: true });
          } catch (error) {
            ackError(ack, error);
          }
        })();
      },
    );

    socket.on(
      "note:update",
      (
        payload: { roomId: string; title: string; body: string },
        ack?: SocketAck,
      ) => {
        void (async () => {
          try {
            const user = socket.data.user as SocketUser;
            const note = await collaborationNoteService.update(user.id, payload.roomId, payload.title, payload.body);
            io.to(payload.roomId).emit("note:updated", note);
            ack?.({ ok: true });
          } catch (error) {
            ackError(ack, error);
          }
        })();
      },
    );

    socket.on("typing:start", (payload: { roomId: string }) => {
      const user = socket.data.user as SocketUser;
      socket.to(payload.roomId).emit("typing:start", { userId: user.id, roomId: payload.roomId });
    });

    socket.on("typing:stop", (payload: { roomId: string }) => {
      const user = socket.data.user as SocketUser;
      socket.to(payload.roomId).emit("typing:stop", { userId: user.id, roomId: payload.roomId });
    });
  });

  initRemoteSupportNamespace(
    io,
  );

  return io;
}

type RemoteParticipant = {
  sessionId: string;
  deviceId: string;
  requestedBy: string;
  requestedByRole: string;

  role:
    | "viewer"
    | "endpoint";

  capabilities: {
    screenView: boolean;
    remoteControl: boolean;
    recording: boolean;
  };
};

type RemoteFramePayload = {
  mimeType: string;
  data: string;
  capturedAt: string;
};

type RemoteInputPayload =
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

const remoteAllowedKeys =
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
    "Space",
    "Control",
    "Shift",
    "Alt",
  ]);

function normalizedCoordinate(
  value: unknown,
): value is number {
  return (
    typeof value ===
      "number" &&
    Number.isFinite(
      value,
    ) &&
    value >=
      0 &&
    value <=
      1
  );
}

function validRemoteInput(
  payload: unknown,
): payload is
  RemoteInputPayload {
  if (
    typeof payload !==
      "object" ||
    payload === null ||
    Array.isArray(
      payload,
    )
  ) {
    return false;
  }

  const input =
    payload as
      Record<
        string,
        unknown
      >;

  if (
    input.type ===
    "mouse_move"
  ) {
    return (
      normalizedCoordinate(
        input.x,
      ) &&
      normalizedCoordinate(
        input.y,
      )
    );
  }

  if (
    input.type ===
    "mouse_button"
  ) {
    return (
      (
        input.button ===
          "left" ||
        input.button ===
          "right"
      ) &&
      (
        input.action ===
          "down" ||
        input.action ===
          "up"
      ) &&
      normalizedCoordinate(
        input.x,
      ) &&
      normalizedCoordinate(
        input.y,
      )
    );
  }

  if (
    input.type ===
    "mouse_wheel"
  ) {
    return (
      typeof input.delta ===
        "number" &&
      Number.isInteger(
        input.delta,
      ) &&
      input.delta >=
        -1200 &&
      input.delta <=
        1200
    );
  }

  if (
    input.type ===
    "key"
  ) {
    return (
      typeof input.key ===
        "string" &&
      remoteAllowedKeys.has(
        input.key,
      ) &&
      (
        input.action ===
          "down" ||
        input.action ===
          "up"
      )
    );
  }

  return false;
}

function remoteSupportRoom(
  sessionId: string,
): string {
  return (
    "remote-support:" +
    sessionId
  );
}

function remoteSupportViewerRoom(
  sessionId: string,
): string {
  return (
    remoteSupportRoom(
      sessionId,
    ) + ":viewers"
  );
}

function remoteSupportEndpointRoom(
  sessionId: string,
): string {
  return (
    remoteSupportRoom(
      sessionId,
    ) + ":endpoints"
  );
}

const MAX_REMOTE_FRAME_BYTES =
  4 * 1024 * 1024;

export function validRemoteFrame(
  frame: RemoteFramePayload,
): boolean {
  if (
    frame?.mimeType !==
      "image/jpeg" ||
    typeof frame.data !==
      "string" ||
    frame.data.length === 0 ||
    frame.data.length % 4 !==
      0 ||
    !/^[A-Za-z0-9+/]+={0,2}$/.test(
      frame.data,
    ) ||
    typeof frame.capturedAt !==
      "string" ||
    !Number.isFinite(
      Date.parse(
        frame.capturedAt,
      ),
    )
  ) {
    return false;
  }

  const padding =
    frame.data.endsWith(
      "==",
    )
      ? 2
      : frame.data.endsWith(
            "=",
          )
        ? 1
        : 0;

  const decodedBytes =
    frame.data.length /
      4 *
      3 -
    padding;

  return (
    decodedBytes > 0 &&
    decodedBytes <=
      MAX_REMOTE_FRAME_BYTES
  );
}

function handshakeString(
  value: unknown,
): string {
  return typeof value ===
    "string"
    ? value.trim()
    : "";
}

function initRemoteSupportNamespace(
  io: Server,
): void {
  const namespace =
    io.of(
      "/remote-support",
    );

  namespace.use(
    async (
      socket,
      next,
    ) => {
      try {
        const sessionId =
          handshakeString(
            socket.handshake.auth
              ?.sessionId,
          );

        const role =
          handshakeString(
            socket.handshake.auth
              ?.role,
          );

        const participantToken =
          handshakeString(
            socket.handshake.auth
              ?.participantToken,
          );

        const participant =
          await remoteSupportTransportService
            .authenticateParticipant({
              sessionId,
              role,
              token:
                participantToken,
            });

        if (
          participant.role ===
          "viewer"
        ) {
          const accessToken =
            handshakeString(
              socket.handshake.auth
                ?.accessToken,
            );

          if (!accessToken) {
            throw new Error(
              "Viewer login token is required",
            );
          }

          const jwt =
            verifyAccessToken(
              accessToken,
            );

          if (
            jwt.sub !==
            participant.requestedBy
          ) {
            throw new Error(
              "Viewer does not own this remote support request",
            );
          }

          await administratorMonitoringAccessService
            .requirePermission(
              jwt.sub,
              jwt.role,
              "device.remote_support.create",
            );
        } else {
          const socketDeviceId =
            handshakeString(
              socket.handshake.auth
                ?.deviceId,
            );

          const deviceToken =
            handshakeString(
              socket.handshake.auth
                ?.deviceToken,
            );

          const deviceKey =
            handshakeString(
              socket.handshake.auth
                ?.deviceKey,
            );

          const hasPerDeviceAuthAttempt =
            Boolean(
              socketDeviceId ||
              deviceToken,
            );

          if (
            hasPerDeviceAuthAttempt
          ) {
            /*
             * New Phase 20 authentication.
             *
             * The device credential must
             * belong to the exact endpoint
             * represented by the authorized
             * remote support session.
             *
             * Invalid new credentials never
             * downgrade to the legacy key.
             */
            if (
              !socketDeviceId ||
              !deviceToken ||
              socketDeviceId !==
                participant.deviceId
            ) {
              throw new Error(
                "Invalid device authentication",
              );
            }

            const authenticated =
              await deviceCredentialService
                .verify(
                  socketDeviceId,
                  deviceToken,
                );

            if (!authenticated) {
              throw new Error(
                "Invalid device authentication",
              );
            }
          } else if (deviceKey) {
            /*
             * Temporary migration path for
             * currently deployed old agents.
             *
             * Removed during Phase 20G final
             * migration cutover.
             */
            const legacySocketAuthEnabled =
              migrationCompatibilityEnabled(
                process.env
                  .ALLOW_LEGACY_DEVICE_AUTH,
              );

            if (!legacySocketAuthEnabled) {
              throw new Error(
                "Invalid device authentication",
              );
            }
            const expectedKey =
              process.env
                .SERVICE_API_KEY
                ?.trim();

            if (
              !secureSecretEqual(
                expectedKey,
                deviceKey,
              )
            ) {
              throw new Error(
                "Invalid device authentication",
              );
            }
          } else {
            /*
             * The endpoint participant token is minted only after the
             * authenticated SYSTEM Agent submits local user consent. The
             * limited Session Helper can therefore join the short-lived
             * remote support socket without reading protected device
             * credentials from ProgramData.
             */
          }
        }

        socket.data
          .remoteParticipant =
          participant satisfies
            RemoteParticipant;

        next();
      } catch (error) {
        next(
          new Error(
            error instanceof Error
              ? error.message
              : "Remote support authentication failed",
          ),
        );
      }
    },
  );

  namespace.on(
    "connection",
    (
      socket,
    ) => {
      const participant =
        socket.data
          .remoteParticipant as
            RemoteParticipant;

      const room =
        remoteSupportRoom(
          participant.sessionId,
        );

      socket.join(
        room,
      );

      socket.join(
        participant.role ===
          "viewer"
          ? remoteSupportViewerRoom(
              participant.sessionId,
            )
          : remoteSupportEndpointRoom(
              participant.sessionId,
            ),
      );

      let lastFrameAcceptedLogAt =
        0;

      socket.emit(
        "remote:joined",
        {
          sessionId:
            participant.sessionId,

          role:
            participant.role,
        },
      );

      void namespace
        .in(
          room,
        )
        .fetchSockets()
        .then(
          async (
            connected,
          ) => {
            const roles =
              connected.map(
                (
                  item,
                ) =>
                  (
                    item.data
                      .remoteParticipant as
                      RemoteParticipant
                  ).role,
              );

            if (
              roles.includes(
                "viewer",
              ) &&
              roles.includes(
                "endpoint",
              )
            ) {
              const active =
                await remoteSupportTransportService
                  .markActive(
                    participant.sessionId,
                  );

              namespace
                .to(
                  room,
                )
                .emit(
                  "remote:status",
                  {
                    status:
                      active.status,

                    expiresAt:
                      active.expiresAt,
                  },
                );
            }
          },
        )
        .catch(
          (
            error,
          ) => {
            socket.emit(
              "remote:error",
              {
                message:
                  error instanceof Error
                    ? error.message
                    : "Remote support activation failed",
              },
            );
          },
        );

      socket.on(
        "remote:exclusive-control:request",
        () => {
          void (async () => {
            try {
              if (
                participant.role !==
                  "viewer"
              ) {
                throw new Error(
                  "Only the authorized viewer may request Exclusive Control",
                );
              }

              if (
                !participant
                  .capabilities
                  .remoteControl
              ) {
                throw new Error(
                  "Remote control is not authorized for this session",
                );
              }

              await remoteSupportTransportService
                .requireActiveSession(
                  participant.sessionId,
                );

              await administratorMonitoringAccessService
                .requirePermission(
                  participant.requestedBy,
                  participant.requestedByRole,
                  "device.remote_support.control",
                );

              socket
                .to(
                  remoteSupportEndpointRoom(
                    participant.sessionId,
                  ),
                )
                .emit(
                  "remote:exclusive-control:request",
                );
            } catch (
              error
            ) {
              socket.emit(
                "remote:error",
                {
                  message:
                    error instanceof Error
                      ? error.message
                      : "Exclusive Control request rejected",
                },
              );
            }
          })();
        },
      );

      socket.on(
        "remote:exclusive-control:release",
        () => {
          void (async () => {
            try {
              if (
                participant.role !==
                  "viewer"
              ) {
                throw new Error(
                  "Only the authorized viewer may release Exclusive Control",
                );
              }

              if (
                !participant
                  .capabilities
                  .remoteControl
              ) {
                throw new Error(
                  "Remote control is not authorized for this session",
                );
              }

              await remoteSupportTransportService
                .requireActiveSession(
                  participant.sessionId,
                );

              socket
                .to(
                  remoteSupportEndpointRoom(
                    participant.sessionId,
                  ),
                )
                .emit(
                  "remote:exclusive-control:release",
                );
            } catch (
              error
            ) {
              socket.emit(
                "remote:error",
                {
                  message:
                    error instanceof Error
                      ? error.message
                      : "Exclusive Control release rejected",
                },
              );
            }
          })();
        },
      );

      socket.on(
        "remote:exclusive-control:state",
        (
          payload:
            unknown,
        ) => {
          void (async () => {
            try {
              if (
                participant.role !==
                  "endpoint"
              ) {
                throw new Error(
                  "Only the consented endpoint may report Exclusive Control state",
                );
              }

              if (
                !participant
                  .capabilities
                  .remoteControl
              ) {
                throw new Error(
                  "Remote control is not authorized for this session",
                );
              }

              const state =
                typeof payload ===
                  "object" &&
                payload !==
                  null &&
                "state" in payload
                  ? (
                      payload as {
                        state?:
                          unknown;
                      }
                    ).state
                  : undefined;

              if (
                state !==
                  "active" &&
                state !==
                  "declined" &&
                state !==
                  "released" &&
                state !==
                  "failed"
              ) {
                throw new Error(
                  "Exclusive Control state is invalid",
                );
              }

              await remoteSupportTransportService
                .requireActiveSession(
                  participant.sessionId,
                );

              socket
                .to(
                  remoteSupportViewerRoom(
                    participant.sessionId,
                  ),
                )
                .emit(
                  "remote:exclusive-control:state",
                  {
                    state,
                  },
                );
            } catch (
              error
            ) {
              socket.emit(
                "remote:error",
                {
                  message:
                    error instanceof Error
                      ? error.message
                      : "Exclusive Control state rejected",
                },
              );
            }
          })();
        },
      );

      socket.on(
        "disconnect",
        () => {
          if (
            participant.role ===
              "viewer"
          ) {
            socket
              .to(
                remoteSupportEndpointRoom(
                  participant.sessionId,
                ),
              )
              .emit(
                "remote:exclusive-control:release",
              );
          }
        },
      );
      socket.on(
        "remote:input",
        (
          payload:
            unknown,
        ) => {
          void (async () => {
            try {
              if (
                participant.role !==
                "viewer"
              ) {
                throw new Error(
                  "Only the authorized viewer may send remote input",
                );
              }

              if (
                !participant
                  .capabilities
                  .remoteControl
              ) {
                throw new Error(
                  "Remote control is not authorized for this session",
                );
              }

              if (
                !validRemoteInput(
                  payload,
                )
              ) {
                throw new Error(
                  "Invalid remote input event",
                );
              }

              await administratorMonitoringAccessService
                .requirePermission(
                  participant.requestedBy,
                  participant.requestedByRole,
                  "device.remote_support.control",
                );

              await remoteSupportTransportService
                .requireActiveSession(
                  participant.sessionId,
                );

              socket
                .to(
                  remoteSupportEndpointRoom(
                    participant.sessionId,
                  ),
                )
                .emit(
                  "remote:input",
                  payload,
                );
            } catch (
              error
            ) {
              socket.emit(
                "remote:error",
                {
                  message:
                    error instanceof Error
                      ? error.message
                      : "Remote input rejected",
                },
              );
            }
          })();
        },
      );

      socket.on(
        "remote:frame",
        (
          frame:
            RemoteFramePayload,
        ) => {
          void (async () => {
            try {
              if (
                participant.role !==
                "endpoint"
              ) {
                throw new Error(
                  "Only the endpoint may send screen frames",
                );
              }

              if (
                !validRemoteFrame(
                  frame,
                )
              ) {
                throw new Error(
                  "Invalid remote screen frame",
                );
              }

              await administratorMonitoringAccessService
                .requirePermission(
                  participant.requestedBy,
                  participant.requestedByRole,
                  "device.remote_support.create",
                );

              await remoteSupportTransportService
                .requireActiveSession(
                  participant.sessionId,
                );

              socket
                .to(
                  remoteSupportViewerRoom(
                    participant.sessionId,
                  ),
                )
                .emit(
                  "remote:frame",
                  frame,
                );

              const now =
                Date.now();

              if (
                lastFrameAcceptedLogAt ===
                  0 ||
                now -
                    lastFrameAcceptedLogAt >=
                  30_000
              ) {
                console.log(
                  "[Remote Screen] Backend frame accepted",
                );

                lastFrameAcceptedLogAt =
                  now;
              }
            } catch (error) {
              socket.emit(
                "remote:error",
                {
                  message:
                    error instanceof Error
                      ? error.message
                      : "Remote frame rejected",
                },
              );
            }
          })();
        },
      );
    },
  );
}


export function disconnectRemoteSupportSession(
  sessionId: string,
  reason:
    string =
      "Remote support session ended",
): void {
  if (!ioInstance) {
    return;
  }

  const room =
    "remote-support:" +
    sessionId;

  const namespace =
    ioInstance.of(
      "/remote-support",
    );

  namespace
    .to(
      room,
    )
    .emit(
      "remote:ended",
      {
        reason,
      },
    );

  namespace
    .in(
      room,
    )
    .disconnectSockets(
      true,
    );
}


