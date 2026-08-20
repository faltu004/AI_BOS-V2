import {
  model,
  Schema,
  type HydratedDocument,
} from "mongoose";

export type DeviceMetric = {
  deviceId: string;

  cpuUsage?: number;
  ramUsage?: number;
  diskUsage?: number;
  uptime?: number;

  networkOnline?: boolean;
  batteryPercent?: number;

  recordedAt: Date;
};

export type DeviceMetricDocument =
  HydratedDocument<DeviceMetric>;

const deviceMetricSchema =
  new Schema<DeviceMetric>(
    {
      deviceId: {
        type: String,
        required: true,
        index: true,
        trim: true,
      },

      cpuUsage: {
        type: Number,
        min: 0,
        max: 100,
      },

      ramUsage: {
        type: Number,
        min: 0,
        max: 100,
      },

      diskUsage: {
        type: Number,
        min: 0,
        max: 100,
      },

      uptime: {
        type: Number,
        min: 0,
      },

      networkOnline: {
        type: Boolean,
      },

      batteryPercent: {
        type: Number,
        min: 0,
        max: 100,
      },

      recordedAt: {
        type: Date,
        required: true,
        default: Date.now,
      },
    },
    {
      versionKey: false,
    },
  );

deviceMetricSchema.index({
  deviceId: 1,
  recordedAt: 1,
});

/**
 * Automatically remove metrics after 7 days.
 * MongoDB TTL cleanup is asynchronous.
 */
deviceMetricSchema.index(
  {
    recordedAt: 1,
  },
  {
    expireAfterSeconds: 60 * 60 * 24 * 7,
  },
);

export const DeviceMetricModel = model(
  "DeviceMetric",
  deviceMetricSchema,
);
