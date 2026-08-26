import { Router } from "express";
import { faceEnrollmentController } from "../controllers/face-enrollment.controller.js";
import { asyncHandler } from "../middleware/async-handler.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { requirePermission, requireRole } from "../middleware/rbac.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import { deleteOwnFaceEnrollmentSchema, enrollFaceSchema, resetFaceEnrollmentSchema } from "../validation/face-enrollment.validation.js";

export const faceEnrollmentRoutes = Router();

faceEnrollmentRoutes.use(authenticate);

faceEnrollmentRoutes.get("/me", asyncHandler(faceEnrollmentController.me));
faceEnrollmentRoutes.post("/me", validate({ body: enrollFaceSchema }), asyncHandler(faceEnrollmentController.enrollMe));
faceEnrollmentRoutes.delete("/me", validate({ body: deleteOwnFaceEnrollmentSchema }), asyncHandler(faceEnrollmentController.deleteMe));
faceEnrollmentRoutes.get(
  "/users/:userId",
  requireRole("Owner", "Administrator"),
  requirePermission("user.view_all"),
  asyncHandler(faceEnrollmentController.userStatus),
);
faceEnrollmentRoutes.post(
  "/users/:userId/reset",
  requireRole("Owner", "Administrator"),
  requirePermission("user.edit"),
  validate({ body: resetFaceEnrollmentSchema }),
  asyncHandler(faceEnrollmentController.resetUser),
);
