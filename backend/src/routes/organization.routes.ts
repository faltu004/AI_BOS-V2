import { Router } from "express";
import { organizationController } from "../controllers/organization.controller.js";
import { route } from "../middleware/async-handler.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { requirePermission } from "../middleware/rbac.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import { updateOrganizationSchema } from "../validation/organization.validation.js";

export const organizationRoutes = Router();

organizationRoutes.use(authenticate);

organizationRoutes.get("/", ...route(organizationController.get));

organizationRoutes.patch(
  "/",
  ...route(requirePermission("organization.update"), validate({ body: updateOrganizationSchema }), organizationController.update),
);
