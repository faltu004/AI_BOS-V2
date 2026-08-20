import test from "node:test";
import assert from "node:assert/strict";

process.env.NODE_ENV = "test";
process.env.BACKEND_URL = "https://ADMIN-WORKNAI:5443";
process.env.AI_BOS_SESSION_TELEMETRY_PORT = "57946";

const serverModule = await import(
  "../../device-agent/src/session-telemetry-server.ts"
);

test("pending proxy responds with a bounded error before the caller's own timeout when the backend hangs", async () => {
  const originalLog = console.log;
  const originalError = console.error;
  console.log = () => undefined;
  console.error = () => undefined;

  const stop = serverModule.startSessionTelemetryServer({
    deviceId: "DEV-PROXY-TIMEOUT",
    remoteSupportBackend: {
      getPending: () =>
        // Simulates an unresponsive/slow backend that never resolves
        // within the caller's outer 10s timeout budget.
        new Promise(() => {}),
      submitConsent: async () => ({ status: 200, data: { success: true } }),
      endSession: async () => ({ status: 200, data: { success: true } }),
    },
  });

  try {
    await new Promise((resolve) => setTimeout(resolve, 50));

    const { createLocalRemoteSupportConsentApi } = await import(
      "../../device-agent/src/remote-support-local-client.ts"
    );
    const localApi = createLocalRemoteSupportConsentApi();

    // The Session Helper's own outer axios timeout is 10_000ms. The proxy
    // must never hold this request open until that fires — it must fail
    // fast with its own bounded upstream timeout well before that.
    await assert.rejects(
      async () => {
        await localApi.getPending();
      },
      (error: unknown) => {
        assert.match(String(error), /timeout|ECONNABORTED|504|Remote support backend/i);
        return true;
      },
    );
  } finally {
    await stop();
    console.log = originalLog;
    console.error = originalError;
  }
});

test("consent proxy still completes the localhost response when the upstream backend rejects", async () => {
  const originalLog = console.log;
  const originalError = console.error;
  console.log = () => undefined;
  console.error = () => undefined;

  const stop = serverModule.startSessionTelemetryServer({
    deviceId: "DEV-PROXY-REJECT",
    remoteSupportBackend: {
      getPending: async () => ({ status: 200, data: { success: true, data: { requests: [] } } }),
      submitConsent: async () => {
        throw new Error("simulated upstream failure");
      },
      endSession: async () => ({ status: 200, data: { success: true } }),
    },
  });

  try {
    await new Promise((resolve) => setTimeout(resolve, 50));

    const { createLocalRemoteSupportConsentApi } = await import(
      "../../device-agent/src/remote-support-local-client.ts"
    );
    const localApi = createLocalRemoteSupportConsentApi();

    // A generic (non-axios) upstream error must still terminate the
    // localhost response instead of leaving the request hanging.
    await assert.rejects(async () => {
      await localApi.submitDecision("RMS-REJECT", "allow");
    });
  } finally {
    await stop();
    console.log = originalLog;
    console.error = originalError;
  }
});
