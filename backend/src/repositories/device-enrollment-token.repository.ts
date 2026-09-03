import {
  DeviceEnrollmentTokenModel,
} from "../models/device-enrollment-token.model.js";

export type CreateDeviceEnrollmentTokenInput = {
  tokenHash: string;
  createdBy: string;
  organizationId?: string;
  deviceBinding?: string;
  createdAt: Date;
  expiresAt: Date;
};

export class DeviceEnrollmentTokenRepository {
  async create(
    input:
      CreateDeviceEnrollmentTokenInput,
  ) {
    const created =
      await DeviceEnrollmentTokenModel
        .create({
          tokenHash:
            input.tokenHash,

          createdBy:
            input.createdBy,

          organizationId:
            input.organizationId,

          deviceBinding:
            input.deviceBinding,

          createdAt:
            input.createdAt,

          expiresAt:
            input.expiresAt,

          consumedAt:
            null,
        });

    return {
      id:
        created.id,

      createdBy:
        created.createdBy,

      organizationId:
        created.organizationId,

      deviceBinding:
        created.deviceBinding,

      createdAt:
        created.createdAt,

      expiresAt:
        created.expiresAt,

      consumedAt:
        created.consumedAt,
    };
  }

  async findUsableByHash(
    tokenHash: string,
    now: Date,
  ) {
    return DeviceEnrollmentTokenModel
      .findOne({
        tokenHash,
        consumedAt:
          null,
        expiresAt: {
          $gt:
            now,
        },
      })
      .select(
        [
          "createdBy",
          "organizationId",
          "deviceBinding",
          "createdAt",
          "expiresAt",
          "consumedAt",
        ].join(" "),
      )
      .lean();
  }

  async consumeByHash(
    tokenHash: string,
    consumedAt: Date,
    deviceBinding?: string,
  ) {
    return DeviceEnrollmentTokenModel
      .findOneAndUpdate(
        {
          tokenHash,
          consumedAt:
            null,
          expiresAt: {
            $gt:
              consumedAt,
          },
          ...(deviceBinding
            ? {
                $or: [
                  { deviceBinding },
                  { deviceBinding: { $exists: false } },
                  { deviceBinding: null },
                ],
              }
            : {
                $or: [
                  { deviceBinding: { $exists: false } },
                  { deviceBinding: null },
                ],
              }),
        },
        {
          $set: {
            consumedAt,
          },
        },
        {
          new: true,
          runValidators: true,
        },
      )
      .select(
        [
          "createdBy",
          "organizationId",
          "deviceBinding",
          "createdAt",
          "expiresAt",
          "consumedAt",
        ].join(" "),
      )
      .lean();
  }
}

export const deviceEnrollmentTokenRepository =
  new DeviceEnrollmentTokenRepository();
