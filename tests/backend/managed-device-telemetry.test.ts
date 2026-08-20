import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { configureBackendTestEnv } from "../helpers/backend-env.ts";

configureBackendTestEnv();

test("managed device heartbeat persists interactive session telemetry fields", async () => {
  const { managedDeviceService } = await import("../../backend/src/services/managed-device.service.ts");
  const { managedDeviceRepository } = await import("../../backend/src/repositories/managed-device.repository.ts");
  const { deviceMetricRepository } = await import("../../backend/src/repositories/device-metric.repository.ts");

  const originalUpdateHeartbeat = managedDeviceRepository.updateHeartbeat;
  const originalCreateMetric = deviceMetricRepository.create;
  const calls: unknown[] = [];

  managedDeviceRepository.updateHeartbeat = (async (deviceId: string, input: unknown) => {
    calls.push(["heartbeat", deviceId, input]);
    return { deviceId, ...(input as object) };
  }) as any;
  deviceMetricRepository.create = (async (input: unknown) => {
    calls.push(["metric", input]);
    return input;
  }) as any;

  try {
    await managedDeviceService.heartbeat({
      deviceId: " DEV-SESSION ",
      cpuUsage: 12,
      ramUsage: 34,
      diskUsage: 56,
      currentUser: " amant ",
      sessionState: "active",
      currentApplication: {
        processName: "Code.exe",
        pid: 1234,
        capturedAt: "2026-08-18T10:00:00.000Z",
      },
      sessionTelemetryAt: "2026-08-18T10:00:01.000Z",
      sessionTelemetryStale: false,
      lastHeartbeatLatencyMs: 27,
    });

    const heartbeatCall = calls[0] as any[];
    assert.equal(heartbeatCall[0], "heartbeat");
    assert.equal(heartbeatCall[1], "DEV-SESSION");
    assert.equal(heartbeatCall[2].currentUser, "amant");
    assert.equal(heartbeatCall[2].sessionState, "active");
    assert.equal(heartbeatCall[2].currentApplication.processName, "Code.exe");
    assert.equal(heartbeatCall[2].currentApplication.pid, 1234);
    assert.equal(heartbeatCall[2].sessionTelemetryAt.toISOString(), "2026-08-18T10:00:01.000Z");
    assert.equal(heartbeatCall[2].sessionTelemetryStale, false);
    assert.equal(heartbeatCall[2].lastHeartbeatLatencyMs, 27);
    assert.equal(heartbeatCall[2].status, "online");

    const metricCall = calls[1] as any[];
    assert.equal(metricCall[0], "metric");
    assert.equal(metricCall[1].cpuUsage, 12);
  } finally {
    managedDeviceRepository.updateHeartbeat = originalUpdateHeartbeat;
    deviceMetricRepository.create = originalCreateMetric;
  }
});

test("managed device repository heartbeat update includes telemetry and never deletes offline devices", async () => {
  const { managedDeviceRepository } = await import("../../backend/src/repositories/managed-device.repository.ts");
  const { ManagedDeviceModel } = await import("../../backend/src/models/managed-device.model.ts");

  const originalFindOneAndUpdate = ManagedDeviceModel.findOneAndUpdate;
  const originalUpdateMany = ManagedDeviceModel.updateMany;
  const calls: unknown[] = [];

  ManagedDeviceModel.findOneAndUpdate = ((filter: unknown, update: unknown, options: unknown) => {
    calls.push(["findOneAndUpdate", filter, update, options]);
    return { lean: () => ({}) };
  }) as any;
  ManagedDeviceModel.updateMany = ((filter: unknown, update: unknown) => {
    calls.push(["updateMany", filter, update]);
    return { modifiedCount: 1 };
  }) as any;

  try {
    await managedDeviceRepository.updateHeartbeat("DEV-SESSION", {
      currentUser: "amant",
      sessionState: "active",
      currentApplication: {
        processName: "Code.exe",
        pid: 1234,
        capturedAt: new Date("2026-08-18T10:00:00.000Z"),
      },
      sessionTelemetryAt: new Date("2026-08-18T10:00:01.000Z"),
      sessionTelemetryStale: false,
      lastHeartbeatLatencyMs: 27,
      status: "online",
      lastSeenAt: new Date("2026-08-18T10:00:02.000Z"),
    });

    await managedDeviceRepository.markInactiveDevicesOffline(new Date("2026-08-18T10:00:00.000Z"));

    const heartbeatUpdate = (calls[0] as any[])[2].$set;
    assert.equal(heartbeatUpdate.currentUser, "amant");
    assert.equal(heartbeatUpdate.sessionState, "active");
    assert.equal(heartbeatUpdate.currentApplication.processName, "Code.exe");
    assert.equal(heartbeatUpdate.sessionTelemetryStale, false);
    assert.equal(heartbeatUpdate.lastHeartbeatLatencyMs, 27);

    const offlineUpdate = calls[1] as any[];
    assert.equal(offlineUpdate[0], "updateMany");
    assert.deepEqual(offlineUpdate[2], { $set: { status: "offline" } });
  } finally {
    ManagedDeviceModel.findOneAndUpdate = originalFindOneAndUpdate;
    ManagedDeviceModel.updateMany = originalUpdateMany;
  }
});

