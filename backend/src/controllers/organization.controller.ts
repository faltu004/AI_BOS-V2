import { organizationService } from "../services/organization.service.js";
import { jsonController } from "../utils/controller.js";
import type { UpdateOrganizationInput } from "../validation/organization.validation.js";

export class OrganizationController {
  get = jsonController(200, "Organization profile fetched successfully", () => organizationService.get());

  update = jsonController(200, "Organization profile updated successfully", ({ req }) =>
    organizationService.update(req.body as UpdateOrganizationInput, req.user?.id),
  );
}

export const organizationController = new OrganizationController();
