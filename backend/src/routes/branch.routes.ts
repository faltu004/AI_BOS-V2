import { Router } from "express";
import { branchController } from "../controllers/branch.controller.js";
import { route } from "../middleware/async-handler.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { requirePermission } from "../middleware/rbac.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import {
  branchIdParamsSchema,
  createBranchSchema,
  listBranchesQuerySchema,
  updateBranchSchema,
} from "../validation/branch.validation.js";

export const branchRoutes = Router();

branchRoutes.use(authenticate);

branchRoutes.get("/", ...route(validate({ query: listBranchesQuerySchema }), branchController.list));

branchRoutes.post(
  "/",
  ...route(requirePermission("branch.create"), validate({ body: createBranchSchema }), branchController.create),
);

branchRoutes.get("/:id", ...route(validate({ params: branchIdParamsSchema }), branchController.getById));

branchRoutes.patch(
  "/:id",
  ...route(
    requirePermission("branch.update"),
    validate({ params: branchIdParamsSchema, body: updateBranchSchema }),
    branchController.update,
  ),
);

branchRoutes.delete(
  "/:id",
  ...route(requirePermission("branch.delete"), validate({ params: branchIdParamsSchema }), branchController.delete),
);
