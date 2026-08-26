import { auditLogService } from "./audit-log.service.js";

export type AIAuditOperation =
  | "natural_language_query"
  | "monitoring_summary"
  | "alert_prioritization"
  | "alert_explanation"
  | "device_troubleshooting";

export class AIAuditService {
  async record(input: {
    userId: string;
    role: string;
    operation: AIAuditOperation;
    statusCode: number;
    promptLength: number;
    responseLength?: number;
    sourceCount?: number;
    durationMs: number;
    provider: string;
    blockedAction?: string;
    ipAddress?: string;
    userAgent?: string;
  }) {
    return auditLogService
      .record({
        actorUserId: input.userId,
        actorRole: input.role,
        category: "ai_activity",
        method: "POST",
        path: `/ai/${input.operation}`,
        resourceType: "ai",
        statusCode: input.statusCode,
        success: input.statusCode >= 200 && input.statusCode < 300,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
        metadata: {
          operation: input.operation,
          promptLength: input.promptLength,
          responseLength: input.responseLength,
          sourceCount: input.sourceCount,
          durationMs: input.durationMs,
          provider: input.provider,
          blockedAction: input.blockedAction,
        },
      })
      .catch(() => null);
  }
}

export const aiAuditService = new AIAuditService();
