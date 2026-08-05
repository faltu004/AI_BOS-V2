import { financeTaxService } from "../services/finance-tax.service.js";
import { jsonController } from "../utils/controller.js";
import type { CreateTaxRecordInput, ListTaxRecordsQuery } from "../validation/finance-tax.validation.js";

export class FinanceTaxController {
  list = jsonController(200, "Tax records fetched successfully", ({ req }) =>
    financeTaxService.list(req.query as unknown as ListTaxRecordsQuery),
  );

  create = jsonController(201, "Tax record created successfully", ({ req }) =>
    financeTaxService.create(req.body as CreateTaxRecordInput, req.user?.id),
  );

  delete = jsonController(200, "Tax record deleted successfully", ({ req }) =>
    financeTaxService.delete(req.params.id),
  );
}

export const financeTaxController = new FinanceTaxController();
