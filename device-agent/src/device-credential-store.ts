import {
  readFileSync,
} from "node:fs";
import {
  open,
  readFile,
  rename,
  stat,
  unlink,
  writeFile,
} from "node:fs/promises";

import dotenv from "dotenv";
import {
  ensureProtectedAgentRoot,
  legacyAgentEnvPath,
  protectedAgentEnvPath,
  protectedAgentRoot,
} from "./agent-storage.js";

export type StoredDeviceCredential = {
  deviceId: string;
  deviceToken: string;
};

const DEVICE_TOKEN_PREFIX =
  "aibos_device_";

const ENROLLMENT_LOCK_NAME =
  ".device-enrollment.lock";

const STALE_LOCK_MS =
  120_000;

function envFilePath():
  string {
  return protectedAgentEnvPath;
}

function enrollmentLockPath():
  string {
  return protectedAgentRoot +
    "\\" +
    ENROLLMENT_LOCK_NAME;
}

async function readCredentialSource():
  Promise<string | null> {
  for (const candidate of [protectedAgentEnvPath, legacyAgentEnvPath]) {
    try {
      return await readFile(
        candidate,
        "utf8",
      );
    } catch {
      // Try the next location.
    }
  }

  return null;
}

function readCredentialSourceSync():
  string | null {
  for (const candidate of [protectedAgentEnvPath, legacyAgentEnvPath]) {
    try {
      return readFileSync(
        candidate,
        "utf8",
      );
    } catch {
      // Try the next location.
    }
  }

  return null;
}

function clean(
  value: unknown,
): string {
  return typeof value === "string"
    ? value.trim()
    : "";
}

function validateEnvValue(
  name: string,
  value: string,
): void {
  if (
    !value ||
    value.includes("\r") ||
    value.includes("\n")
  ) {
    throw new Error(
      name +
        " contains an invalid value",
    );
  }
}

function updateEnvLine(
  source: string,
  key: string,
  value: string,
): string {
  validateEnvValue(
    key,
    value,
  );

  const newline =
    source.includes("\r\n")
      ? "\r\n"
      : "\n";

  const lines =
    source.length > 0
      ? source.split(
          /\r?\n/,
        )
      : [];

  let replaced =
    false;

  const updated =
    lines.map(
      (line) => {
        const trimmed =
          line.trimStart();

        if (
          trimmed.startsWith(
            key + "=",
          )
        ) {
          replaced = true;

          return (
            key +
            "=" +
            value
          );
        }

        return line;
      },
    );

  if (!replaced) {
    updated.push(
      key +
        "=" +
        value,
    );
  }

  return updated.join(
    newline,
  );
}

export function isPerDeviceToken(
  value: string,
): boolean {
  return (
    value.startsWith(
      DEVICE_TOKEN_PREFIX,
    ) &&
    value.length >
      DEVICE_TOKEN_PREFIX.length
  );
}

export async function loadStoredDeviceCredential():
  Promise<StoredDeviceCredential | null> {
  const source =
    await readCredentialSource();

  if (!source) {
    return null;
  }

  const parsed =
    dotenv.parse(
      source,
    );

  const deviceId =
    clean(
      parsed.DEVICE_ID,
    );

  const deviceToken =
    clean(
      parsed.DEVICE_TOKEN,
    );

  if (
    !deviceId ||
    !isPerDeviceToken(
      deviceToken,
    )
  ) {
    return null;
  }

  return {
    deviceId,
    deviceToken,
  };
}

export async function persistDeviceCredential(
  credential:
    StoredDeviceCredential,
): Promise<void> {
  const deviceId =
    clean(
      credential.deviceId,
    );

  const deviceToken =
    clean(
      credential.deviceToken,
    );

  validateEnvValue(
    "DEVICE_ID",
    deviceId,
  );

  if (
    !isPerDeviceToken(
      deviceToken,
    )
  ) {
    throw new Error(
      "Refusing to persist an invalid per-device token",
    );
  }

  const target =
    envFilePath();

  const temporary =
    target +
    ".credential-" +
    process.pid +
    "-" +
    Date.now() +
    ".tmp";

  let source =
    "";

  source =
    await readCredentialSource() ??
    "";

  let updated =
    updateEnvLine(
      source,
      "DEVICE_ID",
      deviceId,
    );

  updated =
    updateEnvLine(
      updated,
      "DEVICE_TOKEN",
      deviceToken,
    );

  try {
    await ensureProtectedAgentRoot();

    await writeFile(
      temporary,
      updated,
      {
        encoding:
          "utf8",

        mode:
          0o600,
      },
    );

    await rename(
      temporary,
      target,
    );
  } catch (error) {
    await unlink(
      temporary,
    ).catch(
      () => {},
    );

    throw error;
  }

  process.env.DEVICE_ID =
    deviceId;

  process.env.DEVICE_TOKEN =
    deviceToken;
}

