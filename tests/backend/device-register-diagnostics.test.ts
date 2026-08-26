import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";

import { configureBackendTestEnv } from "../helpers/backend-env.ts";

configureBackendTestEnv();

/*
 * Deterministic 401 path for the "no device headers presented" case:
 * legacy x-device-key compatibility must be off so an unauthenticated
 * register attempt cannot fall through to a 500 (misconfigured legacy
 * key) instead of the expected 401.
 */
const originalAllowLegacyDeviceAuth = process.env.ALLOW_LEGACY_DEVICE_AUTH;
process.env.ALLOW_LEGACY_DEVICE_AUTH = "false";

const { createApp } = await import("../../backend/src/app.ts");
const { logger } = await import("../../backend/src/utils/logger.ts");

const server = createServer(createApp());

await new Promise<void>((resolve) => {
  server.listen(0, "127.0.0.1", resolve);
});

const serverAddress = server.address() as AddressInfo;
const baseUrl = `http://127.0.0.1:${serverAddress.port}`;

type LoggedCall = {
  payload: Record<string, unknown>;
  message: string;
};

let loggedCalls: LoggedCall[] = [];

const originalLoggerInfo = logger.info.bind(logger);

logger.info = ((payload: unknown, message?: string) => {
  loggedCalls.push({
    payload: payload as Record<string, unknown>,
    message: message ?? "",
  });

  return originalLoggerInfo(payload as never, message as never);
}) as typeof logger.info;

function findRegisterLog(): LoggedCall | undefined {
  return loggedCalls.find(
    (call) => call.payload.event === "device_register_attempt",
  );
}

test.after(async () => {
  logger.info = originalLoggerInfo;

  if (originalAllowLegacyDeviceAuth === undefined) {
    delete process.env.ALLOW_LEGACY_DEVICE_AUTH;
  } else {
    process.env.ALLOW_LEGACY_DEVICE_AUTH = originalAllowLegacyDeviceAuth;
  }

  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
});

test(
  "an unauthenticated /register attempt is logged with request id, status, and forwarded headers, without leaking the presented credential",
  async () => {
    loggedCalls = [];

    const response = await fetch(`${baseUrl}/api/v1/devices/register`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-forwarded-for": "203.0.113.7, 10.0.0.1",
        "x-forwarded-proto": "https",
        "user-agent": "AIBOS-Diagnostics-Test/1.0",
        "x-device-id": "DEV-DIAGNOSTICS-FAKE",
        "x-device-token": "totally-secret-fake-device-token-value",
      },
      body: JSON.stringify({ hostname: "SHOULD-NOT-BE-LOGGED-PC" }),
    });

    assert.equal(response.status, 401);

    const requestId = response.headers.get("x-request-id");
    assert.ok(requestId);

    const registerLog = findRegisterLog();
    assert.ok(registerLog, "expected a device_register_attempt log entry");

    const payload = registerLog!.payload;

    assert.equal(payload.requestId, requestId);
    assert.equal(payload.statusCode, 401);
    assert.equal(payload.forwardedFor, "203.0.113.7");
    assert.equal(payload.forwardedProto, "https");
    assert.equal(payload.userAgent, "AIBOS-Diagnostics-Test/1.0");
    assert.equal(typeof payload.socketRemoteAddress, "string");
    assert.ok((payload.socketRemoteAddress as string).length > 0);

    assert.deepEqual(
      Object.keys(payload).sort(),
      [
        "event",
        "forwardedFor",
        "forwardedProto",
        "requestId",
        "socketRemoteAddress",
        "statusCode",
        "userAgent",
      ].sort(),
    );

    const serialized = JSON.stringify(payload);
    assert.doesNotMatch(serialized, /totally-secret-fake-device-token-value/);
    assert.doesNotMatch(serialized, /DEV-DIAGNOSTICS-FAKE/);
    assert.doesNotMatch(serialized, /SHOULD-NOT-BE-LOGGED-PC/);
  },
);

test(
  "a /register attempt with no forwarding headers at all still logs cleanly",
  async () => {
    loggedCalls = [];

    const response = await fetch(`${baseUrl}/api/v1/devices/register`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({}),
    });

    assert.equal(response.status, 401);

    const registerLog = findRegisterLog();
    assert.ok(registerLog, "expected a device_register_attempt log entry");

    const payload = registerLog!.payload;

    assert.equal(payload.statusCode, 401);
    assert.equal(payload.forwardedFor, undefined);
    assert.equal(typeof payload.socketRemoteAddress, "string");
  },
);

test(
  "a spoofed X-Forwarded-For cannot change the authentication outcome; it is only ever logged, never trusted",
  async () => {
    loggedCalls = [];

    const response = await fetch(`${baseUrl}/api/v1/devices/register`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        // Impersonates a trusted-looking internal address; must have no
        // bearing on the auth decision made by verifyDeviceAgent.
        "x-forwarded-for": "127.0.0.1",
        "x-device-id": "DEV-SPOOF-ATTEMPT",
        "x-device-token": "still-not-a-real-token",
      },
      body: JSON.stringify({}),
    });

    assert.equal(
      response.status,
      401,
      "a spoofed X-Forwarded-For must not grant access",
    );

    const registerLog = findRegisterLog();
    assert.ok(registerLog);
    assert.equal(registerLog!.payload.statusCode, 401);
    assert.equal(registerLog!.payload.forwardedFor, "127.0.0.1");
  },
);
