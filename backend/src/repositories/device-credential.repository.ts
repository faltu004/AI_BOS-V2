import {
  DeviceCredentialModel,
} from "../models/device-credential.model.js";

export type SaveActiveDeviceCredentialInput = {
  deviceId: string;
  tokenHash: string;
  credentialVersion: number;
  issuedAt: Date;
  organizationId?: string | null;
  deviceBinding?: string | null;
};

export type RequestCredentialRotationInput = {
  deviceId: string;
  requestedAt: Date;
  requestedBy: string;
  reason?: string | null;
};

export type SavePendingCredentialRotationInput = {
  deviceId: string;
  pendingTokenHash: string;
  pendingCredentialVersion: number;
  pendingIssuedAt: Date;
  pendingExpiresAt: Date;
};

export type SaveCredentialRecoveryAuthorizationInput = {
  deviceId: string;
  placeholderTokenHash: string;
  authorizationHash: string;
  deviceBinding: string;
  organizationId: string;
  requestedBy: string;
  issuedAt: Date;
  expiresAt: Date;
};

export class DeviceCredentialRepository {
  async findMetadata(
    deviceId: string,
  ) {
    return DeviceCredentialModel
      .findOne({
        deviceId,
      })
      .select(
        [
          "deviceId",
          "organizationId",
          "deviceBinding",
          "status",
          "credentialVersion",
          "issuedAt",
          "rotatedAt",
          "revokedAt",
          "lastUsedAt",
          "rotationRequestedAt",
          "rotationRequestedBy",
          "rotationReason",
          "pendingCredentialVersion",
          "pendingIssuedAt",
          "pendingExpiresAt",
          "recoveryDeviceBinding",
          "recoveryOrganizationId",
          "recoveryRequestedBy",
          "recoveryIssuedAt",
          "recoveryExpiresAt",
        ].join(" "),
      )
      .lean();
  }

  async findForVerification(
    deviceId: string,
  ) {
    return DeviceCredentialModel
      .findOne({
        deviceId,
      })
      .select(
        [
          "+tokenHash",
          "deviceId",
          "status",
          "credentialVersion",
        ].join(" "),
      )
      .lean();
  }

  async findForRotation(
    deviceId: string,
  ) {
    return DeviceCredentialModel
      .findOne({
        deviceId,
      })
      .select(
        [
          "+tokenHash",
          "+pendingTokenHash",
          "deviceId",
          "status",
          "credentialVersion",
          "issuedAt",
          "rotationRequestedAt",
          "rotationRequestedBy",
          "rotationReason",
          "pendingCredentialVersion",
          "pendingIssuedAt",
          "pendingExpiresAt",
        ].join(" "),
      )
      .lean();
  }

  async createInitial(
    input:
      SaveActiveDeviceCredentialInput,
  ) {
    const created =
      await DeviceCredentialModel
        .create({
          deviceId:
            input.deviceId,

          organizationId:
            input.organizationId ??
            null,

          deviceBinding:
            input.deviceBinding ??
            null,

          tokenHash:
            input.tokenHash,

          status:
            "active",

          credentialVersion:
            input.credentialVersion,

          issuedAt:
            input.issuedAt,

          rotatedAt: null,
          revokedAt: null,
          lastUsedAt: null,

          rotationRequestedAt:
            null,

          rotationRequestedBy:
            null,

          rotationReason:
            null,

          pendingTokenHash:
            null,

          pendingCredentialVersion:
            null,

          pendingIssuedAt:
            null,

          pendingExpiresAt:
            null,

          recoveryAuthorizationHash:
            null,

          recoveryDeviceBinding:
            null,

          recoveryOrganizationId:
            null,

          recoveryRequestedBy:
            null,

          recoveryIssuedAt:
            null,

          recoveryExpiresAt:
            null,
        });

    return {
      deviceId:
        created.deviceId,

      status:
        created.status,

      credentialVersion:
        created.credentialVersion,

      issuedAt:
        created.issuedAt,
    };
  }

