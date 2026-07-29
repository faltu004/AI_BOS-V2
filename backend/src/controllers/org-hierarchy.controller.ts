import { orgHierarchyService } from "../services/org-hierarchy.service.js";
import { jsonController } from "../utils/controller.js";

export class OrgHierarchyController {
  get = jsonController(200, "Organization hierarchy fetched successfully", () =>
    orgHierarchyService.buildHierarchy(),
  );
}

export const orgHierarchyController = new OrgHierarchyController();
