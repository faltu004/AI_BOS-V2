import { AGENT_VERSION } from "./agent-version.js";
import axios from "axios";

import os from "node:os";

import {
  config,
} from "./config.js";

import {
  getInventory,
} from "./inventory.js";

import {
  discardBootstrapEnrollmentCredential,
  loadBootstrapEnrollmentCredential,
} from "./device-bootstrap-provisioning.js";

import {
  getDeviceAuthHeaders,
} from "./device-auth.js";

import {
  isPerDeviceToken,
  loadStoredDeviceCredential,
  persistDeviceCredential,
  tryAcquireEnrollmentLock,
  type StoredDeviceCredential,
} from "./device-credential-store.js";

type EnrollmentResponse = {
  success?: boolean;

  data?: {
    device?: {
      deviceId?: string;
    };

    credential?: {
      deviceToken?: string;
      credentialVersion?: number;
      issuedAt?: string;
    };
  };
};

type RegistrationResponse = {
  success?: boolean;

  data?: {
    deviceId?: string;
  };
};

const DEVICE_ENROLLMENT_REQUIRED =
  "DEVICE_ENROLLMENT_REQUIRED";

const WAIT_INTERVAL_MS =
  250;

const WAIT_ATTEMPTS =
  80;

function clean(
  value: unknown,
): string {
  return typeof value === "string"
    ? value.trim()
    : "";
}

function sleep(
  milliseconds: number,
): Promise<void> {
  return new Promise(
    (resolve) => {
      setTimeout(
        resolve,
        milliseconds,
      );
    },
  );
}

export class DeviceEnrollmentRequiredError extends Error {
  code =
    DEVICE_ENROLLMENT_REQUIRED;

  constructor(
    message: string,
  ) {
    super(
      message,
    );

    this.name =
      "DeviceEnrollmentRequiredError";
  }
}

export function isDeviceEnrollmentRequiredError(
  error: unknown,
): error is DeviceEnrollmentRequiredError {
  return (
    error instanceof
      DeviceEnrollmentRequiredError ||
    (
      typeof error ===
        "object" &&
      error !== null &&
      "code" in error &&
      (
        error as {
          code?: unknown;
        }
      ).code ===
        DEVICE_ENROLLMENT_REQUIRED
    )
  );
}

function isInvalidDeviceAuthenticationBody(
  body: unknown,
): boolean {
  if (
    typeof body !==
      "object" ||
    body === null
  ) {
    return false;
  }

  const message =
    clean(
      (
        body as {
          message?: unknown;
        }
      ).message,
    );

  return (
    message ===
    "Invalid device authentication"
  );
}

export function isInvalidDeviceAuthenticationError(
  error: unknown,
): boolean {
  return (
    axios.isAxiosError(
      error,
    ) &&
    error.response
      ?.status ===
      401 &&
    isInvalidDeviceAuthenticationBody(
      error.response
        .data,
    )
  );
}

async function discardBootstrapCredentialIfPresent():
  Promise<void> {
  try {
    await discardBootstrapEnrollmentCredential();
  } catch (
    error: unknown
  ) {
    const message =
      error instanceof Error
        ? error.message
        : String(
          error,
        );

    console.error(
      "[Device Auth] Failed to discard bootstrap enrollment credential: " +
        message,
    );

    throw error;
  }
}

type EnrollmentBootstrapCredential = {
  key: string;
  source:
    | "environment"
    | "protected-bootstrap-file"
    | "none";
};

async function enrollmentKey():
  Promise<EnrollmentBootstrapCredential> {
  const dedicated =
    clean(
      process.env
        .DEVICE_ENROLLMENT_KEY,
    );

  if (dedicated) {
    return {
      key:
        dedicated,
      source:
        "environment",
    };
  }

  const bootstrapCredential =
    await loadBootstrapEnrollmentCredential();

  if (bootstrapCredential) {
    return {
      key:
        bootstrapCredential
          .enrollmentKey,
      source:
        "protected-bootstrap-file",
    };
  }

  const legacyBootstrap =
    clean(
      process.env
        .DEVICE_TOKEN,
    ) ||
    clean(
      config.deviceToken,
    );

  if (
    isPerDeviceToken(
      legacyBootstrap,
    )
  ) {
    return {
      key: "",
      source:
        "none",
    };
  }

  return {
    key:
      legacyBootstrap,
    source:
      legacyBootstrap
        ? "environment"
        : "none",
  };
}

async function protectedBootstrapEnrollmentKey():
  Promise<EnrollmentBootstrapCredential> {
  const bootstrapCredential =
    await loadBootstrapEnrollmentCredential();

  if (!bootstrapCredential) {
    return {
      key: "",
      source:
        "none",
    };
  }

  return {
    key:
      bootstrapCredential
        .enrollmentKey,
    source:
      "protected-bootstrap-file",
  };
}

async function waitForOtherProcessCredential():
  Promise<StoredDeviceCredential | null> {
  for (
    let attempt = 0;
    attempt <
      WAIT_ATTEMPTS;
    attempt += 1
  ) {
    const stored =
      await loadStoredDeviceCredential();

    if (stored) {
      return stored;
    }

    await sleep(
      WAIT_INTERVAL_MS,
    );
  }

  return null;
}