  async saveActive(
    input:
      SaveActiveDeviceCredentialInput,
  ) {
    const rotatedAt =
      input.credentialVersion > 1
        ? input.issuedAt
        : null;

    return DeviceCredentialModel
      .findOneAndUpdate(
        {
          deviceId:
            input.deviceId,
        },
        {
          $set: {
            tokenHash:
              input.tokenHash,

            status:
              "active",

            credentialVersion:
              input.credentialVersion,

            issuedAt:
              input.issuedAt,

            rotatedAt,

            revokedAt: null,

            lastUsedAt: null,

            rotationRequestedAt:
              null,

            rotationRequestedBy:
              null,

            rotationReason:
              null,

            pendingTokenHash:
              null,

            pendingCredentialVersion:
              null,

            pendingIssuedAt:
              null,

            pendingExpiresAt:
              null,

            recoveryAuthorizationHash:
              null,

            recoveryDeviceBinding:
              null,

            recoveryOrganizationId:
              null,

            recoveryRequestedBy:
              null,

            recoveryIssuedAt:
              null,

            recoveryExpiresAt:
              null,
          },
        },
        {
          new: true,
          upsert: true,
          runValidators: true,
          setDefaultsOnInsert: true,
        },
      )
      .select("-tokenHash -pendingTokenHash")
      .lean();
  }

  async touchLastUsed(
    deviceId: string,
    usedAt: Date,
  ) {
    /*
     * Authentication can happen often.
     * Keep lastUsedAt useful without a
     * database write on every request.
     */
    const writeBefore =
      new Date(
        usedAt.getTime() -
          5 * 60 * 1000,
      );

    await DeviceCredentialModel
      .updateOne(
        {
          deviceId,
          status: "active",

          $or: [
            {
              lastUsedAt:
                null,
            },
            {
              lastUsedAt: {
                $lt:
                  writeBefore,
              },
            },
          ],
        },
        {
          $set: {
            lastUsedAt:
              usedAt,
          },
        },
      );
  }

