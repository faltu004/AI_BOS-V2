import {
  ManagedDeviceModel,
  type ManagedDevice,
} from "../models/managed-device.model.js";

export type UpsertRegistrationInput = {
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

  status: ManagedDevice["status"];
  lastSeenAt: Date;
};

export type UpdateHeartbeatInput = {
  cpuUsage?: number;
  ramUsage?: number;
  diskUsage?: number;
  uptime?: number;

  networkOnline?: boolean;
  batteryPercent?: number;

  currentUser?: string;
  sessionState?: ManagedDevice["sessionState"];
  currentApplication?: ManagedDevice["currentApplication"];
  sessionTelemetryAt?: Date;
  sessionTelemetryStale?: boolean;
  lastHeartbeatLatencyMs?: number;

  username?: string;
  lastIp?: string;


  appVersion?: string;

  status: ManagedDevice["status"];
  lastSeenAt: Date;
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

export class ManagedDeviceRepository {
  async upsertRegistration(
    input: UpsertRegistrationInput,
  ) {
    const updateData = removeUndefinedValues({
      fingerprint: input.fingerprint,

      hostname: input.hostname,
      username: input.username,

      os: input.os,
      osVersion: input.osVersion,
      architecture: input.architecture,

      cpu: input.cpu,
      memoryBytes: input.memoryBytes,
      disks: input.disks,
      graphics: input.graphics,
      system: input.system,
      bios: input.bios,
      network: input.network,

      appVersion: input.appVersion,
      lastIp: input.lastIp,

      status: input.status,
      lastSeenAt: input.lastSeenAt,
    });

    return ManagedDeviceModel.findOneAndUpdate(
      {
        deviceId: input.deviceId,
      },
      {
        $set: updateData,
        $setOnInsert: {
          deviceId: input.deviceId,
        },
      },
      {
        new: true,
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      },
    );
  }

  async updateHeartbeat(
    deviceId: string,
    input: UpdateHeartbeatInput,
  ) {
    const updateData = removeUndefinedValues({
      cpuUsage: input.cpuUsage,
      ramUsage: input.ramUsage,
      diskUsage: input.diskUsage,
      uptime: input.uptime,

      networkOnline: input.networkOnline,
      batteryPercent: input.batteryPercent,

      currentUser: input.currentUser,
      sessionState: input.sessionState,
      currentApplication: input.currentApplication,
      sessionTelemetryAt: input.sessionTelemetryAt,
      sessionTelemetryStale: input.sessionTelemetryStale,
      lastHeartbeatLatencyMs: input.lastHeartbeatLatencyMs,

      username: input.username,
      lastIp: input.lastIp,


      appVersion: input.appVersion,
      status: input.status,
      lastSeenAt: input.lastSeenAt,
    });

    return ManagedDeviceModel.findOneAndUpdate(
      {
        deviceId,
      },
      {
        $set: updateData,
      },
      {
        new: true,
        runValidators: true,
      },
    );
  }

  async findAll() {
    return ManagedDeviceModel.find()
      .sort({
        lastSeenAt: -1,
        createdAt: -1,
      })
      .lean();
  }

  async findByDeviceId(deviceId: string) {
    return ManagedDeviceModel.findOne({
      deviceId,
    }).lean();
  }

  async markOffline(deviceId: string) {
    return ManagedDeviceModel.findOneAndUpdate(
      {
        deviceId,
      },
      {
        $set: {
          status: "offline",
        },
      },
      {
        new: true,
      },
    );
  }

  async markInactiveDevicesOffline(
    inactiveBefore: Date,
  ) {
    return ManagedDeviceModel.updateMany(
      {
        status: "online",
        lastSeenAt: {
          $lt: inactiveBefore,
        },
      },
      {
        $set: {
          status: "offline",
        },
      },
    );
  }
}

export const managedDeviceRepository =
  new ManagedDeviceRepository();
