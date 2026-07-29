import { collaborationNoteRepository } from "../repositories/collaboration-note.repository.js";
import { collaborationRoomService } from "./collaboration-room.service.js";

export class CollaborationNoteService {
  async get(userId: string, roomId: string) {
    await collaborationRoomService.requireRoomAccess(userId, roomId);
    const note = await collaborationNoteRepository.findByRoom(roomId);
    return note ?? { roomId, title: "Shared notes", body: "" };
  }

  async update(userId: string, roomId: string, title: string, body: string) {
    await collaborationRoomService.requireRoomAccess(userId, roomId);
    return collaborationNoteRepository.upsert(roomId, title, body, userId);
  }
}

export const collaborationNoteService = new CollaborationNoteService();
