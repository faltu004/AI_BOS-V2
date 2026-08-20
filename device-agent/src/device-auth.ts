import {
  config,
} from "./config.js";

import {
  isPerDeviceToken,
  loadStoredDeviceCredential,
  loadStoredDeviceCredentialSync,
} from "./device-credential-store.js";

export type DeviceAuthHeaders =
  Record<
    string,
    string
  >;

function clean(
  value: unknown,
): string {
  return typeof value === "string"
    ? value.trim()
    : "";
}

export async function getDeviceAuthHeaders(
  deviceId: string,
): Promise<DeviceAuthHeaders> {
  const normalizedDeviceId =
    clean(
      deviceId,
    );

  if (!normalizedDeviceId) {
    throw new Error(
      "Device ID is required for authentication",
    );
  }

  const stored =
    await loadStoredDeviceCredential();

  if (stored) {
    if (
      stored.deviceId !==
      normalizedDeviceId
    ) {
      throw new Error(
        "Stored credential belongs to another device",
      );
    }

    return {
      "x-device-id":
        stored.deviceId,

      "x-device-token":
        stored.deviceToken,
    };
  }

  /*
   * Temporary migration path.
   *
   * This will be removed after all
   * deployed agents possess unique
   * per-device credentials.
   */
  const legacyToken =
    clean(
      process.env
        .DEVICE_TOKEN,
    ) ||
    clean(
      config.deviceToken,
    );

  if (
    !legacyToken ||
    isPerDeviceToken(
      legacyToken,
    )
  ) {
    throw new Error(
      "No valid device authentication credential is available",
    );
  }

  return {
    "x-device-key":
      legacyToken,
  };
}

export async function hasStoredPerDeviceCredential():
  Promise<boolean> {
  return Boolean(
    await loadStoredDeviceCredential(),
  );
}

export type DeviceSocketAuth = {
  deviceId: string;
  deviceToken: string;
};

export function getDeviceSocketAuth(
  deviceId: string,
): DeviceSocketAuth {
  const normalizedDeviceId =
    clean(
      deviceId,
    );

  if (!normalizedDeviceId) {
    throw new Error(
      "Device ID is required for socket authentication",
    );
  }

  /*
   * Read the persisted credential from
   * disk every time a new Remote Support
   * socket is created.
   *
   * This allows the interactive Session
   * Helper to immediately use a credential
   * rotated by the Windows Service without
   * requiring a helper restart.
   */
  const stored =
    loadStoredDeviceCredentialSync();

  if (!stored) {
    throw new Error(
      "Per-device credential is required for Remote Support socket authentication",
    );
  }

  if (
    stored.deviceId !==
    normalizedDeviceId
  ) {
    throw new Error(
      "Stored device credential belongs to another device",
    );
  }

  return {
    deviceId:
      stored.deviceId,

    deviceToken:
      stored.deviceToken,
  };
}
