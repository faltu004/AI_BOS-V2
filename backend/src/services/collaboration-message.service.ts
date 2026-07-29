import { nanoid } from "nanoid";
import fs from "node:fs/promises";
import path from "node:path";
import type { Types } from "mongoose";
import type { CollaborationMessageAttachment } from "../models/collaboration-message.model.js";
import { collaborationMessageRepository } from "../repositories/collaboration-message.repository.js";
import { collaborationRoomRepository } from "../repositories/collaboration-room.repository.js";
import { AppError } from "../utils/app-error.js";
import { uploadService } from "./upload.service.js";
import { notificationService } from "./notification.service.js";
import { collaborationRoomService } from "./collaboration-room.service.js";

const collaborationUploadsDir = path.join(process.cwd(), "uploads", "collaboration");

function toPreview(body: string) {
  return body.length > 140 ? `${body.slice(0, 137)}...` : body;
}

export class CollaborationMessageService {
  async list(userId: string, roomId: string, before?: string, limit = 50) {
    await collaborationRoomService.requireRoomAccess(userId, roomId);
    const messages = await collaborationMessageRepository.list(
      roomId,
      before ? new Date(before) : undefined,
      Math.min(limit, 100),
    );
    return messages.reverse();
  }

  async send(userId: string, roomId: string, body: string, attachments: CollaborationMessageAttachment[] = []) {
    const room = await collaborationRoomService.requireRoomAccess(userId, roomId);

    if (!body.trim() && attachments.length === 0) {
      throw new AppError("A message needs text or an attachment", 400);
    }

    const mentionedUserIds = notificationService.parseMentions(body);

    const message = await collaborationMessageRepository.create({
      roomId: room._id as Types.ObjectId,
      authorId: userId as unknown as Types.ObjectId,
      body: body.trim(),
      mentionedUserIds,
      attachments,
    });

    await collaborationRoomRepository.setLastMessageAt(roomId, message.createdAt);

    const mentionRecipients = mentionedUserIds
      .map((id) => id.toString())
      .filter((id) => id !== userId);

    const notifications = mentionRecipients.length
      ? await notificationService.dispatch({
          recipientUserIds: mentionRecipients,
          type: "mention",
          category: "mention",
          priority: "Medium",
          title: "You were mentioned",
          body: toPreview(body.trim() || "sent an attachment"),
          actorUserId: userId,
          sourceType: "collaboration_room",
          sourceId: roomId,
          metadata: { messageId: (message._id as Types.ObjectId).toString() },
        })
      : [];

    return { message, notifications };
  }

  async edit(userId: string, messageId: string, body: string) {
    const message = await collaborationMessageRepository.findById(messageId);
    if (!message || message.deletedAt) {
      throw new AppError("Message not found", 404);
    }
    if (message.authorId.toString() !== userId) {
      throw new AppError("You can only edit your own messages", 403);
    }

    const mentionedUserIds = notificationService.parseMentions(body);
    return collaborationMessageRepository.update(messageId, {
      body: body.trim(),
      mentionedUserIds,
      editedAt: new Date(),
    });
  }

  async softDelete(userId: string, messageId: string, canModerate: boolean) {
    const message = await collaborationMessageRepository.findById(messageId);
    if (!message || message.deletedAt) {
      throw new AppError("Message not found", 404);
    }
    if (message.authorId.toString() !== userId && !canModerate) {
      throw new AppError("You do not have permission to delete this message", 403);
    }

    await collaborationMessageRepository.update(messageId, { deletedAt: new Date() });
    return { deleted: true, roomId: message.roomId };
  }

  async react(userId: string, messageId: string, emoji: string) {
    const message = await collaborationMessageRepository.findById(messageId);
    if (!message || message.deletedAt) {
      throw new AppError("Message not found", 404);
    }

    await collaborationRoomService.requireRoomAccess(userId, message.roomId.toString());

    const existingIndex = message.reactions.findIndex(
      (reaction) => reaction.userId.toString() === userId && reaction.emoji === emoji,
    );

    if (existingIndex >= 0) {
      message.reactions.splice(existingIndex, 1);
    } else {
      message.reactions.push({ emoji, userId: userId as unknown as Types.ObjectId });
    }

    await message.save();
    return message;
  }

  async pin(userId: string, messageId: string, pinned: boolean, canModerate: boolean) {
    const message = await collaborationMessageRepository.findById(messageId);
    if (!message || message.deletedAt) {
      throw new AppError("Message not found", 404);
    }
    if (message.authorId.toString() !== userId && !canModerate) {
      throw new AppError("You do not have permission to pin this message", 403);
    }

    return collaborationMessageRepository.update(messageId, {
      isPinned: pinned,
      pinnedBy: pinned ? (userId as unknown as Types.ObjectId) : undefined,
      pinnedAt: pinned ? new Date() : undefined,
    });
  }

  async listPinned(userId: string, roomId: string) {
    await collaborationRoomService.requireRoomAccess(userId, roomId);
    return collaborationMessageRepository.listPinned(roomId);
  }

  async search(userId: string, query: string, limit = 30) {
    if (!query.trim()) return [];

    const allRooms = await collaborationRoomService.listRoomsForUser(userId);
    const accessibleRoomIds = allRooms
      .map((room) => room._id as Types.ObjectId)
      .filter((roomId) => !!roomId);

    return collaborationMessageRepository.search(accessibleRoomIds, query.trim(), limit);
  }

  async uploadAttachment(userId: string, roomId: string, file?: Express.Multer.File): Promise<CollaborationMessageAttachment> {
    await collaborationRoomService.requireRoomAccess(userId, roomId);

    const prepared = uploadService.prepareSingleFile(file);
    await fs.mkdir(collaborationUploadsDir, { recursive: true });

    const storedName = `${nanoid()}-${prepared.originalName}`;
    const storedPath = path.join(collaborationUploadsDir, storedName);
    await fs.writeFile(storedPath, file!.buffer);

    return {
      fileName: prepared.originalName,
      storedPath: `collaboration/${storedName}`,
      mimeType: prepared.mimeType,
      size: prepared.size,
      url: `/uploads/collaboration/${storedName}`,
    };
  }
}

export const collaborationMessageService = new CollaborationMessageService();
