import { roleService } from "../services/role.service.js";
import { jsonController } from "../utils/controller.js";
import type { ListRolesQuery } from "../validation/role.validation.js";

export class RoleController {
  list = jsonController(200, "Roles fetched successfully", ({ req }) =>
    roleService.list(req.query as unknown as ListRolesQuery),
  );

  create = jsonController(201, "Role created successfully", ({ req }) =>
    roleService.create(req.body, req.user?.id),
  );

  getById = jsonController(200, "Role fetched successfully", ({ req }) => roleService.getById(req.params.id));

  update = jsonController(200, "Role updated successfully", ({ req }) =>
    roleService.update(req.params.id, req.body, req.user?.id),
  );

  delete = jsonController(200, "Role deleted successfully", ({ req }) =>
    roleService.delete(req.params.id, req.user?.id),
  );
}

export const roleController = new RoleController();
