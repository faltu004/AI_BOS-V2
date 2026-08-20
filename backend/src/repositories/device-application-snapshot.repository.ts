import {
  DeviceApplicationSnapshotModel,
} from "../models/device-application-snapshot.model.js";

export type InstalledApplicationRecord = {
  name: string;
  version: string | null;
  publisher: string | null;
  installDate: string | null;

  scope:
    | "machine"
    | "user";

  architecture:
    | "64-bit"
    | "32-bit"
    | "user";

  source:
    | "registry"
    | "unknown";
};

export type RunningApplicationRecord = {
  processName: string;
  pid: number;

  startedAt: Date | null;

  cpuUsage: number | null;
  memoryBytes: number | null;
};

export type UpsertApplicationSnapshotInput = {
  deviceId: string;

  installedApplications?:
    InstalledApplicationRecord[];

  runningApplications?:
    RunningApplicationRecord[];

  collectedAt: Date;
  reporterSource?: "agent-interactive" | "session-helper" | "unknown";
  sessionContext?: string;
};

export class DeviceApplicationSnapshotRepository {
  async upsertSnapshot(
    input: UpsertApplicationSnapshotInput,
  ) {
    const setFields: Record<string, unknown> = {
      collectedAt:
        input.collectedAt,

      reporterSource:
        input.reporterSource ??
        "unknown",

      sessionContext:
        input.sessionContext,
    };

    if (
      input.installedApplications !==
      undefined
    ) {
      setFields.installedApplications =
        input.installedApplications;
    }

    if (
      input.runningApplications !==
      undefined
    ) {
      setFields.runningApplications =
        input.runningApplications;
    }

    return DeviceApplicationSnapshotModel
      .findOneAndUpdate(
        {
          deviceId:
            input.deviceId,
        },
        {
          $set:
            setFields,

          $setOnInsert: {
            deviceId:
              input.deviceId,
          },
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

  async findByDeviceId(
    deviceId: string,
  ) {
    return DeviceApplicationSnapshotModel
      .findOne({
        deviceId,
      })
      .lean();
  }
}

export const deviceApplicationSnapshotRepository =
  new DeviceApplicationSnapshotRepository();
