import type { Types } from "mongoose";
import type { CollaborationRoomDocument } from "../models/collaboration-room.model.js";
import type { UserDocument } from "../models/user.model.js";
import { collaborationMessageRepository } from "../repositories/collaboration-message.repository.js";
import { collaborationReadStateRepository } from "../repositories/collaboration-read-state.repository.js";
import { collaborationRoomRepository } from "../repositories/collaboration-room.repository.js";
import { organizationRepository } from "../repositories/organization.repository.js";
import { projectRepository } from "../repositories/project.repository.js";
import { teamRepository } from "../repositories/team.repository.js";
import { userRepository } from "../repositories/user.repository.js";
import { AppError } from "../utils/app-error.js";

async function resolveOrganizationId(): Promise<Types.ObjectId> {
  const organization = await organizationRepository.getOrCreateDefault();
  return organization._id as Types.ObjectId;
}

export async function resolveCollaborationUser(userId: string): Promise<UserDocument> {
  const user = await userRepository.findById(userId);
  if (!user) {
    throw new AppError("User not found", 404);
  }
  return user;
}

export function resolveRoomAccess(user: UserDocument, room: CollaborationRoomDocument): boolean {
  switch (room.roomType) {
    case "workspace":
      return true;
    case "team":
      return (user.teamIds ?? []).some((teamId) => teamId.toString() === room.teamId?.toString());
    case "project":
      return true;
    case "entity":
      return true;
    case "direct":
      return room.participantIds.some((id) => id.toString() === (user._id as Types.ObjectId).toString());
    default:
      return false;
  }
}

async function decorateRoom(room: CollaborationRoomDocument | { _id: Types.ObjectId }, userId: Types.ObjectId) {
  const roomId = room._id as Types.ObjectId;
  const [readState, latestMessage] = await Promise.all([
    collaborationReadStateRepository.find(roomId, userId),
    collaborationMessageRepository.findLatest(roomId),
  ]);

  const since = readState?.lastReadAt ?? new Date(0);
  const unreadCount = await collaborationMessageRepository.countUnread(roomId, userId, since);

  const toObject = (room as { toObject?: () => Record<string, unknown> }).toObject;
  const plain = toObject ? toObject.call(room) : (room as unknown as Record<string, unknown>);

  return {
    ...plain,
    _id: roomId,
    unreadCount,
    lastMessage: latestMessage
      ? { body: latestMessage.body, authorId: latestMessage.authorId, createdAt: latestMessage.createdAt }
      : null,
  };
}

export class CollaborationRoomService {
  async getWorkspaceRoom(userId: string) {
    const organizationId = await resolveOrganizationId();
    return collaborationRoomRepository.getOrCreateWorkspaceRoom(organizationId, "Workspace", userId);
  }

  async getTeamRoom(userId: string, teamId: string) {
    const user = await resolveCollaborationUser(userId);
    const team = await teamRepository.findById(teamId);
    if (!team) {
      throw new AppError("Team not found", 404);
    }

    const organizationId = await resolveOrganizationId();
    const room = await collaborationRoomRepository.getOrCreateTeamRoom(organizationId, teamId, `${team.name} Team`, userId);

    if (!resolveRoomAccess(user, room)) {
      throw new AppError("You are not a member of this team", 403);
    }

    return room;
  }

  async getProjectRoom(userId: string, projectId: string) {
    const project = await projectRepository.findById(projectId);
    if (!project) {
      throw new AppError("Project not found", 404);
    }

    const organizationId = await resolveOrganizationId();
    return collaborationRoomRepository.getOrCreateProjectRoom(organizationId, projectId, `${project.projectName}`, userId);
  }

  async getEntityRoom(userId: string, entityType: string, entityId: string) {
    const organizationId = await resolveOrganizationId();
    return collaborationRoomRepository.getOrCreateEntityRoom(
      organizationId,
      entityType,
      entityId,
      `${entityType} discussion`,
      userId,
    );
  }

  async createDirectRoom(userId: string, participantIds: string[]) {
    const uniqueParticipants = Array.from(new Set([userId, ...participantIds]));
    if (uniqueParticipants.length < 2) {
      throw new AppError("A direct conversation needs at least one other participant", 400);
    }

    const organizationId = await resolveOrganizationId();
    const existing = await collaborationRoomRepository.findDirectRoom(organizationId, uniqueParticipants);
    if (existing) return existing;

    const participants = await Promise.all(uniqueParticipants.map((id) => userRepository.findById(id)));
    const missing = participants.some((participant) => !participant);
    if (missing) {
      throw new AppError("One or more participants were not found", 404);
    }

    const name = participants.map((participant) => participant?.fullName).join(", ");

    return collaborationRoomRepository.createDirectRoom({
      organizationId,
      roomType: "direct",
      name,
      participantIds: uniqueParticipants as unknown as Types.ObjectId[],
      createdBy: userId as unknown as Types.ObjectId,
    });
  }

  async listRoomsForUser(userId: string) {
    const user = await resolveCollaborationUser(userId);
    const organizationId = await resolveOrganizationId();

    const workspaceRoom = await collaborationRoomRepository.getOrCreateWorkspaceRoom(organizationId, "Workspace", userId);

    const teamRooms = await Promise.all(
      (user.teamIds ?? []).map(async (teamId) => {
        const team = await teamRepository.findById(teamId.toString());
        return collaborationRoomRepository.getOrCreateTeamRoom(
          organizationId,
          teamId.toString(),
          team ? `${team.name} Team` : "Team",
          userId,
        );
      }),
    );

    const { items: projects } = await projectRepository.list({
      page: 1,
      limit: 100,
      sortBy: "createdAt",
      sortOrder: "desc",
      archived: false,
    });

    const projectRooms = await Promise.all(
      projects.map((project) =>
        collaborationRoomRepository.getOrCreateProjectRoom(
          organizationId,
          (project._id as Types.ObjectId).toString(),
          project.projectName,
          userId,
        ),
      ),
    );

    const directRooms = await collaborationRoomRepository.listDirectRooms(organizationId, user._id as Types.ObjectId);

    const allRooms = [workspaceRoom, ...teamRooms, ...projectRooms, ...directRooms];

    return Promise.all(allRooms.map((room) => decorateRoom(room, user._id as Types.ObjectId)));
  }

  async markRead(roomId: string, userId: string) {
    await collaborationReadStateRepository.markRead(roomId, userId, new Date());
    return { roomId, read: true };
  }

  async archive(roomId: string) {
    const room = await collaborationRoomRepository.archive(roomId);
    if (!room) {
      throw new AppError("Room not found", 404);
    }
    return room;
  }

  async listDirectory() {
    const organizationId = await resolveOrganizationId();
    const users = await userRepository.listByOrganization(organizationId.toString());
    return users.map((user) => ({
      _id: (user._id as Types.ObjectId).toString(),
      fullName: user.fullName,
      email: user.email,
      role: user.role,
    }));
  }

  async requireRoomAccess(userId: string, roomId: string) {
    const room = await collaborationRoomRepository.findById(roomId);
    if (!room) {
      throw new AppError("Room not found", 404);
    }

    const user = await resolveCollaborationUser(userId);
    if (!resolveRoomAccess(user, room)) {
      throw new AppError("You do not have access to this room", 403);
    }

    return room;
  }
}

export const collaborationRoomService = new CollaborationRoomService();
