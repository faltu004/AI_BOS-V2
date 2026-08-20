import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";

process.env.NODE_ENV = "test";
process.env.BACKEND_URL = "https://ADMIN-WORKNAI:5443";
process.env.AI_BOS_SESSION_TELEMETRY_PORT = "57944";

const telemetryModule = await import("../../device-agent/src/session-telemetry.ts");
const serverModule = await import("../../device-agent/src/session-telemetry-server.ts");
const publisherModule = await import("../../device-agent/src/session-telemetry-publisher.ts");
const networkModule = await import("../../device-agent/src/network.ts");

const {
  clearSessionTelemetryForTest,
  getFreshSessionTelemetry,
  normalizeSessionTelemetry,
  telemetryTtlMs,
} = telemetryModule;

async function waitFor(predicate: () => boolean): Promise<void> {
  const deadline = Date.now() + 2_000;

  while (Date.now() < deadline) {
    if (predicate()) {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 20));
  }

  throw new Error("Timed out waiting for condition");
}

function validTelemetry(collectedAt = new Date().toISOString()) {
  return {
    deviceId: "DEV-SESSION",
    currentUser: "amant",
    sessionState: "active",
    currentApplication: {
      processName: "Code.exe",
      pid: 1234,
      capturedAt: collectedAt,
    },
    collectedAt,
  };
}

test.beforeEach(() => {
  clearSessionTelemetryForTest();
});

test("normalizes session helper telemetry and expires stale state", () => {
  const collectedAt = new Date("2026-08-18T10:00:00.000Z").toISOString();
  const normalized = normalizeSessionTelemetry(validTelemetry(collectedAt));

  assert.equal(normalized?.deviceId, "DEV-SESSION");
  assert.equal(normalized?.currentUser, "amant");
  assert.equal(normalized?.sessionState, "active");
  assert.equal(normalized?.currentApplication?.processName, "Code.exe");

  telemetryModule.updateLatestSessionTelemetry(normalized!);

  assert.equal(
    getFreshSessionTelemetry(new Date(collectedAt).getTime() + telemetryTtlMs - 1).stale,
    false,
  );
  assert.equal(
    getFreshSessionTelemetry(new Date(collectedAt).getTime() + telemetryTtlMs + 1).stale,
    true,
  );
});

test("local Agent IPC receiver accepts helper telemetry with matching device id", async () => {
  const originalLog = console.log;
  console.log = () => undefined;

  const stop = serverModule.startSessionTelemetryServer({
    deviceId: "DEV-SESSION",
  });

  try {
    await new Promise((resolve) => setTimeout(resolve, 50));

    const response = await fetch(serverModule.getSessionTelemetryEndpoint(), {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-aibos-device-id": "DEV-SESSION",
      },
      body: JSON.stringify(validTelemetry()),
    });

    assert.equal(response.status, 200);
    assert.equal(getFreshSessionTelemetry().telemetry?.currentApplication?.processName, "Code.exe");
  } finally {
    await stop();
    console.log = originalLog;
  }
});

