import { Router } from "express";
import { holidayController } from "../controllers/holiday.controller.js";
import { route } from "../middleware/async-handler.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { requirePermission } from "../middleware/rbac.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import {
  createHolidaySchema,
  holidayIdParamsSchema,
  listHolidaysQuerySchema,
  updateHolidaySchema,
} from "../validation/holiday.validation.js";

export const holidayRoutes = Router();

holidayRoutes.use(authenticate);

holidayRoutes.get("/", ...route(validate({ query: listHolidaysQuerySchema }), holidayController.list));

holidayRoutes.post(
  "/",
  ...route(requirePermission("holiday.create"), validate({ body: createHolidaySchema }), holidayController.create),
);

holidayRoutes.get("/:id", ...route(validate({ params: holidayIdParamsSchema }), holidayController.getById));

holidayRoutes.patch(
  "/:id",
  ...route(
    requirePermission("holiday.update"),
    validate({ params: holidayIdParamsSchema, body: updateHolidaySchema }),
    holidayController.update,
  ),
);

holidayRoutes.delete(
  "/:id",
  ...route(
    requirePermission("holiday.delete"),
    validate({ params: holidayIdParamsSchema }),
    holidayController.delete,
  ),
);
