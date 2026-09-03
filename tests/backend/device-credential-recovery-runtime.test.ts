import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import test from "node:test";

import { configureBackendTestEnv } from "../helpers/backend-env.ts";

configureBackendTestEnv();
process.env.ALLOW_LEGACY_DEVICE_AUTH = "false";

function sha256(value: string): string {
  return createHash("sha256")
    .update(value, "utf8")
    .digest("hex");
}

const fingerprint =
  "recovery-runtime-stable-fingerprint";
const deviceId =
  `DEV-${sha256(fingerprint).slice(0, 12).toUpperCase()}`;
const deviceBinding = sha256(
  `ai-bos-device-binding-v1:${fingerprint}`,
);
const oldDeviceToken =
  "aibos_device_rejected_legacy_credential";

const { createApp } = await import(
  "../../backend/src/app.ts"
);
const { createTokenPair } = await import(
  "../../backend/src/utils/jwt.ts"
);
const { deviceCredentialRepository } = await import(
  "../../backend/src/repositories/device-credential.repository.ts"
);
const { userRepository } = await import(
  "../../backend/src/repositories/user.repository.ts"
);
const { auditLogService } = await import(
  "../../backend/src/services/audit-log.service.ts"
);
const { managedDeviceService } = await import(
  "../../backend/src/services/managed-device.service.ts"
);

const originals = {
  findMetadata:
    deviceCredentialRepository.findMetadata,
  findForRecovery:
    deviceCredentialRepository.findForRecovery,
  findForVerification:
    deviceCredentialRepository.findForVerification,
  saveRecoveryAuthorization:
    deviceCredentialRepository.saveRecoveryAuthorization,
  promoteRecovery:
    deviceCredentialRepository.promoteRecovery,
  touchLastUsed:
    deviceCredentialRepository.touchLastUsed,
  findUserById:
    userRepository.findById,
  auditRecord:
    auditLogService.record,
  register:
    managedDeviceService.register,
  heartbeat:
    managedDeviceService.heartbeat,
};

const record: any = {
  deviceId,
  organizationId: null,
  deviceBinding: null,
  tokenHash: sha256(oldDeviceToken),
  status: "active",
  credentialVersion: 1,
  issuedAt: new Date("2026-08-29T00:00:00.000Z"),
  rotatedAt: null,
  revokedAt: null,
  lastUsedAt: null,
  recoveryAuthorizationHash: null,
  recoveryDeviceBinding: null,
  recoveryOrganizationId: null,
  recoveryRequestedBy: null,
  recoveryIssuedAt: null,
  recoveryExpiresAt: null,
};
let recordExists = false;

const auditEvents: any[] = [];
let registerCalls = 0;
let heartbeatCalls = 0;

deviceCredentialRepository.findMetadata =
  (async (requestedDeviceId: string) =>
    recordExists &&
    requestedDeviceId === deviceId
      ? {
          ...record,
          tokenHash: undefined,
          recoveryAuthorizationHash: undefined,
        }
      : null) as any;

deviceCredentialRepository.findForRecovery =
  (async (requestedDeviceId: string) =>
    recordExists &&
    requestedDeviceId === deviceId
      ? { ...record }
      : null) as any;

deviceCredentialRepository.findForVerification =
  (async (requestedDeviceId: string) =>
    recordExists &&
    requestedDeviceId === deviceId
      ? {
          deviceId,
          tokenHash: record.tokenHash,
          status: record.status,
          credentialVersion:
            record.credentialVersion,
        }
      : null) as any;

deviceCredentialRepository.saveRecoveryAuthorization =
  (async (input: any) => {
    if (
      input.deviceId !== deviceId ||
      (recordExists &&
        record.status !== "active") ||
      (recordExists &&
        record.organizationId &&
        record.organizationId !== input.organizationId) ||
      (recordExists &&
        record.deviceBinding &&
        record.deviceBinding !== input.deviceBinding)
    ) {
      return null;
    }

    if (!recordExists) {
      recordExists = true;
      record.tokenHash =
        input.placeholderTokenHash;
      record.status = "active";
      record.credentialVersion = 1;
      record.issuedAt = input.issuedAt;
    }

    record.organizationId =
      input.organizationId;
    record.deviceBinding =
      input.deviceBinding;

    record.recoveryAuthorizationHash =
      input.authorizationHash;
    record.recoveryDeviceBinding =
      input.deviceBinding;
    record.recoveryOrganizationId =
      input.organizationId;
    record.recoveryRequestedBy =
      input.requestedBy;
    record.recoveryIssuedAt =
      input.issuedAt;
    record.recoveryExpiresAt =
      input.expiresAt;

    return {
      ...record,
      tokenHash: undefined,
      recoveryAuthorizationHash: undefined,
    };
  }) as any;