test("local Agent IPC receiver stamps device id for limited helper telemetry", async () => {
  const originalLog = console.log;
  console.log = () => undefined;

  const stop = serverModule.startSessionTelemetryServer({
    deviceId: "DEV-SESSION",
  });

  try {
    await new Promise((resolve) => setTimeout(resolve, 50));

    const payload = validTelemetry();
    delete (payload as Partial<typeof payload>).deviceId;

    const response = await fetch(serverModule.getSessionTelemetryEndpoint(), {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    assert.equal(response.status, 200);
    assert.equal(getFreshSessionTelemetry().telemetry?.deviceId, "DEV-SESSION");
    assert.equal(getFreshSessionTelemetry().telemetry?.currentUser, "amant");
  } finally {
    await stop();
    console.log = originalLog;
  }
});

test("limited helper pending, consent, and end calls traverse the SYSTEM Agent proxy", async () => {
  const calls: unknown[] = [];
  const stop = serverModule.startSessionTelemetryServer({
    deviceId: "DEV-SESSION",
    remoteSupportBackend: {
      getPending: async (deviceId) => {
        calls.push(["pending", deviceId]);
        return {
          status: 200,
          data: {
            success: true,
            data: {
              requests: [
                {
                  sessionId: "RMS-LOCAL-1",
                  requestedBy: "admin-user-1",
                  requestedByRole: "Administrator",
                  requestedAt: new Date().toISOString(),
                  expiresAt: new Date(Date.now() + 60_000).toISOString(),
                  capabilities: {
                    screenView: true,
                    remoteControl: true,
                    recording: false,
                  },
                },
              ],
            },
          },
        };
      },
      submitConsent: async (deviceId, sessionId, decision) => {
        calls.push(["consent", deviceId, sessionId, decision]);
        return {
          status: 200,
          data: {
            success: true,
            data: {
              endpointToken: "endpoint-token-local",
              session: {
                expiresAt: new Date(Date.now() + 60_000).toISOString(),
              },
            },
          },
        };
      },
      endSession: async (deviceId, sessionId, reason) => {
        calls.push(["end", deviceId, sessionId, reason]);
        return {
          status: 200,
          data: { success: true },
        };
      },
    },
  });

  try {
    await new Promise((resolve) => setTimeout(resolve, 50));
    const { createLocalRemoteSupportConsentApi, endRemoteSupportViaLocalAgent } =
      await import("../../device-agent/src/remote-support-local-client.ts");
    const localApi = createLocalRemoteSupportConsentApi();
    const pending = await localApi.getPending();
    assert.equal((pending.requests as any[])[0]?.sessionId, "RMS-LOCAL-1");
    const approved = await localApi.submitDecision("RMS-LOCAL-1", "allow");
    assert.equal(approved.endpointToken, "endpoint-token-local");
    await endRemoteSupportViaLocalAgent({
      sessionId: "RMS-LOCAL-1",
      reason: "User disconnected",
    });
    assert.deepEqual(calls, [
      ["pending", "DEV-SESSION"],
      ["consent", "DEV-SESSION", "RMS-LOCAL-1", "allow"],
      ["end", "DEV-SESSION", "RMS-LOCAL-1", "User disconnected"],
    ]);
  } finally {
    await stop();
  }
});

test("session helper publisher reconnects when local Agent receiver starts later", async () => {
  const requests: unknown[] = [];
  const server = http.createServer((request, response) => {
    let body = "";
    request.setEncoding("utf8");
    request.on("data", (chunk) => {
      body += chunk;
    });
    request.on("end", () => {
      requests.push({
        url: request.url,
        deviceId: request.headers["x-aibos-device-id"],
        body: JSON.parse(body),
      });
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify({ success: true }));
    });
  });

  const endpoint = "http://127.0.0.1:57945/session-telemetry";
  const originalLog = console.log;
  const originalError = console.error;
  console.log = () => undefined;
  console.error = () => undefined;

  const stopPublisher = publisherModule.startSessionTelemetryPublisher({
    deviceId: "DEV-SESSION",
    endpoint,
    intervalMs: 50,
    collectTelemetry: async () => validTelemetry(),
  });

  try {
    await new Promise((resolve) => setTimeout(resolve, 120));
    await new Promise<void>((resolve) => server.listen(57945, "127.0.0.1", resolve));
    await waitFor(() => requests.length > 0);

    assert.equal((requests[0] as any).deviceId, "DEV-SESSION");
    assert.equal((requests[0] as any).body.currentUser, "amant");
    assert.equal((requests[0] as any).body.publishedAt.length > 0, true);
  } finally {
    await stopPublisher();
    await new Promise<void>((resolve) => server.close(() => resolve()));
    console.log = originalLog;
    console.error = originalError;
  }
});

test("network address ordering keeps IPv4 before link-local IPv6 without disabling TLS", () => {
  const sorted = networkModule.preferOperationalDnsAddresses([
    { address: "fe80::abcd", family: 6 },
    { address: "192.168.1.25", family: 4 },
    { address: "2401:abcd::1", family: 6 },
  ]);

  assert.equal(sorted[0]?.address, "192.168.1.25");
  assert.equal(sorted[2]?.address, "fe80::abcd");
  assert.equal(networkModule.isLinkLocalIpv6("fe80::1"), true);
});

test("limited Session Helper does not import credential enrollment or protected storage setup", async () => {
  const root = process.cwd();
  const helperSource = await readFile(
    path.join(root, "device-agent/src/session-helper.ts"),
    "utf8",
  );
  const configSource = await readFile(
    path.join(root, "device-agent/src/config.ts"),
    "utf8",
  );
  const localRemoteClientSource = await readFile(
    path.join(root, "device-agent/src/remote-support-local-client.ts"),
    "utf8",
  );
  const remoteConsentSource = await readFile(
    path.join(root, "device-agent/src/remote-support-consent.ts"),
    "utf8",
  );
  const remoteTransportSource = await readFile(
    path.join(root, "device-agent/src/remote-support-transport.ts"),
    "utf8",
  );

  assert.equal(helperSource.includes("prepareDeviceIdentity"), false);
  assert.equal(helperSource.includes("device-enrollment"), false);
  assert.equal(helperSource.includes("getDeviceAuthHeaders"), false);
  assert.equal(helperSource.includes("device-auth"), false);
  assert.equal(localRemoteClientSource.includes("device-auth"), false);
  assert.equal(remoteConsentSource.includes('from "./device-auth.js"'), false);
  assert.equal(remoteTransportSource.includes("getDeviceSocketAuth"), false);
  assert.equal(remoteTransportSource.includes("device-auth"), false);
  assert.equal(configSource.includes("ensureProtectedAgentRootSync"), false);
});

test("Session Helper preserves remote support interactive startup wiring", async () => {
  const helperSource = await readFile(
    path.join(process.cwd(), "device-agent/src/session-helper.ts"),
    "utf8",
  );

  assert.equal(helperSource.includes("startRemoteSupportConsentWatcher"), true);
  assert.equal(helperSource.includes("createLocalRemoteSupportConsentApi"), true);
  assert.equal(helperSource.includes("startRemoteSupportTransport"), true);
  assert.equal(helperSource.includes("startRemoteSupportScreenProducer"), true);
  assert.equal(helperSource.includes("startRemoteSupportInputExecutor"), true);
  assert.equal(helperSource.includes("startRemoteSupportIndicator"), true);
  assert.equal(helperSource.includes("requestRemoteSupportExclusiveControlConsent"), true);
  assert.equal(helperSource.includes("endRemoteSupportViaLocalAgent"), true);
});

test("remote support transport starts only after visible consent is submitted", async () => {
  const { startRemoteSupportConsentWatcher } = await import(
    "../../device-agent/src/remote-support-consent.ts"
  );
  const events: string[] = [];
  let resolveApproved: (() => void) | undefined;
  const approved = new Promise<void>((resolve) => {
    resolveApproved = resolve;
  });

  const stop = startRemoteSupportConsentWatcher({
    api: {
      getPending: async () => ({
        requests: [
          {
            sessionId: "RMS-CONSENT-ALLOW",
            requestedBy: "admin-user-1",
            requestedByRole: "Administrator",
            requestedAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 60_000).toISOString(),
            capabilities: {
              screenView: true,
              remoteControl: true,
              recording: false,
            },
          },
        ],
      }),
      submitDecision: async (_sessionId, decision) => {
        events.push(`submit:${decision}`);
        return {
          endpointToken: "endpoint-token-1",
          session: {
            expiresAt: new Date(Date.now() + 60_000).toISOString(),
          },
        };
      },
    },
    requestConsent: async () => {
      events.push("visible-consent");
      return "allow";
    },
    onApproved: async (session) => {
      events.push(`transport:${session.endpointToken}`);
      resolveApproved?.();
    },
  });

  try {
    await Promise.race([
      approved,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Consent watcher timed out")), 2_000),
      ),
    ]);
    assert.deepEqual(events, [
      "visible-consent",
      "submit:allow",
      "transport:endpoint-token-1",
    ]);
  } finally {
    stop();
  }
});

