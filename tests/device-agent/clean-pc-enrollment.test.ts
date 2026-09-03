import assert from "node:assert/strict";
import crypto from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("loopback enrollment handoff rejects browser origins and requires a one-use nonce", async () => {
  const { startDeviceBootstrapServer } = await import(
    "../../device-agent/src/device-bootstrap-server.ts"
  );

  let bootstrap: any = null;
  let credential: any = null;
  let storedCalls = 0;
  const handoffKeys = crypto.generateKeyPairSync("rsa", { modulusLength: 2048 });
  const handle = await startDeviceBootstrapServer({
    port: 0,
    getInventory: (async () => ({
      hostname: "CLEAN-PC",
      system: { uuid: "clean-pc-uuid" },
      network: [],
    })) as any,
    loadStoredDeviceCredential: (async () => credential) as any,
    loadBootstrapEnrollmentCredential: (async () => bootstrap) as any,
    persistBootstrapEnrollmentCredential: (async (enrollmentKey: string, deviceBinding: string) => {
      bootstrap = { enrollmentKey, deviceBinding, sourcePath: "protected" };
    }) as any,
    onBootstrapStored: () => {
      storedCalls += 1;
    },
    handoffCryptography: {
      signPayload: (payload) =>
        crypto.sign("RSA-SHA256", Buffer.from(payload, "utf8"), handoffKeys.privateKey).toString("base64"),
      decryptEnrollmentKey: (encrypted) =>
        crypto.privateDecrypt(
          {
            key: handoffKeys.privateKey,
            padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
            oaepHash: "sha256",
          },
          Buffer.from(encrypted, "base64"),
        ).toString("utf8"),
    },
  });

  try {
    const baseUrl = `http://127.0.0.1:${handle.port}/v1/enrollment`;
    const blocked = await fetch(`${baseUrl}/status`, { headers: { Origin: "https://attacker.example" } });
    assert.equal(blocked.status, 403);

    const statusResponse = await fetch(`${baseUrl}/status`);
    assert.equal(statusResponse.status, 200);
    const status = (await statusResponse.json() as any).data;
    assert.equal(status.state, "awaiting_bootstrap");
    assert.match(status.deviceBinding, /^[a-f0-9]{64}$/);
    const proofPayload = [
      "aibos-agent-handoff-v1",
      status.state,
      status.deviceBinding,
      status.handoffNonce,
      status.handoffNonceExpiresAt,
    ].join("\n");
    assert.equal(
      crypto.verify(
        "RSA-SHA256",
        Buffer.from(proofPayload, "utf8"),
        handoffKeys.publicKey,
        Buffer.from(status.agentProof, "base64"),
      ),
      true,
    );

    const encryptedEnrollmentKey = crypto.publicEncrypt(
      {
        key: handoffKeys.publicKey,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: "sha256",
      },
      Buffer.from("aibos_enroll_ot_test-key", "utf8"),
    ).toString("base64");

    const invalidNonce = await fetch(`${baseUrl}/bootstrap`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        encryptedEnrollmentKey,
        deviceBinding: status.deviceBinding,
        handoffNonce: "invalid",
      }),
    });
    assert.equal(invalidNonce.status, 403);

    const accepted = await fetch(`${baseUrl}/bootstrap`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        encryptedEnrollmentKey,
        deviceBinding: status.deviceBinding,
        handoffNonce: status.handoffNonce,
      }),
    });
    assert.equal(accepted.status, 202);
    assert.equal(bootstrap.enrollmentKey, "aibos_enroll_ot_test-key");
    assert.equal(bootstrap.deviceBinding, status.deviceBinding);
    assert.equal(storedCalls, 1);

    const replay = await fetch(`${baseUrl}/bootstrap`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        encryptedEnrollmentKey,
        deviceBinding: status.deviceBinding,
        handoffNonce: status.handoffNonce,
      }),
    });
    assert.equal(replay.status, 403);

    credential = { deviceId: "device-1", deviceToken: "aibos_dev_test" };
    const enrolled = await fetch(`${baseUrl}/status`);
    const enrolledStatus = (await enrolled.json() as any).data;
    assert.equal(enrolledStatus.state, "enrolled");

    const unnecessaryBootstrap = await fetch(`${baseUrl}/bootstrap`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        encryptedEnrollmentKey,
        deviceBinding: enrolledStatus.deviceBinding,
        handoffNonce: enrolledStatus.handoffNonce,
      }),
    });
    assert.equal(unnecessaryBootstrap.status, 409);
    assert.equal((await unnecessaryBootstrap.json() as any).data.state, "enrolled");
    assert.equal(storedCalls, 1, "an enrolled Agent must not accept another initial bootstrap");
  } finally {
    await handle.stop();
  }
});

