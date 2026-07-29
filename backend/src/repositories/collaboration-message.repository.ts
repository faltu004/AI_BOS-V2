import type { Types } from "mongoose";
import {
  CollaborationMessageModel,
  type CollaborationMessage,
} from "../models/collaboration-message.model.js";

export type CollaborationMessageCreateData = Pick<
  CollaborationMessage,
  "roomId" | "authorId" | "body" | "mentionedUserIds" | "attachments"
>;

export class CollaborationMessageRepository {
  async create(data: CollaborationMessageCreateData) {
    return CollaborationMessageModel.create({
      ...data,
      reactions: [],
      isPinned: false,
    });
  }

  async findById(id: string) {
    return CollaborationMessageModel.findById(id);
  }

  async list(roomId: string, before: Date | undefined, limit: number) {
    const filter: Record<string, unknown> = { roomId, deletedAt: null };
    if (before) {
      filter.createdAt = { $lt: before };
    }

    return CollaborationMessageModel.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
  }

  async listPinned(roomId: string) {
    return CollaborationMessageModel.find({ roomId, isPinned: true, deletedAt: null })
      .sort({ pinnedAt: -1 })
      .lean();
  }

  async search(roomIds: Types.ObjectId[], query: string, limit: number) {
    return CollaborationMessageModel.find({
      roomId: { $in: roomIds },
      deletedAt: null,
      $text: { $search: query },
    })
      .sort({ score: { $meta: "textScore" } })
      .limit(limit)
      .lean();
  }

  async countUnread(roomId: Types.ObjectId, userId: Types.ObjectId, since: Date) {
    return CollaborationMessageModel.countDocuments({
      roomId,
      authorId: { $ne: userId },
      deletedAt: null,
      createdAt: { $gt: since },
    });
  }

  async findLatest(roomId: Types.ObjectId) {
    return CollaborationMessageModel.findOne({ roomId, deletedAt: null }).sort({ createdAt: -1 }).lean();
  }

  async update(id: string, updates: Partial<CollaborationMessage>) {
    return CollaborationMessageModel.findByIdAndUpdate(id, { $set: updates }, { new: true });
  }
}

export const collaborationMessageRepository = new CollaborationMessageRepository();
