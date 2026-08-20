import axios from "axios";

import {
  createHash,
} from "node:crypto";

import {
  config,
} from "./config.js";

import {
  getDeviceAuthHeaders,
} from "./device-auth.js";

import {
  isPerDeviceToken,
  loadPendingDeviceCredentialRotation,
  persistDeviceCredential,
  persistPendingDeviceCredentialRotation,
  removePendingDeviceCredentialRotation,
  type PendingDeviceCredentialRotation,
} from "./device-credential-store.js";

type RotationState = {
  deviceId: string;

  status:
    | "active"
    | "revoked";

  credentialVersion: number;

  rotationRequested: boolean;

  rotationRequestedAt?:
    string |
    null;

  pendingPrepared: boolean;

  pendingCredentialVersion?:
    number |
    null;

  pendingExpiresAt?:
    string |
    null;
};

type RotationStateResponse = {
  success?: boolean;

  data?: RotationState;
};

type PrepareRotationResponse = {
  success?: boolean;

  data?: {
    deviceId?: string;

    deviceToken?: string;

    credentialVersion?: number;

    issuedAt?: string;

    expiresAt?: string;
  };
};

type StartDeviceCredentialRotationWatcherOptions = {
  deviceId: string;
};

const ROTATION_POLL_INTERVAL_MS =
  30_000;

function clean(
  value: unknown,
): string {
  return typeof value === "string"
    ? value.trim()
    : "";
}

function createTokenProof(
  deviceToken: string,
): string {
  return createHash(
    "sha256",
  )
    .update(
      deviceToken,
      "utf8",
    )
    .digest(
      "hex",
    );
}

function explicitDeviceHeaders(
  deviceId: string,
  deviceToken: string,
) {
  return {
    "x-device-id":
      deviceId,

    "x-device-token":
      deviceToken,
  };
}

function isUnauthorized(
  error: unknown,
): boolean {
  return (
    axios.isAxiosError(
      error,
    ) &&
    error.response
      ?.status ===
      401
  );
}

function validateState(
  response:
    RotationStateResponse,
  expectedDeviceId: string,
): RotationState {
  const state =
    response.data;

  if (
    !state ||
    clean(
      state.deviceId,
    ) !==
      expectedDeviceId ||
    typeof state
      .credentialVersion !==
      "number"
  ) {
    throw new Error(
      "Invalid credential rotation state response",
    );
  }

  return state;
}

async function getRotationStateWithHeaders(
  deviceId: string,
  headers:
    Record<
      string,
      string
    >,
): Promise<RotationState> {
  const response =
    await axios.get<RotationStateResponse>(
      config.backendUrl +
        "/api/v1/devices/credential/rotation",
      {
        headers,

        params: {
          deviceId,
        },

        timeout:
          15_000,
      },
    );

  return validateState(
    response.data,
    deviceId,
  );
}

async function getRotationStateWithCurrentCredential(
  deviceId: string,
): Promise<RotationState> {
  return getRotationStateWithHeaders(
    deviceId,
    await getDeviceAuthHeaders(
      deviceId,
    ),
  );
}

async function confirmPendingCredential(
  pending:
    PendingDeviceCredentialRotation,
): Promise<void> {
  const currentHeaders =
    await getDeviceAuthHeaders(
      pending.deviceId,
    );

  await axios.post(
    config.backendUrl +
      "/api/v1/devices/credential/rotation/confirm",
    {
      deviceId:
        pending.deviceId,

      pendingTokenProof:
        createTokenProof(
          pending.deviceToken,
        ),
    },
    {
      headers: {
        "Content-Type":
          "application/json",

        ...currentHeaders,
      },

      timeout:
        15_000,
    },
  );

  /*
   * Server has promoted the pending
   * credential. Promote local storage only
   * after confirmation response arrives.
   *
   * If the response is lost after server
   * promotion, this code is not reached and
   * the pending sidecar remains for recovery.
   */
  await persistDeviceCredential({
    deviceId:
      pending.deviceId,

    deviceToken:
      pending.deviceToken,
  });

  await removePendingDeviceCredentialRotation();

  console.log(
    "[Device Auth] Credential rotation completed.",
  );
}

