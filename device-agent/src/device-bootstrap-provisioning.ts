import {
  readFile,
  unlink,
} from "node:fs/promises";

import path from "node:path";

import dotenv from "dotenv";

import {
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

    return {
      enrollmentKey,
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
