import {
  deviceUpdateEventRepository,
} from "../repositories/device-update-event.repository.js";

import {
  deviceUpdateStatuses,
  type DeviceUpdateStatus,
} from "../models/device-update-event.model.js";

import {
  managedDeviceRepository,
} from "../repositories/managed-device.repository.js";

import {
  auditLogService,
} from "./audit-log.service.js";

import {
  AppError,
} from "../utils/app-error.js";

export type RecordDeviceUpdateStatusInput = {
  deviceId?: unknown;
  fromVersion?: unknown;
  toVersion?: unknown;
  packageId?: unknown;
  status?: unknown;
  failureCategory?: unknown;
  safeErrorText?: unknown;
  metadata?: unknown;
  reportedAt?: unknown;
};

const semverPattern =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;

const allowedStatuses =
  new Set<string>(
    deviceUpdateStatuses,
  );

function requiredString(
  value: unknown,
  name: string,
  maxLength: number,
): string {
  if (
    typeof value !== "string"
  ) {
    throw new AppError(
      name + " is required",
      400,
    );
  }

  const normalized =
    value.trim();

  if (
    !normalized ||
    normalized.length > maxLength
  ) {
    throw new AppError(
      name + " is invalid",
      400,
    );
  }

  return normalized;
}

function optionalString(
  value: unknown,
  maxLength: number,
): string | null {
  if (
    value === undefined ||
    value === null
  ) {
    return null;
  }

  if (
    typeof value !== "string"
  ) {
    throw new AppError(
      "Optional update field is invalid",
      400,
    );
  }

  const normalized =
    value.trim();

  if (!normalized) {
    return null;
  }

  return normalized.slice(
    0,
    maxLength,
  );
}

function optionalVersion(
  value: unknown,
): string | null {
  const version =
    optionalString(
      value,
      50,
    );

  if (
    version &&
    !semverPattern.test(version)
  ) {
    throw new AppError(
      "Update version is invalid",
      400,
    );
  }

  return version;
}

function normalizeStatus(
  value: unknown,
): DeviceUpdateStatus {
  if (
    typeof value === "string" &&
    allowedStatuses.has(value)
  ) {
    return value as DeviceUpdateStatus;
  }

  throw new AppError(
    "Update status is invalid",
    400,
  );
}

function normalizeSafeErrorText(
  value: unknown,
): string | null {
  const text =
    optionalString(
      value,
      500,
    );

  return text
    ? text.replace(
        /[^\x20-\x7E]/g,
        " ",
      )
    : null;
}

function normalizeMetadata(
  value: unknown,
): Record<string, unknown> | null {
  if (
    value === undefined ||
    value === null
  ) {
    return null;
  }

  if (
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    throw new AppError(
      "Update metadata must be an object",
      400,
    );
  }

  const serialized =
    JSON.stringify(value);

  if (
    serialized.length > 5000
  ) {
    throw new AppError(
      "Update metadata is too large",
      400,
    );
  }

  return value as Record<string, unknown>;
}

function normalizeReportedAt(
  value: unknown,
): Date {
  if (
    value === undefined ||
    value === null
  ) {
    return new Date();
  }

  if (
    typeof value !== "string"
  ) {
    throw new AppError(
      "Update report timestamp is invalid",
      400,
    );
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    throw new AppError(
      "Update report timestamp is invalid",
      400,
    );
  }

  return date;
}

export class DeviceUpdateEventService {
  async recordStatus(
    input:
      RecordDeviceUpdateStatusInput,
  ) {
    const deviceId =
      requiredString(
        input.deviceId,
        "Device ID",
        100,
      );

    const device =
      await managedDeviceRepository
        .findByDeviceId(
          deviceId,
        );

    if (!device) {
      throw new AppError(
        "Managed device not found",
        404,
      );
    }

    const status =
      normalizeStatus(
        input.status,
      );

    const event =
      await deviceUpdateEventRepository
        .create({
          deviceId,
          fromVersion:
            optionalVersion(
              input.fromVersion,
            ),
          toVersion:
            optionalVersion(
              input.toVersion,
            ),
          packageId:
            optionalString(
              input.packageId,
              150,
            ),
          status,
          failureCategory:
            optionalString(
              input.failureCategory,
              80,
            ),
          safeErrorText:
            normalizeSafeErrorText(
              input.safeErrorText,
            ),
          metadata:
            normalizeMetadata(
              input.metadata,
            ),
          reportedAt:
            normalizeReportedAt(
              input.reportedAt,
            ),
        });

    await auditLogService
      .record({
        actorRole:
          "DeviceAgent",
        category:
          "device_update",
        method:
          "POST",
        path:
          "/devices/agent-update/status",
        resourceType:
          "device",
        resourceId:
          deviceId,
        statusCode:
          200,
        success:
          status !== "failed",
        metadata: {
          status,
          fromVersion:
            event.fromVersion ?? null,
          toVersion:
            event.toVersion ?? null,
          packageId:
            event.packageId ?? null,
          failureCategory:
            event.failureCategory ?? null,
        },
      })
      .catch(
        () => undefined,
      );

    return event;
  }

  async getSummary(
    deviceIdInput: unknown,
  ) {
    const deviceId =
      requiredString(
        deviceIdInput,
        "Device ID",
        100,
      );

    const device =
      await managedDeviceRepository
        .findByDeviceId(
          deviceId,
        );

    if (!device) {
      throw new AppError(
        "Managed device not found",
        404,
      );
    }

    const [
      latest,
      lastSuccessful,
      lastFailure,
    ] =
      await Promise.all([
        deviceUpdateEventRepository
          .findLatestByDeviceId(
            deviceId,
          ),
        deviceUpdateEventRepository
          .findLatestSuccessfulByDeviceId(
            deviceId,
          ),
        deviceUpdateEventRepository
          .findLatestFailureByDeviceId(
            deviceId,
          ),
      ]);

    return {
      deviceId,
      currentVersion:
        device.appVersion ?? null,
      targetVersion:
        latest?.toVersion ?? null,
      lastUpdateCheck:
        latest?.reportedAt ?? null,
      lastSuccessfulUpdate:
        lastSuccessful?.reportedAt ?? null,
      lastFailure:
        lastFailure?.reportedAt ?? null,
      rollbackStatus:
        latest?.status === "rolled_back"
          ? latest
          : null,
      latest,
    };
  }

  async getHistory(
    deviceIdInput: unknown,
  ) {
    const deviceId =
      requiredString(
        deviceIdInput,
        "Device ID",
        100,
      );

    const device =
      await managedDeviceRepository
        .findByDeviceId(
          deviceId,
        );

    if (!device) {
      throw new AppError(
        "Managed device not found",
        404,
      );
    }

    const events =
      await deviceUpdateEventRepository
        .findRecentByDeviceId(
          deviceId,
          100,
        );

    return {
      deviceId,
      events,
    };
  }
}

export const deviceUpdateEventService =
  new DeviceUpdateEventService();
