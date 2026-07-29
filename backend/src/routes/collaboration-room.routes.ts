import { Router } from "express";
import { collaborationMessageController } from "../controllers/collaboration-message.controller.js";
import { collaborationNoteController } from "../controllers/collaboration-note.controller.js";
import { collaborationRoomController } from "../controllers/collaboration-room.controller.js";
import { route } from "../middleware/async-handler.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { requirePermission } from "../middleware/rbac.middleware.js";
import { upload } from "../middleware/upload.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import {
  createDirectRoomSchema,
  entityParamsSchema,
  projectIdParamsSchema,
  roomIdParamsSchema,
  teamIdParamsSchema,
} from "../validation/collaboration-room.validation.js";
import { listMessagesQuerySchema, sendMessageSchema } from "../validation/collaboration-message.validation.js";
import { updateNoteSchema } from "../validation/collaboration-note.validation.js";

export const collaborationRoomRoutes = Router();

collaborationRoomRoutes.use(authenticate);

collaborationRoomRoutes.get("/", ...route(collaborationRoomController.list));
collaborationRoomRoutes.get("/directory", ...route(collaborationRoomController.directory));
collaborationRoomRoutes.get("/workspace", ...route(collaborationRoomController.getWorkspace));
collaborationRoomRoutes.get(
  "/team/:teamId",
  ...route(validate({ params: teamIdParamsSchema }), collaborationRoomController.getTeamRoom),
);
collaborationRoomRoutes.get(
  "/project/:projectId",
  ...route(validate({ params: projectIdParamsSchema }), collaborationRoomController.getProjectRoom),
);
collaborationRoomRoutes.get(
  "/entity/:entityType/:entityId",
  ...route(validate({ params: entityParamsSchema }), collaborationRoomController.getEntityRoom),
);
collaborationRoomRoutes.post(
  "/direct",
  ...route(validate({ body: createDirectRoomSchema }), collaborationRoomController.createDirectRoom),
);
collaborationRoomRoutes.patch(
  "/:id/read",
  ...route(validate({ params: roomIdParamsSchema }), collaborationRoomController.markRead),
);
collaborationRoomRoutes.patch(
  "/:id/archive",
  ...route(
    validate({ params: roomIdParamsSchema }),
    requirePermission("collaboration.moderate"),
    collaborationRoomController.archive,
  ),
);

collaborationRoomRoutes.get(
  "/:roomId/messages",
  ...route(validate({ query: listMessagesQuerySchema }), collaborationMessageController.list),
);
collaborationRoomRoutes.post(
  "/:roomId/messages",
  ...route(validate({ body: sendMessageSchema }), collaborationMessageController.send),
);
collaborationRoomRoutes.get("/:roomId/messages/pinned", ...route(collaborationMessageController.listPinned));
collaborationRoomRoutes.post(
  "/:roomId/attachments",
  ...route(upload.single("file"), collaborationMessageController.uploadAttachment),
);

collaborationRoomRoutes.get("/:roomId/note", ...route(collaborationNoteController.get));
collaborationRoomRoutes.patch(
  "/:roomId/note",
  ...route(validate({ body: updateNoteSchema }), collaborationNoteController.update),
);
