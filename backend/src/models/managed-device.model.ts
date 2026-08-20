import {
  model,
  Schema,
  type HydratedDocument,
} from "mongoose";

export type ManagedDeviceStatus =
  | "online"
  | "offline"
  | "disabled";

export type ManagedDevice = {
  deviceId: string;
  fingerprint: string;

  hostname: string;
  username?: string;

  os?: string;
  osVersion?: string;
  architecture?: string;

  cpu?: unknown;
  memoryBytes?: number;
  disks?: unknown[];
  graphics?: unknown;
  system?: unknown;
  bios?: unknown;
  network?: unknown[];

  appVersion?: string;
  lastIp?: string;

  cpuUsage?: number;
  ramUsage?: number;
  diskUsage?: number;
  uptime?: number;

  networkOnline?: boolean;
  batteryPercent?: number;

  currentUser?: string;
  sessionState?: "active" | "unavailable";
  currentApplication?: {
    processName: string;
    pid: number;
    capturedAt: Date;
  } | null;
  sessionTelemetryAt?: Date;
  sessionTelemetryStale?: boolean;
  lastHeartbeatLatencyMs?: number;

  status: ManagedDeviceStatus;
  lastSeenAt?: Date;
};

export type ManagedDeviceDocument =
  HydratedDocument<ManagedDevice>;

const managedDeviceSchema = new Schema<ManagedDevice>(
  {
    deviceId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      maxlength: 100,
      trim: true,
    },

    fingerprint: {
      type: String,
      required: true,
      unique: true,
      index: true,
      maxlength: 512,
      trim: true,
    },

    hostname: {
      type: String,
      required: true,
      maxlength: 200,
      trim: true,
    },

    username: {
      type: String,
      maxlength: 200,
      trim: true,
    },

    os: {
      type: String,
      maxlength: 250,
    },

    osVersion: {
      type: String,
      maxlength: 100,
    },

    architecture: {
      type: String,
      maxlength: 50,
    },

    cpu: {
      type: Schema.Types.Mixed,
    },

    memoryBytes: {
      type: Number,
      min: 0,
    },

    disks: {
      type: [Schema.Types.Mixed],
      default: [],
    },

    graphics: {
      type: Schema.Types.Mixed,
    },

    system: {
      type: Schema.Types.Mixed,
    },

    bios: {
      type: Schema.Types.Mixed,
    },

    network: {
      type: [Schema.Types.Mixed],
      default: [],
    },

    appVersion: {
      type: String,
      maxlength: 50,
    },

    lastIp: {
      type: String,
      maxlength: 100,
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
      default: true,
    },

    batteryPercent: {
      type: Number,
      min: 0,
      max: 100,
    },

    currentUser: {
      type: String,
      maxlength: 200,
      trim: true,
    },

    sessionState: {
      type: String,
      enum: ["active", "unavailable"],
    },

    currentApplication: {
      type: new Schema(
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

          capturedAt: {
            type: Date,
            required: true,
          },
        },
        {
          _id: false,
        },
      ),
      default: null,
    },

    sessionTelemetryAt: {
      type: Date,
      index: true,
    },

    sessionTelemetryStale: {
      type: Boolean,
      default: true,
    },

    lastHeartbeatLatencyMs: {
      type: Number,
      min: 0,
      max: 300000,
    },

    status: {
      type: String,
      enum: ["online", "offline", "disabled"],
      default: "online",
      index: true,
    },

    lastSeenAt: {
      type: Date,
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

managedDeviceSchema.index({
  status: 1,
  lastSeenAt: -1,
});

export const ManagedDeviceModel = model(
  "ManagedDevice",
  managedDeviceSchema,
);
