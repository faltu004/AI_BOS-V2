import axios from "axios";

import {
  config,
} from "./config.js";
import {
  deriveDeviceBinding,
  deriveDeviceFingerprint,
} from "./device-binding.js";
import {
  isPerDeviceToken,
  persistDeviceCredential,
} from "./device-credential-store.js";
import {
  getInventory,
} from "./inventory.js";

const RECOVERY_AUTHORIZATION_PREFIX =
  "aibos_recover_ot_";

type RecoveryResponse = {
  success?: boolean;
  data?: {
    deviceId?: unknown;
    deviceToken?: unknown;
    credentialVersion?: unknown;
    issuedAt?: unknown;
  };
};

function clean(value: unknown): string {
  return typeof value === "string"
    ? value.trim()
    : "";
}

export async function recoverRejectedDeviceCredential(
  input: {
    deviceId: string;
    deviceBinding: string;
    recoveryAuthorization: string;
  },
): Promise<void> {
  const deviceId =
    clean(input.deviceId);
  const expectedBinding =
    clean(input.deviceBinding)
      .toLowerCase();
  const recoveryAuthorization =
    clean(input.recoveryAuthorization);

  if (
    !deviceId ||
    !/^[a-f0-9]{64}$/.test(
      expectedBinding,
    ) ||
    !recoveryAuthorization.startsWith(
      RECOVERY_AUTHORIZATION_PREFIX,
    )
  ) {
    throw new Error(
      "Device credential recovery input is invalid",
    );
  }

  const inventory =
    await getInventory();
  const fingerprint =
    deriveDeviceFingerprint(inventory);
  const deviceBinding =
    deriveDeviceBinding(fingerprint);

  if (deviceBinding !== expectedBinding) {
    throw new Error(
      "Device credential recovery binding mismatch",
    );
  }

  const response =
    await axios.post<RecoveryResponse>(
      config.backendUrl +
        "/api/v1/devices/credential/recovery",
      {
        deviceId,
        deviceBinding,
        fingerprint,
      },
      {
        headers: {
          "Content-Type":
            "application/json",
          "x-device-recovery-authorization":
            recoveryAuthorization,
        },
        timeout: 30_000,
      },
    );

  const returnedDeviceId =
    clean(response.data
      ?.data?.deviceId);
  const deviceToken =
    clean(response.data
      ?.data?.deviceToken);
  const credentialVersion =
    response.data
      ?.data?.credentialVersion;
  const issuedAt =
    clean(response.data
      ?.data?.issuedAt);

  if (
    returnedDeviceId !== deviceId ||
    !isPerDeviceToken(deviceToken) ||
    typeof credentialVersion !== "number" ||
    !Number.isInteger(credentialVersion) ||
    credentialVersion < 2 ||
    !issuedAt ||
    Number.isNaN(Date.parse(issuedAt))
  ) {
    throw new Error(
      "Device credential recovery returned an invalid response",
    );
  }

  await persistDeviceCredential({
    deviceId,
    deviceToken,
  });

  console.log(
    "[Device Auth] Authenticated device credential recovery completed.",
  );
}
