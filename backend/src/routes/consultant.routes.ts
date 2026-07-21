import { Router } from "express";
import { consultantController } from "../controllers/consultant.controller.js";
import { asyncHandler } from "../middleware/async-handler.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { authorize } from "../middleware/rbac.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import {
  consultantAnalysisSchema,
  consultantExportSchema,
  consultantListQuerySchema,
  consultantReportIdSchema,
} from "../validation/consultant.validation.js";

export const consultantRoutes = Router();

consultantRoutes.use(authenticate);

consultantRoutes.post(
  "/analyze",
  authorize("Admin", "CEO", "Manager"),
  validate({ body: consultantAnalysisSchema }),
  asyncHandler(consultantController.analyze),
);

consultantRoutes.get(
  "/",
  validate({ query: consultantListQuerySchema }),
  asyncHandler(consultantController.list),
);

consultantRoutes.get(
  "/recent",
  asyncHandler(consultantController.recent),
);

consultantRoutes.get(
  "/:id",
  validate({ params: consultantReportIdSchema }),
  asyncHandler(consultantController.getById),
);

consultantRoutes.delete(
  "/:id",
  authorize("Admin", "CEO"),
  validate({ params: consultantReportIdSchema }),
  asyncHandler(consultantController.delete),
);

consultantRoutes.post(
  "/export",
  authorize("Admin", "CEO", "Manager"),
  validate({ body: consultantExportSchema }),
  asyncHandler(consultantController.exportReport),
);
