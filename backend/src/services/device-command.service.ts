import {
  randomUUID,
} from "node:crypto";

import {
  deviceCommandRepository,
  type DeviceCommandStatus,
  type DeviceCommandType,
} from "../repositories/device-command.repository.js";

import {
  managedDeviceRepository,
} from "../repositories/managed-device.repository.js";

import {
  softwareCatalogRepository,
} from "../repositories/software-catalog.repository.js";

import {
  AppError,
} from "../utils/app-error.js";

export type CreateDeviceCommandInput = {
  deviceId?: unknown;
  type?: unknown;
  payload?: unknown;
  requestedBy?: unknown;
  requestedByRole?: unknown;

  /**
   * Internal authorization flag.
   * Never read this value directly from an HTTP request body.
   */
  powerAuthorized?: boolean;
};

export type UpdateDeviceCommandStatusInput = {
  deviceId?: unknown;
  commandId?: unknown;
  status?: unknown;
  result?: unknown;
  errorMessage?: unknown;
};

type AppDeviceCommandType =
  | "INSTALL_APP"
  | "UNINSTALL_APP"
  | "UPDATE_APP";

type PowerDeviceCommandType =
  | "RESTART_DEVICE"
  | "SHUTDOWN_DEVICE";

type PowerDeviceCommandPayload = {
  reason: string;
  delaySeconds: number;
};

type MsiPackageCommandPayload = {
  packageId: string;

  name: string;
  version: string;
  publisher: string;

  packageType: "MSI";

  downloadUrl: string;
  sha256: string;
  productCode: string;
};
const DEVICE_COMMAND_DELIVERY_LEASE_MS =
  60_000;

const DEVICE_COMMAND_MAX_DELIVERY_ATTEMPTS =
  3;
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
    value
      .trim()
      .slice(
        0,
        maxLength,
      );

  return normalized || null;
}

function normalizeCommandType(
  value: unknown,
): DeviceCommandType | null {
  if (
    value === "PING" ||
    value === "INSTALL_APP" ||
    value === "UNINSTALL_APP" ||
    value === "UPDATE_APP" ||
    value === "RESTART_DEVICE" ||
    value === "SHUTDOWN_DEVICE"
  ) {
    return value;
  }

  return null;
}

function normalizeAppCommandRequestPayload(
  value: unknown,
): {
  packageId: string;
} {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value)
  ) {
    throw new AppError(
      "App command payload must contain packageId",
      400,
    );
  }

  const record =
    value as Record<string, unknown>;

  const keys =
    Object.keys(record);

  if (
    keys.length !== 1 ||
    keys[0] !== "packageId"
  ) {
    throw new AppError(
      "App command payload may contain only packageId",
      400,
    );
  }

  const packageId =
    normalizeRequiredString(
      record.packageId,
      100,
    );

  if (!packageId) {
    throw new AppError(
      "Software package ID is required",
      400,
    );
  }

  return {
    packageId,
  };
}

function isPowerDeviceCommandType(
  type: DeviceCommandType,
): type is PowerDeviceCommandType {
  return (
    type === "RESTART_DEVICE" ||
    type === "SHUTDOWN_DEVICE"
  );
}

function normalizePowerCommandPayload(
  value: unknown,
): PowerDeviceCommandPayload {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value)
  ) {
    throw new AppError(
      "Power command payload must contain reason and delaySeconds",
      400,
    );
  }

  const record =
    value as Record<string, unknown>;

  const keys =
    Object.keys(record);

  if (
    keys.length !== 2 ||
    !keys.includes("reason") ||
    !keys.includes("delaySeconds")
  ) {
    throw new AppError(
      "Power command payload may contain only reason and delaySeconds",
      400,
    );
  }

  const reason =
    normalizeRequiredString(
      record.reason,
      200,
    );

  if (
    !reason ||
    reason.length < 3
  ) {
    throw new AppError(
      "Power command reason must be at least 3 characters",
      400,
    );
  }

  const delaySeconds =
    record.delaySeconds;

  if (
    typeof delaySeconds !== "number" ||
    !Number.isInteger(delaySeconds) ||
    delaySeconds < 60 ||
    delaySeconds > 3600
  ) {
    throw new AppError(
      "Power command delaySeconds must be an integer between 60 and 3600",
      400,
    );
  }

  return {
    reason,
    delaySeconds,
  };
}

