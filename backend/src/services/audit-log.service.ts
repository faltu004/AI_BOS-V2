import mongoose, { type Types } from "mongoose";
import { auditLogRepository, type AuditLogFilters } from "../repositories/audit-log.repository.js";
import type { AuditCategory } from "../constants/audit.js";
import { userRepository } from "../repositories/user.repository.js";

export type RecordAuditEntryInput = {
  actorUserId?: string;
  actorRole?: string;
  category: AuditCategory;
  method: string;
  path: string;
  resourceType?: string;
  resourceId?: string;
  statusCode: number;
  success: boolean;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
};

export class AuditLogService {
  async record(input: RecordAuditEntryInput) {
    // Avoid Mongoose's command buffering (which waits up to bufferTimeoutMS,
    // 10s by default) when there's no live connection — e.g. lightweight test
    // harnesses that boot the Express app without calling connectDatabase().
    if (mongoose.connection.readyState !== 1) return null;

    let actorEmail: string | undefined;
    if (input.actorUserId) {
      const user = await userRepository.findById(input.actorUserId).catch(() => null);
      actorEmail = user?.email;
    }

    return auditLogRepository.create({
      actorUserId: input.actorUserId as unknown as Types.ObjectId,
      actorEmail,
      actorRole: input.actorRole,
      category: input.category,
      method: input.method,
      path: input.path,
      resourceType: input.resourceType,
      resourceId: input.resourceId,
      statusCode: input.statusCode,
      success: input.success,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      metadata: input.metadata,
    });
  }

  async list(filters: AuditLogFilters, page = 1, limit = 50) {
    return auditLogRepository.list(filters, page, limit);
  }

  async exportCsv(filters: AuditLogFilters): Promise<string> {
    const rows = await auditLogRepository.listForExport(filters);
    const header = "createdAt,actorEmail,actorRole,category,method,path,resourceType,statusCode,success\n";
    const body = rows
      .map((row) =>
        [
          row.createdAt.toISOString(),
          row.actorEmail ?? "",
          row.actorRole ?? "",
          row.category,
          row.method,
          row.path,
          row.resourceType ?? "",
          row.statusCode,
          row.success,
        ]
          .map((value) => `"${String(value).replace(/"/g, '""')}"`)
          .join(","),
      )
      .join("\n");

    return header + body;
  }
}

export const auditLogService = new AuditLogService();