test("loopback recovery handoff requires explicit recovery state and exposes no authorization", async () => {
  const { startDeviceBootstrapServer } = await import(
    "../../device-agent/src/device-bootstrap-server.ts"
  );

  const handoffKeys = crypto.generateKeyPairSync(
    "rsa",
    { modulusLength: 2048 },
  );
  const deviceId = "DEV-RECOVERY-BOUND";
  const recoveryAuthorization =
    "aibos_recover_ot_loopback-test";
  let recoveryRequired = true;
  let receivedRecovery: any = null;
  const handle = await startDeviceBootstrapServer({
    port: 0,
    getInventory: (async () => ({
      hostname: "RECOVERY-PC",
      system: {
        uuid: "recovery-pc-uuid",
      },
      network: [],
    })) as any,
    loadStoredDeviceCredential: (async () => ({
      deviceId,
      deviceToken:
        "aibos_device_rejected-local-token",
    })) as any,
    loadBootstrapEnrollmentCredential:
      (async () => null) as any,
    persistBootstrapEnrollmentCredential:
      (async () => {
        throw new Error(
          "Recovery must not write a bootstrap artifact",
        );
      }) as any,
    isCredentialRecoveryRequired: () =>
      recoveryRequired,
    onCredentialRecoveryAuthorized:
      async (input) => {
        receivedRecovery = input;
        recoveryRequired = false;
      },
    handoffCryptography: {
      signPayload: (payload) =>
        crypto.sign(
          "RSA-SHA256",
          Buffer.from(payload, "utf8"),
          handoffKeys.privateKey,
        ).toString("base64"),
      decryptEnrollmentKey: (encrypted) =>
        crypto.privateDecrypt(
          {
            key: handoffKeys.privateKey,
            padding:
              crypto.constants
                .RSA_PKCS1_OAEP_PADDING,
            oaepHash: "sha256",
          },
          Buffer.from(encrypted, "base64"),
        ).toString("utf8"),
    },
  });

  try {
    const baseUrl =
      `http://127.0.0.1:${handle.port}/v1/enrollment`;
    const statusResponse = await fetch(
      `${baseUrl}/status`,
    );
    assert.equal(statusResponse.status, 200);
    const status =
      (await statusResponse.json() as any).data;
    assert.equal(
      status.state,
      "recovery_required",
    );
    assert.equal(status.deviceId, deviceId);

    const encryptedRecoveryAuthorization =
      crypto.publicEncrypt(
        {
          key: handoffKeys.publicKey,
          padding:
            crypto.constants
              .RSA_PKCS1_OAEP_PADDING,
          oaepHash: "sha256",
        },
        Buffer.from(
          recoveryAuthorization,
          "utf8",
        ),
      ).toString("base64");

    const accepted = await fetch(
      `${baseUrl}/recovery`,
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify({
          encryptedRecoveryAuthorization,
          deviceId,
          deviceBinding:
            status.deviceBinding,
          handoffNonce:
            status.handoffNonce,
        }),
      },
    );
    assert.equal(accepted.status, 200);
    const acceptedBody =
      await accepted.json() as any;
    assert.equal(
      acceptedBody.data.state,
      "recovered",
    );
    assert.equal(
      JSON.stringify(acceptedBody).includes(
        recoveryAuthorization,
      ),
      false,
    );
    assert.deepEqual(receivedRecovery, {
      deviceId,
      deviceBinding:
        status.deviceBinding,
      recoveryAuthorization,
    });

    const replay = await fetch(
      `${baseUrl}/recovery`,
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify({
          encryptedRecoveryAuthorization,
          deviceId,
          deviceBinding:
            status.deviceBinding,
          handoffNonce:
            status.handoffNonce,
        }),
      },
    );
    assert.equal(replay.status, 403);

    const enrolled = await fetch(
      `${baseUrl}/status`,
    );
    assert.equal(
      (await enrolled.json() as any).data.state,
      "enrolled",
    );
  } finally {
    await handle.stop();
  }
});

