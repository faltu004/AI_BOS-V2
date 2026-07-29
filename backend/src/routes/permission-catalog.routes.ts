import { Router } from "express";
import { permissionCatalogController } from "../controllers/permission-catalog.controller.js";
import { route } from "../middleware/async-handler.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { requirePermission } from "../middleware/rbac.middleware.js";

export const permissionCatalogRoutes = Router();

permissionCatalogRoutes.use(authenticate);

permissionCatalogRoutes.get("/", ...route(requirePermission("role.view"), permissionCatalogController.get));
