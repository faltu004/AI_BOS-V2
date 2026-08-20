import {
  model,
  Schema,
  type HydratedDocument,
} from "mongoose";

export type DeviceEnrollmentToken = {
  tokenHash: string;
  createdBy: string;
  createdAt: Date;
  expiresAt: Date;
  consumedAt?: Date | null;
};

export type DeviceEnrollmentTokenDocument =
  HydratedDocument<DeviceEnrollmentToken>;

const deviceEnrollmentTokenSchema =
  new Schema<DeviceEnrollmentToken>(
    {
      tokenHash: {
        type: String,
        required: true,
        unique: true,
        index: true,
        minlength: 64,
        maxlength: 64,
        select: false,
      },

      createdBy: {
        type: String,
        required: true,
        trim: true,
        maxlength: 100,
      },

      createdAt: {
        type: Date,
        required: true,
        default: Date.now,
      },

      expiresAt: {
        type: Date,
        required: true,
        index: true,
      },

      consumedAt: {
        type: Date,
        default: null,
        index: true,
      },
    },
    {
      timestamps: true,
      versionKey: false,
    },
  );

deviceEnrollmentTokenSchema.index({
  consumedAt: 1,
  expiresAt: 1,
});

export const DeviceEnrollmentTokenModel =
  model(
    "DeviceEnrollmentToken",
    deviceEnrollmentTokenSchema,
  );
