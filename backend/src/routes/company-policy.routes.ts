import { Router } from "express";
import { companyPolicyController } from "../controllers/company-policy.controller.js";
import { route } from "../middleware/async-handler.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { requirePermission } from "../middleware/rbac.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import {
  companyPolicyIdParamsSchema,
  createCompanyPolicySchema,
  listCompanyPoliciesQuerySchema,
  updateCompanyPolicySchema,
} from "../validation/company-policy.validation.js";

export const companyPolicyRoutes = Router();

companyPolicyRoutes.use(authenticate);

companyPolicyRoutes.get(
  "/published",
  ...route(validate({ query: listCompanyPoliciesQuerySchema }), companyPolicyController.listPublished),
);

companyPolicyRoutes.get(
  "/",
  ...route(
    requirePermission("policy.view_all"),
    validate({ query: listCompanyPoliciesQuerySchema }),
    companyPolicyController.list,
  ),
);

companyPolicyRoutes.post(
  "/",
  ...route(
    requirePermission("policy.create"),
    validate({ body: createCompanyPolicySchema }),
    companyPolicyController.create,
  ),
);

companyPolicyRoutes.get(
  "/:id",
  ...route(validate({ params: companyPolicyIdParamsSchema }), companyPolicyController.getById),
);

companyPolicyRoutes.patch(
  "/:id",
  ...route(
    requirePermission("policy.update"),
    validate({ params: companyPolicyIdParamsSchema, body: updateCompanyPolicySchema }),
    companyPolicyController.update,
  ),
);

companyPolicyRoutes.patch(
  "/:id/publish",
  ...route(
    requirePermission("policy.publish"),
    validate({ params: companyPolicyIdParamsSchema }),
    companyPolicyController.publish,
  ),
);

companyPolicyRoutes.delete(
  "/:id",
  ...route(
    requirePermission("policy.delete"),
    validate({ params: companyPolicyIdParamsSchema }),
    companyPolicyController.delete,
  ),
);
