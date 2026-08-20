import { DeviceMetricModel } from "../models/device-metric.model.js";

export type CreateDeviceMetricInput = {
  deviceId: string;

  cpuUsage?: number | undefined;
  ramUsage?: number | undefined;
  diskUsage?: number | undefined;
  uptime?: number | undefined;

  networkOnline?: boolean | undefined;
  batteryPercent?: number | undefined;

  recordedAt: Date;
};

function removeUndefinedValues(
  input: Record<string, unknown>,
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(input).filter(
      ([, value]) => value !== undefined,
    ),
  );
}

export class DeviceMetricRepository {
  async create(
    input: CreateDeviceMetricInput,
  ) {
    return DeviceMetricModel.create(
      removeUndefinedValues({
        deviceId: input.deviceId,

        cpuUsage: input.cpuUsage,
        ramUsage: input.ramUsage,
        diskUsage: input.diskUsage,
        uptime: input.uptime,

        networkOnline:
          input.networkOnline,

        batteryPercent:
          input.batteryPercent,

        recordedAt:
          input.recordedAt,
      }),
    );
  }

  async findSince(
    deviceId: string,
    since: Date,
  ) {
    return DeviceMetricModel.find({
      deviceId,
      recordedAt: {
        $gte: since,
      },
    })
      .sort({
        recordedAt: 1,
      })
      .lean();
  }
}

export const deviceMetricRepository =
  new DeviceMetricRepository();
