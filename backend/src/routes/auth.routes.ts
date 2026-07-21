import { Router } from "express";
import { authController } from "../controllers/auth.controller.js";
import { asyncHandler } from "../middleware/async-handler.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import {
  changePasswordSchema,
  loginSchema,
  refreshTokenSchema,
  registerSchema,
} from "../validation/auth.validation.js";

export const authRoutes = Router();

authRoutes.post(
  "/register",
  validate({ body: registerSchema }),
  asyncHandler(authController.register),
);

authRoutes.post(
  "/login",
  validate({ body: loginSchema }),
  asyncHandler(authController.login),
);

authRoutes.post(
  "/refresh-token",
  validate({ body: refreshTokenSchema.partial() }),
  asyncHandler(authController.refresh),
);

authRoutes.post("/logout", asyncHandler(authController.logout));

authRoutes.get("/me", authenticate, asyncHandler(authController.me));

authRoutes.patch(
  "/change-password",
  authenticate,
  validate({ body: changePasswordSchema }),
  asyncHandler(authController.changePassword),
);
