import { execFile } from "node:child_process";
import {
  constants,
  createPrivateKey,
  createPublicKey,
  generateKeyPairSync,
  privateDecrypt,
  sign,
} from "node:crypto";
import { chmod, mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

import {
  ensureProtectedAgentRoot,
  hardenProtectedAgentFile,
  protectedAgentRoot,
} from "./agent-storage.js";

const execFileAsync = promisify(execFile);
const PRIVATE_KEY_PATH = path.join(protectedAgentRoot, ".enrollment-handoff-private.pem");
const programDataRoot = process.env.ProgramData || process.env.PROGRAMDATA || "C:\\ProgramData";
export const enrollmentHandoffPublicRoot = path.join(programDataRoot, "AI BOS", "DeviceHandoff");
export const enrollmentHandoffPublicKeyPath = path.join(enrollmentHandoffPublicRoot, "agent-public.pem");

export type EnrollmentHandoffCryptography = {
  signPayload: (payload: string) => string;
  decryptEnrollmentKey: (encryptedEnrollmentKey: string) => string;
};

function icaclsExecutable(): string {
  const windowsRoot = process.env.SystemRoot || process.env.WINDIR || "C:\\Windows";
  return path.join(windowsRoot, "System32", "icacls.exe");
}

async function ensurePublicKeyRoot(): Promise<void> {
  await mkdir(enrollmentHandoffPublicRoot, { recursive: true });
  if (process.platform !== "win32") return;

  await execFileAsync(icaclsExecutable(), [
    enrollmentHandoffPublicRoot,
    "/inheritance:r",
    "/grant:r",
    "*S-1-5-18:(OI)(CI)F",
    "*S-1-5-32-544:(OI)(CI)F",
    "*S-1-5-32-545:(OI)(CI)RX",
  ]);
}

async function hardenPublicKeyFile(filePath: string): Promise<void> {
  if (process.platform === "win32") {
    await execFileAsync(icaclsExecutable(), [
      filePath,
      "/inheritance:r",
      "/grant:r",
      "*S-1-5-18:F",
      "*S-1-5-32-544:F",
      "*S-1-5-32-545:R",
    ]);
    return;
  }

  await chmod(filePath, 0o644);
}

async function publishPublicKey(publicPem: string): Promise<void> {
  const temporaryPath = `${enrollmentHandoffPublicKeyPath}.${process.pid}.${Date.now()}.tmp`;
  try {
    await ensurePublicKeyRoot();
    await writeFile(temporaryPath, publicPem, { encoding: "utf8", mode: 0o644 });
    await hardenPublicKeyFile(temporaryPath);
    await rename(temporaryPath, enrollmentHandoffPublicKeyPath);
    await hardenPublicKeyFile(enrollmentHandoffPublicKeyPath);
  } catch (error) {
    await unlink(temporaryPath).catch(() => undefined);
    throw error;
  }
}

async function loadOrCreateKeyPair(): Promise<{ privatePem: string; publicPem: string }> {
  await ensureProtectedAgentRoot();

  try {
    const privatePem = await readFile(PRIVATE_KEY_PATH, "utf8");
    const publicPem = createPublicKey(createPrivateKey(privatePem))
      .export({ format: "pem", type: "spki" })
      .toString();
    await publishPublicKey(publicPem);
    return { privatePem, publicPem };
  } catch (error) {
    if (
      typeof error !== "object" ||
      error === null ||
      !("code" in error) ||
      (error as { code?: unknown }).code !== "ENOENT"
    ) {
      throw error;
    }
  }

  const pair = generateKeyPairSync("rsa", {
    modulusLength: 3072,
    publicKeyEncoding: { format: "pem", type: "spki" },
    privateKeyEncoding: { format: "pem", type: "pkcs8" },
  });
  const temporaryPrivatePath = `${PRIVATE_KEY_PATH}.${process.pid}.${Date.now()}.tmp`;

  try {
    await writeFile(temporaryPrivatePath, pair.privateKey, { encoding: "utf8", mode: 0o600 });
    await hardenProtectedAgentFile(temporaryPrivatePath);
    await rename(temporaryPrivatePath, PRIVATE_KEY_PATH);
    await hardenProtectedAgentFile(PRIVATE_KEY_PATH);
    await publishPublicKey(pair.publicKey);
  } catch (error) {
    await unlink(temporaryPrivatePath).catch(() => undefined);
    throw error;
  }

  return { privatePem: pair.privateKey, publicPem: pair.publicKey };
}

export async function loadEnrollmentHandoffCryptography(): Promise<EnrollmentHandoffCryptography> {
  const { privatePem } = await loadOrCreateKeyPair();
  const privateKey = createPrivateKey(privatePem);

  return {
    signPayload: (payload) => sign("RSA-SHA256", Buffer.from(payload, "utf8"), privateKey).toString("base64"),
    decryptEnrollmentKey: (encryptedEnrollmentKey) =>
      privateDecrypt(
        {
          key: privateKey,
          padding: constants.RSA_PKCS1_OAEP_PADDING,
          oaepHash: "sha256",
        },
        Buffer.from(encryptedEnrollmentKey, "base64"),
      ).toString("utf8"),
  };
}
