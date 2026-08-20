import {
  randomUUID,
} from "node:crypto";

import {
  managedDeviceRepository,
} from "../repositories/managed-device.repository.js";

import {
  deviceApplicationPolicyRepository,
} from "../repositories/device-application-policy.repository.js";

import type {
  ApplicationPolicyEnforcementStatus,
} from "../models/device-application-policy.model.js";

import type {
  ApplicationPolicyAction,
} from "../models/device-application-policy.model.js";

import {
  AppError,
} from "../utils/app-error.js";

export type SetApplicationPolicyInput = {
  deviceId?: unknown;

  processName?: unknown;
  displayName?: unknown;

  action?: unknown;

  requestedBy?: unknown;
};

const protectedProcessKeys =
  new Set([
    "system",
    "idle",
    "registry",
    "smss",
    "csrss",
    "wininit",
    "services",
    "lsass",
    "svchost",
    "winlogon",
    "dwm",
    "explorer",
    "taskmgr",
    "msiexec",
    "conhost",
    "node",
    "powershell",
    "pwsh",
    "cmd",
  ]);

function normalizeRequiredString(
  value: unknown,
  field: string,
  maxLength: number,
): string {
  if (
    typeof value !== "string"
  ) {
    throw new AppError(
      field + " is required",
      400,
    );
  }

  const normalized =
    value
      .trim()
      .slice(
        0,
        maxLength,
      );

  if (!normalized) {
    throw new AppError(
      field + " is required",
      400,
    );
  }

  return normalized;
}

function normalizeProcessName(
  value: unknown,
): {
  processName: string;
  processKey: string;
} {
  let processName =
    normalizeRequiredString(
      value,
      "Process name",
      128,
    );

  processName =
    processName.replace(
      /\.exe$/i,
      "",
    );

  if (
    !processName ||
    /[\\/:*?"<>|]/.test(
      processName,
    )
  ) {
    throw new AppError(
      "Process name is invalid",
      400,
    );
  }

  return {
    processName,

    processKey:
      processName
        .toLowerCase(),
  };
}

function normalizeDisplayName(
  value: unknown,
): string | undefined {
  if (
    value === undefined ||
    value === null
  ) {
    return undefined;
  }

  if (
    typeof value !== "string"
  ) {
    throw new AppError(
      "Display name must be a string",
      400,
    );
  }

  const normalized =
    value
      .trim()
      .slice(
        0,
        200,
      );

  return normalized ||
    undefined;
}

function normalizeAction(
  value: unknown,
): ApplicationPolicyAction {
  if (
    value === "block" ||
    value === "allow"
  ) {
    return value;
  }

  throw new AppError(
    "Policy action must be block or allow",
    400,
  );
}

export class DeviceApplicationPolicyService {
  async getPolicy(
    deviceIdInput: unknown,
  ) {
    const deviceId =
      normalizeRequiredString(
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

    const rules =
      await deviceApplicationPolicyRepository
        .findByDeviceId(
          deviceId,
        );

    return {
      deviceId,
      rules,
    };
  }

  async setPolicy(
    input: SetApplicationPolicyInput,
  ) {
    const deviceId =
      normalizeRequiredString(
        input.deviceId,
        "Device ID",
        100,
      );

    const requestedBy =
      normalizeRequiredString(
        input.requestedBy,
        "Requested by",
        200,
      );

    const {
      processName,
      processKey,
    } =
      normalizeProcessName(
        input.processName,
      );

    const action =
      normalizeAction(
        input.action,
      );

    if (
      action === "block" &&
      protectedProcessKeys.has(
        processKey,
      )
    ) {
      throw new AppError(
        "This Windows or AI BOS process is protected from restriction",
        409,
      );
    }

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

    return deviceApplicationPolicyRepository
      .upsertRule({
        ruleId:
          "APR-" +
          randomUUID(),

        deviceId,

        processName,
        processKey,

        displayName:
          normalizeDisplayName(
            input.displayName,
          ),

        action,
        enabled: true,

        requestedBy,
      });
  }

  async getAgentPolicy(
    deviceIdInput: unknown,
  ) {
    const deviceId =
      normalizeRequiredString(
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

    const rules =
      await deviceApplicationPolicyRepository
        .findBlockedByDeviceId(
          deviceId,
        );

    return {
      deviceId,

      blockedProcesses:
        rules.map(
          (rule) => ({
            ruleId:
              rule.ruleId,

            processName:
              rule.processName,

            displayName:
              rule.displayName ??
              rule.processName,
          }),
        ),
    };
  }

  async reportAgentEnforcement(
    input: {
      deviceId?: unknown;
      status?: unknown;
      errorMessage?: unknown;
    },
  ) {
    const deviceId = normalizeRequiredString(
      input.deviceId,
      "Device ID",
      100,
    );

    const status = input.status as ApplicationPolicyEnforcementStatus;
    if (
      status !== "pending" &&
      status !== "applied" &&
      status !== "failed"
    ) {
      throw new AppError(
        "Invalid application policy enforcement status",
        400,
      );
    }

    const device = await managedDeviceRepository.findByDeviceId(deviceId);
    if (!device) {
      throw new AppError("Managed device not found", 404);
    }

    const errorMessage =
      typeof input.errorMessage === "string"
        ? input.errorMessage.trim().slice(0, 500)
        : undefined;

    return deviceApplicationPolicyRepository.updateEnforcementStatus(
      deviceId,
      status,
      errorMessage,
    );
  }
}

export const deviceApplicationPolicyService =
  new DeviceApplicationPolicyService();