async function buildAppCommandPayload(
  type: AppDeviceCommandType,
  value: unknown,
): Promise<MsiPackageCommandPayload> {
  const request =
    normalizeAppCommandRequestPayload(
      value,
    );

  const softwarePackage =
    await softwareCatalogRepository
      .findByPackageId(
        request.packageId,
      );

  if (!softwarePackage) {
    throw new AppError(
      "Approved software package not found",
      404,
    );
  }

  if (
    type !== "UNINSTALL_APP" &&
    softwarePackage.enabled !== true
  ) {
    throw new AppError(
      "Software package is disabled",
      409,
    );
  }

  if (
    softwarePackage.packageType !==
    "MSI"
  ) {
    throw new AppError(
      "Only approved MSI packages can be executed",
      409,
    );
  }

  return {
    packageId:
      softwarePackage.packageId,

    name:
      softwarePackage.name,

    version:
      softwarePackage.version,

    publisher:
      softwarePackage.publisher,

    packageType:
      "MSI",

    downloadUrl:
      softwarePackage.downloadUrl,

    sha256:
      softwarePackage.sha256,

    productCode:
      softwarePackage.productCode,
  };
}
function normalizeAgentStatus(
  value: unknown,
): DeviceCommandStatus | null {
  if (
    value === "acknowledged" ||
    value === "running" ||
    value === "completed" ||
    value === "failed"
  ) {
    return value;
  }

  return null;
}

function isAllowedTransition(
  currentStatus:
    DeviceCommandStatus,
  nextStatus:
    DeviceCommandStatus,
): boolean {
  if (
    currentStatus ===
    nextStatus
  ) {
    return true;
  }

  if (
    currentStatus ===
      "sent" &&
    (
      nextStatus ===
        "acknowledged" ||
      nextStatus ===
        "running" ||
      nextStatus ===
        "completed" ||
      nextStatus ===
        "failed"
    )
  ) {
    return true;
  }

  if (
    currentStatus ===
      "acknowledged" &&
    (
      nextStatus ===
        "running" ||
      nextStatus ===
        "completed" ||
      nextStatus ===
        "failed"
    )
  ) {
    return true;
  }

  if (
    currentStatus ===
      "running" &&
    (
      nextStatus ===
        "completed" ||
      nextStatus ===
        "failed"
    )
  ) {
    return true;
  }

  return false;
}

function normalizeResult(
  value: unknown,
): unknown {
  if (
    value === undefined
  ) {
    return null;
  }

  try {
    const serialized =
      JSON.stringify(
        value,
      );

    if (
      serialized.length >
      20_000
    ) {
      throw new Error(
        "Command result is too large",
      );
    }

    return value;
  } catch (
    error
  ) {
    if (
      error instanceof Error &&
      error.message ===
        "Command result is too large"
    ) {
      throw error;
    }

    throw new Error(
      "Command result must be JSON serializable",
    );
  }
}

export class DeviceCommandService {
  async createPowerCommand(
    input:
      Omit<
        CreateDeviceCommandInput,
        "powerAuthorized"
      >,
  ) {
    const type =
      normalizeCommandType(
        input.type,
      );

    if (
      !type ||
      !isPowerDeviceCommandType(type)
    ) {
      throw new AppError(
        "Unsupported device power command type",
        400,
      );
    }

    return this.createCommand({
      ...input,
      type,
      powerAuthorized: true,
    });
  }

