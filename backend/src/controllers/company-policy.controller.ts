import { companyPolicyService } from "../services/company-policy.service.js";
import { jsonController } from "../utils/controller.js";
import type { ListCompanyPoliciesQuery } from "../validation/company-policy.validation.js";

export class CompanyPolicyController {
  list = jsonController(200, "Company policies fetched successfully", ({ req }) =>
    companyPolicyService.list(req.query as unknown as ListCompanyPoliciesQuery),
  );

  listPublished = jsonController(200, "Published company policies fetched successfully", ({ req }) =>
    companyPolicyService.listPublished(req.query as unknown as ListCompanyPoliciesQuery),
  );

  create = jsonController(201, "Company policy created successfully", ({ req }) =>
    companyPolicyService.create(req.body, req.user?.id),
  );

  getById = jsonController(200, "Company policy fetched successfully", ({ req }) =>
    companyPolicyService.getById(req.params.id),
  );

  update = jsonController(200, "Company policy updated successfully", ({ req }) =>
    companyPolicyService.update(req.params.id, req.body, req.user?.id),
  );

  publish = jsonController(200, "Company policy published successfully", ({ req }) =>
    companyPolicyService.publish(req.params.id, req.user?.id),
  );

  delete = jsonController(200, "Company policy deleted successfully", ({ req }) =>
    companyPolicyService.delete(req.params.id),
  );
}

export const companyPolicyController = new CompanyPolicyController();