async function recoverPendingCredential(
  deviceId: string,
): Promise<boolean> {
  const pending =
    await loadPendingDeviceCredentialRotation();

  if (!pending) {
    return false;
  }

  if (
    pending.deviceId !==
    deviceId
  ) {
    throw new Error(
      "Pending credential rotation belongs to another device",
    );
  }

  /*
   * First try the pending token itself.
   *
   * If this succeeds, the backend already
   * promoted it and the previous CONFIRM
   * response was likely lost.
   */
  try {
    await getRotationStateWithHeaders(
      deviceId,
      explicitDeviceHeaders(
        deviceId,
        pending.deviceToken,
      ),
    );

    await persistDeviceCredential({
      deviceId,
      deviceToken:
        pending.deviceToken,
    });

    await removePendingDeviceCredentialRotation();

    console.log(
      "[Device Auth] Recovered previously confirmed rotated credential.",
    );

    return true;
  } catch (error) {
    if (
      !isUnauthorized(
        error,
      )
    ) {
      throw error;
    }
  }

  /*
   * Pending token is not active.
   * Check whether the old/current token
   * still works and inspect server state.
   */
  const state =
    await getRotationStateWithCurrentCredential(
      deviceId,
    );

  if (
    !state.rotationRequested
  ) {
    await removePendingDeviceCredentialRotation();

    console.log(
      "[Device Auth] Removed stale pending rotation state.",
    );

    return false;
  }

  if (
    !state.pendingPrepared ||
    state.pendingCredentialVersion !==
      pending.credentialVersion
  ) {
    await removePendingDeviceCredentialRotation();

    console.log(
      "[Device Auth] Pending rotation changed on server; local stale state removed.",
    );

    return false;
  }

  if (
    state.pendingExpiresAt &&
    Date.parse(
      state.pendingExpiresAt,
    ) <=
      Date.now()
  ) {
    await removePendingDeviceCredentialRotation();

    console.log(
      "[Device Auth] Expired pending credential removed.",
    );

    return false;
  }

  /*
   * Old credential still authenticates and
   * the exact pending version exists.
   * Safely retry confirmation.
   */
  await confirmPendingCredential(
    pending,
  );

  return true;
}

function validatePreparedCredential(
  deviceId: string,
  response:
    PrepareRotationResponse,
): PendingDeviceCredentialRotation {
  const data =
    response.data;

  const returnedDeviceId =
    clean(
      data?.deviceId,
    );

  const deviceToken =
    clean(
      data?.deviceToken,
    );

  const issuedAt =
    clean(
      data?.issuedAt,
    );

  const expiresAt =
    clean(
      data?.expiresAt,
    );

  const credentialVersion =
    data?.credentialVersion;

  if (
    returnedDeviceId !==
      deviceId ||
    !isPerDeviceToken(
      deviceToken,
    ) ||
    typeof credentialVersion !==
      "number" ||
    !Number.isInteger(
      credentialVersion,
    ) ||
    credentialVersion < 1 ||
    !issuedAt ||
    Number.isNaN(
      Date.parse(
        issuedAt,
      ),
    ) ||
    !expiresAt ||
    Number.isNaN(
      Date.parse(
        expiresAt,
      ),
    )
  ) {
    throw new Error(
      "Invalid prepared credential rotation response",
    );
  }

  return {
    deviceId,
    deviceToken,
    credentialVersion,
    issuedAt,
    expiresAt,
  };
}

async function processRotation(
  deviceId: string,
): Promise<void> {
  /*
   * Crash/network recovery always runs
   * before starting a fresh PREPARE.
   */
  const recovered =
    await recoverPendingCredential(
      deviceId,
    );

  if (recovered) {
    return;
  }

  const state =
    await getRotationStateWithCurrentCredential(
      deviceId,
    );

  if (
    state.status !==
      "active" ||
    !state.rotationRequested
  ) {
    return;
  }

  /*
   * It is safe to call PREPARE even if
   * the server has an unfinished pending
   * token but the raw token was never
   * persisted locally.
   *
   * Backend PREPARE replaces only the
   * pending token, never the active token.
   */
  const currentHeaders =
    await getDeviceAuthHeaders(
      deviceId,
    );

  const preparedResponse =
    await axios.post<PrepareRotationResponse>(
      config.backendUrl +
        "/api/v1/devices/credential/rotation/prepare",
      {
        deviceId,
      },
      {
        headers: {
          "Content-Type":
            "application/json",

          ...currentHeaders,
        },

        timeout:
          15_000,
      },
    );

  const pending =
    validatePreparedCredential(
      deviceId,
      preparedResponse.data,
    );

  /*
   * Persist BEFORE confirm.
   * This is the crash-recovery boundary.
   */
  await persistPendingDeviceCredentialRotation(
    pending,
  );

  console.log(
    "[Device Auth] Pending credential rotation securely staged.",
  );

  await confirmPendingCredential(
    pending,
  );
}

export function startDeviceCredentialRotationWatcher({
  deviceId,
}: StartDeviceCredentialRotationWatcherOptions):
  () => Promise<void> {
  let stopped =
    false;

  let currentRequest:
    Promise<void> |
    null =
      null;

  function trigger():
    void {
    if (
      stopped ||
      currentRequest
    ) {
      return;
    }

    currentRequest =
      processRotation(
        deviceId,
      )
        .catch(
          (
            error:
              unknown,
          ) => {
            if (
              axios.isAxiosError(
                error,
              )
            ) {
              console.error(
                "[Device Auth] Rotation check failed:",
                error.response
                  ?.data ??
                  error.message,
              );

              return;
            }

            console.error(
              "[Device Auth] Rotation check failed:",
              error instanceof
                Error
                ? error.message
                : "Unknown error",
            );
          },
        )
        .finally(
          () => {
            currentRequest =
              null;
          },
        );
  }

  /*
   * Check immediately at service startup,
   * then periodically.
   */
  trigger();

  const timer =
    setInterval(
      trigger,
      ROTATION_POLL_INTERVAL_MS,
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