test("declined remote support consent never starts transport", async () => {
  const { startRemoteSupportConsentWatcher } = await import(
    "../../device-agent/src/remote-support-consent.ts"
  );
  const events: string[] = [];
  let resolveSubmitted: (() => void) | undefined;
  const submitted = new Promise<void>((resolve) => {
    resolveSubmitted = resolve;
  });

  const stop = startRemoteSupportConsentWatcher({
    api: {
      getPending: async () => ({
        requests: [
          {
            sessionId: "RMS-CONSENT-DECLINE",
            requestedBy: "admin-user-1",
            requestedByRole: "Administrator",
            requestedAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 60_000).toISOString(),
            capabilities: {
              screenView: true,
              remoteControl: true,
              recording: false,
            },
          },
        ],
      }),
      submitDecision: async (_sessionId, decision) => {
        events.push(`submit:${decision}`);
        resolveSubmitted?.();
        return {};
      },
    },
    requestConsent: async () => {
      events.push("visible-consent");
      return "decline";
    },
    onApproved: async () => {
      events.push("transport");
    },
  });

  try {
    await Promise.race([
      submitted,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Consent watcher timed out")), 2_000),
      ),
    ]);
    assert.deepEqual(events, ["visible-consent", "submit:decline"]);
  } finally {
    stop();
  }
});

test("SYSTEM Agent remains responsible for remote support backend auth and protected credential ACLs", async () => {
  const root = process.cwd();
  const localServerSource = await readFile(
    path.join(root, "device-agent/src/session-telemetry-server.ts"),
    "utf8",
  );
  const agentStorageSource = await readFile(
    path.join(root, "device-agent/src/agent-storage.ts"),
    "utf8",
  );
  const credentialStoreSource = await readFile(
    path.join(root, "device-agent/src/device-credential-store.ts"),
    "utf8",
  );
  const installScript = await readFile(
    path.join(root, "packaging/windows/install-device-services.ps1"),
    "utf8",
  );
  const provisioningScript = await readFile(
    path.join(root, "packaging/windows/provisioning/Install-AiBosDeviceEnrollmentPackage.ps1"),
    "utf8",
  );

  assert.equal(localServerSource.includes("getDeviceAuthHeaders"), true);
  assert.equal(localServerSource.includes("/api/v1/devices/remote-sessions/pending"), true);
  assert.equal(localServerSource.includes("/consent"), true);
  assert.equal(localServerSource.includes("/end"), true);
  assert.equal(agentStorageSource.includes("icacls.exe"), true);
  assert.equal(agentStorageSource.includes("*S-1-5-18:(OI)(CI)F"), true);
  assert.equal(agentStorageSource.includes("*S-1-5-32-544:(OI)(CI)F"), true);
  assert.equal(credentialStoreSource.includes("await ensureProtectedAgentRoot();"), true);
  assert.equal(installScript.includes("Assert-ProtectedAgentAcl"), true);
  assert.equal(provisioningScript.includes("Protect-AgentDataRoot"), true);
  assert.equal(provisioningScript.includes("Protect-BootstrapFile"), true);
});
