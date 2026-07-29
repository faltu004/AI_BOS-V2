import { roleHistoryService } from "../services/role-history.service.js";
import { jsonController } from "../utils/controller.js";
import type { ListRoleHistoryQuery } from "../validation/role-history.validation.js";

export class RoleHistoryController {
  listByRole = jsonController(200, "Role history fetched successfully", ({ req }) =>
    roleHistoryService.listByRole(req.params.roleId, req.query as unknown as ListRoleHistoryQuery),
  );
}

export const roleHistoryController = new RoleHistoryController();
