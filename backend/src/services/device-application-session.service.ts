import {
  deviceApplicationSessionRepository,
} from "../repositories/device-application-session.repository.js";

import {
  managedDeviceRepository,
} from "../repositories/managed-device.repository.js";

export type ApplicationSessionRange =
  | "1h"
  | "24h"
  | "7d"
  | "30d";

export type SaveApplicationSessionInput = {
  deviceId?: unknown;
  processName?: unknown;
  pid?: unknown;
  startedAt?: unknown;
  endedAt?: unknown;
  durationSeconds?: unknown;
};

const rangeMilliseconds:
  Record<
    ApplicationSessionRange,
    number
  > = {
    "1h":
      60 * 60 * 1000,

    "24h":
      24 * 60 * 60 * 1000,

    "7d":
      7 * 24 * 60 * 60 * 1000,

    "30d":
      30 * 24 * 60 * 60 * 1000,
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
    value
      .trim()
      .slice(
        0,
        maxLength,
      );

  return normalized || null;
}

function normalizeInteger(
  value: unknown,
): number | null {
  if (
    typeof value !== "number" ||
    !Number.isInteger(
      value,
    ) ||
    value < 0
  ) {
    return null;
  }

  return value;
}

function normalizeDate(
  value: unknown,
): Date | null {
  if (
    typeof value !== "string" &&
    !(value instanceof Date)
  ) {
    return null;
  }

  const parsed =
    new Date(
      value,
    );

  if (
    Number.isNaN(
      parsed.getTime(),
    )
  ) {
    return null;
  }

  return parsed;
}

function normalizeRange(
  value: unknown,
): ApplicationSessionRange {
  if (
    value === "1h" ||
    value === "24h" ||
    value === "7d" ||
    value === "30d"
  ) {
    return value;
  }

  return "24h";
}

export class DeviceApplicationSessionService {
  async saveSession(
    input:
      SaveApplicationSessionInput,
  ) {
    const deviceId =
      normalizeRequiredString(
        input.deviceId,
        100,
      );

    if (!deviceId) {
      throw new Error(
        "Device ID is required for application session",
      );
    }

    const processName =
      normalizeRequiredString(
        input.processName,
        300,
      );

    if (!processName) {
      throw new Error(
        "Process name is required",
      );
    }

    const pid =
      normalizeInteger(
        input.pid,
      );

    if (pid === null) {
      throw new Error(
        "Valid process PID is required",
      );
    }

    const startedAt =
      normalizeDate(
        input.startedAt,
      );

    const endedAt =
      normalizeDate(
        input.endedAt,
      );

    if (
      !startedAt ||
      !endedAt
    ) {
      throw new Error(
        "Valid session timestamps are required",
      );
    }

    if (
      endedAt.getTime() <
      startedAt.getTime()
    ) {
      throw new Error(
        "Session endedAt cannot be before startedAt",
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

    const durationSeconds =
      Number(
        (
          (
            endedAt.getTime() -
            startedAt.getTime()
          ) /
          1000
        ).toFixed(
          2,
        ),
      );

    return deviceApplicationSessionRepository
      .upsertSession({
        deviceId,
        processName,
        pid,
        startedAt,
        endedAt,
        durationSeconds,
      });
  }

  async getSessions(
    deviceId:
      string | undefined,
    rangeInput:
      unknown,
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

    const range =
      normalizeRange(
        rangeInput,
      );

    const to =
      new Date();

    const from =
      new Date(
        to.getTime() -
          rangeMilliseconds[
            range
          ],
      );

    const sessions =
      await deviceApplicationSessionRepository
        .findSince(
          normalizedDeviceId,
          from,
        );

    return {
      deviceId:
        normalizedDeviceId,

      range,

      from:
        from.toISOString(),

      to:
        to.toISOString(),

      sessions,
    };
  }
}

export const deviceApplicationSessionService =
  new DeviceApplicationSessionService();
