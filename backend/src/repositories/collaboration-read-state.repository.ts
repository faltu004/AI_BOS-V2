import type { Types } from "mongoose";
import { CollaborationReadStateModel } from "../models/collaboration-read-state.model.js";

export class CollaborationReadStateRepository {
  async find(roomId: Types.ObjectId, userId: Types.ObjectId) {
    return CollaborationReadStateModel.findOne({ roomId, userId }).lean();
  }

  async findManyForUser(userId: Types.ObjectId, roomIds: Types.ObjectId[]) {
    return CollaborationReadStateModel.find({ userId, roomId: { $in: roomIds } }).lean();
  }

  async markRead(roomId: string, userId: string, at: Date) {
    return CollaborationReadStateModel.findOneAndUpdate(
      { roomId, userId },
      { $set: { lastReadAt: at } },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    ).lean();
  }
}

export const collaborationReadStateRepository = new CollaborationReadStateRepository();