deviceCredentialRepository.promoteRecovery =
  (async (input: any) => {
    if (
      input.deviceId !== deviceId ||
      record.status !== "active" ||
      record.credentialVersion !==
        input.previousCredentialVersion ||
      record.recoveryAuthorizationHash !==
        input.authorizationHash ||
      record.recoveryDeviceBinding !==
        input.deviceBinding ||
      record.recoveryOrganizationId !==
        input.organizationId ||
      !record.recoveryExpiresAt ||
      record.recoveryExpiresAt.getTime() <=
        input.recoveredAt.getTime()
    ) {
      return null;
    }

    record.tokenHash = input.tokenHash;
    record.credentialVersion =
      input.credentialVersion;
    record.issuedAt = input.issuedAt;
    record.rotatedAt = input.recoveredAt;
    record.organizationId =
      input.organizationId;
    record.deviceBinding =
      input.deviceBinding;
    record.recoveryAuthorizationHash = null;
    record.recoveryDeviceBinding = null;
    record.recoveryOrganizationId = null;
    record.recoveryRequestedBy = null;
    record.recoveryIssuedAt = null;
    record.recoveryExpiresAt = null;

    return {
      ...record,
      tokenHash: undefined,
    };
  }) as any;

deviceCredentialRepository.touchLastUsed =
  (async () => undefined) as any;

userRepository.findById =
  (async (userId: string) => ({
    id: userId,
    role: "Employee",
    isActive: true,
    organizationId:
      userId === "other-employee"
        ? "org-other"
        : "org-recovery",
  })) as any;

auditLogService.record =
  (async (event: any) => {
    auditEvents.push(event);
  }) as any;

managedDeviceService.register =
  (async (input: any) => {
    registerCalls += 1;
    return {
      ...input,
      deviceId: input.deviceId,
      status: "online",
    };
  }) as any;

managedDeviceService.heartbeat =
  (async (input: any) => {
    heartbeatCalls += 1;
    return {
      ...input,
      deviceId: input.deviceId,
      status: "online",
    };
  }) as any;

const server = createServer(createApp());
await new Promise<void>((resolve) =>
  server.listen(0, "127.0.0.1", resolve),
);
const address = server.address() as AddressInfo;
const devicesUrl =
  `http://127.0.0.1:${address.port}/api/v1/devices`;

test.after(async () => {
  Object.assign(
    deviceCredentialRepository,
    {
      findMetadata:
        originals.findMetadata,
      findForRecovery:
        originals.findForRecovery,
      findForVerification:
        originals.findForVerification,
      saveRecoveryAuthorization:
        originals.saveRecoveryAuthorization,
      promoteRecovery:
        originals.promoteRecovery,
      touchLastUsed:
        originals.touchLastUsed,
    },
  );
  userRepository.findById =
    originals.findUserById;
  auditLogService.record =
    originals.auditRecord;
  managedDeviceService.register =
    originals.register;
  managedDeviceService.heartbeat =
    originals.heartbeat;

  await new Promise<void>((resolve, reject) => {
    server.close((error) =>
      error ? reject(error) : resolve(),
    );
  });
});

