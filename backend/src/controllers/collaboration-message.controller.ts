import { collaborationMessageService } from "../services/collaboration-message.service.js";
import { permissionService } from "../services/permission.service.js";
import { jsonController } from "../utils/controller.js";

function canModerate(role: string) {
  return permissionService.hasPermission(role, "collaboration.moderate");
}

export class CollaborationMessageController {
  list = jsonController(200, "Messages fetched successfully", ({ req }) =>
    collaborationMessageService.list(
      req.user!.id,
      req.params.roomId,
      req.query.before as string | undefined,
      req.query.limit ? Number(req.query.limit) : undefined,
    ),
  );

  send = jsonController(201, "Message sent successfully", ({ req }) =>
    collaborationMessageService.send(req.user!.id, req.params.roomId, req.body.body, req.body.attachments ?? []),
  );

  edit = jsonController(200, "Message updated successfully", ({ req }) =>
    collaborationMessageService.edit(req.user!.id, req.params.id, req.body.body),
  );

  softDelete = jsonController(200, "Message deleted successfully", async ({ req }) => {
    const moderate = await canModerate(req.user!.role);
    return collaborationMessageService.softDelete(req.user!.id, req.params.id, moderate);
  });

  react = jsonController(200, "Reaction updated successfully", ({ req }) =>
    collaborationMessageService.react(req.user!.id, req.params.id, req.body.emoji),
  );

  pin = jsonController(200, "Message pin state updated", async ({ req }) => {
    const moderate = await canModerate(req.user!.role);
    return collaborationMessageService.pin(req.user!.id, req.params.id, req.body.pinned, moderate);
  });

  listPinned = jsonController(200, "Pinned messages fetched successfully", ({ req }) =>
    collaborationMessageService.listPinned(req.user!.id, req.params.roomId),
  );

  search = jsonController(200, "Search results fetched successfully", ({ req }) =>
    collaborationMessageService.search(req.user!.id, (req.query.q as string) ?? ""),
  );

  uploadAttachment = jsonController(201, "Attachment uploaded successfully", ({ req }) =>
    collaborationMessageService.uploadAttachment(req.user!.id, req.params.roomId, req.file),
  );
}

export const collaborationMessageController = new CollaborationMessageController();