  async saveRecoveryAuthorization(
    input:
      SaveCredentialRecoveryAuthorizationInput,
  ) {
    try {
      return await DeviceCredentialModel
        .findOneAndUpdate(
          {
            deviceId:
              input.deviceId,
            status: "active",
            $and: [
              {
                $or: [
                  { organizationId: input.organizationId },
                  { organizationId: null },
                  { organizationId: { $exists: false } },
                ],
              },
              {
                $or: [
                  { deviceBinding: input.deviceBinding },
                  { deviceBinding: null },
                  { deviceBinding: { $exists: false } },
                ],
              },
            ],
          },
          {
            $setOnInsert: {
              deviceId:
                input.deviceId,
              tokenHash:
                input.placeholderTokenHash,
              status: "active",
              credentialVersion: 1,
              issuedAt:
                input.issuedAt,
              rotatedAt: null,
              revokedAt: null,
              lastUsedAt: null,
              rotationRequestedAt: null,
              rotationRequestedBy: null,
              rotationReason: null,
              pendingTokenHash: null,
              pendingCredentialVersion: null,
              pendingIssuedAt: null,
              pendingExpiresAt: null,
            },
            $set: {
              organizationId:
                input.organizationId,
              deviceBinding:
                input.deviceBinding,
              recoveryAuthorizationHash:
                input.authorizationHash,
              recoveryDeviceBinding:
                input.deviceBinding,
              recoveryOrganizationId:
                input.organizationId,
              recoveryRequestedBy:
                input.requestedBy,
              recoveryIssuedAt:
                input.issuedAt,
              recoveryExpiresAt:
                input.expiresAt,
            },
          },
          {
            new: true,
            upsert: true,
            runValidators: true,
            setDefaultsOnInsert: true,
          },
        )
        .select("-tokenHash -pendingTokenHash -recoveryAuthorizationHash")
        .lean();
    } catch (error) {
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === 11000
      ) {
        return null;
      }

      throw error;
    }
  }

  async findForRecovery(
    deviceId: string,
  ) {
    return DeviceCredentialModel
      .findOne({
        deviceId,
      })
      .select(
        [
          "+recoveryAuthorizationHash",
          "deviceId",
          "organizationId",
          "deviceBinding",
          "status",
          "credentialVersion",
          "recoveryDeviceBinding",
          "recoveryOrganizationId",
          "recoveryRequestedBy",
          "recoveryIssuedAt",
          "recoveryExpiresAt",
        ].join(" "),
      )
      .lean();
  }

  async promoteRecovery(
    input: {
      deviceId: string;
      authorizationHash: string;
      previousCredentialVersion: number;
      tokenHash: string;
      credentialVersion: number;
      issuedAt: Date;
      recoveredAt: Date;
      deviceBinding: string;
      organizationId: string;
    },
  ) {
    return DeviceCredentialModel
      .findOneAndUpdate(
        {
          deviceId:
            input.deviceId,
          status: "active",
          credentialVersion:
            input.previousCredentialVersion,
          recoveryAuthorizationHash:
            input.authorizationHash,
          recoveryDeviceBinding:
            input.deviceBinding,
          recoveryOrganizationId:
            input.organizationId,
          recoveryExpiresAt: {
            $gt:
              input.recoveredAt,
          },
        },
        {
          $set: {
            tokenHash:
              input.tokenHash,
            organizationId:
              input.organizationId,
            deviceBinding:
              input.deviceBinding,
            credentialVersion:
              input.credentialVersion,
            issuedAt:
              input.issuedAt,
            rotatedAt:
              input.recoveredAt,
            revokedAt: null,
            lastUsedAt: null,
            rotationRequestedAt: null,
            rotationRequestedBy: null,
            rotationReason: null,
            pendingTokenHash: null,
            pendingCredentialVersion: null,
            pendingIssuedAt: null,
            pendingExpiresAt: null,
            recoveryAuthorizationHash: null,
            recoveryDeviceBinding: null,
            recoveryOrganizationId: null,
            recoveryRequestedBy: null,
            recoveryIssuedAt: null,
            recoveryExpiresAt: null,
          },
        },
        {
          new: true,
          runValidators: true,
        },
      )
      .select("-tokenHash -pendingTokenHash -recoveryAuthorizationHash")
      .lean();
  }
  async requestRotation(
    input:
      RequestCredentialRotationInput,
  ) {
    return DeviceCredentialModel
      .findOneAndUpdate(
        {
          deviceId:
            input.deviceId,

          status:
            "active",
        },
        {
          $set: {
            rotationRequestedAt:
              input.requestedAt,

            rotationRequestedBy:
              input.requestedBy,

            rotationReason:
              input.reason ??
              null,

            /*
             * A fresh admin request
             * invalidates any unfinished
             * previous pending rotation.
             *
             * Active credential remains
             * untouched.
             */
            pendingTokenHash:
              null,

            pendingCredentialVersion:
              null,

            pendingIssuedAt:
              null,

            pendingExpiresAt:
              null,
          },
        },
        {
          new: true,
          runValidators: true,
        },
      )
      .select("-tokenHash -pendingTokenHash")
      .lean();
  }

  async savePendingRotation(
    input:
      SavePendingCredentialRotationInput,
  ) {
    return DeviceCredentialModel
      .findOneAndUpdate(
        {
          deviceId:
            input.deviceId,

          status:
            "active",

          rotationRequestedAt: {
            $ne: null,
          },
        },
        {
          $set: {
            pendingTokenHash:
              input.pendingTokenHash,

            pendingCredentialVersion:
              input.pendingCredentialVersion,

            pendingIssuedAt:
              input.pendingIssuedAt,

            pendingExpiresAt:
              input.pendingExpiresAt,
          },
        },
        {
          new: true,
          runValidators: true,
        },
      )
      .select("-tokenHash -pendingTokenHash")
      .lean();
  }

  async promotePendingRotation(
    input: {
      deviceId: string;
      pendingTokenHash: string;
      credentialVersion: number;
      issuedAt: Date;
      confirmedAt: Date;
    },
  ) {
    return DeviceCredentialModel
      .findOneAndUpdate(
        {
          deviceId:
            input.deviceId,

          status:
            "active",

          pendingTokenHash:
            input.pendingTokenHash,

          pendingExpiresAt: {
            $gt:
              input.confirmedAt,
          },
        },
        {
          $set: {
            tokenHash:
              input.pendingTokenHash,

            credentialVersion:
              input.credentialVersion,

            issuedAt:
              input.issuedAt,

            rotatedAt:
              input.confirmedAt,

            rotationRequestedAt:
              null,

            rotationRequestedBy:
              null,

            rotationReason:
              null,

            pendingTokenHash:
              null,

            pendingCredentialVersion:
              null,

            pendingIssuedAt:
              null,

            pendingExpiresAt:
              null,
          },
        },
        {
          new: true,
          runValidators: true,
        },
      )
      .select("-tokenHash -pendingTokenHash")
      .lean();
  }

  async revoke(
    deviceId: string,
    revokedAt: Date,
  ) {
    return DeviceCredentialModel
      .findOneAndUpdate(
        {
          deviceId,
          status: "active",
        },
        {
          $set: {
            status:
              "revoked",

            revokedAt,

            rotationRequestedAt:
              null,

            rotationRequestedBy:
              null,

            rotationReason:
              null,

            pendingTokenHash:
              null,

            pendingCredentialVersion:
              null,

            pendingIssuedAt:
              null,

            pendingExpiresAt:
              null,
          },
        },
        {
          new: true,
          runValidators: true,
        },
      )
      .select("-tokenHash -pendingTokenHash")
      .lean();
  }
}

export const deviceCredentialRepository =
  new DeviceCredentialRepository();

