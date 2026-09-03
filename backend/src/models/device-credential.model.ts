import {
  Schema,
  model,
  type HydratedDocument,
} from "mongoose";

export type DeviceCredentialStatus =
  | "active"
  | "revoked";

export type DeviceCredential = {
  deviceId: string;

  organizationId?: string | null;

  deviceBinding?: string | null;

  tokenHash: string;

  status:
    DeviceCredentialStatus;

  credentialVersion: number;

  issuedAt: Date;

  rotatedAt?: Date | null;

  revokedAt?: Date | null;

  lastUsedAt?: Date | null;

  rotationRequestedAt?: Date | null;

  rotationRequestedBy?: string | null;

  rotationReason?: string | null;

  pendingTokenHash?: string | null;

  pendingCredentialVersion?: number | null;

  pendingIssuedAt?: Date | null;

  pendingExpiresAt?: Date | null;

  recoveryAuthorizationHash?: string | null;

  recoveryDeviceBinding?: string | null;

  recoveryOrganizationId?: string | null;

  recoveryRequestedBy?: string | null;

  recoveryIssuedAt?: Date | null;

  recoveryExpiresAt?: Date | null;
};

export type DeviceCredentialDocument =
  HydratedDocument<DeviceCredential>;

const deviceCredentialSchema =
  new Schema<DeviceCredential>(
    {
      deviceId: {
        type: String,
        required: true,
        unique: true,
        index: true,
        trim: true,
        maxlength: 100,
      },

      organizationId: {
        type: String,
        default: null,
        trim: true,
        maxlength: 100,
        index: true,
      },

      deviceBinding: {
        type: String,
        default: null,
        trim: true,
        lowercase: true,
        minlength: 64,
        maxlength: 64,
        index: true,
      },

      tokenHash: {
        type: String,
        required: true,
        minlength: 64,
        maxlength: 64,
        select: false,
      },

      status: {
        type: String,
        enum: [
          "active",
          "revoked",
        ],
        default: "active",
        required: true,
        index: true,
      },

      credentialVersion: {
        type: Number,
        required: true,
        min: 1,
        default: 1,
      },

      issuedAt: {
        type: Date,
        required: true,
      },

      rotatedAt: {
        type: Date,
        default: null,
      },

      revokedAt: {
        type: Date,
        default: null,
      },

      lastUsedAt: {
        type: Date,
        default: null,
      },

      rotationRequestedAt: {
        type: Date,
        default: null,
      },

      rotationRequestedBy: {
        type: String,
        default: null,
        trim: true,
        maxlength: 200,
      },

      rotationReason: {
        type: String,
        default: null,
        trim: true,
        maxlength: 500,
      },

      pendingTokenHash: {
        type: String,
        default: null,
        minlength: 64,
        maxlength: 64,
        select: false,
      },

      pendingCredentialVersion: {
        type: Number,
        default: null,
        min: 1,
      },

      pendingIssuedAt: {
        type: Date,
        default: null,
      },

      pendingExpiresAt: {
        type: Date,
        default: null,
        index: true,
      },

      recoveryAuthorizationHash: {
        type: String,
        default: null,
        minlength: 64,
        maxlength: 64,
        select: false,
      },

      recoveryDeviceBinding: {
        type: String,
        default: null,
        trim: true,
        lowercase: true,
        minlength: 64,
        maxlength: 64,
      },

      recoveryOrganizationId: {
        type: String,
        default: null,
        trim: true,
        maxlength: 100,
      },

      recoveryRequestedBy: {
        type: String,
        default: null,
        trim: true,
        maxlength: 100,
      },

      recoveryIssuedAt: {
        type: Date,
        default: null,
      },

      recoveryExpiresAt: {
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

deviceCredentialSchema.index({
  deviceId: 1,
  status: 1,
});

export const DeviceCredentialModel =
  model(
    "DeviceCredential",
    deviceCredentialSchema,
  );
