import { Router } from "express";
import { collaborationMessageController } from "../controllers/collaboration-message.controller.js";
import { route } from "../middleware/async-handler.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import {
  editMessageSchema,
  messageIdParamsSchema,
  pinMessageSchema,
  reactMessageSchema,
  searchMessagesQuerySchema,
} from "../validation/collaboration-message.validation.js";

export const collaborationMessageRoutes = Router();

collaborationMessageRoutes.use(authenticate);

collaborationMessageRoutes.get(
  "/search",
  ...route(validate({ query: searchMessagesQuerySchema }), collaborationMessageController.search),
);

collaborationMessageRoutes.patch(
  "/:id",
  ...route(validate({ params: messageIdParamsSchema, body: editMessageSchema }), collaborationMessageController.edit),
);
collaborationMessageRoutes.delete(
  "/:id",
  ...route(validate({ params: messageIdParamsSchema }), collaborationMessageController.softDelete),
);
collaborationMessageRoutes.post(
  "/:id/react",
  ...route(validate({ params: messageIdParamsSchema, body: reactMessageSchema }), collaborationMessageController.react),
);
collaborationMessageRoutes.patch(
  "/:id/pin",
  ...route(validate({ params: messageIdParamsSchema, body: pinMessageSchema }), collaborationMessageController.pin),
);
