import { createHash } from "node:crypto";

export function deriveDeviceBindingFromFingerprint(fingerprint: unknown): string | null {
  const normalized = typeof fingerprint === "string" ? fingerprint.trim() : "";
  if (!normalized) return null;

  return createHash("sha256")
    .update(`ai-bos-device-binding-v1:${normalized}`, "utf8")
    .digest("hex");
}
