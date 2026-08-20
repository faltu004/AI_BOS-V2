import test from "node:test";
import assert from "node:assert/strict";
import { configureBackendTestEnv } from "../helpers/backend-env.ts";

configureBackendTestEnv();

test("device enrollment reissues a credential for an already enrolled physical device without changing deviceId", async () => {
  const { deviceEnrollmentService } = await import(
    "../../backend/src/services/device-enrollment.service.ts"
  );
  const { managedDeviceService } = await import(
    "../../backend/src/services/managed-device.service.ts"
  );
  const { deviceCredentialService } = await import(
    "../../backend/src/services/device-credential.service.ts"
  );

  const originalEnroll = managedDeviceService.enroll;
  const originalIssueInitial = deviceCredentialService.issueInitialForDevice;
  const originalIssueForDevice = deviceCredentialService.issueForDevice;

  const calls: unknown[] = [];

  managedDeviceService.enroll = (async () => {
    calls.push(["managed-enroll"]);

    return {
      deviceId: "DEV-SAME-PHYSICAL-MACHINE",
      fingerprint: "stable-machine-fingerprint",
      hostname: "SIDHI-PC-04",
      status: "online",
    } as any;
  }) as any;

  deviceCredentialService.issueInitialForDevice = (async (deviceId: string) => {
    calls.push(["issue-initial", deviceId]);
    return null;
  }) as any;

  deviceCredentialService.issueForDevice = (async (deviceId: string) => {
    calls.push(["issue-replacement", deviceId]);

    return {
      deviceId,
      deviceToken: "aibos_device_replacement_test_token",
      credentialVersion: 2,
      issuedAt: new Date("2026-08-18T00:00:00.000Z"),
    };
  }) as any;

  try {
    const result = await deviceEnrollmentService.enroll({
      hostname: "SIDHI-PC-04",
      fingerprint: "stable-machine-fingerprint",
    });

    assert.equal(result.device.deviceId, "DEV-SAME-PHYSICAL-MACHINE");
    assert.equal(result.credential.deviceId, "DEV-SAME-PHYSICAL-MACHINE");
    assert.equal(result.credential.credentialVersion, 2);
    assert.deepEqual(calls, [
      ["managed-enroll"],
      ["issue-initial", "DEV-SAME-PHYSICAL-MACHINE"],
      ["issue-replacement", "DEV-SAME-PHYSICAL-MACHINE"],
    ]);
  } finally {
    managedDeviceService.enroll = originalEnroll;
    deviceCredentialService.issueInitialForDevice = originalIssueInitial;
    deviceCredentialService.issueForDevice = originalIssueForDevice;
  }
});