function validateEnrollmentResponse(
  response:
    EnrollmentResponse,
): StoredDeviceCredential {
  const deviceId =
    clean(
      response
        .data
        ?.device
        ?.deviceId,
    );

  const deviceToken =
    clean(
      response
        .data
        ?.credential
        ?.deviceToken,
    );

  if (
    !deviceId ||
    !isPerDeviceToken(
      deviceToken,
    )
  ) {
    throw new Error(
      "Enrollment response did not contain a valid device credential",
    );
  }

  return {
    deviceId,
    deviceToken,
  };
}

async function enrollAndPersistDeviceCredential(
  bootstrap:
    EnrollmentBootstrapCredential,
): Promise<StoredDeviceCredential> {
  if (!bootstrap.key) {
    throw new DeviceEnrollmentRequiredError(
      "DEVICE_ENROLLMENT_REQUIRED: device enrollment credential is not available",
    );
  }

  const inventory =
    await getInventory();

  let response;

  try {
    response =
      await axios.post<EnrollmentResponse>(
        config.backendUrl +
          "/api/v1/devices/enroll",
        {
          ...inventory,

          username:
            os.userInfo()
              .username,

          appVersion:
            AGENT_VERSION,
        },
        {
          headers: {
            "Content-Type":
              "application/json",

            "x-device-enrollment-key":
              bootstrap.key,
          },

          timeout:
            30_000,
        },
      );
  } catch (error) {
    if (
      axios.isAxiosError(
        error,
      ) &&
      error.response
        ?.status ===
        409
    ) {
      const credential =
        await waitForOtherProcessCredential();

      if (credential) {
        return credential;
      }

      throw new Error(
        "Device is already enrolled but no local credential exists. Credential recovery or rotation is required.",
      );
    }

    throw error;
  }

  const credential =
    validateEnrollmentResponse(
      response.data,
    );

  await persistDeviceCredential(
    credential,
  );

  if (
    bootstrap.source ===
    "protected-bootstrap-file"
  ) {
    await discardBootstrapCredentialIfPresent();
  }

  console.log(
    "[Device Auth] Unique per-device credential enrolled and stored.",
  );

  return credential;
}

export async function ensurePerDeviceCredential():
  Promise<StoredDeviceCredential> {
  const existing =
    await loadStoredDeviceCredential();

  if (existing) {
    return existing;
  }

  const lock =
    await tryAcquireEnrollmentLock();

  if (!lock) {
    const credential =
      await waitForOtherProcessCredential();

    if (credential) {
      return credential;
    }

    throw new Error(
      "Another process is enrolling this device but no credential became available",
    );
  }

  try {
    const afterLock =
      await loadStoredDeviceCredential();

    if (afterLock) {
      return afterLock;
    }

    const bootstrap =
      await enrollmentKey();

    const credential =
      await enrollAndPersistDeviceCredential(
        bootstrap,
      );

    return credential;
  } finally {
    await lock.release();
  }
}

export async function prepareDeviceIdentity():
  Promise<string> {
  let credential =
    await ensurePerDeviceCredential();

  try {
    return await registerDeviceIdentity(
      credential,
    );
  } catch (error) {
    if (
      !isInvalidDeviceAuthenticationError(
        error,
      )
    ) {
      throw error;
    }
  }

  credential =
    await recoverFromInvalidDeviceAuthentication();

  return registerDeviceIdentity(
    credential,
  );
}

async function registerDeviceIdentity(
  credential:
    StoredDeviceCredential,
): Promise<string> {
  const inventory =
    await getInventory();

  const response =
    await axios.post<RegistrationResponse>(
      config.backendUrl +
        "/api/v1/devices/register",
      {
        ...inventory,

        /*
         * Once enrolled, registration
         * refresh is explicitly bound to
         * the authenticated deviceId.
         */
        deviceId:
          credential.deviceId,

        username:
          os.userInfo()
            .username,

        appVersion:
          AGENT_VERSION,
      },
      {
        headers: {
          "Content-Type":
            "application/json",

          ...(
            await getDeviceAuthHeaders(
              credential.deviceId,
            )
          ),
        },

        timeout:
          30_000,
      },
    );

  const returnedDeviceId =
    clean(
      response.data
        ?.data
        ?.deviceId,
    );

  if (
    returnedDeviceId !==
    credential.deviceId
  ) {
    throw new Error(
      "Backend registration returned an unexpected device identity",
    );
  }

  console.log(
    "[Device Auth] Device identity ready: " +
      credential.deviceId,
  );

  return credential.deviceId;
}

async function recoverFromInvalidDeviceAuthentication():
  Promise<StoredDeviceCredential> {
  console.warn(
    "[Device Auth] Stored device credential was rejected by the backend; protected bootstrap re-enrollment is required.",
  );

  const bootstrap =
    await protectedBootstrapEnrollmentKey();

  if (!bootstrap.key) {
    throw new DeviceEnrollmentRequiredError(
      "DEVICE_ENROLLMENT_REQUIRED: stored device credential was rejected and no protected bootstrap enrollment artifact is available",
    );
  }

  console.warn(
    "[Device Auth] Protected bootstrap enrollment artifact found; re-enrolling this device.",
  );

  return enrollAndPersistDeviceCredential(
    bootstrap,
  );
}
