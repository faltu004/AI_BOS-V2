import { auditLogService } from "./audit-log.service.js";

export class AIAuditService {
  async record(input: {
    userId: string;
    role: string;
    success: boolean;
    promptLength: number;
    responseLength?: number;
    scope: string;
    usedFallback: boolean;
  }) {
    return auditLogService
      .record({
        actorUserId: input.userId,
        actorRole: input.role,
        category: "ai_activity",
        method: "POST",
        path: "/ai/chat",
        resourceType: "ai",
        statusCode: input.success ? 200 : 500,
        success: input.success,
        metadata: {
          promptLength: input.promptLength,
          responseLength: input.responseLength,
          scope: input.scope,
          usedFallback: input.usedFallback,
        },
      })
      .catch(() => null);
  }
}

export const aiAuditService = new AIAuditService();
