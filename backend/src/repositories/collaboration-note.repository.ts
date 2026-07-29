import { CollaborationNoteModel } from "../models/collaboration-note.model.js";

export class CollaborationNoteRepository {
  async findByRoom(roomId: string) {
    return CollaborationNoteModel.findOne({ roomId }).lean();
  }

  async upsert(roomId: string, title: string, body: string, lastEditedBy?: string) {
    return CollaborationNoteModel.findOneAndUpdate(
      { roomId },
      { $set: { title, body, lastEditedBy } },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    ).lean();
  }
}

export const collaborationNoteRepository = new CollaborationNoteRepository();
