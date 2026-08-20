import {
  DeviceApplicationSessionModel,
} from "../models/device-application-session.model.js";

export type DeviceApplicationSessionRecord = {
  deviceId: string;
  processName: string;
  pid: number;
  startedAt: Date;
  endedAt: Date;
  durationSeconds: number;
};

export class DeviceApplicationSessionRepository {
  async upsertSession(
    input:
      DeviceApplicationSessionRecord,
  ) {
    return DeviceApplicationSessionModel
      .findOneAndUpdate(
        {
          deviceId:
            input.deviceId,

          processName:
            input.processName,

          startedAt:
            input.startedAt,
        },
        {
          $setOnInsert:
            input,
        },
        {
          new: true,
          upsert: true,
          runValidators: true,
          setDefaultsOnInsert: true,
        },
      )
      .lean();
  }

  async findRecentByDeviceId(
    deviceId: string,
    limit = 200,
  ) {
    return DeviceApplicationSessionModel
      .find({
        deviceId,
      })
      .sort({
        startedAt: -1,
      })
      .limit(
        limit,
      )
      .lean();
  }

  async findSince(
    deviceId: string,
    from: Date,
  ) {
    return DeviceApplicationSessionModel
      .find({
        deviceId,

        startedAt: {
          $gte: from,
        },
      })
      .sort({
        startedAt: 1,
      })
      .lean();
  }
}

export const deviceApplicationSessionRepository =
  new DeviceApplicationSessionRepository();
