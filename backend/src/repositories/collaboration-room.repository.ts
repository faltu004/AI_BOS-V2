import type { Types } from "mongoose";
import {
  CollaborationRoomModel,
  type CollaborationRoom,
} from "../models/collaboration-room.model.js";

export type CollaborationRoomCreateData = Omit<CollaborationRoom, "createdAt" | "updatedAt" | "isArchived">;

export class CollaborationRoomRepository {
  async findById(id: string) {
    return CollaborationRoomModel.findById(id);
  }

  async getOrCreateWorkspaceRoom(organizationId: Types.ObjectId, name: string, createdBy?: string) {
    return CollaborationRoomModel.findOneAndUpdate(
      { organizationId, roomType: "workspace" },
      {
        $setOnInsert: {
          organizationId,
          roomType: "workspace",
          name,
          participantIds: [],
          createdBy,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
  }

  async getOrCreateTeamRoom(organizationId: Types.ObjectId, teamId: string, name: string, createdBy?: string) {
    return CollaborationRoomModel.findOneAndUpdate(
      { organizationId, roomType: "team", teamId },
      {
        $setOnInsert: {
          organizationId,
          roomType: "team",
          teamId,
          name,
          participantIds: [],
          createdBy,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
  }

  async getOrCreateProjectRoom(organizationId: Types.ObjectId, projectId: string, name: string, createdBy?: string) {
    return CollaborationRoomModel.findOneAndUpdate(
      { organizationId, roomType: "project", projectId },
      {
        $setOnInsert: {
          organizationId,
          roomType: "project",
          projectId,
          name,
          participantIds: [],
          createdBy,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
  }

  async getOrCreateEntityRoom(
    organizationId: Types.ObjectId,
    entityType: string,
    entityId: string,
    name: string,
    createdBy?: string,
  ) {
    return CollaborationRoomModel.findOneAndUpdate(
      { organizationId, roomType: "entity", entityType, entityId },
      {
        $setOnInsert: {
          organizationId,
          roomType: "entity",
          entityType,
          entityId,
          name,
          participantIds: [],
          createdBy,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
  }

  async findDirectRoom(organizationId: Types.ObjectId, participantIds: string[]) {
    const sorted = [...participantIds].sort();
    return CollaborationRoomModel.findOne({
      organizationId,
      roomType: "direct",
      participantIds: { $size: sorted.length, $all: sorted },
    });
  }

  async createDirectRoom(data: CollaborationRoomCreateData) {
    return CollaborationRoomModel.create({ ...data, isArchived: false });
  }

  async listTeamRooms(organizationId: Types.ObjectId, teamIds: Types.ObjectId[]) {
    return CollaborationRoomModel.find({ organizationId, roomType: "team", teamId: { $in: teamIds } }).lean();
  }

  async listProjectRooms(organizationId: Types.ObjectId) {
    return CollaborationRoomModel.find({ organizationId, roomType: "project", isArchived: false }).lean();
  }

  async listDirectRooms(organizationId: Types.ObjectId, userId: Types.ObjectId) {
    return CollaborationRoomModel.find({ organizationId, roomType: "direct", participantIds: userId }).lean();
  }

  async setLastMessageAt(roomId: string, date: Date) {
    await CollaborationRoomModel.updateOne({ _id: roomId }, { $set: { lastMessageAt: date } });
  }

  async archive(id: string) {
    return CollaborationRoomModel.findByIdAndUpdate(id, { $set: { isArchived: true } }, { new: true }).lean();
  }
}

export const collaborationRoomRepository = new CollaborationRoomRepository();
