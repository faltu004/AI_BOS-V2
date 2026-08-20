import {
  stageAgentUpdatePackage,
} from "./agent-update-stager.js";
import {
  createAgentUpdateActivationRequest,
} from "./agent-update-activation-request.js";
import {
  tryReportAgentUpdateStatus,
} from "./agent-update-status-reporter.js";
import {
  downloadAgentUpdatePackage,
} from "./agent-update-downloader.js";
import axios from "axios";

import {
  AGENT_VERSION,
} from "./agent-version.js";

import {
  getDeviceAuthHeaders,
} from "./device-auth.js";

import {
  config,
} from "./config.js";

type JsonObject =
  Record<string, unknown>;

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

type StartAgentUpdateWatcherOptions = {
  deviceId: string;
};

const UPDATE_CHECK_INTERVAL_MS =
  15 * 60 * 1000;

const MAX_PACKAGE_BYTES =
  1024 * 1024 * 1024;

const semverPattern =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;

function isObject(
  value: unknown,
): value is JsonObject {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
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

function requireVersion(
  value: unknown,
  name: string,
): string {
  const version =
    requireString(
      value,
      name,
      50,
    );

  if (
    !semverPattern.test(
      version,
    )
  ) {
    throw new Error(
      name +
        " must be a valid semantic version",
    );
  }

  return version;
}

function compareIdentifier(
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

  if (leftNumeric) {
    return -1;
  }

  if (rightNumeric) {
    return 1;
  }

  return left === right
    ? 0
    : left > right
      ? 1
      : -1;
}

export function compareAgentVersions(
  leftInput: string,
  rightInput: string,
): number {
  const left =
    semverPattern.exec(
      requireVersion(
        leftInput,
        "Left version",
      ),
    );

  const right =
    semverPattern.exec(
      requireVersion(
        rightInput,
        "Right version",
      ),
    );

  if (
    !left ||
    !right
  ) {
    throw new Error(
      "Semantic version parsing failed",
    );
  }

  for (
    const index of [
      1,
      2,
      3,
    ]
  ) {
    const leftNumber =
      Number(left[index]);

    const rightNumber =
      Number(right[index]);

    if (
      leftNumber !==
      rightNumber
    ) {
      return leftNumber >
        rightNumber
        ? 1
        : -1;
    }
  }

  const leftPrerelease =
    left[4]
      ? left[4].split(".")
      : [];

  const rightPrerelease =
    right[4]
      ? right[4].split(".")
      : [];

  if (
    leftPrerelease.length === 0 &&
    rightPrerelease.length === 0
  ) {
    return 0;
  }

  if (
    leftPrerelease.length === 0
  ) {
    return 1;
  }

  if (
    rightPrerelease.length === 0
  ) {
    return -1;
  }

  const length =
    Math.max(
      leftPrerelease.length,
      rightPrerelease.length,
    );

  for (
    let index = 0;
    index < length;
    index += 1
  ) {
    const leftPart =
      leftPrerelease[index];

    const rightPart =
      rightPrerelease[index];

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

    const result =
      compareIdentifier(
        leftPart,
        rightPart,
      );

    if (result !== 0) {
      return result;
    }
  }

  return 0;
}

function validateRelease(
  value: unknown,
  currentVersion: string,
): AgentUpdateRelease {
  if (!isObject(value)) {
    throw new Error(
      "Update release is invalid",
    );
  }

  const version =
    requireVersion(
      value.version,
      "Update version",
    );

  if (
    compareAgentVersions(
      version,
      currentVersion,
    ) <= 0
  ) {
    throw new Error(
      "Update release must be newer than current version",
    );
  }

  const packageId =
    requireString(
      value.packageId,
      "Package ID",
      150,
    );

  const expectedPackageId =
    "aibos-agent-windows-x64-" +
    version;

  if (
    packageId !==
    expectedPackageId
  ) {
    throw new Error(
      "Unexpected update package ID",
    );
  }

  const packagePath =
    requireString(
      value.packagePath,
      "Package path",
      500,
    );

  const expectedPath =
    "/api/v1/devices/agent-update/package/" +
    encodeURIComponent(
      version,
    );

  if (
    packagePath !==
    expectedPath
  ) {
    throw new Error(
      "Unexpected update package path",
    );
  }

  if (
    value.platform !==
    "windows"
  ) {
    throw new Error(
      "Unsupported update platform",
    );
  }

  if (
    value.architecture !==
    "x64"
  ) {
    throw new Error(
      "Unsupported update architecture",
    );
  }

  const sha256 =
    requireString(
      value.sha256,
      "Package SHA256",
      64,
    ).toUpperCase();

  if (
    !/^[A-F0-9]{64}$/.test(
      sha256,
    )
  ) {
    throw new Error(
      "Package SHA256 is invalid",
    );
  }

  if (
    typeof value.sizeBytes !==
      "number" ||
    !Number.isSafeInteger(
      value.sizeBytes,
    ) ||
    value.sizeBytes < 1 ||
    value.sizeBytes >
      MAX_PACKAGE_BYTES
  ) {
    throw new Error(
      "Package size is invalid",
    );
  }

  if (
    typeof value.mandatory !==
    "boolean"
  ) {
    throw new Error(
      "Mandatory flag is invalid",
    );
  }

  const publishedAt =
    requireString(
      value.publishedAt,
      "Published date",
      100,
    );

  if (
    Number.isNaN(
      new Date(
        publishedAt,
      ).getTime(),
    )
  ) {
    throw new Error(
      "Published date is invalid",
    );
  }

  return {
    version,
    packageId,
    packagePath,
    platform: "windows",
    architecture: "x64",
    sha256,
    sizeBytes:
      value.sizeBytes,
    mandatory:
      value.mandatory,
    publishedAt:
      new Date(
        publishedAt,
      ).toISOString(),
  };
}

export function validateAgentUpdateManifest(
  value: unknown,
  expectedCurrentVersion =
    AGENT_VERSION,
): AgentUpdateManifest {
  if (!isObject(value)) {
    throw new Error(
      "Update manifest is invalid",
    );
  }

  const currentVersion =
    requireVersion(
      value.currentVersion,
      "Manifest current version",
    );

  if (
    currentVersion !==
    expectedCurrentVersion
  ) {
    throw new Error(
      "Manifest current version mismatch",
    );
  }

  if (
    typeof value.updateAvailable !==
    "boolean"
  ) {
    throw new Error(
      "Update availability flag is invalid",
    );
  }

  if (
    value.updateAvailable ===
    false
  ) {
    if (
      value.release !== null
    ) {
      throw new Error(
        "No-update manifest cannot contain a release",
      );
    }

    return {
      currentVersion,
      updateAvailable: false,
      release: null,
    };
  }

  return {
    currentVersion,
    updateAvailable: true,
    release:
      validateRelease(
        value.release,
        currentVersion,
      ),
  };
}

export async function checkAgentUpdateOnce(
  deviceId: string,
): Promise<AgentUpdateManifest> {
  const response =
    await axios.get(
      config.backendUrl +
        "/api/v1/devices/agent-update/manifest",
      {
        params: {
          currentVersion:
            AGENT_VERSION,
        },

        headers: {
          ...(await getDeviceAuthHeaders(
            deviceId,
          )),
        },

        timeout:
          15_000,

        /*
         * Manifest must come directly from the
         * configured AI BOS backend. Do not
         * follow redirects with device auth.
         */
        maxRedirects:
          0,

        validateStatus:
          (status) =>
            status === 200,
      },
    );

  if (
    !isObject(
      response.data,
    ) ||
    response.data.success !==
      true
  ) {
    throw new Error(
      "Invalid update manifest response",
    );
  }

  return validateAgentUpdateManifest(
    response.data.data,
    AGENT_VERSION,
  );
}

export function startAgentUpdateWatcher({
  deviceId,
}: StartAgentUpdateWatcherOptions):
  () => Promise<void> {
  let stopped =
    false;

  let currentRequest:
    Promise<void> | null =
      null;

  async function check():
    Promise<void> {
    if (stopped) {
      return;
    }

    let activeRelease:
      AgentUpdateRelease | null =
      null;

    try {
      const manifest =
        await checkAgentUpdateOnce(
          deviceId,
        );

      if (
        manifest.updateAvailable &&
        manifest.release
      ) {
        activeRelease =
          manifest.release;

        console.log(
          "[Agent Update] Available: " +
            AGENT_VERSION +
            " -> " +
            manifest.release.version +
            (
              manifest.release
                .mandatory
                ? " | mandatory"
                : ""
            ),
        );

        await tryReportAgentUpdateStatus({
          deviceId,
          status:
            "update_available",
          fromVersion:
            AGENT_VERSION,
          toVersion:
            manifest.release.version,
          packageId:
            manifest.release.packageId,
          metadata: {
            mandatory:
              manifest.release
                .mandatory,
            publishedAt:
              manifest.release
                .publishedAt,
          },
        });

        await tryReportAgentUpdateStatus({
          deviceId,
          status:
            "download_started",
          fromVersion:
            AGENT_VERSION,
          toVersion:
            manifest.release.version,
          packageId:
            manifest.release.packageId,
        });

        const downloaded =
          await downloadAgentUpdatePackage(
            deviceId,
            manifest.release,
          );

        console.log(
          "[Agent Update] Package verified and staged: " +
            downloaded.filePath +
            (
              downloaded.reusedExisting
                ? " | cached"
                : ""
            ),
        );

        await tryReportAgentUpdateStatus({
          deviceId,
          status:
            "download_verified",
          fromVersion:
            AGENT_VERSION,
          toVersion:
            manifest.release.version,
          packageId:
            manifest.release.packageId,
          metadata: {
            reusedExisting:
              downloaded
                .reusedExisting,
          },
        });

        await tryReportAgentUpdateStatus({
          deviceId,
          status:
            "staging_started",
          fromVersion:
            AGENT_VERSION,
          toVersion:
            manifest.release.version,
          packageId:
            manifest.release.packageId,
        });

        const staged =
          await stageAgentUpdatePackage(
            downloaded,
          );

        console.log(
          "[Agent Update] Package safely staged: " +
            staged.stageRoot,
        );

        await tryReportAgentUpdateStatus({
          deviceId,
          status:
            "staged",
          fromVersion:
            AGENT_VERSION,
          toVersion:
            manifest.release.version,
          packageId:
            manifest.release.packageId,
          metadata: {
            entryCount:
              staged.entryCount,
            totalUncompressedBytes:
              staged
                .totalUncompressedBytes,
          },
        });

        const activation =
          await createAgentUpdateActivationRequest(
            staged,
          );

        if (activation.requested) {
          await tryReportAgentUpdateStatus({
            deviceId,
            status:
              "activation_requested",
            fromVersion:
              AGENT_VERSION,
            toVersion:
              activation.request
                .version,
            packageId:
              activation.request
                .packageId,
            metadata: {
              requestId:
                activation.request
                  .requestId,
            },
          });

          console.log(
            "[Agent Update] Activation request created for version " +
              activation.request
                .version,
          );

          return;
        }

        console.log(
          "[Agent Update] Activation remains disabled; staged package is awaiting updater handoff.",
        );

        return;
      }

      console.log(
        "[Agent Update] Up to date: " +
          AGENT_VERSION,
      );
    } catch (error) {
      if (activeRelease) {
        await tryReportAgentUpdateStatus({
          deviceId,
          status:
            "failed",
          fromVersion:
            AGENT_VERSION,
          toVersion:
            activeRelease.version,
          packageId:
            activeRelease.packageId,
          failureCategory:
            "agent_update_pipeline",
          safeErrorText:
            error instanceof Error
              ? error.message
              : "Unknown update pipeline error",
        });
      }

      if (
        axios.isAxiosError(
          error,
        )
      ) {
        console.error(
          "[Agent Update] Manifest check failed" +
            (
              error.response?.status
                ? " | HTTP " +
                  error.response.status
                : ""
            ) +
            " | " +
            error.message,
        );

        return;
      }

      console.error(
        "[Agent Update] Manifest check failed:",
        error instanceof Error
          ? error.message
          : "Unknown error",
      );
    }
  }

  function trigger():
    void {
    if (
      stopped ||
      currentRequest
    ) {
      return;
    }

    currentRequest =
      check()
        .finally(
          () => {
            currentRequest =
              null;
          },
        );
  }

  trigger();

  const timer =
    setInterval(
      trigger,
      UPDATE_CHECK_INTERVAL_MS,
    );

  return async () => {
    if (stopped) {
      return;
    }

    stopped =
      true;

    clearInterval(
      timer,
    );

    if (currentRequest) {
      await currentRequest;
    }
  };
}


