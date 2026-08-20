import {
  Schema,
  model,
} from "mongoose";

export const deviceCommandTypes = [
  "PING",
  "INSTALL_APP",
  "UNINSTALL_APP",
  "UPDATE_APP",
  "RESTART_DEVICE",
  "SHUTDOWN_DEVICE",
] as const;

export const deviceCommandStatuses = [
  "queued",
  "sent",
  "acknowledged",
  "running",
  "completed",
  "failed",
  "expired",
  "cancelled",
] as const;

const deviceCommandSchema =
  new Schema(
    {
      commandId: {
        type: String,
        required: true,
        unique: true,
        index: true,
        trim: true,
        maxlength: 100,
      },

      deviceId: {
        type: String,
        required: true,
        index: true,
        trim: true,
        maxlength: 100,
      },

      type: {
        type: String,
        required: true,
        enum: deviceCommandTypes,
        index: true,
      },

      status: {
        type: String,
        required: true,
        enum: deviceCommandStatuses,
        default: "queued",
        index: true,
      },

      payload: {
        type: Schema.Types.Mixed,
        default: null,
      },

      result: {
        type: Schema.Types.Mixed,
        default: null,
      },

      errorMessage: {
        type: String,
        default: null,
        maxlength: 2000,
      },

      requestedBy: {
        type: String,
        default: null,
        maxlength: 200,
      },

      requestedByRole: {
        type: String,
        default: null,
        maxlength: 100,
      },

      authorizationPermission: {
        type: String,
        default: null,
        maxlength: 100,
      },

      requestedAt: {
        type: Date,
        required: true,
        default: Date.now,
        index: true,
      },

      sentAt: {
        type: Date,
        default: null,
      },

      acknowledgedAt: {
        type: Date,
        default: null,
      },

      startedAt: {
        type: Date,
        default: null,
      },

      completedAt: {
        type: Date,
        default: null,
      },

      expiresAt: {
        type: Date,
        default: null,
        index: true,
      },

      attemptCount: {
        type: Number,
        default: 0,
        min: 0,
      },
    },
    {
      timestamps: true,
      versionKey: false,
    },
  );

deviceCommandSchema.index(
  {
    deviceId: 1,
    status: 1,
    requestedAt: 1,
  },
);

deviceCommandSchema.index(
  {
    deviceId: 1,
    createdAt: -1,
  },
);

export const DeviceCommandModel =
  model(
    "DeviceCommand",
    deviceCommandSchema,
  );

