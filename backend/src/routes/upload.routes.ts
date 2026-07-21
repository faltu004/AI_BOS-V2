import { Router } from "express";
import { uploadController } from "../controllers/upload.controller.js";
import { asyncHandler } from "../middleware/async-handler.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { upload } from "../middleware/upload.middleware.js";

export const uploadRoutes = Router();

uploadRoutes.post(
  "/single",
  authenticate,
  upload.single("file"),
  asyncHandler(uploadController.single),
);
