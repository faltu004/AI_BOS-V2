import { collaborationRoomService } from "../services/collaboration-room.service.js";
import { jsonController } from "../utils/controller.js";

export class CollaborationRoomController {
  list = jsonController(200, "Rooms fetched successfully", ({ req }) =>
    collaborationRoomService.listRoomsForUser(req.user!.id),
  );

  directory = jsonController(200, "Directory fetched successfully", () =>
    collaborationRoomService.listDirectory(),
  );

  getWorkspace = jsonController(200, "Workspace room fetched successfully", ({ req }) =>
    collaborationRoomService.getWorkspaceRoom(req.user!.id),
  );

  getTeamRoom = jsonController(200, "Team room fetched successfully", ({ req }) =>
    collaborationRoomService.getTeamRoom(req.user!.id, req.params.teamId),
  );

  getProjectRoom = jsonController(200, "Project room fetched successfully", ({ req }) =>
    collaborationRoomService.getProjectRoom(req.user!.id, req.params.projectId),
  );

  getEntityRoom = jsonController(200, "Discussion thread fetched successfully", ({ req }) =>
    collaborationRoomService.getEntityRoom(req.user!.id, req.params.entityType, req.params.entityId),
  );

  createDirectRoom = jsonController(201, "Direct conversation created successfully", ({ req }) =>
    collaborationRoomService.createDirectRoom(req.user!.id, req.body.participantIds),
  );

  markRead = jsonController(200, "Room marked as read", ({ req }) =>
    collaborationRoomService.markRead(req.params.id, req.user!.id),
  );

  archive = jsonController(200, "Room archived successfully", ({ req }) =>
    collaborationRoomService.archive(req.params.id),
  );
}

export const collaborationRoomController = new CollaborationRoomController();
