import { teamService } from "../services/team.service.js";
import { jsonController } from "../utils/controller.js";
import type { ListTeamsQuery } from "../validation/team.validation.js";

export class TeamController {
  list = jsonController(200, "Teams fetched successfully", ({ req }) =>
    teamService.list(req.query as unknown as ListTeamsQuery),
  );

  create = jsonController(201, "Team created successfully", ({ req }) =>
    teamService.create(req.body, req.user?.id),
  );

  getById = jsonController(200, "Team fetched successfully", ({ req }) => teamService.getById(req.params.id));

  update = jsonController(200, "Team updated successfully", ({ req }) =>
    teamService.update(req.params.id, req.body, req.user?.id),
  );

  delete = jsonController(200, "Team deleted successfully", ({ req }) => teamService.delete(req.params.id));
}

export const teamController = new TeamController();
