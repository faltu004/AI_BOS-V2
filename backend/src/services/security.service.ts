import crypto from "node:crypto";
import { env } from "../config/env.js";
import { type Types } from "mongoose";
import { AppError } from "../utils/app-error.js";
import { deviceRepository } from "../repositories/device.repository.js";
import { loginHistoryRepository } from "../repositories/login-history.repository.js";
import { securityEventRepository } from "../repositories/security-event.repository.js";
import { sessionRepository } from "../repositories/session.repository.js";

export type SuspiciousSignal = {
  breached: boolean;
  newDevice: boolean;
  untrustedDevice: boolean;
  suspiciousAgent: boolean;
  newLocation: boolean;
  failedAttempts: number;
};

function fingerprintDevice(userAgent: string) {
  return Buffer.from(userAgent.toLowerCase()).toString("hex");
}

export function isValidObjectId(value?: string) {
  if (!value) return false;
  return /^[0-9a-f]{24}$/i.test(value);
}

export class SecurityService {
  async recordLoginHistory(input: {
    userId: string;
    eventType: "login_success" | "login_failure" | "logout" | "token_refresh" | "password_change" | "suspicious";
    ip?: string;
    userAgent?: string;
    deviceId?: string;
    location?: string;
    metadata?: Record<string, unknown>;
    failureReason?: string;
  }) {
    if (!env.ENABLE_LOGIN_HISTORY) return;
    if (!isValidObjectId(input.userId)) return;
    await loginHistoryRepository.create({
      user: input.userId,
      eventType: input.eventType,
      ip: input.ip,
      userAgent: input.userAgent,
      deviceId: input.deviceId,
      location: input.location,
      metadata: input.metadata ?? {},
      failureReason: input.failureReason,
    } as unknown as Parameters<typeof loginHistoryRepository.create>[0]);
  }

  async recordSecurityEvent(input: {
    userId?: string;
    eventType: string;
    severity: "low" | "medium" | "high" | "critical";
    ip?: string;
    userAgent?: string;
    deviceId?: string;
    description: string;
    metadata?: Record<string, unknown>;
  }) {
    if (!isValidObjectId(input.userId)) {
      return Promise.resolve(undefined);
    }
    return securityEventRepository.create({
      user: input.userId,
      eventType: input.eventType,
      severity: input.severity,
      ip: input.ip,
      userAgent: input.userAgent,
      deviceId: input.deviceId,
      description: input.description,
      metadata: input.metadata ?? {},
    } as unknown as Parameters<typeof securityEventRepository.create>[0]);
  }

  async countRecentFailedLogins(userId: string, sinceMinutesAgo: number): Promise<number> {
    if (!isValidObjectId(userId)) return 0;
    const since = new Date(Date.now() - sinceMinutesAgo * 60 * 1000);
    const history = await loginHistoryRepository.findRecentByUser(userId, since);
    return history.filter((item) => item.eventType === "login_failure").length;
  }

  async detectSuspiciousLogin(userId: string, ip: string, userAgent: string): Promise<SuspiciousSignal> {
    const device = await deviceRepository.findByUserAndFingerprint(userId, fingerprintDevice(userAgent));
    const history = await loginHistoryRepository.findRecentByUser(userId, new Date(Date.now() - 60 * 24 * 60 * 60 * 1000));
    const failed = history.filter((item) => item.eventType === "login_failure").length;

    return {
      breached: failed >= env.MAX_LOGIN_ATTEMPTS,
      newDevice: !device,
      untrustedDevice: !!device && device.trustStatus !== "trusted",
      suspiciousAgent: isSuspiciousUserAgent(userAgent),
      newLocation: isSuspiciousUserAgent(userAgent),
      failedAttempts: failed,
    };
  }

  async summarizeSecurity() {
    const events = await securityEventRepository.findMany({}, 200);
    const openCount = await securityEventRepository.countOpen();

    return {
      openCount,
      bySeverity: events.reduce<Record<string, number>>((acc, event) => {
        acc[event.severity] = (acc[event.severity] ?? 0) + 1;
        return acc;
      }, {}),
      recent: events.slice(0, 20),
    };
  }

  async listEvents(userId?: string) {
    const filter = userId ? { user: userId } : {};
    return securityEventRepository.findMany(filter, 200);
  }

  async loginHistory(userId: string) {
    return loginHistoryRepository.findManyByUser(userId, env.MAX_LOGIN_HISTORY_PER_USER);
  }

  async listDevices(userId: string) {
    return deviceRepository.findManyByUser(userId);
  }

  async trustDevice(deviceId: string, userId: string) {
    return deviceRepository.updateTrustStatus(deviceId, "trusted");
  }

  async untrustDevice(deviceId: string, userId: string) {
    return deviceRepository.updateTrustStatus(deviceId, "untrusted");
  }

  async revokeDevice(deviceId: string, userId: string) {
    return deviceRepository.deactivate(deviceId);
  }

  async revokeSession(sessionId: string, userId: string) {
    const session = await sessionRepository.findById(sessionId);
    if (!session || session.user.toString() !== userId) {
      throw new AppError("Session not found", 404);
    }
    return sessionRepository.revoke(sessionId);
  }
}

export const securityService = new SecurityService();

function isSuspiciousUserAgent(userAgent = "") {
  const normalized = userAgent.toLowerCase();
  return (
    normalized.includes("sqlmap") ||
    normalized.includes("nmap") ||
    normalized.includes("nikto") ||
    normalized.includes("masscan") ||
    normalized.includes("zgrab") ||
    normalized.includes("curl/") ||
    normalized.includes("python-requests") ||
    normalized.includes("scanner")
  );
}
