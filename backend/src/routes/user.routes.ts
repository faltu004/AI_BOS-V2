import { Router } from "express";
import { userController } from "../controllers/user.controller.js";
import { asyncHandler } from "../middleware/async-handler.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { requirePermission } from "../middleware/rbac.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import { createUserSchema, updateEmployeeProfileSchema } from "../validation/user.validation.js";

export const userRoutes = Router();

userRoutes.get(
  "/",
  authenticate,
  requirePermission("user.view_all"),
  asyncHandler(userController.list),
);

userRoutes.get(
  "/assignable-roles",
  authenticate,
  requirePermission("user.create"),
  asyncHandler(userController.assignableRoles),
);

userRoutes.post(
  "/",
  authenticate,
  requirePermission("user.create"),
  validate({ body: createUserSchema }),
  asyncHandler(userController.create),
);

userRoutes.patch(
  "/:id",
  authenticate,
  requirePermission("user.edit"),
  validate({ body: updateEmployeeProfileSchema }),
  asyncHandler(userController.updateProfile),
);

userRoutes.get(
  "/me",
  authenticate,
  asyncHandler(userController.me),
);

userRoutes.get(
  "/me/password-changes",
  authenticate,
  asyncHandler(userController.passwordChanges),
);
