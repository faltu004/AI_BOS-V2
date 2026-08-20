import {
  deviceApplicationSnapshotRepository,
  type InstalledApplicationRecord,
  type RunningApplicationRecord,
} from "../repositories/device-application-snapshot.repository.js";

import {
  managedDeviceRepository,
} from "../repositories/managed-device.repository.js";

type InstalledApplicationInput = {
  name?: unknown;
  version?: unknown;
  publisher?: unknown;
  installDate?: unknown;
  scope?: unknown;
  architecture?: unknown;
  source?: unknown;
};

type RunningApplicationInput = {
  processName?: unknown;
  pid?: unknown;
  startedAt?: unknown;
  cpuUsage?: unknown;
  memoryBytes?: unknown;
};

export type SaveApplicationSnapshotInput = {
  deviceId?: unknown;

  installedApplications?: unknown;
  runningApplications?: unknown;

  collectedAt?: unknown;
  reporterSource?: unknown;
  sessionContext?: unknown;
};

function normalizeRequiredString(
  value: unknown,
  maxLength: number,
): string | null {
  if (
    typeof value !== "string"
  ) {
    return null;
  }

  const normalized =
    value.trim().slice(
      0,
      maxLength,
    );

  return normalized || null;
}

function normalizeNullableString(
  value: unknown,
  maxLength: number,
): string | null {
  if (
    value === null ||
    value === undefined
  ) {
    return null;
  }

  if (
    typeof value !== "string"
  ) {
    return null;
  }

  const normalized =
    value.trim().slice(
      0,
      maxLength,
    );

  return normalized || null;
}

function normalizeNullableNumber(
  value: unknown,
): number | null {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < 0
  ) {
    return null;
  }

  return value;
}

function normalizeNullableDate(
  value: unknown,
): Date | null {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  if (
    typeof value !== "string" &&
    !(value instanceof Date)
  ) {
    return null;
  }

  const parsed =
    new Date(value);

  if (
    Number.isNaN(
      parsed.getTime(),
    )
  ) {
    return null;
  }

  return parsed;
}

function normalizeReporterSource(value: unknown): "agent-interactive" | "session-helper" | "unknown" {
  return value === "agent-interactive" || value === "session-helper" ? value : "unknown";
}

function normalizeInstalledApplications(
  value: unknown,
): InstalledApplicationRecord[] {
  if (
    !Array.isArray(value)
  ) {
    throw new Error(
      "installedApplications must be an array",
    );
  }

  if (
    value.length > 2500
  ) {
    throw new Error(
      "Too many installed applications in snapshot",
    );
  }

  return value.flatMap(
    (
      raw,
    ): InstalledApplicationRecord[] => {
      if (
        typeof raw !== "object" ||
        raw === null
      ) {
        return [];
      }

      const input =
        raw as InstalledApplicationInput;

      const name =
        normalizeRequiredString(
          input.name,
          500,
        );

      if (!name) {
        return [];
      }

      const scope:
        InstalledApplicationRecord["scope"] =
          input.scope === "user"
            ? "user"
            : "machine";

      let architecture:
        InstalledApplicationRecord["architecture"] =
          "64-bit";

      if (
        input.architecture ===
        "32-bit"
      ) {
        architecture =
          "32-bit";
      }

      if (
        input.architecture ===
        "user"
      ) {
        architecture =
          "user";
      }

      return [
        {
          name,

          version:
            normalizeNullableString(
              input.version,
              200,
            ),

          publisher:
            normalizeNullableString(
              input.publisher,
              500,
            ),

          installDate:
            normalizeNullableString(
              input.installDate,
              100,
            ),

          scope,
          architecture,

          source:
            input.source === "registry"
              ? "registry"
              : "unknown",
        },
      ];
    },
  );
}

function normalizeRunningApplications(
  value: unknown,
): RunningApplicationRecord[] {
  if (
    !Array.isArray(value)
  ) {
    throw new Error(
      "runningApplications must be an array",
    );
  }

  if (
    value.length > 1000
  ) {
    throw new Error(
      "Too many running applications in snapshot",
    );
  }

  return value.flatMap(
    (
      raw,
    ): RunningApplicationRecord[] => {
      if (
        typeof raw !== "object" ||
        raw === null
      ) {
        return [];
      }

      const input =
        raw as RunningApplicationInput;

      const processName =
        normalizeRequiredString(
          input.processName,
          300,
        );

      if (!processName) {
        return [];
      }

      if (
        typeof input.pid !==
          "number" ||
        !Number.isInteger(
          input.pid,
        ) ||
        input.pid < 0
      ) {
        return [];
      }

      return [
        {
          processName,
          pid: input.pid,

          startedAt:
            normalizeNullableDate(
              input.startedAt,
            ),

          cpuUsage:
            normalizeNullableNumber(
              input.cpuUsage,
            ),

          memoryBytes:
            normalizeNullableNumber(
              input.memoryBytes,
            ),
        },
      ];
    },
  );
}

export class DeviceApplicationService {
  async saveSnapshot(
    input:
      SaveApplicationSnapshotInput,
  ) {
    const deviceId =
      normalizeRequiredString(
        input.deviceId,
        100,
      );

    if (!deviceId) {
      throw new Error(
        "Device ID is required for application snapshot",
      );
    }

    const device =
      await managedDeviceRepository
        .findByDeviceId(
          deviceId,
        );

    if (!device) {
      throw new Error(
        "Managed device not found",
      );
    }

    const hasInstalledApplications =
      Object.prototype.hasOwnProperty.call(
        input,
        "installedApplications",
      );

    const hasRunningApplications =
      Object.prototype.hasOwnProperty.call(
        input,
        "runningApplications",
      );

    if (
      !hasInstalledApplications &&
      !hasRunningApplications
    ) {
      throw new Error(
        "Application snapshot must include installedApplications or runningApplications",
      );
    }

    const installedApplications =
      hasInstalledApplications
        ? normalizeInstalledApplications(
            input.installedApplications,
          )
        : undefined;

    const runningApplications =
      hasRunningApplications
        ? normalizeRunningApplications(
            input.runningApplications,
          )
        : undefined;

    let collectedAt =
      new Date();

    if (
      input.collectedAt !==
        undefined
    ) {
      const parsed =
        normalizeNullableDate(
          input.collectedAt,
        );

      if (!parsed) {
        throw new Error(
          "Invalid application snapshot collectedAt",
        );
      }

      collectedAt =
        parsed;
    }

    return deviceApplicationSnapshotRepository
      .upsertSnapshot({
        deviceId,
        installedApplications,
        runningApplications,
        collectedAt,
        reporterSource:
          normalizeReporterSource(
            input.reporterSource,
          ),
        sessionContext:
          normalizeNullableString(
            input.sessionContext,
            120,
          ) ?? undefined,
      });
  }

  async getSnapshot(
    deviceId:
      string | undefined,
  ) {
    const normalizedDeviceId =
      deviceId?.trim();

    if (!normalizedDeviceId) {
      throw new Error(
        "Device ID is required",
      );
    }

    const device =
      await managedDeviceRepository
        .findByDeviceId(
          normalizedDeviceId,
        );

    if (!device) {
      throw new Error(
        "Managed device not found",
      );
    }

    const snapshot =
      await deviceApplicationSnapshotRepository
        .findByDeviceId(
          normalizedDeviceId,
        );

    if (!snapshot) {
      return {
        deviceId:
          normalizedDeviceId,

        installedApplications:
          [],

        runningApplications:
          [],

        collectedAt:
          null,
      };
    }

    return snapshot;
  }
}

export const deviceApplicationService =
  new DeviceApplicationService();