  async createCommand(
    input:
      CreateDeviceCommandInput,
  ) {
    const deviceId =
      normalizeRequiredString(
        input.deviceId,
        100,
      );

    if (!deviceId) {
      throw new Error(
        "Device ID is required",
      );
    }

    const type =
      normalizeCommandType(
        input.type,
      );

    if (!type) {
      throw new Error(
        "Unsupported device command type",
      );
    }

    if (
      isPowerDeviceCommandType(type) &&
      input.powerAuthorized !== true
    ) {
      throw new AppError(
        "Power device command requires dedicated authorization",
        403,
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

    if (
      device.status ===
      "disabled"
    ) {
      throw new Error(
        "Commands cannot be created for a disabled device",
      );
    }

    const requestedAt =
      new Date();

    const expiresAt =
      new Date(
        requestedAt.getTime() +
          5 * 60 * 1000,
      );

    const requestedBy =
      normalizeNullableString(
        input.requestedBy,
        200,
      );

    const requestedByRole =
      normalizeNullableString(
        input.requestedByRole,
        100,
      );

    const authorizationPermission =
      isPowerDeviceCommandType(type)
        ? "device.command.power"
        : "device.command.execute";

    /*
     * Phase 14 starts with one harmless,
     * typed command only.
     *
     * PING takes no executable payload.
     */
    let payload:
      | null
      | MsiPackageCommandPayload
      | PowerDeviceCommandPayload;

    if (type === "PING") {
      payload = null;
    } else if (
      isPowerDeviceCommandType(type)
    ) {
      payload =
        normalizePowerCommandPayload(
          input.payload,
        );
    } else {
      payload =
        await buildAppCommandPayload(
          type,
          input.payload,
        );
    }
    return deviceCommandRepository
      .create({
        commandId:
          "CMD-" +
          randomUUID(),

        deviceId,
        type,
        payload,
        requestedBy,
        requestedByRole,
        authorizationPermission,
        requestedAt,
        expiresAt,
      });
  }

  async getNextCommand(
    deviceIdInput: unknown,
  ) {
    const deviceId =
      normalizeRequiredString(
        deviceIdInput,
        100,
      );

    if (!deviceId) {
      throw new Error(
        "Device ID is required",
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

    if (
      device.status ===
      "disabled"
    ) {
      return null;
    }

    const now =
      new Date();

    const staleBefore =
      new Date(
        now.getTime() -
          DEVICE_COMMAND_DELIVERY_LEASE_MS,
      );

    await deviceCommandRepository
      .expirePendingCommands(
        deviceId,
        now,
      );

    await deviceCommandRepository
      .failStaleDeliveryCommands(
        deviceId,
        staleBefore,
        now,
        DEVICE_COMMAND_MAX_DELIVERY_ATTEMPTS,
      );

    await deviceCommandRepository
      .requeueStaleDeliveryCommands(
        deviceId,
        staleBefore,
        now,
        DEVICE_COMMAND_MAX_DELIVERY_ATTEMPTS,
      );

    return deviceCommandRepository
      .claimNextQueuedCommand(
        deviceId,
        now,
        DEVICE_COMMAND_MAX_DELIVERY_ATTEMPTS,
      );
  }
  async updateCommandStatus(
    input:
      UpdateDeviceCommandStatusInput,
  ) {
    const deviceId =
      normalizeRequiredString(
        input.deviceId,
        100,
      );

    const commandId =
      normalizeRequiredString(
        input.commandId,
        100,
      );

    if (
      !deviceId ||
      !commandId
    ) {
      throw new Error(
        "Device ID and command ID are required",
      );
    }

    const status =
      normalizeAgentStatus(
        input.status,
      );

    if (!status) {
      throw new Error(
        "Invalid command status",
      );
    }

    const existing =
      await deviceCommandRepository
        .findByCommandId(
          commandId,
        );

    if (!existing) {
      throw new Error(
        "Device command not found",
      );
    }

    if (
      existing.deviceId !==
      deviceId
    ) {
      throw new Error(
        "Command does not belong to this device",
      );
    }

    const currentStatus =
      existing.status as
        DeviceCommandStatus;

    if (
      !isAllowedTransition(
        currentStatus,
        status,
      )
    ) {
      throw new Error(
        "Invalid command status transition",
      );
    }

    const now =
      new Date();

    const update: {
      status:
        DeviceCommandStatus;

      acknowledgedAt?:
        Date | null;

      startedAt?:
        Date | null;

      completedAt?:
        Date | null;

      result?:
        unknown;

      errorMessage?:
        string | null;
    } = {
      status,
    };

    if (
      status ===
      "acknowledged"
    ) {
      update.acknowledgedAt =
        now;
    }

    if (
      status ===
      "running"
    ) {
      update.startedAt =
        now;
    }

    if (
      status ===
        "completed" ||
      status ===
        "failed"
    ) {
      update.completedAt =
        now;

      update.result =
        normalizeResult(
          input.result,
        );
    }

    if (
      status ===
      "failed"
    ) {
      update.errorMessage =
        normalizeNullableString(
          input.errorMessage,
          2000,
        ) ??
        "Command failed";
    }

    if (
      status ===
      "completed"
    ) {
      update.errorMessage =
        null;
    }

    return deviceCommandRepository
      .updateStatus(
        commandId,
        deviceId,
        update,
      );
  }

  async getDeviceCommands(
    deviceIdInput:
      unknown,
  ) {
    const deviceId =
      normalizeRequiredString(
        deviceIdInput,
        100,
      );

    if (!deviceId) {
      throw new Error(
        "Device ID is required",
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

    return deviceCommandRepository
      .findRecentByDeviceId(
        deviceId,
        100,
      );
  }
}

export const deviceCommandService =
  new DeviceCommandService();


