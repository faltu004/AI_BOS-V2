import { Router } from "express";
import { organizationSettingsController } from "../controllers/organization-settings.controller.js";
import { route } from "../middleware/async-handler.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { requirePermission, requireRole } from "../middleware/rbac.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import { updateModuleAccessSchema, updateOrganizationSettingsSchema } from "../validation/organization-settings.validation.js";

export const organizationSettingsRoutes = Router();

organizationSettingsRoutes.use(authenticate);

organizationSettingsRoutes.get("/", ...route(organizationSettingsController.get));

organizationSettingsRoutes.patch(
  "/",
  ...route(
    requirePermission("organization_settings.update"),
    validate({ body: updateOrganizationSettingsSchema }),
    organizationSettingsController.update,
  ),
);

// Owner-only — Administrator's hasFullAccess must NOT bypass this, since the whole
// point is letting the Owner lock the Administrator out of the Admin Panel.
organizationSettingsRoutes.patch(
  "/module-access",
  ...route(
    requireRole("Owner"),
    validate({ body: updateModuleAccessSchema }),
    organizationSettingsController.updateModuleAccess,
  ),
);
