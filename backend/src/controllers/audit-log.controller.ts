import { auditLogService } from "../services/audit-log.service.js";
import { fileController, jsonController } from "../utils/controller.js";
import type { ListAuditLogQuery } from "../validation/audit-log.validation.js";

export class AuditLogController {
  list = jsonController(200, "Audit logs fetched successfully", ({ req }) => {
    const query = req.query as unknown as ListAuditLogQuery;
    return auditLogService.list(
      { category: query.category, actorUserId: query.actorUserId, search: query.search, from: query.from, to: query.to },
      query.page,
      query.limit,
    );
  });

  export = fileController("text/csv", 'attachment; filename="audit-log.csv"', ({ req }) => {
    const query = req.query as unknown as ListAuditLogQuery;
    return auditLogService.exportCsv({
      category: query.category,
      actorUserId: query.actorUserId,
      search: query.search,
      from: query.from,
      to: query.to,
    });
  });
}

export const auditLogController = new AuditLogController();
