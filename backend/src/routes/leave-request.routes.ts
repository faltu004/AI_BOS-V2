import { Router } from "express";
import { leaveRequestController } from "../controllers/leave-request.controller.js";
import { route } from "../middleware/async-handler.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import {
  applyLeaveSchema,
  leaveDecisionSchema,
  leaveIdParamsSchema,
  listApprovalsQuerySchema,
  listMyLeaveQuerySchema,
} from "../validation/leave-request.validation.js";

export const leaveRequestRoutes = Router();

leaveRequestRoutes.use(authenticate);

leaveRequestRoutes.post("/", ...route(validate({ body: applyLeaveSchema }), leaveRequestController.apply));
leaveRequestRoutes.get("/me", ...route(validate({ query: listMyLeaveQuerySchema }), leaveRequestController.myRequests));
leaveRequestRoutes.post("/:id/cancel", ...route(validate({ params: leaveIdParamsSchema }), leaveRequestController.cancel));

leaveRequestRoutes.get(
  "/approvals",
  ...route(validate({ query: listApprovalsQuerySchema }), leaveRequestController.approvals),
);
leaveRequestRoutes.post(
  "/:id/decision",
  ...route(
    validate({ params: leaveIdParamsSchema, body: leaveDecisionSchema }),
    leaveRequestController.decide,
  ),
);
