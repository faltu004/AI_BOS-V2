import { Router } from "express";
import { userController } from "../controllers/user.controller.js";
import { asyncHandler } from "../middleware/async-handler.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { authorize } from "../middleware/rbac.middleware.js";

export const userRoutes = Router();

userRoutes.get(
  "/",
  authenticate,
  authorize("Admin", "CEO"),
  asyncHandler(userController.list),
);
