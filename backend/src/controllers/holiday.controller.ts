import { holidayService } from "../services/holiday.service.js";
import { jsonController } from "../utils/controller.js";
import type { ListHolidaysQuery } from "../validation/holiday.validation.js";

export class HolidayController {
  list = jsonController(200, "Holidays fetched successfully", ({ req }) =>
    holidayService.list(req.query as unknown as ListHolidaysQuery),
  );

  create = jsonController(201, "Holiday created successfully", ({ req }) =>
    holidayService.create(req.body, req.user?.id),
  );

  getById = jsonController(200, "Holiday fetched successfully", ({ req }) => holidayService.getById(req.params.id));

  update = jsonController(200, "Holiday updated successfully", ({ req }) =>
    holidayService.update(req.params.id, req.body, req.user?.id),
  );

  delete = jsonController(200, "Holiday deleted successfully", ({ req }) => holidayService.delete(req.params.id));
}

export const holidayController = new HolidayController();
