type ParsedSemver = {
  major: number;
  minor: number;
  patch: number;
  prerelease: string[];
};

export type AgentUpdateRelease = {
  version: string;
  packageId: string;
  packagePath: string;
  platform: "windows";
  architecture: "x64";
  sha256: string;
  sizeBytes: number;
  mandatory: boolean;
  publishedAt: string;
};

export type AgentUpdateManifest = {
  currentVersion: string;
  updateAvailable: boolean;
  release: AgentUpdateRelease | null;
};

const semverPattern =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;

function requireVersion(
  value: unknown,
  fieldName: string,
): string {
  if (
    typeof value !== "string" ||
    value.length > 50
  ) {
    throw new Error(
      fieldName + " is invalid",
    );
  }

  const version =
    value.trim();

  if (
    !semverPattern.test(
      version,
    )
  ) {
    throw new Error(
      fieldName +
        " must be a valid semantic version",
    );
  }

  return version;
}

function parseSemver(
  value: string,
): ParsedSemver {
  const match =
    semverPattern.exec(
      value,
    );

  if (!match) {
    throw new Error(
      "Invalid semantic version",
    );
  }

  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
    prerelease:
      match[4]
        ? match[4].split(".")
        : [],
  };
}

function comparePrereleaseIdentifier(
  left: string,
  right: string,
): number {
  const leftNumeric =
    /^\d+$/.test(left);

  const rightNumeric =
    /^\d+$/.test(right);

  if (
    leftNumeric &&
    rightNumeric
  ) {
    const leftNumber =
      Number(left);

    const rightNumber =
      Number(right);

    return leftNumber === rightNumber
      ? 0
      : leftNumber > rightNumber
        ? 1
        : -1;
  }

  if (
    leftNumeric &&
    !rightNumeric
  ) {
    return -1;
  }

  if (
    !leftNumeric &&
    rightNumeric
  ) {
    return 1;
  }

  return left === right
    ? 0
    : left > right
      ? 1
      : -1;
}

export function compareSemver(
  leftInput: string,
  rightInput: string,
): number {
  const left =
    parseSemver(
      requireVersion(
        leftInput,
        "Left version",
      ),
    );

  const right =
    parseSemver(
      requireVersion(
        rightInput,
        "Right version",
      ),
    );

  for (
    const key of [
      "major",
      "minor",
      "patch",
    ] as const
  ) {
    if (
      left[key] !==
      right[key]
    ) {
      return left[key] >
        right[key]
        ? 1
        : -1;
    }
  }

  if (
    left.prerelease.length === 0 &&
    right.prerelease.length === 0
  ) {
    return 0;
  }

  if (
    left.prerelease.length === 0
  ) {
    return 1;
  }

  if (
    right.prerelease.length === 0
  ) {
    return -1;
  }

  const maxLength =
    Math.max(
      left.prerelease.length,
      right.prerelease.length,
    );

  for (
    let index = 0;
    index < maxLength;
    index += 1
  ) {
    const leftPart =
      left.prerelease[index];

    const rightPart =
      right.prerelease[index];

    if (
      leftPart === undefined
    ) {
      return -1;
    }

    if (
      rightPart === undefined
    ) {
      return 1;
    }

    const comparison =
      comparePrereleaseIdentifier(
        leftPart,
        rightPart,
      );

    if (comparison !== 0) {
      return comparison;
    }
  }

  return 0;
}