test("authenticated Employee can perform one-time bound recovery and resume register/heartbeat", async () => {
  const employeeToken = createTokenPair({
    sub: "recovery-employee",
    role: "Employee",
  }).accessToken;
  const otherEmployeeToken = createTokenPair({
    sub: "other-employee",
    role: "Employee",
  }).accessToken;

  const authorizationBody = JSON.stringify({
    deviceId,
    deviceBinding,
  });

  const anonymous = await fetch(
    `${devicesUrl}/credential/recovery/self`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: authorizationBody,
    },
  );
  assert.equal(anonymous.status, 401);

  const authorized = await fetch(
    `${devicesUrl}/credential/recovery/self`,
    {
      method: "POST",
      headers: {
        Authorization:
          `Bearer ${employeeToken}`,
        "Content-Type": "application/json",
      },
      body: authorizationBody,
    },
  );
  assert.equal(authorized.status, 201);
  const authorizedJson =
    await authorized.json() as any;
  const recoveryAuthorization =
    authorizedJson.data
      .recoveryAuthorization as string;
  assert.match(
    recoveryAuthorization,
    /^aibos_recover_ot_/,
  );
  const authorizationExpiresAt = Date.parse(
    authorizedJson.data.expiresAt,
  );
  assert.ok(
    authorizationExpiresAt > Date.now(),
  );
  assert.ok(
    authorizationExpiresAt <=
      Date.now() + 5 * 60_000 + 1_000,
  );
  assert.equal(
    record.recoveryAuthorizationHash,
    sha256(recoveryAuthorization),
  );
  assert.notEqual(
    record.recoveryAuthorizationHash,
    recoveryAuthorization,
  );
  assert.equal(recordExists, true);
  assert.equal(
    record.organizationId,
    "org-recovery",
  );
  assert.equal(
    record.deviceBinding,
    deviceBinding,
  );

  const wrongOrganization = await fetch(
    `${devicesUrl}/credential/recovery/self`,
    {
      method: "POST",
      headers: {
        Authorization:
          `Bearer ${otherEmployeeToken}`,
        "Content-Type": "application/json",
      },
      body: authorizationBody,
    },
  );
  assert.equal(wrongOrganization.status, 403);
  assert.equal(
    record.recoveryAuthorizationHash,
    sha256(recoveryAuthorization),
  );

  const oldCredentialAlone = await fetch(
    `${devicesUrl}/credential/recovery`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-device-id": deviceId,
        "x-device-token": oldDeviceToken,
        "x-device-recovery-authorization":
          oldDeviceToken,
      },
      body: JSON.stringify({
        deviceId,
        deviceBinding,
        fingerprint,
      }),
    },
  );
  assert.equal(oldCredentialAlone.status, 401);
  assert.equal(record.credentialVersion, 1);

  const wrongPhysicalDevice = await fetch(
    `${devicesUrl}/credential/recovery`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-device-recovery-authorization":
          recoveryAuthorization,
      },
      body: JSON.stringify({
        deviceId,
        deviceBinding,
        fingerprint: "some-other-device",
      }),
    },
  );
  assert.equal(wrongPhysicalDevice.status, 403);
  assert.equal(record.credentialVersion, 1);

  const recovered = await fetch(
    `${devicesUrl}/credential/recovery`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-device-recovery-authorization":
          recoveryAuthorization,
      },
      body: JSON.stringify({
        deviceId,
        deviceBinding,
        fingerprint,
      }),
    },
  );
  assert.equal(recovered.status, 200);
  const recoveredJson =
    await recovered.json() as any;
  const newDeviceToken =
    recoveredJson.data.deviceToken as string;
  assert.match(newDeviceToken, /^aibos_device_/);
  assert.notEqual(newDeviceToken, oldDeviceToken);
  assert.equal(
    recoveredJson.data.credentialVersion,
    2,
  );
  assert.equal(record.credentialVersion, 2);
  assert.equal(
    record.recoveryAuthorizationHash,
    null,
  );

  const replay = await fetch(
    `${devicesUrl}/credential/recovery`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-device-recovery-authorization":
          recoveryAuthorization,
      },
      body: JSON.stringify({
        deviceId,
        deviceBinding,
        fingerprint,
      }),
    },
  );
  assert.equal(replay.status, 401);

  const oldHeartbeat = await fetch(
    `${devicesUrl}/heartbeat`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-device-id": deviceId,
        "x-device-token": oldDeviceToken,
      },
      body: JSON.stringify({
        deviceId,
        hostname: "RECOVERY-PC",
      }),
    },
  );
  assert.equal(oldHeartbeat.status, 401);

  const recoveredHeaders = {
    "Content-Type": "application/json",
    "x-device-id": deviceId,
    "x-device-token": newDeviceToken,
  };
  const register = await fetch(
    `${devicesUrl}/register`,
    {
      method: "POST",
      headers: recoveredHeaders,
      body: JSON.stringify({
        deviceId,
        fingerprint,
        hostname: "RECOVERY-PC",
      }),
    },
  );
  assert.equal(register.status, 201);

  const heartbeat = await fetch(
    `${devicesUrl}/heartbeat`,
    {
      method: "POST",
      headers: recoveredHeaders,
      body: JSON.stringify({
        deviceId,
        hostname: "RECOVERY-PC",
      }),
    },
  );
  assert.equal(heartbeat.status, 200);
  assert.equal(registerCalls, 1);
  assert.equal(heartbeatCalls, 1);

  assert.deepEqual(
    auditEvents
      .filter(
        (event) =>
          event.resourceType ===
            "device_credential" &&
          event.success === true,
      )
      .map((event) => event.path),
    [
      "/devices/credential/recovery/self",
      "/devices/credential/recovery",
    ],
  );
  assert.equal(
    JSON.stringify(auditEvents).includes(
      recoveryAuthorization,
    ),
    false,
  );
  assert.equal(
    JSON.stringify(auditEvents).includes(
      newDeviceToken,
    ),
    false,
  );
});
