import { Router } from "express";
import { protectedAccountController } from "../controllers/protected-account.controller.js";
import { asyncHandler } from "../middleware/async-handler.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { requireLocalSetupRequest } from "../middleware/local-setup.middleware.js";
import { requireRole } from "../middleware/rbac.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import {
  administratorCredentialsSchema,
  firstOwnerBootstrapSchema,
} from "../validation/protected-account.validation.js";

export const protectedAccountRoutes = Router();

protectedAccountRoutes.get(
  "/owner-bootstrap/status",
  requireLocalSetupRequest,
  asyncHandler(protectedAccountController.ownerBootstrapStatus),
);

protectedAccountRoutes.post(
  "/owner-bootstrap",
  requireLocalSetupRequest,
  validate({ body: firstOwnerBootstrapSchema }),
  asyncHandler(protectedAccountController.createFirstOwner),
);

protectedAccountRoutes.get(
  "/administrator",
  authenticate,
  requireRole("Owner"),
  asyncHandler(protectedAccountController.administratorStatus),
);

protectedAccountRoutes.put(
  "/administrator",
  authenticate,
  requireRole("Owner"),
  validate({ body: administratorCredentialsSchema }),
  asyncHandler(protectedAccountController.saveAdministrator),
);
