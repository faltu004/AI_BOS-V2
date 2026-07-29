import { roleTemplateService } from "../services/role-template.service.js";
import { jsonController } from "../utils/controller.js";
import type { ListRoleTemplatesQuery } from "../validation/role-template.validation.js";

export class RoleTemplateController {
  list = jsonController(200, "Role templates fetched successfully", ({ req }) =>
    roleTemplateService.list(req.query as unknown as ListRoleTemplatesQuery),
  );

  create = jsonController(201, "Role template created successfully", ({ req }) =>
    roleTemplateService.create(req.body, req.user?.id),
  );

  getById = jsonController(200, "Role template fetched successfully", ({ req }) =>
    roleTemplateService.getById(req.params.id),
  );

  update = jsonController(200, "Role template updated successfully", ({ req }) =>
    roleTemplateService.update(req.params.id, req.body, req.user?.id),
  );

  delete = jsonController(200, "Role template deleted successfully", ({ req }) =>
    roleTemplateService.delete(req.params.id, req.user?.id),
  );
}

export const roleTemplateController = new RoleTemplateController();
