import {
  createHash,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

import {
  deviceCredentialRepository,
} from "../repositories/device-credential.repository.js";

import {
  AppError,
} from "../utils/app-error.js";

const DEVICE_TOKEN_PREFIX =
  "aibos_device_";

const RECOVERY_AUTHORIZATION_PREFIX =
  "aibos_recover_ot_";

const PENDING_ROTATION_TTL_MS =
  10 * 60 * 1000;

const RECOVERY_AUTHORIZATION_TTL_MS =
  5 * 60 * 1000;

function normalizeDeviceId(
  deviceId: string,
): string {
  const normalized =
    deviceId.trim();

  if (!normalized) {
    throw new Error(
      "Device ID is required",
    );
  }

  if (normalized.length > 100) {
    throw new Error(
      "Device ID is invalid",
    );
  }

  return normalized;
}

function createDeviceToken():
  string {
  return (
    DEVICE_TOKEN_PREFIX +
    randomBytes(32)
      .toString("base64url")
  );
}

function createRecoveryAuthorization():
  string {
  return (
    RECOVERY_AUTHORIZATION_PREFIX +
    randomBytes(32)
      .toString("base64url")
  );
}

function hashDeviceToken(
  deviceToken: string,
): string {
  return createHash("sha256")
    .update(
      deviceToken,
      "utf8",
    )
    .digest("hex");
}

function normalizeDeviceBinding(
  value: string,
): string {
  const normalized =
    value.trim().toLowerCase();

  if (!/^[a-f0-9]{64}$/.test(normalized)) {
    throw new AppError(
      "Device binding is invalid",
      400,
    );
  }

  return normalized;
}

function deriveDeviceIdentity(
  fingerprint: string,
) {
  const normalizedFingerprint =
    fingerprint.trim();

  if (!normalizedFingerprint) {
    throw new AppError(
      "Device fingerprint is required",
      400,
    );
  }

  const deviceIdHash =
    createHash("sha256")
      .update(normalizedFingerprint)
      .digest("hex")
      .slice(0, 12)
      .toUpperCase();

  const deviceBinding =
    createHash("sha256")
      .update(
        `ai-bos-device-binding-v1:${normalizedFingerprint}`,
        "utf8",
      )
      .digest("hex");

  return {
    deviceId:
      `DEV-${deviceIdHash}`,
    deviceBinding,
  };
}

function hashesMatch(
  expectedHash: string,
  receivedHash: string,
): boolean {
  if (
    expectedHash.length !== 64 ||
    receivedHash.length !== 64
  ) {
    return false;
  }

  const expected =
    Buffer.from(
      expectedHash,
      "hex",
    );

  const received =
    Buffer.from(
      receivedHash,
      "hex",
    );

  if (
    expected.length !==
    received.length
  ) {
    return false;
  }

  return timingSafeEqual(
    expected,
    received,
  );
}

function normalizeHashProof(
  value: string,
): string {
  const normalized =
    value
      .trim()
      .toLowerCase();

  if (
    !/^[a-f0-9]{64}$/.test(
      normalized,
    )
  ) {
    throw new AppError(
      "Invalid credential rotation confirmation",
      400,
    );
  }

  return normalized;
}

function isDuplicateKeyError(
  error: unknown,
): boolean {
  if (
    typeof error !== "object" ||
    error === null ||
    !("code" in error)
  ) {
    return false;
  }

  return (
    (error as {
      code?: unknown;
    }).code === 11000
  );
}

export type IssuedDeviceCredential = {
  deviceId: string;

  deviceToken: string;

  credentialVersion: number;

  issuedAt: Date;
};

export type DeviceCredentialStatusView = {
  deviceId: string;

  status:
    | "active"
    | "revoked";

  credentialVersion: number;

  issuedAt: Date;

  rotatedAt?: Date | null;

  revokedAt?: Date | null;

  lastUsedAt?: Date | null;

  rotationRequestedAt?:
    Date |
    null;

  rotationRequestedBy?:
    string |
    null;

  rotationReason?:
    string |
    null;

  pendingCredentialVersion?:
    number |
    null;

  pendingIssuedAt?:
    Date |
    null;

  pendingExpiresAt?:
    Date |
    null;
};

export type IssuedDeviceRecoveryAuthorization = {
  deviceId: string;
  recoveryAuthorization: string;
  expiresAt: Date;
};

export class DeviceCredentialService {
  async issueInitialForDevice(
    deviceId: string,
    context?: {
      organizationId?: string;
      deviceBinding?: string;
    },
  ): Promise<IssuedDeviceCredential | null> {
    const normalizedDeviceId =
      normalizeDeviceId(
        deviceId,
      );

    const existing =
      await deviceCredentialRepository
        .findMetadata(
          normalizedDeviceId,
        );

    if (existing) {
      return null;
    }

    const deviceToken =
      createDeviceToken();

    const tokenHash =
      hashDeviceToken(
        deviceToken,
      );

    const issuedAt =
      new Date();

    try {
      await deviceCredentialRepository
        .createInitial({
          deviceId:
            normalizedDeviceId,

          tokenHash,

          credentialVersion: 1,

          issuedAt,

          organizationId:
            context?.organizationId
              ?.trim() ||
            null,

          deviceBinding:
            context?.deviceBinding
              ? normalizeDeviceBinding(
                  context.deviceBinding,
                )
              : null,
        });
    } catch (error) {
      if (
        isDuplicateKeyError(
          error,
        )
      ) {
        return null;
      }

      throw error;
    }

    return {
      deviceId:
        normalizedDeviceId,

      deviceToken,

      credentialVersion: 1,

      issuedAt,
    };
  }

  async issueForDevice(
    deviceId: string,
  ): Promise<IssuedDeviceCredential> {
    const normalizedDeviceId =
      normalizeDeviceId(
        deviceId,
      );

    const existing =
      await deviceCredentialRepository
        .findMetadata(
          normalizedDeviceId,
        );

    const credentialVersion =
      (
        existing
          ?.credentialVersion ??
        0
      ) + 1;

    const deviceToken =
      createDeviceToken();

    const tokenHash =
      hashDeviceToken(
        deviceToken,
      );

    const issuedAt =
      new Date();

    await deviceCredentialRepository
      .saveActive({
        deviceId:
          normalizedDeviceId,

        tokenHash,

        credentialVersion,

        issuedAt,
      });

    return {
      deviceId:
        normalizedDeviceId,

      deviceToken,

      credentialVersion,

      issuedAt,
    };
  }

  async verify(
    deviceId: string,
    deviceToken: string,
  ): Promise<boolean> {
    let normalizedDeviceId:
      string;

    try {
      normalizedDeviceId =
        normalizeDeviceId(
          deviceId,
        );
    } catch {
      return false;
    }

    const normalizedToken =
      deviceToken.trim();

    if (
      !normalizedToken ||
      !normalizedToken.startsWith(
        DEVICE_TOKEN_PREFIX,
      )
    ) {
      return false;
    }

    const credential =
      await deviceCredentialRepository
        .findForVerification(
          normalizedDeviceId,
        );

    if (
      !credential ||
      credential.status !==
        "active" ||
      !credential.tokenHash
    ) {
      return false;
    }

    const receivedHash =
      hashDeviceToken(
        normalizedToken,
      );

    if (
      !hashesMatch(
        credential.tokenHash,
        receivedHash,
      )
    ) {
      return false;
    }

    await deviceCredentialRepository
      .touchLastUsed(
        normalizedDeviceId,
        new Date(),
      );

    return true;
  }

  async requestRecoveryAuthorization(
    input: {
      deviceId: string;
      deviceBinding: string;
      organizationId: string;
      requestedBy: string;
    },
  ): Promise<IssuedDeviceRecoveryAuthorization> {
    const deviceId =
      normalizeDeviceId(input.deviceId);
    const deviceBinding =
      normalizeDeviceBinding(input.deviceBinding);
    const organizationId =
      input.organizationId.trim();
    const requestedBy =
      input.requestedBy.trim();

    if (!organizationId || !requestedBy) {
      throw new AppError(
        "Authenticated organization membership is required",
        403,
      );
    }

    const existing =
      await deviceCredentialRepository
        .findMetadata(deviceId);

    if (
      existing &&
      existing.status !== "active"
    ) {
      throw new AppError(
        "Device credential is unavailable",
        409,
      );
    }

    if (
      existing?.organizationId &&
      existing.organizationId !== organizationId
    ) {
      throw new AppError(
        "Device belongs to another organization",
        403,
      );
    }

    if (
      existing?.deviceBinding &&
      existing.deviceBinding !== deviceBinding
    ) {
      throw new AppError(
        "Device binding mismatch",
        403,
      );
    }

    const recoveryAuthorization =
      createRecoveryAuthorization();
    const issuedAt = new Date();
    const expiresAt = new Date(
      issuedAt.getTime() +
        RECOVERY_AUTHORIZATION_TTL_MS,
    );

    const saved =
      await deviceCredentialRepository
        .saveRecoveryAuthorization({
          deviceId,
          placeholderTokenHash:
            hashDeviceToken(
              createDeviceToken(),
            ),
          authorizationHash:
            hashDeviceToken(
              recoveryAuthorization,
            ),
          deviceBinding,
          organizationId,
          requestedBy,
          issuedAt,
          expiresAt,
        });

    if (!saved) {
      throw new AppError(
        "Device recovery authorization could not be issued",
        409,
      );
    }

    return {
      deviceId,
      recoveryAuthorization,
      expiresAt,
    };
  }

  async recoverWithAuthorization(
    input: {
      deviceId: string;
      deviceBinding: string;
      fingerprint: string;
      recoveryAuthorization: string;
    },
  ) {
    const deviceId =
      normalizeDeviceId(input.deviceId);
    const deviceBinding =
      normalizeDeviceBinding(input.deviceBinding);
    const recoveryAuthorization =
      input.recoveryAuthorization.trim();

    if (
      !recoveryAuthorization.startsWith(
        RECOVERY_AUTHORIZATION_PREFIX,
      )
    ) {
      throw new AppError(
        "Invalid device recovery authorization",
        401,
      );
    }

    const derived =
      deriveDeviceIdentity(input.fingerprint);

    if (
      derived.deviceId !== deviceId ||
      derived.deviceBinding !== deviceBinding
    ) {
      throw new AppError(
        "Device recovery binding mismatch",
        403,
      );
    }

    const credential =
      await deviceCredentialRepository
        .findForRecovery(deviceId);
    const authorizationHash =
      hashDeviceToken(recoveryAuthorization);
    const now = new Date();

    if (
      !credential ||
      credential.status !== "active" ||
      !credential.recoveryAuthorizationHash ||
      !hashesMatch(
        credential.recoveryAuthorizationHash,
        authorizationHash,
      ) ||
      credential.recoveryDeviceBinding !== deviceBinding ||
      !credential.recoveryOrganizationId ||
      !credential.recoveryRequestedBy ||
      !credential.recoveryExpiresAt ||
      credential.recoveryExpiresAt.getTime() <= now.getTime()
    ) {
      throw new AppError(
        "Invalid or expired device recovery authorization",
        401,
      );
    }

    if (
      credential.organizationId &&
      credential.organizationId !==
        credential.recoveryOrganizationId
    ) {
      throw new AppError(
        "Device recovery organization mismatch",
        403,
      );
    }

    if (
      credential.deviceBinding &&
      credential.deviceBinding !== deviceBinding
    ) {
      throw new AppError(
        "Device recovery binding mismatch",
        403,
      );
    }

    const deviceToken =
      createDeviceToken();
    const issuedAt = now;
    const credentialVersion =
      credential.credentialVersion + 1;
    const organizationId =
      credential.recoveryOrganizationId;
    const requestedBy =
      credential.recoveryRequestedBy;

    const promoted =
      await deviceCredentialRepository
        .promoteRecovery({
          deviceId,
          authorizationHash,
          previousCredentialVersion:
            credential.credentialVersion,
          tokenHash:
            hashDeviceToken(deviceToken),
          credentialVersion,
          issuedAt,
          recoveredAt: now,
          deviceBinding,
          organizationId,
        });

    if (!promoted) {
      throw new AppError(
        "Device recovery authorization was already used",
        409,
      );
    }

    return {
      deviceId,
      deviceToken,
      credentialVersion,
      issuedAt,
      organizationId,
      requestedBy,
    };
  }

  async requestRotation(
    deviceId: string,
    requestedBy: string,
    reason?: string,
  ) {
    const normalizedDeviceId =
      normalizeDeviceId(
        deviceId,
      );

    const existing =
      await deviceCredentialRepository
        .findMetadata(
          normalizedDeviceId,
        );

    if (!existing) {
      throw new AppError(
        "Device credential not found",
        404,
      );
    }

    if (
      existing.status !==
      "active"
    ) {
      throw new AppError(
        "Revoked device credentials cannot be rotated",
        409,
      );
    }

    const result =
      await deviceCredentialRepository
        .requestRotation({
          deviceId:
            normalizedDeviceId,

          requestedAt:
            new Date(),

          requestedBy:
            requestedBy.trim(),

          reason:
            reason
              ?.trim()
              .slice(
                0,
                500,
              ) ||
            null,
        });

    if (!result) {
      throw new AppError(
        "Unable to request credential rotation",
        409,
      );
    }

    return result;
  }

  async getRotationState(
    deviceId: string,
  ) {
    const normalizedDeviceId =
      normalizeDeviceId(
        deviceId,
      );

    const credential =
      await deviceCredentialRepository
        .findMetadata(
          normalizedDeviceId,
        );

    if (!credential) {
      throw new AppError(
        "Device credential not found",
        404,
      );
    }

    return {
      deviceId:
        credential.deviceId,

      status:
        credential.status,

      credentialVersion:
        credential
          .credentialVersion,

      rotationRequested:
        Boolean(
          credential
            .rotationRequestedAt,
        ),

      rotationRequestedAt:
        credential
          .rotationRequestedAt ??
        null,

      pendingPrepared:
        Boolean(
          credential
            .pendingCredentialVersion &&
          credential
            .pendingExpiresAt
        ),

      pendingCredentialVersion:
        credential
          .pendingCredentialVersion ??
        null,

      pendingExpiresAt:
        credential
          .pendingExpiresAt ??
        null,
    };
  }

  async prepareRotation(
    deviceId: string,
  ) {
    const normalizedDeviceId =
      normalizeDeviceId(
        deviceId,
      );

    const credential =
      await deviceCredentialRepository
        .findForRotation(
          normalizedDeviceId,
        );

    if (!credential) {
      throw new AppError(
        "Device credential not found",
        404,
      );
    }

    if (
      credential.status !==
      "active"
    ) {
      throw new AppError(
        "Device credential is revoked",
        409,
      );
    }

    if (
      !credential
        .rotationRequestedAt
    ) {
      throw new AppError(
        "Credential rotation has not been requested",
        409,
      );
    }

    /*
     * Every PREPARE may replace an
     * unfinished pending credential.
     *
     * This is deliberate:
     * if the previous HTTP response was
     * lost, the active old credential
     * remains valid and the device can
     * safely retry PREPARE.
     */
    const deviceToken =
      createDeviceToken();

    const pendingTokenHash =
      hashDeviceToken(
        deviceToken,
      );

    const issuedAt =
      new Date();

    const expiresAt =
      new Date(
        issuedAt.getTime() +
          PENDING_ROTATION_TTL_MS,
      );

    const credentialVersion =
      credential
        .credentialVersion +
      1;

    const saved =
      await deviceCredentialRepository
        .savePendingRotation({
          deviceId:
            normalizedDeviceId,

          pendingTokenHash,

          pendingCredentialVersion:
            credentialVersion,

          pendingIssuedAt:
            issuedAt,

          pendingExpiresAt:
            expiresAt,
        });

    if (!saved) {
      throw new AppError(
        "Unable to prepare credential rotation",
        409,
      );
    }

    return {
      deviceId:
        normalizedDeviceId,

      deviceToken,

      credentialVersion,

      issuedAt,

      expiresAt,
    };
  }

  async confirmRotation(
    deviceId: string,
    pendingTokenProof: string,
  ) {
    const normalizedDeviceId =
      normalizeDeviceId(
        deviceId,
      );

    const proof =
      normalizeHashProof(
        pendingTokenProof,
      );

    const credential =
      await deviceCredentialRepository
        .findForRotation(
          normalizedDeviceId,
        );

    if (
      !credential ||
      credential.status !==
        "active"
    ) {
      throw new AppError(
        "Device credential is unavailable",
        409,
      );
    }

    if (
      !credential.pendingTokenHash ||
      !credential
        .pendingCredentialVersion ||
      !credential
        .pendingIssuedAt ||
      !credential
        .pendingExpiresAt
    ) {
      throw new AppError(
        "No credential rotation is pending",
        409,
      );
    }

    const now =
      new Date();

    if (
      credential
        .pendingExpiresAt
        .getTime() <=
      now.getTime()
    ) {
      throw new AppError(
        "Pending credential rotation has expired",
        410,
      );
    }

    if (
      !hashesMatch(
        credential
          .pendingTokenHash,
        proof,
      )
    ) {
      throw new AppError(
        "Invalid credential rotation confirmation",
        409,
      );
    }

    const promoted =
      await deviceCredentialRepository
        .promotePendingRotation({
          deviceId:
            normalizedDeviceId,

          pendingTokenHash:
            credential
              .pendingTokenHash,

          credentialVersion:
            credential
              .pendingCredentialVersion,

          issuedAt:
            credential
              .pendingIssuedAt,

          confirmedAt:
            now,
        });

    if (!promoted) {
      throw new AppError(
        "Credential rotation could not be confirmed",
        409,
      );
    }

    return {
      deviceId:
        promoted.deviceId,

      status:
        promoted.status,

      credentialVersion:
        promoted
          .credentialVersion,

      issuedAt:
        promoted.issuedAt,

      rotatedAt:
        promoted.rotatedAt,
    };
  }

  async revokeForDevice(
    deviceId: string,
  ): Promise<boolean> {
    const normalizedDeviceId =
      normalizeDeviceId(
        deviceId,
      );

    const revoked =
      await deviceCredentialRepository
        .revoke(
          normalizedDeviceId,
          new Date(),
        );

    return Boolean(revoked);
  }

  async getStatus(
    deviceId: string,
  ): Promise<DeviceCredentialStatusView | null> {
    const normalizedDeviceId =
      normalizeDeviceId(
        deviceId,
      );

    const credential =
      await deviceCredentialRepository
        .findMetadata(
          normalizedDeviceId,
        );

    if (!credential) {
      return null;
    }

    return {
      deviceId:
        credential.deviceId,

      status:
        credential.status,

      credentialVersion:
        credential
          .credentialVersion,

      issuedAt:
        credential.issuedAt,

      rotatedAt:
        credential.rotatedAt,

      revokedAt:
        credential.revokedAt,

      lastUsedAt:
        credential.lastUsedAt,

      rotationRequestedAt:
        credential
          .rotationRequestedAt,

      rotationRequestedBy:
        credential
          .rotationRequestedBy,

      rotationReason:
        credential
          .rotationReason,

      pendingCredentialVersion:
        credential
          .pendingCredentialVersion,

      pendingIssuedAt:
        credential
          .pendingIssuedAt,

      pendingExpiresAt:
        credential
          .pendingExpiresAt,
    };
  }
}

export const deviceCredentialService =
  new DeviceCredentialService();
