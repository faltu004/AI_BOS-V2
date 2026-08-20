import { createHash } from "node:crypto";
import { managedDeviceRepository } from "../repositories/managed-device.repository.js";
import { deviceMetricRepository } from "../repositories/device-metric.repository.js";

type NetworkInterfaceInput = {
  mac?: string;
  default?: boolean;
  internal?: boolean;
  virtual?: boolean;
  [key: string]: unknown;
};

type SystemInput = {
  uuid?: string;
  serial?: string;
  manufacturer?: string;
  model?: string;
  [key: string]: unknown;
};

export type RegisterManagedDeviceInput = {
  deviceId?: string;
  fingerprint?: string;

  hostname?: string;
  username?: string;

  os?: string;
  version?: string;
  arch?: string;

  cpu?: unknown;
  memory?: number;
  disks?: unknown[];
  graphics?: unknown;
  system?: SystemInput;
  bios?: unknown;
  network?: NetworkInterfaceInput[];

  appVersion?: string;
  lastIp?: string;
};

export type ManagedDeviceHeartbeatInput = {
  deviceId?: string;

  cpuUsage?: number;
  ramUsage?: number;
  diskUsage?: number;
  uptime?: number;

  networkOnline?: boolean;
  batteryPercent?: number;

  username?: string;
  currentUser?: string;
  sessionState?: "active" | "unavailable";
  currentApplication?: {
    processName?: unknown;
    pid?: unknown;
    capturedAt?: unknown;
  } | null;
  sessionTelemetryAt?: string | Date;
  sessionTelemetryStale?: boolean;
  lastHeartbeatLatencyMs?: number;
  lastIp?: string;
};

export type DeviceMetricRange =
  | "1h"
  | "24h"
  | "7d";

function getPrimaryMac(
  network?: NetworkInterfaceInput[],
): string {
  if (!Array.isArray(network)) {
    return "";
  }

  const primary =
    network.find(
      (item) =>
        item.default === true &&
        item.internal !== true &&
        item.virtual !== true &&
        typeof item.mac === "string",
    ) ??
    network.find(
      (item) =>
        item.internal !== true &&
        item.virtual !== true &&
        typeof item.mac === "string",
    );

  return primary?.mac?.trim().toLowerCase() || "";
}

function createFingerprint(
  input: RegisterManagedDeviceInput,
): string {
  const suppliedFingerprint =
    input.fingerprint?.trim();

  if (suppliedFingerprint) {
    return suppliedFingerprint;
  }

  const uuid = input.system?.uuid?.trim();

  if (uuid) {
    return uuid;
  }

  const serial = input.system?.serial?.trim();

  if (serial) {
    return serial;
  }

  const mac = getPrimaryMac(input.network);
  const hostname = input.hostname?.trim();

  if (mac && hostname) {
    return `${hostname}:${mac}`;
  }

  if (hostname) {
    return hostname;
  }

  throw new Error(
    "Unable to generate device fingerprint",
  );
}

function createDeviceId(
  fingerprint: string,
): string {
  const hash = createHash("sha256")
    .update(fingerprint)
    .digest("hex")
    .slice(0, 12)
    .toUpperCase();

  return `DEV-${hash}`;
}

function getRangeMilliseconds(
  range: DeviceMetricRange,
): number {
  switch (range) {
    case "1h":
      return 60 * 60 * 1000;

    case "24h":
      return 24 * 60 * 60 * 1000;

    case "7d":
      return 7 * 24 * 60 * 60 * 1000;
  }
}

function normalizeRange(
  range: string | undefined,
): DeviceMetricRange {
  if (
    range === undefined ||
    range === "" ||
    range === "1h"
  ) {
    return "1h";
  }

  if (
    range === "24h" ||
    range === "7d"
  ) {
    return range;
  }

  throw new Error(
    "Invalid metrics range. Use 1h, 24h, or 7d.",
  );
}

function downsampleMetrics<T>(
  items: T[],
  maxPoints = 500,
): T[] {
  if (items.length <= maxPoints) {
    return items;
  }

  const step = Math.ceil(
    items.length / maxPoints,
  );

  const sampled = items.filter(
    (_item, index) =>
      index % step === 0,
  );

  const lastItem =
    items[items.length - 1];

  if (
    lastItem !== undefined &&
    sampled[sampled.length - 1] !== lastItem
  ) {
    sampled.push(lastItem);
  }

  return sampled;
}

function normalizeDate(
  value: unknown,
): Date | undefined {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return undefined;
  }

  if (
    typeof value !== "string" &&
    !(value instanceof Date)
  ) {
    return undefined;
  }

  const parsed =
    new Date(value);

  return Number.isNaN(
    parsed.getTime(),
  )
    ? undefined
    : parsed;
}

function normalizeCurrentApplication(
  value:
    ManagedDeviceHeartbeatInput["currentApplication"],
) {
  if (value === null) {
    return null;
  }

  if (
    typeof value !== "object" ||
    value === undefined
  ) {
    return undefined;
  }

  const processName =
    typeof value.processName ===
    "string"
      ? value.processName
          .trim()
          .slice(0, 300)
      : "";

  const pid =
    typeof value.pid === "number" &&
    Number.isInteger(value.pid) &&
    value.pid >= 0
      ? value.pid
      : null;

  const capturedAt =
    normalizeDate(
      value.capturedAt,
    );

  if (
    !processName ||
    pid === null ||
    !capturedAt
  ) {
    return undefined;
  }

  return {
    processName,
    pid,
    capturedAt,
  };
}

