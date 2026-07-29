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

  return io;
}
