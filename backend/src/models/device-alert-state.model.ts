import {
  model,
  Schema,
  type HydratedDocument,
} from "mongoose";

export const deviceAlertConditions = [
  "offline",
  "high_cpu",
  "high_memory",
] as const;

export type DeviceAlertCondition =
  (
    typeof deviceAlertConditions
  )[number];

export type DeviceAlertStatus =
  | "open"
  | "resolved";

export type DeviceAlertState = {
  deviceId: string;

  condition:
    DeviceAlertCondition;

  status:
    DeviceAlertStatus;

  openedAt: Date;

  lastObservedAt:
    Date;

  resolvedAt?: Date;

  acknowledgedAt?: Date;

  acknowledgedBy?: string;

  acknowledgedByName?: string;

  lastNotifiedAt?: Date;

  latestValue?: number;

  threshold?: number;

  notificationCount:
    number;

  createdAt: Date;

  updatedAt: Date;
};

export type DeviceAlertStateDocument =
  HydratedDocument<
    DeviceAlertState
  >;

const deviceAlertStateSchema =
  new Schema<DeviceAlertState>(
    {
      deviceId: {
        type: String,
        required: true,
        trim: true,
        maxlength: 100,
      },

      condition: {
        type: String,
        enum:
          deviceAlertConditions,
        required: true,
      },

      status: {
        type: String,
        enum: [
          "open",
          "resolved",
        ],
        required: true,
        default: "open",
      },

      openedAt: {
        type: Date,
        required: true,
      },

      lastObservedAt: {
        type: Date,
        required: true,
      },

      resolvedAt: {
        type: Date,
      },

      acknowledgedAt: {
        type: Date,
      },

      acknowledgedBy: {
        type: String,
        maxlength: 100,
      },

      acknowledgedByName: {
        type: String,
        maxlength: 200,
      },

      lastNotifiedAt: {
        type: Date,
      },

      latestValue: {
        type: Number,
      },

      threshold: {
        type: Number,
      },

      notificationCount: {
        type: Number,
        min: 0,
        default: 0,
      },
    },
    {
      timestamps: true,
      versionKey: false,
    },
  );

deviceAlertStateSchema.index(
  {
    deviceId: 1,
    condition: 1,
  },
  {
    unique: true,
  },
);

deviceAlertStateSchema.index({
  status: 1,
  updatedAt: -1,
});

export const DeviceAlertStateModel =
  model(
    "DeviceAlertState",
    deviceAlertStateSchema,
  );
