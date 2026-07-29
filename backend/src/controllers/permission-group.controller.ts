import { permissionGroupService } from "../services/permission-group.service.js";
import { jsonController } from "../utils/controller.js";
import type { ListPermissionGroupsQuery } from "../validation/permission-group.validation.js";

export class PermissionGroupController {
  list = jsonController(200, "Permission groups fetched successfully", ({ req }) =>
    permissionGroupService.list(req.query as unknown as ListPermissionGroupsQuery),
  );

  create = jsonController(201, "Permission group created successfully", ({ req }) =>
    permissionGroupService.create(req.body, req.user?.id),
  );

  getById = jsonController(200, "Permission group fetched successfully", ({ req }) =>
    permissionGroupService.getById(req.params.id),
  );

  update = jsonController(200, "Permission group updated successfully", ({ req }) =>
    permissionGroupService.update(req.params.id, req.body, req.user?.id),
  );

  delete = jsonController(200, "Permission group deleted successfully", ({ req }) =>
    permissionGroupService.delete(req.params.id, req.user?.id),
  );
}

export const permissionGroupController = new PermissionGroupController();
