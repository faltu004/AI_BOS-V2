import { branchService } from "../services/branch.service.js";
import { jsonController } from "../utils/controller.js";
import type { ListBranchesQuery } from "../validation/branch.validation.js";

export class BranchController {
  list = jsonController(200, "Branches fetched successfully", ({ req }) =>
    branchService.list(req.query as unknown as ListBranchesQuery),
  );

  create = jsonController(201, "Branch created successfully", ({ req }) =>
    branchService.create(req.body, req.user?.id),
  );

  getById = jsonController(200, "Branch fetched successfully", ({ req }) => branchService.getById(req.params.id));

  update = jsonController(200, "Branch updated successfully", ({ req }) =>
    branchService.update(req.params.id, req.body, req.user?.id),
  );

  delete = jsonController(200, "Branch deleted successfully", ({ req }) => branchService.delete(req.params.id));
}

export const branchController = new BranchController();