test("racing login handoffs persist only one initial bootstrap", async () => {
  const { startDeviceBootstrapServer } = await import(
    "../../device-agent/src/device-bootstrap-server.ts"
  );

  let bootstrap: any = null;
  let persistCalls = 0;
  let signalPersistStarted: (() => void) | undefined;
  let releasePersist: (() => void) | undefined;
  const persistStarted = new Promise<void>((resolve) => {
    signalPersistStarted = resolve;
  });
  const persistGate = new Promise<void>((resolve) => {
    releasePersist = resolve;
  });
  const handoffKeys = crypto.generateKeyPairSync("rsa", { modulusLength: 2048 });
  const handle = await startDeviceBootstrapServer({
    port: 0,
    getInventory: (async () => ({
      hostname: "RACING-CLEAN-PC",
      system: { uuid: "racing-clean-pc-uuid" },
      network: [],
    })) as any,
    loadStoredDeviceCredential: (async () => null) as any,
    loadBootstrapEnrollmentCredential: (async () => bootstrap) as any,
    persistBootstrapEnrollmentCredential: (async (enrollmentKey: string, deviceBinding: string) => {
      persistCalls += 1;
      signalPersistStarted?.();
      await persistGate;
      bootstrap = { enrollmentKey, deviceBinding, sourcePath: "protected" };
    }) as any,
    handoffCryptography: {
      signPayload: (payload) =>
        crypto.sign("RSA-SHA256", Buffer.from(payload, "utf8"), handoffKeys.privateKey).toString("base64"),
      decryptEnrollmentKey: (encrypted) =>
        crypto.privateDecrypt(
          {
            key: handoffKeys.privateKey,
            padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
            oaepHash: "sha256",
          },
          Buffer.from(encrypted, "base64"),
        ).toString("utf8"),
    },
  });

  try {
    const baseUrl = `http://127.0.0.1:${handle.port}/v1/enrollment`;
    const firstStatus = (await (await fetch(`${baseUrl}/status`)).json() as any).data;
    const secondStatus = (await (await fetch(`${baseUrl}/status`)).json() as any).data;
    const encrypt = (value: string) =>
      crypto.publicEncrypt(
        {
          key: handoffKeys.publicKey,
          padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
          oaepHash: "sha256",
        },
        Buffer.from(value, "utf8"),
      ).toString("base64");
    const postBootstrap = (status: any, value: string) => fetch(`${baseUrl}/bootstrap`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        encryptedEnrollmentKey: encrypt(value),
        deviceBinding: status.deviceBinding,
        handoffNonce: status.handoffNonce,
      }),
    });

    const firstRequest = postBootstrap(firstStatus, "aibos_enroll_ot_first");
    await persistStarted;

    const secondResponse = await postBootstrap(secondStatus, "aibos_enroll_ot_second");
    assert.equal(secondResponse.status, 409);
    assert.equal((await secondResponse.json() as any).data.state, "bootstrap_pending");

    releasePersist?.();
    const firstResponse = await firstRequest;
    assert.equal(firstResponse.status, 202);
    assert.equal(persistCalls, 1);
    assert.equal(bootstrap.enrollmentKey, "aibos_enroll_ot_first");
  } finally {
    releasePersist?.();
    await handle.stop();
  }
});

test("Employee login enrollment bridge is wired without exposing the bootstrap to renderer code", async () => {
  const [main, preload, frontend, agent, heartbeat] = await Promise.all([
    readFile("electron/employee-main.cjs", "utf8"),
    readFile("electron/preload.cjs", "utf8"),
    readFile("frontend/src/features/auth/DeviceEnrollmentBootstrap.tsx", "utf8"),
    readFile("device-agent/src/index.ts", "utf8"),
    readFile("device-agent/src/heartbeat.ts", "utf8"),
  ]);

  assert.match(main, /enrollment-credentials\/self/);
  assert.match(main, /credential\/recovery\/self/);
  assert.match(main, /encryptedRecoveryAuthorization/);
  assert.match(main, /AGENT_ENROLLMENT_BASE_URL[\s\S]*127\.0\.0\.1:57945/);
  assert.match(main, /encryptedEnrollmentKey, deviceBinding, handoffNonce/);
  assert.match(main, /RSA_PKCS1_OAEP_PADDING/);
  assert.match(main, /crypto\.verify/);
  assert.match(main, /enrollmentConfirmed/);
  assert.match(main, /response\.status === 409/);
  assert.match(main, /requestSingleInstanceLock/);
  assert.doesNotMatch(preload, /enrollmentKey/);
  assert.doesNotMatch(preload, /recoveryAuthorization/);
  assert.match(preload, /ensureDeviceEnrollment/);
  assert.match(frontend, /session\.user\.mustChangePassword/);
  assert.doesNotMatch(frontend, /recoveryAuthorization/);
  assert.match(agent, /startDeviceBootstrapServer/);
  assert.match(agent, /requestImmediateStartupRetry/);
  assert.match(heartbeat, /sendHeartbeat|heartbeat/i);
});

test("install-local handoff private key is protected and only the public key is user-readable", async () => {
  const [keySource, installerSource] = await Promise.all([
    readFile("device-agent/src/enrollment-handoff-key.ts", "utf8"),
    readFile("packaging/windows/install-device-services.ps1", "utf8"),
  ]);

  assert.match(keySource, /\.enrollment-handoff-private\.pem/);
  assert.match(keySource, /hardenProtectedAgentFile/);
  assert.match(keySource, /RSA_PKCS1_OAEP_PADDING/);
  assert.match(installerSource, /DeviceHandoff/);
  assert.match(installerSource, /S-1-5-32-545:\(OI\)\(CI\)RX/);
  assert.doesNotMatch(installerSource, /PRIVATE KEY/);
});

test("backend and Device Agent derive the same binding from the stable fingerprint", async () => {
  const { deriveDeviceBinding } = await import("../../device-agent/src/device-binding.ts");
  const { deriveDeviceBindingFromFingerprint } = await import(
    "../../backend/src/utils/device-binding.ts"
  );

  const fingerprint = "stable-hardware-uuid";
  assert.equal(
    deriveDeviceBindingFromFingerprint(fingerprint),
    deriveDeviceBinding(fingerprint),
  );
});
