import { collaborationNoteService } from "../services/collaboration-note.service.js";
import { jsonController } from "../utils/controller.js";

export class CollaborationNoteController {
  get = jsonController(200, "Shared note fetched successfully", ({ req }) =>
    collaborationNoteService.get(req.user!.id, req.params.roomId),
  );

  update = jsonController(200, "Shared note updated successfully", ({ req }) =>
    collaborationNoteService.update(req.user!.id, req.params.roomId, req.body.title, req.body.body),
  );
}

export const collaborationNoteController = new CollaborationNoteController();