async function removeStaleEnrollmentLock():
  Promise<void> {
  const lockPath =
    enrollmentLockPath();

  try {
    const info =
      await stat(
        lockPath,
      );

    if (
      Date.now() -
        info.mtimeMs >
      STALE_LOCK_MS
    ) {
      await unlink(
        lockPath,
      );
    }
  } catch {
    // Missing lock is normal.
  }
}

export type EnrollmentLock = {
  release:
    () => Promise<void>;
};

export async function tryAcquireEnrollmentLock():
  Promise<EnrollmentLock | null> {
  await ensureProtectedAgentRoot();
  await removeStaleEnrollmentLock();

  const lockPath =
    enrollmentLockPath();

  try {
    const handle =
      await open(
        lockPath,
        "wx",
        0o600,
      );

    return {
      release:
        async () => {
          await handle
            .close()
            .catch(
              () => {},
            );

          await unlink(
            lockPath,
          ).catch(
            () => {},
          );
        },
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
        "EEXIST"
    ) {
      return null;
    }

    throw error;
  }
}

export type PendingDeviceCredentialRotation = {
  deviceId: string;

  deviceToken: string;

  credentialVersion: number;

  issuedAt: string;

  expiresAt: string;
};

const PENDING_ROTATION_FILE_NAME =
  ".device-credential-rotation.pending.json";

function pendingRotationPath():
  string {
  return protectedAgentRoot +
    "\\" +
    PENDING_ROTATION_FILE_NAME;
}

function validatePendingRotation(
  input:
    Partial<PendingDeviceCredentialRotation>,
): PendingDeviceCredentialRotation {
  const deviceId =
    clean(
      input.deviceId,
    );

  const deviceToken =
    clean(
      input.deviceToken,
    );

  if (!deviceId) {
    throw new Error(
      "Pending rotation device ID is invalid",
    );
  }

  if (
    !isPerDeviceToken(
      deviceToken,
    )
  ) {
    throw new Error(
      "Pending rotation credential is invalid",
    );
  }

  if (
    typeof input
      .credentialVersion !==
      "number" ||
    !Number.isInteger(
      input.credentialVersion,
    ) ||
    input.credentialVersion < 1
  ) {
    throw new Error(
      "Pending rotation credential version is invalid",
    );
  }

  const issuedAt =
    clean(
      input.issuedAt,
    );

  const expiresAt =
    clean(
      input.expiresAt,
    );

  if (
    !issuedAt ||
    Number.isNaN(
      Date.parse(
        issuedAt,
      ),
    )
  ) {
    throw new Error(
      "Pending rotation issue time is invalid",
    );
  }

  if (
    !expiresAt ||
    Number.isNaN(
      Date.parse(
        expiresAt,
      ),
    )
  ) {
    throw new Error(
      "Pending rotation expiry is invalid",
    );
  }

  return {
    deviceId,
    deviceToken,

    credentialVersion:
      input.credentialVersion,

    issuedAt,
    expiresAt,
  };
}

export function loadStoredDeviceCredentialSync():
  StoredDeviceCredential | null {
  const source =
    readCredentialSourceSync();

  if (!source) {
    return null;
  }

  const parsed =
    dotenv.parse(
      source,
    );

  const deviceId =
    clean(
      parsed.DEVICE_ID,
    );

  const deviceToken =
    clean(
      parsed.DEVICE_TOKEN,
    );

  if (
    !deviceId ||
    !isPerDeviceToken(
      deviceToken,
    )
  ) {
    return null;
  }

  return {
    deviceId,
    deviceToken,
  };
}

export async function loadPendingDeviceCredentialRotation():
  Promise<PendingDeviceCredentialRotation | null> {
  try {
    const source =
      await readFile(
        pendingRotationPath(),
        "utf8",
      );

    const parsed =
      JSON.parse(
        source,
      ) as Partial<PendingDeviceCredentialRotation>;

    return validatePendingRotation(
      parsed,
    );
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

export async function persistPendingDeviceCredentialRotation(
  input:
    PendingDeviceCredentialRotation,
): Promise<void> {
  const validated =
    validatePendingRotation(
      input,
    );

  const target =
    pendingRotationPath();

  const temporary =
    target +
    "." +
    process.pid +
    "." +
    Date.now() +
    ".tmp";

  const content =
    JSON.stringify(
      validated,
    );

  try {
    await ensureProtectedAgentRoot();

    await writeFile(
      temporary,
      content,
      {
        encoding:
          "utf8",

        mode:
          0o600,
      },
    );

    await rename(
      temporary,
      target,
    );
  } catch (error) {
    await unlink(
      temporary,
    ).catch(
      () => {},
    );

    throw error;
  }
}

export async function removePendingDeviceCredentialRotation():
  Promise<void> {
  await unlink(
    pendingRotationPath(),
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