test("admin monitoring sources do not reintroduce random or mock monitoring data", async () => {
  const root = process.cwd();
  const dashboard = await readFile(
    path.join(root, "admin/src/admin/features/monitoring/MonitoringDashboardPage.tsx"),
    "utf8",
  );
  const controller = await readFile(
    path.join(root, "backend/src/controllers/monitoring.controller.ts"),
    "utf8",
  );

  assert.equal(dashboard.includes("Math.random"), false);
  assert.equal(controller.includes("Math.random"), false);
  assert.equal(controller.includes("alert-1"), false);
  assert.equal(controller.includes("Daily Health Report"), false);
});

test("remote support endpoint socket can use consented endpoint token without helper device credential access", async () => {
  const source = await readFile(
    path.join(process.cwd(), "backend/src/realtime/socket-server.ts"),
    "utf8",
  );

  assert.equal(source.includes("limited Session Helper"), true);
  assert.equal(source.includes("else if (deviceKey)"), true);
  assert.equal(source.includes("deviceCredentialService\n                .verify"), true);
});

test("application snapshot service preserves installed and running endpoint data", async () => {
  const { deviceApplicationService } = await import("../../backend/src/services/device-application.service.ts");
  const { managedDeviceRepository } = await import("../../backend/src/repositories/managed-device.repository.ts");
  const { deviceApplicationSnapshotRepository } = await import(
    "../../backend/src/repositories/device-application-snapshot.repository.ts",
  );

  const originalFindByDeviceId = managedDeviceRepository.findByDeviceId;
  const originalUpsertSnapshot = deviceApplicationSnapshotRepository.upsertSnapshot;
  let saved: any;

  managedDeviceRepository.findByDeviceId = (async () => ({ deviceId: "DEV-APPS" })) as any;
  deviceApplicationSnapshotRepository.upsertSnapshot = (async (input: unknown) => {
    saved = input;
    return input;
  }) as any;

  try {
    await deviceApplicationService.saveSnapshot({
      deviceId: " DEV-APPS ",
      installedApplications: [
        {
          name: "Visual Studio Code",
          version: "1.2.3",
          publisher: "Microsoft",
          installDate: "20260818",
          scope: "machine",
          architecture: "64-bit",
          source: "registry",
        },
      ],
      runningApplications: [
        {
          processName: "Code",
          pid: 1234,
          startedAt: "2026-08-18T10:00:00.000Z",
          cpuUsage: 4.5,
          memoryBytes: 1024,
        },
      ],
      collectedAt: "2026-08-18T10:01:00.000Z",
      reporterSource: "session-helper",
    });

    assert.equal(saved.deviceId, "DEV-APPS");
    assert.equal(saved.installedApplications[0].name, "Visual Studio Code");
    assert.equal(saved.installedApplications[0].source, "registry");
    assert.equal(saved.runningApplications[0].processName, "Code");
    assert.equal(saved.runningApplications[0].pid, 1234);
  } finally {
    managedDeviceRepository.findByDeviceId = originalFindByDeviceId;
    deviceApplicationSnapshotRepository.upsertSnapshot = originalUpsertSnapshot;
  }
});

test("application usage service computes duration and returns an honest empty range", async () => {
  const { deviceApplicationSessionService } = await import(
    "../../backend/src/services/device-application-session.service.ts",
  );
  const { managedDeviceRepository } = await import("../../backend/src/repositories/managed-device.repository.ts");
  const { deviceApplicationSessionRepository } = await import(
    "../../backend/src/repositories/device-application-session.repository.ts",
  );

  const originalFindByDeviceId = managedDeviceRepository.findByDeviceId;
  const originalUpsertSession = deviceApplicationSessionRepository.upsertSession;
  const originalFindSince = deviceApplicationSessionRepository.findSince;
  let saved: any;

  managedDeviceRepository.findByDeviceId = (async () => ({ deviceId: "DEV-USAGE" })) as any;
  deviceApplicationSessionRepository.upsertSession = (async (input: unknown) => {
    saved = input;
    return input;
  }) as any;
  deviceApplicationSessionRepository.findSince = (async () => []) as any;

  try {
    await deviceApplicationSessionService.saveSession({
      deviceId: "DEV-USAGE",
      processName: "Code",
      pid: 22,
      startedAt: "2026-08-18T10:00:00.000Z",
      endedAt: "2026-08-18T10:02:03.000Z",
      durationSeconds: 999,
    });

    assert.equal(saved.durationSeconds, 123);

    const empty = await deviceApplicationSessionService.getSessions(
      "DEV-USAGE",
      "24h",
    );
    assert.deepEqual(empty.sessions, []);
    assert.equal(empty.deviceId, "DEV-USAGE");
  } finally {
    managedDeviceRepository.findByDeviceId = originalFindByDeviceId;
    deviceApplicationSessionRepository.upsertSession = originalUpsertSession;
    deviceApplicationSessionRepository.findSince = originalFindSince;
  }
});
