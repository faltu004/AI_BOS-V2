import crypto from "crypto";
import { env } from "../config/env.js";

const algorithm = "aes-256-gcm";

function getKey() {
  const secret = env.AI_CONFIG_ENCRYPTION_SECRET ?? env.JWT_ACCESS_SECRET;
  return crypto.createHash("sha256").update(secret).digest();
}

export function encryptSecret(value: string) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(algorithm, getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv.toString("base64"), authTag.toString("base64"), encrypted.toString("base64")].join(":");
}

export function decryptSecret(value: string) {
  const [iv, authTag, encrypted] = value.split(":");
  if (!iv || !authTag || !encrypted) {
    return "";
  }
  const decipher = crypto.createDecipheriv(algorithm, getKey(), Buffer.from(iv, "base64"));
  decipher.setAuthTag(Buffer.from(authTag, "base64"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encrypted, "base64")),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}
