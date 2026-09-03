import { execFile } from "node:child_process";
import { chmod, mkdir, stat } from "node:fs/promises";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

function icaclsExecutable(): string {
  const windowsRoot =
    process.env.SystemRoot ||
    process.env.WINDIR ||
    "C:\\Windows";

  return path.join(
    windowsRoot,
    "System32",
    "icacls.exe",
  );
}

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
    await execFileAsync(icaclsExecutable(), [
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

export async function hardenProtectedAgentFile(
  filePath: string,
): Promise<void> {
  const resolvedRoot =
    path.resolve(protectedAgentRoot);
  const resolvedFile =
    path.resolve(filePath);

  if (
    resolvedFile !== resolvedRoot &&
    !resolvedFile.startsWith(
      resolvedRoot + path.sep,
    )
  ) {
    throw new Error(
      "Refusing to harden a file outside the protected Agent root",
    );
  }

  if (process.platform === "win32") {
    await execFileAsync(
      icaclsExecutable(),
      [
        resolvedFile,
        "/inheritance:r",
        "/grant:r",
        "*S-1-5-18:F",
        "*S-1-5-32-544:F",
      ],
    );
    return;
  }

  await chmod(
    resolvedFile,
    0o600,
  );
}

export async function protectedStoreExists(): Promise<boolean> {
  try {
    const info = await stat(protectedAgentEnvPath);
    return info.isFile();
  } catch {
    return false;
  }
}
