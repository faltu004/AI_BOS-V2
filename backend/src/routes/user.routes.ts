import { Router } from "express";
import { userController } from "../controllers/user.controller.js";
import { asyncHandler } from "../middleware/async-handler.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { requirePermission } from "../middleware/rbac.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import {
  changeManagerSchema,
  changeRoleSchema,
  completeProfileSchema,
  createUserSchema,
  moveDepartmentSchema,
  updateEmployeeProfileSchema,
  updateOwnProfileSchema,
} from "../validation/user.validation.js";

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
  "/me/profile",
  authenticate,
  validate({ body: completeProfileSchema }),
  asyncHandler(userController.completeOwnProfile),
);

userRoutes.get(
  "/me",
  authenticate,
  asyncHandler(userController.me),
);

userRoutes.patch(
  "/me",
  authenticate,
  validate({ body: updateOwnProfileSchema }),
  asyncHandler(userController.updateOwnProfile),
);

userRoutes.get(
  "/me/password-changes",
  authenticate,
  asyncHandler(userController.passwordChanges),
);

userRoutes.patch(
  "/:id/department",
  authenticate,
  requirePermission("user.edit"),
  validate({ body: moveDepartmentSchema }),
  asyncHandler(userController.moveDepartment),
);

userRoutes.patch(
  "/:id/manager",
  authenticate,
  requirePermission("user.edit"),
  validate({ body: changeManagerSchema }),
  asyncHandler(userController.changeManager),
);

userRoutes.patch(
  "/:id/role",
  authenticate,
  requirePermission("user.edit"),
  validate({ body: changeRoleSchema }),
  asyncHandler(userController.changeRole),
);

userRoutes.patch(
  "/:id",
  authenticate,
  requirePermission("user.edit"),
  validate({ body: updateEmployeeProfileSchema }),
  asyncHandler(userController.updateProfile),
);

userRoutes.delete(
  "/:id",
  authenticate,
  requirePermission("user.edit"),
  asyncHandler(userController.delete),
);