export class ManagedDeviceService {
  async enroll(
    input: RegisterManagedDeviceInput,
  ) {
    if (!input.hostname?.trim()) {
      throw new Error(
        "Device hostname is required",
      );
    }

    const fingerprint =
      createFingerprint(
        input,
      );

    /*
     * Secure enrollment never trusts a
     * client-supplied deviceId.
     *
     * Device identity is derived by the
     * backend from the device fingerprint.
     */
    const deviceId =
      createDeviceId(
        fingerprint,
      );

    return managedDeviceRepository
      .upsertRegistration({
        deviceId,
        fingerprint,

        hostname:
          input.hostname.trim(),

        username:
          input.username?.trim(),

        os:
          input.os,

        osVersion:
          input.version,

        architecture:
          input.arch,

        cpu:
          input.cpu,

        memoryBytes:
          input.memory,

        disks:
          input.disks,

        graphics:
          input.graphics,

        system:
          input.system,

        bios:
          input.bios,

        network:
          input.network,

        appVersion:
          input.appVersion,

        lastIp:
          input.lastIp,

        status:
          "online",

        lastSeenAt:
          new Date(),
      });
  }

  async register(
    input: RegisterManagedDeviceInput,
  ) {
    if (!input.hostname?.trim()) {
      throw new Error(
        "Device hostname is required",
      );
    }

    const fingerprint =
      createFingerprint(input);

    const deviceId =
      input.deviceId?.trim() ||
      createDeviceId(fingerprint);

    return managedDeviceRepository.upsertRegistration({
      deviceId,
      fingerprint,

      hostname: input.hostname.trim(),
      username: input.username?.trim(),

      os: input.os,
      osVersion: input.version,
      architecture: input.arch,

      cpu: input.cpu,
      memoryBytes: input.memory,
      disks: input.disks,
      graphics: input.graphics,
      system: input.system,
      bios: input.bios,
      network: input.network,

      appVersion: input.appVersion,
      lastIp: input.lastIp,

      status: "online",
      lastSeenAt: new Date(),
    });
  }

  async heartbeat(
    input: ManagedDeviceHeartbeatInput,
  ) {
    const deviceId =
      input.deviceId?.trim();

    if (!deviceId) {
      throw new Error(
        "Device ID is required for heartbeat",
      );
    }

    const recordedAt = new Date();

    const device =
      await managedDeviceRepository.updateHeartbeat(
        deviceId,
        {
          cpuUsage: input.cpuUsage,
          ramUsage: input.ramUsage,
          diskUsage: input.diskUsage,
          uptime: input.uptime,

          networkOnline:
            input.networkOnline,

          batteryPercent:
            input.batteryPercent,

          currentUser:
            input.currentUser?.trim(),

          sessionState:
            input.sessionState ===
            "active"
              ? "active"
              : "unavailable",

          currentApplication:
            normalizeCurrentApplication(
              input.currentApplication,
            ),

          sessionTelemetryAt:
            normalizeDate(
              input.sessionTelemetryAt,
            ),

          sessionTelemetryStale:
            input.sessionTelemetryStale,

          lastHeartbeatLatencyMs:
            input.lastHeartbeatLatencyMs,

          username: input.username,
          lastIp: input.lastIp,

          status: "online",
          lastSeenAt: recordedAt,
        },
      );

    if (!device) {
      throw new Error(
        "Managed device not found",
      );
    }

    await deviceMetricRepository.create({
      deviceId,

      cpuUsage: input.cpuUsage,
      ramUsage: input.ramUsage,
      diskUsage: input.diskUsage,
      uptime: input.uptime,

      networkOnline:
        input.networkOnline,

      batteryPercent:
        input.batteryPercent,

      recordedAt,
    });

    return device;
  }

  async list() {
    return managedDeviceRepository.findAll();
  }

  async getByDeviceId(
    deviceId: string | undefined,
  ) {
    if (!deviceId?.trim()) {
      throw new Error(
        "Device ID is required",
      );
    }

    const device =
      await managedDeviceRepository.findByDeviceId(
        deviceId.trim(),
      );

    if (!device) {
      throw new Error(
        "Managed device not found",
      );
    }

    return device;
  }

  async getMetrics(
    deviceId: string | undefined,
    requestedRange?: string,
  ) {
    if (!deviceId?.trim()) {
      throw new Error(
        "Device ID is required",
      );
    }

    const normalizedDeviceId =
      deviceId.trim();

    const device =
      await managedDeviceRepository.findByDeviceId(
        normalizedDeviceId,
      );

    if (!device) {
      throw new Error(
        "Managed device not found",
      );
    }

    const range =
      normalizeRange(requestedRange);

    const since = new Date(
      Date.now() -
        getRangeMilliseconds(range),
    );

    const metrics =
      await deviceMetricRepository.findSince(
        normalizedDeviceId,
        since,
      );

    return {
      deviceId: normalizedDeviceId,
      range,
      from: since,
      to: new Date(),
      points: downsampleMetrics(
        metrics,
        500,
      ),
    };
  }
}

export const managedDeviceService =
  new ManagedDeviceService();


