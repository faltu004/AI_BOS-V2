import { organizationSettingsService } from "../services/organization-settings.service.js";
import { jsonController } from "../utils/controller.js";
import type { UpdateModuleAccessInput, UpdateOrganizationSettingsInput } from "../validation/organization-settings.validation.js";

export class OrganizationSettingsController {
  get = jsonController(200, "Organization settings fetched successfully", () =>
    organizationSettingsService.get(),
  );

  update = jsonController(200, "Organization settings updated successfully", ({ req }) =>
    organizationSettingsService.update(req.body as UpdateOrganizationSettingsInput, req.user?.id),
  );

  updateModuleAccess = jsonController(200, "Module access updated successfully", ({ req }) =>
    organizationSettingsService.updateModuleAccess(req.body as UpdateModuleAccessInput, req.user?.id),
  );
}

export const organizationSettingsController = new OrganizationSettingsController();
