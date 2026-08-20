import {
  DeviceUpdateEventModel,
  type DeviceUpdateStatus,
} from "../models/device-update-event.model.js";

export type CreateDeviceUpdateEventInput = {
  deviceId: string;
  fromVersion?: string | null;
  toVersion?: string | null;
  packageId?: string | null;
  status: DeviceUpdateStatus;
  failureCategory?: string | null;
  safeErrorText?: string | null;
  metadata?: Record<string, unknown> | null;
  reportedAt: Date;
};

export class DeviceUpdateEventRepository {
  async create(
    input: CreateDeviceUpdateEventInput,
  ) {
    return DeviceUpdateEventModel
      .create(input);
  }

  async findRecentByDeviceId(
    deviceId: string,
    limit = 100,
  ) {
    return DeviceUpdateEventModel
      .find({
        deviceId,
      })
      .sort({
        reportedAt: -1,
        createdAt: -1,
      })
      .limit(limit)
      .lean();
  }

  async findLatestByDeviceId(
    deviceId: string,
  ) {
    return DeviceUpdateEventModel
      .findOne({
        deviceId,
      })
      .sort({
        reportedAt: -1,
        createdAt: -1,
      })
      .lean();
  }

  async findLatestSuccessfulByDeviceId(
    deviceId: string,
  ) {
    return DeviceUpdateEventModel
      .findOne({
        deviceId,
        status: "healthy",
      })
      .sort({
        reportedAt: -1,
        createdAt: -1,
      })
      .lean();
  }

  async findLatestFailureByDeviceId(
    deviceId: string,
  ) {
    return DeviceUpdateEventModel
      .findOne({
        deviceId,
        status: "failed",
      })
      .sort({
        reportedAt: -1,
        createdAt: -1,
      })
      .lean();
  }
}

export const deviceUpdateEventRepository =
  new DeviceUpdateEventRepository();
