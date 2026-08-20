import {
  Schema,
  model,
} from "mongoose";

const deviceApplicationSessionSchema =
  new Schema(
    {
      deviceId: {
        type: String,
        required: true,
        trim: true,
        maxlength: 100,
        index: true,
      },

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
        required: true,
        index: true,
      },

      endedAt: {
        type: Date,
        required: true,
      },

      durationSeconds: {
        type: Number,
        required: true,
        min: 0,
      },
    },
    {
      timestamps: true,
      versionKey: false,
    },
  );

deviceApplicationSessionSchema.index(
  {
    deviceId: 1,
    startedAt: -1,
  },
);

deviceApplicationSessionSchema.index(
  {
    deviceId: 1,
    processName: 1,
    startedAt: 1,
  },
  {
    unique: true,
  },
);

export const DeviceApplicationSessionModel =
  model(
    "DeviceApplicationSession",
    deviceApplicationSessionSchema,
  );
