import { Router } from "express";
import { teamController } from "../controllers/team.controller.js";
import { route } from "../middleware/async-handler.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { requirePermission } from "../middleware/rbac.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import {
  createTeamSchema,
  listTeamsQuerySchema,
  teamIdParamsSchema,
  updateTeamSchema,
} from "../validation/team.validation.js";

export const teamRoutes = Router();

teamRoutes.use(authenticate);

teamRoutes.get("/", ...route(validate({ query: listTeamsQuerySchema }), teamController.list));

teamRoutes.post(
  "/",
  ...route(
    requirePermission("team.create"),
    validate({ body: createTeamSchema }),
    teamController.create,
  ),
);

teamRoutes.get("/:id", ...route(validate({ params: teamIdParamsSchema }), teamController.getById));

teamRoutes.patch(
  "/:id",
  ...route(
    requirePermission("team.update"),
    validate({ params: teamIdParamsSchema, body: updateTeamSchema }),
    teamController.update,
  ),
);

teamRoutes.delete(
  "/:id",
  ...route(requirePermission("team.delete"), validate({ params: teamIdParamsSchema }), teamController.delete),
);
