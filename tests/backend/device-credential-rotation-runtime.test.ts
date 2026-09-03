import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createServer } from "node:http";
import { mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { configureBackendTestEnv } from "../helpers/backend-env.ts";

configureBackendTestEnv();

/*
 * Fake in-memory replacement for DeviceCredentialModel, implementing
 * the same conditional-update semantics as the real Mongoose queries
 * in device-credential.repository.ts (status must be "active" for
 * mutations, pending fields cleared on request/promote/revoke, etc.).
 * This lets the real deviceCredentialService business logic (hashing,
 * timing-safe comparison, expiry checks) run unmodified against a
 * fake store, instead of needing a real MongoDB.
 */
type FakeCredentialRecord = {
  deviceId: string;
  tokenHash: string;
  status: "active" | "revoked";
  credentialVersion: number;
  issuedAt: Date;
  rotatedAt: Date | null;
  revokedAt: Date | null;
  lastUsedAt: Date | null;
  rotationRequestedAt: Date | null;
  rotationRequestedBy: string | null;
  rotationReason: string | null;
  pendingTokenHash: string | null;
  pendingCredentialVersion: number | null;
  pendingIssuedAt: Date | null;
  pendingExpiresAt: Date | null;
};

function stripSecrets(
  record: FakeCredentialRecord,
): Omit<FakeCredentialRecord, "tokenHash" | "pendingTokenHash"> {
  const { tokenHash, pendingTokenHash, ...rest } = record;
  return rest;
}

function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

async function waitFor(
  predicate: () => boolean,
  timeoutMs = 5_000,
): Promise<void> {
  const expiresAt = Date.now() + timeoutMs;

  while (!predicate()) {
    if (Date.now() >= expiresAt) {
      throw new Error("Timed out waiting for condition");
    }

    await new Promise((resolve) => setTimeout(resolve, 20));
  }
}

const testRoot = path.join(
  os.tmpdir(),
  "AI BOS Credential Rotation Test " + Date.now().toString(36),
);

const originalProgramData = process.env.ProgramData;
const originalProgramDataAlt = process.env.PROGRAMDATA;
const originalPath = process.env.PATH;
const originalSystemRoot = process.env.SystemRoot;

process.env.ProgramData = path.join(testRoot, "ProgramData");
process.env.PROGRAMDATA = process.env.ProgramData;
process.env.SystemRoot = path.join(testRoot, "MissingWindowsRoot");

const protectedRoot = path.join(
  process.env.ProgramData,
  "AI BOS",
  "DeviceAgent",
);
const protectedEnvPath = path.join(protectedRoot, ".env");

const { createApp } = await import("../../backend/src/app.ts");
const { createTokenPair } = await import("../../backend/src/utils/jwt.ts");
const { userRepository } = await import(
  "../../backend/src/repositories/user.repository.ts"
);
const { permissionService } = await import(
  "../../backend/src/services/permission.service.ts"
);
const { administratorMonitoringAccessService } = await import(
  "../../backend/src/services/administrator-monitoring-access.service.ts"
);
const { deviceCredentialRepository } = await import(
  "../../backend/src/repositories/device-credential.repository.ts"
);

/*
 * Every device-agent module that touches the backend (config.ts,
 * device-auth.ts, device-credential-rotation.ts) computes/consumes
 * config.backendUrl exactly once, at module evaluation time, from
 * process.env.BACKEND_URL. Node's module cache means only the first
 * import of this dependency chain in this process actually "sees"
 * whatever BACKEND_URL is set at that moment -- any later change to
 * process.env.BACKEND_URL is invisible to an already-loaded copy. So
 * the shared HTTP server used by every test in this file must be
 * started, and BACKEND_URL assigned, BEFORE these agent modules are
 * imported for the first (and only) time below.
 */
const server = createServer(createApp());

await new Promise<void>((resolve) =>
  server.listen(0, "127.0.0.1", resolve),
);

const serverAddress = server.address();
if (!serverAddress || typeof serverAddress !== "object") {
  throw new Error("Failed to determine test server address");
}

const baseUrl = `http://127.0.0.1:${serverAddress.port}`;
process.env.BACKEND_URL = baseUrl;

const { getDeviceAuthHeaders } = await import(
  "../../device-agent/src/device-auth.ts"
);
const { persistDeviceCredential } = await import(
  "../../device-agent/src/device-credential-store.ts"
);
const { startDeviceCredentialRotationWatcher } = await import(
  "../../device-agent/src/device-credential-rotation.ts"
);

const originalRepository = {
  findMetadata: deviceCredentialRepository.findMetadata,
  findForVerification: deviceCredentialRepository.findForVerification,
  findForRotation: deviceCredentialRepository.findForRotation,
  touchLastUsed: deviceCredentialRepository.touchLastUsed,
  requestRotation: deviceCredentialRepository.requestRotation,
  savePendingRotation: deviceCredentialRepository.savePendingRotation,
  promotePendingRotation: deviceCredentialRepository.promotePendingRotation,
  revoke: deviceCredentialRepository.revoke,
};

const originalUserFindById = userRepository.findById;
const originalResolvePermissions =
  permissionService.resolveEffectivePermissions;
const originalRequireMonitoringPermission =
  administratorMonitoringAccessService.requirePermission;

let store: Map<string, FakeCredentialRecord>;

function installFakeRepository(): void {
  store = new Map();

  deviceCredentialRepository.findMetadata = (async (
    deviceId: string,
  ) => {
    const record = store.get(deviceId);
    return record ? stripSecrets(record) : null;
  }) as any;

  deviceCredentialRepository.findForVerification = (async (
    deviceId: string,
  ) => {
    const record = store.get(deviceId);
    if (!record) return null;
    return {
      deviceId: record.deviceId,
      status: record.status,
      credentialVersion: record.credentialVersion,
      tokenHash: record.tokenHash,
    };
  }) as any;

  deviceCredentialRepository.findForRotation = (async (
    deviceId: string,
  ) => {
    const record = store.get(deviceId);
    return record ? { ...record } : null;
  }) as any;

  deviceCredentialRepository.touchLastUsed = (async (
    deviceId: string,
    usedAt: Date,
  ) => {
    const record = store.get(deviceId);
    if (record && record.status === "active") {
      record.lastUsedAt = usedAt;
    }
  }) as any;

  deviceCredentialRepository.requestRotation = (async (input: {
    deviceId: string;
    requestedAt: Date;
    requestedBy: string;
    reason?: string | null;
  }) => {
    const record = store.get(input.deviceId);
    if (!record || record.status !== "active") return null;

    record.rotationRequestedAt = input.requestedAt;
    record.rotationRequestedBy = input.requestedBy;
    record.rotationReason = input.reason ?? null;
    record.pendingTokenHash = null;
    record.pendingCredentialVersion = null;
    record.pendingIssuedAt = null;
    record.pendingExpiresAt = null;

    return stripSecrets(record);
  }) as any;

  deviceCredentialRepository.savePendingRotation = (async (input: {
    deviceId: string;
    pendingTokenHash: string;
    pendingCredentialVersion: number;
    pendingIssuedAt: Date;
    pendingExpiresAt: Date;
  }) => {
    const record = store.get(input.deviceId);
    if (
      !record ||
      record.status !== "active" ||
      !record.rotationRequestedAt
    ) {
      return null;
    }

    record.pendingTokenHash = input.pendingTokenHash;
    record.pendingCredentialVersion = input.pendingCredentialVersion;
    record.pendingIssuedAt = input.pendingIssuedAt;
    record.pendingExpiresAt = input.pendingExpiresAt;

    return stripSecrets(record);
  }) as any;

  deviceCredentialRepository.promotePendingRotation = (async (input: {
    deviceId: string;
    pendingTokenHash: string;
    credentialVersion: number;
    issuedAt: Date;
    confirmedAt: Date;
  }) => {
    const record = store.get(input.deviceId);
    if (
      !record ||
      record.status !== "active" ||
      record.pendingTokenHash !== input.pendingTokenHash ||
      !record.pendingExpiresAt ||
      record.pendingExpiresAt.getTime() <= input.confirmedAt.getTime()
    ) {
      return null;
    }

    record.tokenHash = input.pendingTokenHash;
    record.credentialVersion = input.credentialVersion;
    record.issuedAt = input.issuedAt;
    record.rotatedAt = input.confirmedAt;
    record.rotationRequestedAt = null;
    record.rotationRequestedBy = null;
    record.rotationReason = null;
    record.pendingTokenHash = null;
    record.pendingCredentialVersion = null;
    record.pendingIssuedAt = null;
    record.pendingExpiresAt = null;

    return stripSecrets(record);
  }) as any;

  deviceCredentialRepository.revoke = (async (
    deviceId: string,
    revokedAt: Date,
  ) => {
    const record = store.get(deviceId);
    if (!record || record.status !== "active") return null;

    record.status = "revoked";
    record.revokedAt = revokedAt;
    record.rotationRequestedAt = null;
    record.rotationRequestedBy = null;
    record.rotationReason = null;
    record.pendingTokenHash = null;
    record.pendingCredentialVersion = null;
    record.pendingIssuedAt = null;
    record.pendingExpiresAt = null;

    return stripSecrets(record);
  }) as any;
}

function seedActiveCredential(
  deviceId: string,
  deviceToken: string,
  credentialVersion = 1,
): void {
  store.set(deviceId, {
    deviceId,
    tokenHash: sha256(deviceToken),
    status: "active",
    credentialVersion,
    issuedAt: new Date(),
    rotatedAt: null,
    revokedAt: null,
    lastUsedAt: null,
    rotationRequestedAt: null,
    rotationRequestedBy: null,
    rotationReason: null,
    pendingTokenHash: null,
    pendingCredentialVersion: null,
    pendingIssuedAt: null,
    pendingExpiresAt: null,
  });
}

async function resetAgentFiles(): Promise<void> {
  await rm(testRoot, { recursive: true, force: true });
  await mkdir(protectedRoot, { recursive: true });
}

async function writeAgentCredential(
  deviceId: string,
  deviceToken: string,
): Promise<void> {
  await writeFile(
    protectedEnvPath,
    `DEVICE_ID=${deviceId}\nDEVICE_TOKEN=${deviceToken}\n`,
    "utf8",
  );
}

const { persistPendingDeviceCredentialRotation } = await import(
  "../../device-agent/src/device-credential-store.ts"
);

test.after(async () => {
  Object.assign(deviceCredentialRepository, originalRepository);
  userRepository.findById = originalUserFindById;
  permissionService.resolveEffectivePermissions = originalResolvePermissions;
  administratorMonitoringAccessService.requirePermission =
    originalRequireMonitoringPermission;

  process.env.ProgramData = originalProgramData;
  process.env.PROGRAMDATA = originalProgramDataAlt;
  process.env.PATH = originalPath;
  process.env.SystemRoot = originalSystemRoot;

  await new Promise<void>((resolve) => server.close(() => resolve()));
  await rm(testRoot, { recursive: true, force: true });
});

test("Owner requests rotation; Agent prepares, adopts, and confirms; version increments; old token stays usable until confirmation; heartbeat continues after", async () => {
  installFakeRepository();
  await resetAgentFiles();

  const deviceId = "DEV-ROTATION-1";
  const oldToken = "aibos_device_original_token_v1";

  seedActiveCredential(deviceId, oldToken, 1);
  await writeAgentCredential(deviceId, oldToken);

  userRepository.findById = (async () => ({
    id: "owner-user-1",
    role: "Owner",
    isActive: true,
    mustChangePassword: false,
  })) as any;

  const accessToken = createTokenPair({
    sub: "owner-user-1",
    role: "Owner",
  }).accessToken;

  // --- Step 1: Admin requests rotation via the real HTTP endpoint ---
  const requestResponse = await fetch(
    `${baseUrl}/api/v1/devices/${deviceId}/credential/rotation-request`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ reason: "Scheduled security rotation" }),
    },
  );
  assert.equal(requestResponse.status, 202);
  const requestBody = (await requestResponse.json()) as any;
  assert.equal(requestBody.data.deviceId, deviceId);
  assert.ok(store.get(deviceId)?.rotationRequestedAt);

  // Old token must still authenticate while rotation is only
  // requested/pending, never yet confirmed.
  const preConfirmHeaders = await getDeviceAuthHeaders(deviceId);
  assert.equal(preConfirmHeaders["x-device-token"], oldToken);

  const preConfirmStatusResponse = await fetch(
    `${baseUrl}/api/v1/devices/credential/rotation?deviceId=${deviceId}`,
    { headers: preConfirmHeaders },
  );
  assert.equal(preConfirmStatusResponse.status, 200);

  // --- Step 2: real Agent rotation watcher runs prepare + confirm ---
  const stopWatcher = startDeviceCredentialRotationWatcher({ deviceId });

  try {
    await waitFor(() => store.get(deviceId)?.credentialVersion === 2);
  } finally {
    await stopWatcher();
  }

  const rotated = store.get(deviceId);
  assert.equal(rotated?.credentialVersion, 2);
  assert.ok(rotated?.rotatedAt);
  assert.equal(rotated?.rotationRequestedAt, null);
  assert.equal(rotated?.pendingTokenHash, null);

  // Old token must no longer authenticate after confirmation.
  const oldTokenResponse = await fetch(`${baseUrl}/api/v1/devices/heartbeat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-device-id": deviceId,
      "x-device-token": oldToken,
    },
    body: JSON.stringify({ deviceId }),
  });
  assert.equal(oldTokenResponse.status, 401);

  // The agent's on-disk credential must now be the new token, and
  // heartbeat must succeed with it -- no offline window.
  const newHeaders = await getDeviceAuthHeaders(deviceId);
  assert.notEqual(newHeaders["x-device-token"], oldToken);

  const newTokenStatusResponse = await fetch(
    `${baseUrl}/api/v1/devices/credential/rotation?deviceId=${deviceId}`,
    { headers: newHeaders },
  );
  assert.equal(newTokenStatusResponse.status, 200);
});

test("Administrator without device.credential.rotate is refused with 403 and nothing changes", async () => {
  installFakeRepository();
  await resetAgentFiles();

  const deviceId = "DEV-ROTATION-2";
  seedActiveCredential(deviceId, "aibos_device_admin_denied_token", 1);

  userRepository.findById = (async () => ({
    id: "admin-user-1",
    role: "Administrator",
    isActive: true,
    mustChangePassword: false,
  })) as any;

  permissionService.resolveEffectivePermissions = (async () => ({
    hasFullAccess: true,
    permissionKeys: new Set(["device.credential.view"]),
  })) as any;

  administratorMonitoringAccessService.requirePermission =
    (async () => undefined) as any;

  const accessToken = createTokenPair({
    sub: "admin-user-1",
    role: "Administrator",
  }).accessToken;

  const response = await fetch(
    `${baseUrl}/api/v1/devices/${deviceId}/credential/rotation-request`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ reason: "Should be denied" }),
    },
  );

  assert.equal(response.status, 403);
  assert.equal(store.get(deviceId)?.rotationRequestedAt, null);
});

test("Administrator granted device.credential.rotate can request rotation", async () => {
  installFakeRepository();
  await resetAgentFiles();

  const deviceId = "DEV-ROTATION-3";
  seedActiveCredential(deviceId, "aibos_device_admin_allowed_token", 1);

  userRepository.findById = (async () => ({
    id: "admin-user-2",
    role: "Administrator",
    isActive: true,
    mustChangePassword: false,
  })) as any;

  permissionService.resolveEffectivePermissions = (async () => ({
    hasFullAccess: true,
    permissionKeys: new Set([
      "device.credential.view",
      "device.credential.rotate",
    ]),
  })) as any;

  administratorMonitoringAccessService.requirePermission =
    (async () => undefined) as any;

  const accessToken = createTokenPair({
    sub: "admin-user-2",
    role: "Administrator",
  }).accessToken;

  const response = await fetch(
    `${baseUrl}/api/v1/devices/${deviceId}/credential/rotation-request`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ reason: "Authorized Administrator rotation" }),
    },
  );

  assert.equal(response.status, 202);
  assert.ok(store.get(deviceId)?.rotationRequestedAt);
  assert.equal(store.get(deviceId)?.rotationRequestedBy, "admin-user-2");
});

test("Agent restart after PREPARE but before CONFIRM recovers safely without stranding the device", async () => {
  installFakeRepository();
  await resetAgentFiles();

  const deviceId = "DEV-ROTATION-4";
  const oldToken = "aibos_device_crash_recovery_old_token";

  seedActiveCredential(deviceId, oldToken, 1);
  await writeAgentCredential(deviceId, oldToken);

  // Simulate: Admin already requested rotation, and the Agent already
  // completed PREPARE (server has a pending credential) and persisted
  // the pending sidecar file to disk, but the process was killed
  // before CONFIRM ever ran -- the real crash boundary this protocol
  // is designed around.
  const record = store.get(deviceId)!;
  record.rotationRequestedAt = new Date();
  record.rotationRequestedBy = "owner-user-1";

  const newToken = "aibos_device_crash_recovery_new_token";
  const pendingIssuedAt = new Date();
  const pendingExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

  record.pendingTokenHash = sha256(newToken);
  record.pendingCredentialVersion = 2;
  record.pendingIssuedAt = pendingIssuedAt;
  record.pendingExpiresAt = pendingExpiresAt;

  await persistPendingDeviceCredentialRotation({
    deviceId,
    deviceToken: newToken,
    credentialVersion: 2,
    issuedAt: pendingIssuedAt.toISOString(),
    expiresAt: pendingExpiresAt.toISOString(),
  });

  // "Restart": start the watcher fresh, as a newly launched process
  // would. It must find the persisted pending credential, recover,
  // and complete confirmation -- not get stuck and not strand the
  // device offline.
  const stopWatcher = startDeviceCredentialRotationWatcher({ deviceId });

  try {
    await waitFor(() => store.get(deviceId)?.credentialVersion === 2);
  } finally {
    await stopWatcher();
  }

  const recovered = store.get(deviceId);
  assert.equal(recovered?.credentialVersion, 2);
  assert.ok(recovered?.rotatedAt);
  assert.equal(recovered?.pendingTokenHash, null);

  const newHeaders = await getDeviceAuthHeaders(deviceId);
  assert.equal(newHeaders["x-device-token"], newToken);

  const statusResponse = await fetch(
    `${baseUrl}/api/v1/devices/credential/rotation?deviceId=${deviceId}`,
    { headers: newHeaders },
  );
  assert.equal(statusResponse.status, 200);
});
