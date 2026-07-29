import type { NextFunction, Request, RequestHandler, Response } from "express";
import { appConfig } from "../config/app.js";
import type { AuditCategory } from "../constants/audit.js";
import { auditLogService } from "../services/audit-log.service.js";

export type AuditClassification = { category: AuditCategory; resourceType?: string } | null;

function firstSegment(path: string): string | undefined {
  return path.split("/").filter(Boolean)[0];
}

/**
 * Pure classification function, kept separate from the middleware so it can
 * be unit tested directly. New route coverage = one more rule here, nothing
 * else in the app needs to change (the "modular" part of the audit system).
 */
export function classifyRequest(method: string, path: string): AuditClassification {
  const m = method.toUpperCase();
  const p = path.split("?")[0] || path;

  // RBAC already has its own richer audit trail (PermissionAuditLog) — don't double-log.
  if (p.startsWith("/rbac")) return null;

  if (m === "POST" && p === "/auth/login") return { category: "login" };
  if (m === "POST" && p === "/auth/logout") return { category: "logout" };

  if (m === "PATCH" && (p === "/organization/settings" || p.startsWith("/integrations/admin/"))) {
    return { category: "settings_change", resourceType: firstSegment(p) };
  }

  if (m === "POST" && (p.includes("/attachments") || p.startsWith("/uploads"))) {
    return { category: "file_activity", resourceType: firstSegment(p) };
  }

  if (m === "GET" && (p.startsWith("/reports/export") || p.includes("/export"))) {
    return { category: "report_download", resourceType: firstSegment(p) };
  }

  if (m === "GET") return null; // avoid read-noise for everything else

  if (["POST", "PATCH", "PUT", "DELETE"].includes(m)) {
    return { category: "crud", resourceType: firstSegment(p) };
  }

  return null;
}

export const auditMiddleware: RequestHandler = (req: Request, res: Response, next: NextFunction) => {
  // Nested routers (e.g. `/auth`, `/organization/departments`) strip their own
  // prefix from req.url/req.path while handling the request, and that mutation
  // is still in effect when `finish` fires later — so capture the stable,
  // never-mutated req.originalUrl up front instead of reading req.path lazily.
  const method = req.method;
  const rawPath = req.originalUrl.split("?")[0] ?? req.originalUrl;
  const path = rawPath.startsWith(appConfig.apiPrefix) ? rawPath.slice(appConfig.apiPrefix.length) || "/" : rawPath;

  res.on("finish", () => {
    const classification = classifyRequest(method, path);
    if (!classification) return;

    // Fire-and-forget: audit capture must never surface as an unhandled
    // rejection or take the request down with it (e.g. no live DB connection
    // in a lightweight test harness) — swallow failures here, not silently
    // inside the service, so the service's own callers still see real errors.
    auditLogService
      .record({
        actorUserId: req.user?.id,
        actorRole: req.user?.role,
        category: classification.category,
        method,
        path,
        resourceType: classification.resourceType,
        resourceId: (req.params as Record<string, string> | undefined)?.id,
        statusCode: res.statusCode,
        success: res.statusCode < 400,
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
      })
      .catch(() => undefined);
  });

  next();
};
