import {
  AGENT_UPDATE_SCHEMA_VERSION,
} from "./agent-update-paths.js";

export type AgentActivationRequest = {
  schemaVersion: number;
  requestId: string;
  packageId: string;
  version: string;
  sha256: string;
  createdAt: string;
};

const semverPattern =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;

function isObject(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function rejectUnexpectedKeys(
  value: Record<string, unknown>,
): void {
  const allowed =
    new Set([
      "schemaVersion",
      "requestId",
      "packageId",
      "version",
      "sha256",
      "createdAt",
    ]);

  for (
    const key of Object.keys(value)
  ) {
    if (!allowed.has(key)) {
      throw new Error(
        "Activation request contains an unsupported field",
      );
    }
  }
}

function requireString(
  value: unknown,
  name: string,
  maxLength: number,
): string {
  if (
    typeof value !== "string"
  ) {
    throw new Error(
      name + " must be a string",
    );
  }

  const result =
    value.trim();

  if (
    result.length < 1 ||
    result.length > maxLength
  ) {
    throw new Error(
      name + " is invalid",
    );
  }

  return result;
}

export function validateActivationRequest(
  value: unknown,
): AgentActivationRequest {
  if (!isObject(value)) {
    throw new Error(
      "Activation request is invalid",
    );
  }

  rejectUnexpectedKeys(value);

  if (
    value.schemaVersion !==
    AGENT_UPDATE_SCHEMA_VERSION
  ) {
    throw new Error(
      "Activation request schema is unsupported",
    );
  }

  const requestId =
    requireString(
      value.requestId,
      "Activation request ID",
      80,
    );

  if (
    !/^[A-Za-z0-9_-]{16,80}$/.test(
      requestId,
    )
  ) {
    throw new Error(
      "Activation request ID is invalid",
    );
  }

  const version =
    requireString(
      value.version,
      "Activation version",
      50,
    );

  if (!semverPattern.test(version)) {
    throw new Error(
      "Activation version is invalid",
    );
  }

  const packageId =
    requireString(
      value.packageId,
      "Activation package ID",
      150,
    );

  if (
    packageId !==
    "aibos-agent-windows-x64-" +
      version
  ) {
    throw new Error(
      "Activation package ID is invalid",
    );
  }

  const sha256 =
    requireString(
      value.sha256,
      "Activation package SHA256",
      64,
    ).toUpperCase();

  if (
    !/^[A-F0-9]{64}$/.test(
      sha256,
    )
  ) {
    throw new Error(
      "Activation package SHA256 is invalid",
    );
  }

  const createdAt =
    requireString(
      value.createdAt,
      "Activation creation time",
      100,
    );

  const createdDate =
    new Date(createdAt);

  if (
    Number.isNaN(
      createdDate.getTime(),
    )
  ) {
    throw new Error(
      "Activation creation time is invalid",
    );
  }

  return {
    schemaVersion:
      AGENT_UPDATE_SCHEMA_VERSION,
    requestId,
    packageId,
    version,
    sha256,
    createdAt:
      createdDate.toISOString(),
  };
}
