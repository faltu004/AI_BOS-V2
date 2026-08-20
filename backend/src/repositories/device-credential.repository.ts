import {
  DeviceCredentialModel,
} from "../models/device-credential.model.js";

export type SaveActiveDeviceCredentialInput = {
  deviceId: string;
  tokenHash: string;
  credentialVersion: number;
  issuedAt: Date;
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

