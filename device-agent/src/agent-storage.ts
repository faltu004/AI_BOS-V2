import { execFile } from "node:child_process";
import { mkdir, stat } from "node:fs/promises";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
export const agentRoot = path.resolve(currentDirectory, "..");
export const legacyAgentEnvPath = path.join(agentRoot, ".env");

const programDataRoot = process.env.ProgramData || process.env.PROGRAMDATA || "C:\\ProgramData";
export const protectedAgentRoot = path.join(programDataRoot, "AI BOS", "DeviceAgent");
export const protectedAgentEnvPath = path.join(protectedAgentRoot, ".env");

let aclAttempted = false;

export function ensureProtectedAgentRootSync(): void {
  mkdirSync(protectedAgentRoot, { recursive: true });
}

export async function ensureProtectedAgentRoot(): Promise<void> {
  await mkdir(protectedAgentRoot, { recursive: true });

  if (process.platform !== "win32" || aclAttempted) {
    return;
  }

  aclAttempted = true;

  try {
    await execFileAsync("icacls.exe", [
      protectedAgentRoot,
      "/inheritance:r",
      "/grant:r",
      "*S-1-5-18:(OI)(CI)F",
      "*S-1-5-32-544:(OI)(CI)F",
    ]);
  } catch (error) {
    console.error("[Agent Storage] Failed to apply protected ACL:", error);
  }
}

export async function protectedStoreExists(): Promise<boolean> {
  try {
    const info = await stat(protectedAgentEnvPath);
    return info.isFile();
  } catch {
    return false;
  }
}
