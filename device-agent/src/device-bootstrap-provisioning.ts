import {
  readFile,
  rename,
  unlink,
  writeFile,
} from "node:fs/promises";

import path from "node:path";

import dotenv from "dotenv";

import {
  ensureProtectedAgentRoot,
  hardenProtectedAgentFile,
  protectedAgentRoot,
} from "./agent-storage.js";

const BOOTSTRAP_FILE_NAME =
  ".bootstrap-enrollment.env";

export const protectedBootstrapEnrollmentPath =
  path.join(
    protectedAgentRoot,
    BOOTSTRAP_FILE_NAME,
  );

function clean(
  value: unknown,
): string {
  return typeof value === "string"
    ? value.trim()
    : "";
}

function validateBootstrapKey(
  value: unknown,
): string {
  const key =
    clean(
      value,
    );

  if (
    !key ||
    key.includes(
      "\r",
    ) ||
    key.includes(
      "\n",
    )
  ) {
    throw new Error(
      "Bootstrap enrollment credential is invalid",
    );
  }

  return key;
}

export type BootstrapEnrollmentCredential = {
  enrollmentKey: string;
  deviceBinding?: string | undefined;
  sourcePath: string;
};

export async function loadBootstrapEnrollmentCredential():
  Promise<BootstrapEnrollmentCredential | null> {
  try {
    const parsed =
      dotenv.parse(
        await readFile(
          protectedBootstrapEnrollmentPath,
          "utf8",
        ),
      );

    const enrollmentKey =
      validateBootstrapKey(
        parsed.DEVICE_ENROLLMENT_KEY,
      );

    const deviceBinding = clean(parsed.DEVICE_ENROLLMENT_BINDING).toLowerCase();
    if (deviceBinding && !/^[a-f0-9]{64}$/.test(deviceBinding)) {
      throw new Error("Bootstrap device binding is invalid");
    }

    return {
      enrollmentKey,
      deviceBinding: deviceBinding || undefined,
      sourcePath:
        protectedBootstrapEnrollmentPath,
    };
  } catch (
    error:
      unknown
  ) {
    if (
      typeof error ===
        "object" &&
      error !== null &&
      "code" in error &&
      (
        error as {
          code?: unknown;
        }
      ).code ===
        "ENOENT"
    ) {
      return null;
    }

    throw error;
  }
}

export async function persistBootstrapEnrollmentCredential(
  enrollmentKey: string,
  deviceBinding: string,
): Promise<void> {
  const validatedKey = validateBootstrapKey(enrollmentKey);
  const validatedBinding = clean(deviceBinding).toLowerCase();

  if (
    !validatedKey.startsWith("aibos_enroll_ot_") ||
    !/^[a-f0-9]{64}$/.test(validatedBinding)
  ) {
    throw new Error("Enrollment bootstrap is invalid");
  }

  const temporaryPath = `${protectedBootstrapEnrollmentPath}.${process.pid}.${Date.now()}.tmp`;
  const content =
    `DEVICE_ENROLLMENT_KEY=${validatedKey}\r\n` +
    `DEVICE_ENROLLMENT_BINDING=${validatedBinding}\r\n`;

  try {
    await ensureProtectedAgentRoot();
    await writeFile(temporaryPath, content, { encoding: "utf8", mode: 0o600 });
    await hardenProtectedAgentFile(temporaryPath);
    await rename(temporaryPath, protectedBootstrapEnrollmentPath);
    await hardenProtectedAgentFile(protectedBootstrapEnrollmentPath);
  } catch (error) {
    await unlink(temporaryPath).catch(() => {});
    throw error;
  }
}

export async function discardBootstrapEnrollmentCredential():
  Promise<void> {
  await unlink(
    protectedBootstrapEnrollmentPath,
  ).catch(
    (
      error:
        unknown,
    ) => {
      if (
        typeof error ===
          "object" &&
        error !== null &&
        "code" in error &&
        (
          error as {
            code?: unknown;
          }
        ).code ===
          "ENOENT"
      ) {
        return;
      }

      throw error;
    },
  );
}
