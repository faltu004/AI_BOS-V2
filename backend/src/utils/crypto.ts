import crypto from "node:crypto";
import { env } from "../config/env.js";

const ALGORITHM = "aes-256-gcm";
const KEY_LENGTH = 32;
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const SALT_LENGTH = 64;

function getRawSecret(): Buffer {
  const secret = env.ENCRYPTION_SECRET ?? env.JWT_ACCESS_SECRET ?? "";
  if (!secret) {
    throw new Error("Missing encryption secret");
  }
  return Buffer.from(secret, "utf8");
}

function getBiometricRawSecret(): Buffer {
  if (!env.BIOMETRIC_ENCRYPTION_SECRET) {
    throw new Error("Biometric encryption is not configured");
  }
  return Buffer.from(env.BIOMETRIC_ENCRYPTION_SECRET, "utf8");
}

function getCryptoKey(): Buffer {
  const rawKey = getRawSecret();
  if (rawKey.length === KEY_LENGTH) return rawKey;
  const padded = Buffer.alloc(KEY_LENGTH, 0);
  rawKey.copy(padded);
  return padded;
}

function getCryptoKeyFromSalt(salt: Buffer): Buffer {
  const rawKey = getRawSecret();
  return crypto.pbkdf2Sync(rawKey, salt, 100_000, KEY_LENGTH, "sha512");
}

function encryptWithRawSecret(text: string, rawSecret: Buffer): string {
  const salt = crypto.randomBytes(SALT_LENGTH);
  const key = crypto.pbkdf2Sync(rawSecret, salt, 100_000, KEY_LENGTH, "sha512");
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${salt.toString("base64url")}:${iv.toString("base64url")}:${authTag.toString("base64url")}:${encrypted.toString("base64url")}`;
}

function decryptWithRawSecret(payload: string, rawSecret: Buffer): string {
  try {
    const [saltB64, ivB64, authTagB64, encryptedB64] = payload.split(":");
    if (!saltB64 || !ivB64 || !authTagB64 || !encryptedB64) throw new Error("Invalid encrypted payload");
    const salt = Buffer.from(saltB64, "base64url");
    const iv = Buffer.from(ivB64, "base64url");
    const authTag = Buffer.from(authTagB64, "base64url");
    const encrypted = Buffer.from(encryptedB64, "base64url");
    const key = crypto.pbkdf2Sync(rawSecret, salt, 100_000, KEY_LENGTH, "sha512");
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
  } catch {
    throw new Error("Decryption failed");
  }
}

export function encrypt(text: string): string {
  const salt = crypto.randomBytes(SALT_LENGTH);
  const key = getCryptoKeyFromSalt(salt);
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${salt.toString("base64url")}:${iv.toString("base64url")}:${authTag.toString("base64url")}:${encrypted.toString("base64url")}`;
}

export function decrypt(payload: string): string {
  try {
    const [saltB64, ivB64, authTagB64, encryptedB64] = payload.split(":");
    if (!saltB64 || !ivB64 || !authTagB64 || !encryptedB64) {
      throw new Error("Invalid encrypted payload");
    }

    const salt = Buffer.from(saltB64, "base64url");
    const iv = Buffer.from(ivB64, "base64url");
    const authTag = Buffer.from(authTagB64, "base64url");
    const encrypted = Buffer.from(encryptedB64, "base64url");
    const key = getCryptoKeyFromSalt(salt);

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
  } catch {
    throw new Error("Decryption failed");
  }
}

export function hashValue(value: string): string {
  return crypto.createHmac("sha256", getRawSecret()).update(value).digest("hex");
}

export function encryptSecret(value: string) {
  return encrypt(value);
}

export function decryptSecret(value: string) {
  return decrypt(value);
}

export function biometricEncryptionConfigured() {
  return Boolean(env.BIOMETRIC_ENCRYPTION_SECRET);
}

export function encryptBiometricTemplate(value: string) {
  return encryptWithRawSecret(value, getBiometricRawSecret());
}

export function decryptBiometricTemplate(value: string) {
  return decryptWithRawSecret(value, getBiometricRawSecret());
}

export function hashBiometricTemplate(value: string) {
  return crypto.createHmac("sha256", getBiometricRawSecret()).update(value).digest("hex");
}

export function encryptBuffer(buffer: Buffer) {
  const salt = crypto.randomBytes(SALT_LENGTH);
  const key = getCryptoKeyFromSalt(salt);
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([salt, iv, authTag, encrypted]);
}

export function decryptBuffer(buffer: Buffer) {
  const salt = buffer.subarray(0, SALT_LENGTH);
  const iv = buffer.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
  const authTag = buffer.subarray(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH);
  const encrypted = buffer.subarray(SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH);
  const key = getCryptoKeyFromSalt(salt);

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]);
}
