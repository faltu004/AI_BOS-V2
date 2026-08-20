import {
  Schema,
  model,
} from "mongoose";

const installedApplicationSchema =
  new Schema(
    {
      name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 500,
      },

      version: {
        type: String,
        default: null,
        maxlength: 200,
      },

      publisher: {
        type: String,
        default: null,
        maxlength: 500,
      },

      installDate: {
        type: String,
        default: null,
        maxlength: 100,
      },

      scope: {
        type: String,
        required: true,
        enum: [
          "machine",
          "user",
        ],
      },

      architecture: {
        type: String,
        required: true,
        enum: [
          "64-bit",
          "32-bit",
          "user",
        ],
      },

      source: {
        type: String,
        required: true,
        enum: [
          "registry",
          "unknown",
        ],
        default: "unknown",
      },
    },
    {
      _id: false,
    },
  );

const runningApplicationSchema =
  new Schema(
    {
      processName: {
        type: String,
        required: true,
        trim: true,
        maxlength: 300,
      },

      pid: {
        type: Number,
        required: true,
        min: 0,
      },

      startedAt: {
        type: Date,
        default: null,
      },

      cpuUsage: {
        type: Number,
        default: null,
        min: 0,
      },

      memoryBytes: {
        type: Number,
        default: null,
        min: 0,
      },
    },
    {
      _id: false,
    },
  );

const deviceApplicationSnapshotSchema =
  new Schema(
    {
      deviceId: {
        type: String,
        required: true,
        unique: true,
        index: true,
        trim: true,
        maxlength: 100,
      },

      installedApplications: {
        type: [
          installedApplicationSchema,
        ],
        default: [],
      },

      runningApplications: {
        type: [
          runningApplicationSchema,
        ],
        default: [],
      },

      collectedAt: {
        type: Date,
        required: true,
        index: true,
      },

      reporterSource: {
        type: String,
        enum: [
          "agent-interactive",
          "session-helper",
          "unknown",
        ],
        default: "unknown",
        index: true,
      },

      sessionContext: {
        type: String,
        trim: true,
        maxlength: 120,
      },
    },
    {
      timestamps: true,
      versionKey: false,
    },
  );

export const DeviceApplicationSnapshotModel =
  model(
    "DeviceApplicationSnapshot",
    deviceApplicationSnapshotSchema,
  );
