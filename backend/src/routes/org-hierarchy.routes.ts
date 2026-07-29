import { Router } from "express";
import { orgHierarchyController } from "../controllers/org-hierarchy.controller.js";
import { route } from "../middleware/async-handler.js";
import { authenticate } from "../middleware/auth.middleware.js";

export const orgHierarchyRoutes = Router();

orgHierarchyRoutes.use(authenticate);

orgHierarchyRoutes.get("/", ...route(orgHierarchyController.get));