function readApprovedRelease():
  AgentUpdateRelease | null {
  const rawVersion =
    process.env
      .AGENT_UPDATE_VERSION
      ?.trim();

  const rawSha256 =
    process.env
      .AGENT_UPDATE_SHA256
      ?.trim()
      .toUpperCase();

  const rawSize =
    process.env
      .AGENT_UPDATE_SIZE_BYTES
      ?.trim();

  const rawPublishedAt =
    process.env
      .AGENT_UPDATE_PUBLISHED_AT
      ?.trim();

  const anyConfigured =
    Boolean(
      rawVersion ||
      rawSha256 ||
      rawSize ||
      rawPublishedAt,
    );

  if (!anyConfigured) {
    return null;
  }

  if (
    !rawVersion ||
    !rawSha256 ||
    !rawSize ||
    !rawPublishedAt
  ) {
    throw new Error(
      "Agent update release configuration is incomplete",
    );
  }

  const version =
    requireVersion(
      rawVersion,
      "Agent update version",
    );

  if (
    !/^[A-F0-9]{64}$/.test(
      rawSha256,
    )
  ) {
    throw new Error(
      "Agent update SHA256 is invalid",
    );
  }

  const sizeBytes =
    Number(rawSize);

  if (
    !Number.isSafeInteger(
      sizeBytes,
    ) ||
    sizeBytes < 1 ||
    sizeBytes >
      1024 * 1024 * 1024
  ) {
    throw new Error(
      "Agent update package size is invalid",
    );
  }

  const publishedDate =
    new Date(
      rawPublishedAt,
    );

  if (
    Number.isNaN(
      publishedDate.getTime(),
    )
  ) {
    throw new Error(
      "Agent update published date is invalid",
    );
  }

  const mandatory =
    (
      process.env
        .AGENT_UPDATE_MANDATORY ||
      "false"
    )
      .trim()
      .toLowerCase() ===
    "true";

  return {
    version,

    packageId:
      "aibos-agent-windows-x64-" +
      version,

    packagePath:
      "/api/v1/devices/agent-update/package/" +
      encodeURIComponent(
        version,
      ),

    platform:
      "windows",

    architecture:
      "x64",

    sha256:
      rawSha256,

    sizeBytes,

    mandatory,

    publishedAt:
      publishedDate.toISOString(),
  };
}

export class AgentUpdateService {
  findApprovedRelease(
    versionInput: unknown,
  ): AgentUpdateRelease | null {
    const version =
      requireVersion(
        versionInput,
        "Requested agent version",
      );

    const release =
      readApprovedRelease();

    if (
      !release ||
      release.version !== version
    ) {
      return null;
    }

    return release;
  }

  getManifest(
    currentVersionInput: unknown,
  ): AgentUpdateManifest {
    const currentVersion =
      requireVersion(
        currentVersionInput,
        "Current agent version",
      );

    const release =
      readApprovedRelease();

    if (!release) {
      return {
        currentVersion,
        updateAvailable: false,
        release: null,
      };
    }

    const updateAvailable =
      compareSemver(
        release.version,
        currentVersion,
      ) > 0;

    return {
      currentVersion,
      updateAvailable,
      release:
        updateAvailable
          ? release
          : null,
    };
  }

  /*
   * Safe, non-sensitive operational status for Admin visibility only.
   * Deliberately excludes sha256/packagePath. Activation is a
   * per-device local setting (AI_BOS_AGENT_UPDATE_ACTIVATION_ENABLED
   * on the device itself) and is never visible to the backend, so it
   * is reported here as a documented operational fact, not a live
   * per-device value.
   */
  getOperationalStatus(): {
    releaseConfigured: boolean;
    approvedVersion: string | null;
    mandatory: boolean | null;
    publishedAt: string | null;
    activationIsPerDeviceLocalSetting: true;
    activationEnvVarName: string;
  } {
    let release: AgentUpdateRelease | null;

    try {
      release =
        readApprovedRelease();
    } catch {
      release = null;
    }

    return {
      releaseConfigured:
        release !== null,

      approvedVersion:
        release?.version ??
        null,

      mandatory:
        release?.mandatory ??
        null,

      publishedAt:
        release?.publishedAt ??
        null,

      activationIsPerDeviceLocalSetting:
        true,

      activationEnvVarName:
        "AI_BOS_AGENT_UPDATE_ACTIVATION_ENABLED",
    };
  }
}

export const agentUpdateService =
  new AgentUpdateService();

