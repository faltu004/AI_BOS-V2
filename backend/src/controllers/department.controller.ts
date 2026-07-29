import { departmentService } from "../services/department.service.js";
import { jsonController } from "../utils/controller.js";
import type { ListDepartmentsQuery } from "../validation/department.validation.js";

export class DepartmentController {
  list = jsonController(200, "Departments fetched successfully", ({ req }) =>
    departmentService.list(req.query as unknown as ListDepartmentsQuery),
  );

  create = jsonController(201, "Department created successfully", ({ req }) =>
    departmentService.create(req.body, req.user?.id),
  );

  getById = jsonController(200, "Department fetched successfully", ({ req }) =>
    departmentService.getById(req.params.id),
  );

  update = jsonController(200, "Department updated successfully", ({ req }) =>
    departmentService.update(req.params.id, req.body, req.user?.id),
  );

  delete = jsonController(200, "Department deleted successfully", ({ req }) =>
    departmentService.delete(req.params.id),
  );
}

export const departmentController = new DepartmentController();
