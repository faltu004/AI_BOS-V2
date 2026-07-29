import crypto from "node:crypto";

export function fingerprintDevice(userAgent: string, acceptHeaders = "unknown") {
  const normalized = `${userAgent}|${acceptHeaders}`.toLowerCase();
  return crypto.createHash("sha256").update(normalized).digest("hex");
}

export function resolveClientIp(req: { ip?: string; headers?: Record<string, string | undefined> }): string {
  const forwarded = req.headers?.["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.length) {
    return forwarded.split(",")[0]?.trim() ?? req.ip ?? "unknown";
  }
  return req.ip ?? "unknown";
}

export function isSuspiciousUserAgent(userAgent = "") {
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

export function generateTemporaryTotpSecret() {
  return crypto.randomBytes(20).toString("base64url");
}
