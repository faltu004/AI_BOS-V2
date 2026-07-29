import { useEffect, useMemo, useRef } from "react";
import type { Socket } from "socket.io-client";
import { getSocket } from "@shared/realtime/socket-client";
import type { CollaborationAttachment, CollaborationMessage, CollaborationNote } from "./collaboration.schema";

type AckResponse<TData = unknown> = { ok: boolean; error?: string; data?: TData };

export type CollaborationSocketHandlers = {
  onMessageNew?: (message: CollaborationMessage) => void;
  onMessageUpdated?: (message: CollaborationMessage) => void;
  onNoteUpdated?: (note: CollaborationNote) => void;
  onTypingStart?: (payload: { userId: string; roomId: string }) => void;
  onTypingStop?: (payload: { userId: string; roomId: string }) => void;
};

function emitWithAck<TPayload, TData = void>(socket: Socket, event: string, payload: TPayload) {
  return new Promise<TData>((resolve, reject) => {
    socket.emit(event, payload, (response: AckResponse<TData>) => {
      if (response?.ok) {
        resolve(response.data as TData);
      } else {
        reject(new Error(response?.error ?? `${event} failed`));
      }
    });
  });
}

export function useCollaborationSocket(token: string | undefined, handlers: CollaborationSocketHandlers) {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  const socket = useMemo(() => (token ? getSocket(token) : null), [token]);

  useEffect(() => {
    if (!socket) return;

    const onMessageNew = (message: CollaborationMessage) => handlersRef.current.onMessageNew?.(message);
    const onMessageUpdated = (message: CollaborationMessage) => handlersRef.current.onMessageUpdated?.(message);
    const onNoteUpdated = (note: CollaborationNote) => handlersRef.current.onNoteUpdated?.(note);
    const onTypingStart = (payload: { userId: string; roomId: string }) =>
      handlersRef.current.onTypingStart?.(payload);
    const onTypingStop = (payload: { userId: string; roomId: string }) => handlersRef.current.onTypingStop?.(payload);

    socket.on("message:new", onMessageNew);
    socket.on("message:updated", onMessageUpdated);
    socket.on("note:updated", onNoteUpdated);
    socket.on("typing:start", onTypingStart);
    socket.on("typing:stop", onTypingStop);

    return () => {
      socket.off("message:new", onMessageNew);
      socket.off("message:updated", onMessageUpdated);
      socket.off("note:updated", onNoteUpdated);
      socket.off("typing:start", onTypingStart);
      socket.off("typing:stop", onTypingStop);
    };
  }, [socket]);

  return useMemo(
    () => ({
      socket,
      joinRoom(roomId: string) {
        return socket ? emitWithAck(socket, "room:join", roomId) : Promise.resolve();
      },
      sendMessage(roomId: string, body: string, attachments: CollaborationAttachment[] = []) {
        return socket
          ? emitWithAck<{ roomId: string; body: string; attachments: CollaborationAttachment[] }, CollaborationMessage>(
              socket,
              "message:send",
              { roomId, body, attachments },
            )
          : Promise.resolve(undefined);
      },
      react(messageId: string, emoji: string) {
        return socket ? emitWithAck(socket, "message:react", { messageId, emoji }) : Promise.resolve();
      },
      pin(messageId: string, pinned: boolean) {
        return socket ? emitWithAck(socket, "message:pin", { messageId, pinned }) : Promise.resolve();
      },
      updateNote(roomId: string, title: string, body: string) {
        return socket ? emitWithAck(socket, "note:update", { roomId, title, body }) : Promise.resolve();
      },
      typingStart(roomId: string) {
        socket?.emit("typing:start", { roomId });
      },
      typingStop(roomId: string) {
        socket?.emit("typing:stop", { roomId });
      },
    }),
    [socket],
  );
}
