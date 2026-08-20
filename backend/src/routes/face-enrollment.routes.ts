import { Router } from "express";
import { faceEnrollmentController } from "../controllers/face-enrollment.controller.js";
import { asyncHandler } from "../middleware/async-handler.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { requirePermission } from "../middleware/rbac.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import { enrollFaceSchema, resetFaceEnrollmentSchema } from "../validation/face-enrollment.validation.js";

export const faceEnrollmentRoutes = Router();

faceEnrollmentRoutes.use(authenticate);

faceEnrollmentRoutes.get("/me", asyncHandler(faceEnrollmentController.me));
faceEnrollmentRoutes.post("/me", validate({ body: enrollFaceSchema }), asyncHandler(faceEnrollmentController.enrollMe));
faceEnrollmentRoutes.get(
  "/users/:userId",
  requirePermission("user.view_all"),
  asyncHandler(faceEnrollmentController.userStatus),
);
faceEnrollmentRoutes.post(
  "/users/:userId/reset",
  requirePermission("user.edit"),
  validate({ body: resetFaceEnrollmentSchema }),
  asyncHandler(faceEnrollmentController.resetUser),
);
