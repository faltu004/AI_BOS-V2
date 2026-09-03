import assert from "node:assert/strict";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import test from "node:test";

import { configureBackendTestEnv } from "../helpers/backend-env.ts";

configureBackendTestEnv();
process.env.ALLOW_LEGACY_DEVICE_AUTH = "false";

type FakeCredentialRecord = {
  deviceId: string;
  tokenHash: string;
  status: "active" | "revoked";
  credentialVersion: number;
  issuedAt: Date;
  rotatedAt: Date | null;
  revokedAt: Date | null;
  lastUsedAt: Date | null;
};

test("concurrent and duplicate initial enrollment cannot invalidate the winning Agent credential", async () => {
  const { deviceEnrollmentService } = await import(
    "../../backend/src/services/device-enrollment.service.ts"
  );
  const { deviceCredentialService } = await import(
    "../../backend/src/services/device-credential.service.ts"
  );
  const { deviceCredentialRepository } = await import(
    "../../backend/src/repositories/device-credential.repository.ts"
  );
  const { managedDeviceService } = await import(
    "../../backend/src/services/managed-device.service.ts"
  );

  const originals = {
    findMetadata: deviceCredentialRepository.findMetadata,
    findForVerification: deviceCredentialRepository.findForVerification,
    createInitial: deviceCredentialRepository.createInitial,
    saveActive: deviceCredentialRepository.saveActive,
    touchLastUsed: deviceCredentialRepository.touchLastUsed,
    enroll: managedDeviceService.enroll,
    register: managedDeviceService.register,
    heartbeat: managedDeviceService.heartbeat,
  };

  let record: FakeCredentialRecord | null = null;
  let createAttempts = 0;
  let unsafeReplacementWrites = 0;
  let releaseConcurrentCreates: (() => void) | undefined;
  const bothCreatesEntered = new Promise<void>((resolve) => {
    releaseConcurrentCreates = resolve;
  });

  deviceCredentialRepository.findMetadata = (async () =>
    record ? { ...record, tokenHash: undefined } : null) as any;

  deviceCredentialRepository.findForVerification = (async () =>
    record ? { ...record } : null) as any;

  deviceCredentialRepository.createInitial = (async (input: any) => {
    createAttempts += 1;
    if (createAttempts === 2) releaseConcurrentCreates?.();
    await bothCreatesEntered;

    if (record) {
      throw Object.assign(new Error("duplicate device credential"), {
        code: 11000,
      });
    }

    record = {
      ...input,
      status: "active",
      rotatedAt: null,
      revokedAt: null,
      lastUsedAt: null,
    };

    return { ...record, tokenHash: undefined };
  }) as any;

  /*
   * This emulates the old issueForDevice() fallback. The fixed enrollment
   * path must never call it for an ordinary initial-enrollment retry.
   */
  deviceCredentialRepository.saveActive = (async (input: any) => {
    unsafeReplacementWrites += 1;
    record = {
      ...input,
      status: "active",
      rotatedAt: input.issuedAt,
      revokedAt: null,
      lastUsedAt: null,
    };
    return { ...record, tokenHash: undefined };
  }) as any;

  deviceCredentialRepository.touchLastUsed = (async () => undefined) as any;

  managedDeviceService.enroll = (async () => ({
    deviceId: "DEV-CONCURRENT-CLEAN-PC",
    fingerprint: "stable-clean-pc-fingerprint",
    hostname: "CLEAN-PC",
    status: "online",
  })) as any;

  managedDeviceService.register = (async (input: any) => ({
    deviceId: input.deviceId,
    hostname: input.hostname,
    status: "online",
  })) as any;

  managedDeviceService.heartbeat = (async (input: any) => ({
    deviceId: input.deviceId,
    hostname: input.hostname,
    status: "online",
  })) as any;

  let server: ReturnType<typeof createServer> | undefined;

  try {
    const attempts = await Promise.allSettled([
      deviceEnrollmentService.enroll({
        hostname: "CLEAN-PC",
        fingerprint: "stable-clean-pc-fingerprint",
      }),
      deviceEnrollmentService.enroll({
        hostname: "CLEAN-PC",
        fingerprint: "stable-clean-pc-fingerprint",
      }),
    ]);

    const successful = attempts.filter(
      (result): result is PromiseFulfilledResult<Awaited<ReturnType<typeof deviceEnrollmentService.enroll>>> =>
        result.status === "fulfilled",
    );
    const rejected = attempts.filter(
      (result): result is PromiseRejectedResult => result.status === "rejected",
    );

    assert.equal(successful.length, 1, "exactly one initial enrollment must win");
    assert.equal(rejected.length, 1, "the concurrent duplicate must be rejected");
    assert.equal((rejected[0]?.reason as any)?.statusCode, 409);
    assert.match(
      String((rejected[0]?.reason as any)?.message),
      /already enrolled|recovery/i,
    );
    assert.equal(createAttempts, 2);
    assert.equal(
      unsafeReplacementWrites,
      0,
      "initial enrollment must never overwrite an existing active token hash",
    );

    const winningCredential = successful[0]!.value.credential;
    assert.equal(winningCredential.credentialVersion, 1);
    assert.equal(
      await deviceCredentialService.verify(
        winningCredential.deviceId,
        winningCredential.deviceToken,
      ),
      true,
      "the credential returned to the winning Agent must remain active",
    );

    await assert.rejects(
      deviceEnrollmentService.enroll({
        hostname: "CLEAN-PC",
        fingerprint: "stable-clean-pc-fingerprint",
      }),
      (error: any) => error?.statusCode === 409,
    );
    assert.equal(unsafeReplacementWrites, 0);
    assert.equal(
      await deviceCredentialService.verify(
        winningCredential.deviceId,
        winningCredential.deviceToken,
      ),
      true,
      "an ordinary duplicate request cannot invalidate the first credential",
    );

    const { createApp } = await import("../../backend/src/app.ts");
    server = createServer(createApp());
    await new Promise<void>((resolve) => server!.listen(0, "127.0.0.1", resolve));
    const address = server.address() as AddressInfo;
    const baseUrl = `http://127.0.0.1:${address.port}/api/v1/devices`;
    const authHeaders = {
      "content-type": "application/json",
      "x-device-id": winningCredential.deviceId,
      "x-device-token": winningCredential.deviceToken,
    };

    const registerResponse = await fetch(`${baseUrl}/register`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        deviceId: winningCredential.deviceId,
        hostname: "CLEAN-PC",
      }),
    });
    assert.equal(registerResponse.status, 201);

    const heartbeatResponse = await fetch(`${baseUrl}/heartbeat`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        deviceId: winningCredential.deviceId,
        hostname: "CLEAN-PC",
      }),
    });
    assert.equal(heartbeatResponse.status, 200);
  } finally {
    if (server) {
      await new Promise<void>((resolve, reject) => {
        server!.close((error) => (error ? reject(error) : resolve()));
      });
    }

    deviceCredentialRepository.findMetadata = originals.findMetadata;
    deviceCredentialRepository.findForVerification = originals.findForVerification;
    deviceCredentialRepository.createInitial = originals.createInitial;
    deviceCredentialRepository.saveActive = originals.saveActive;
    deviceCredentialRepository.touchLastUsed = originals.touchLastUsed;
    managedDeviceService.enroll = originals.enroll;
    managedDeviceService.register = originals.register;
    managedDeviceService.heartbeat = originals.heartbeat;
  }
});
