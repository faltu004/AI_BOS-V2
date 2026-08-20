import {
  Schema,
  model,
} from "mongoose";

export const deviceUpdateStatuses = [
  "update_available",
  "download_started",
  "download_verified",
  "staging_started",
  "staged",
  "activation_requested",
  "activation_started",
  "service_stopped",
  "payload_activated",
  "service_started",
  "health_pending",
  "healthy",
  "rollback_started",
  "rolled_back",
  "failed",
] as const;

export type DeviceUpdateStatus =
  (typeof deviceUpdateStatuses)[number];

const deviceUpdateEventSchema =
  new Schema(
    {
      deviceId: {
        type: String,
        required: true,
        index: true,
        trim: true,
        maxlength: 100,
      },

      fromVersion: {
        type: String,
        trim: true,
        maxlength: 50,
        default: null,
      },

      toVersion: {
        type: String,
        trim: true,
        maxlength: 50,
        default: null,
      },

      packageId: {
        type: String,
        trim: true,
        maxlength: 150,
        default: null,
      },

      status: {
        type: String,
        required: true,
        enum: deviceUpdateStatuses,
        index: true,
      },

      failureCategory: {
        type: String,
        trim: true,
        maxlength: 80,
        default: null,
      },

      safeErrorText: {
        type: String,
        trim: true,
        maxlength: 500,
        default: null,
      },

      metadata: {
        type: Schema.Types.Mixed,
        default: null,
      },

      reportedAt: {
        type: Date,
        required: true,
        index: true,
      },
    },
    {
      timestamps: true,
      versionKey: false,
    },
  );

deviceUpdateEventSchema.index({
  deviceId: 1,
  reportedAt: -1,
});

deviceUpdateEventSchema.index({
  deviceId: 1,
  status: 1,
  reportedAt: -1,
});

export const DeviceUpdateEventModel =
  model(
    "DeviceUpdateEvent",
    deviceUpdateEventSchema,
  );
