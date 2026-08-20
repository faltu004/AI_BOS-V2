import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { requireLocalSetupRequest } from "../src/middleware/local-setup.middleware.js";
import { migrationCompatibilityEnabled } from "../src/utils/secure-secret.js";

const currentFile = fileURLToPath(import.meta.url);
const scriptsDir = path.dirname(currentFile);
const backendDir = path.resolve(scriptsDir, "..");
const repoRoot = path.resolve(backendDir, "..");

let checks = 0;

function runCheck(name: string, fn: () => void) {
  try {
    fn();
    checks += 1;
    console.log(`PASS: ${name}`);
  } catch (error) {
    console.error(`FAIL: ${name}`);
    throw error;
  }
}

function invokeLocalSetup(
  remoteAddress: string | undefined,
  extras: {
    ip?: string;
    hostname?: string;
    headers?: Record<string, string>;
  } = {},
) {
  let called = false;
  let nextError: unknown;

  const req = {
    socket: {
      remoteAddress,
    },
    ip: extras.ip,
    hostname: extras.hostname,
    headers: extras.headers ?? {},
  } as any;

  requireLocalSetupRequest(
    req,
    {} as any,
    (error?: unknown) => {
      called = true;
      nextError = error;
    },
  );

  assert.equal(called, true, "middleware did not call next()");
  return nextError;
}

function expectAllowed(
  remoteAddress: string,
  extras: {
    ip?: string;
    hostname?: string;
    headers?: Record<string, string>;
  } = {},
) {
  const result = invokeLocalSetup(remoteAddress, extras);
  assert.equal(result, undefined);
}

function expectDenied(
  remoteAddress: string,
  extras: {
    ip?: string;
    hostname?: string;
    headers?: Record<string, string>;
  } = {},
) {
  const result = invokeLocalSetup(remoteAddress, extras);

  assert.ok(
    result instanceof Error,
    "remote request should return an error",
  );

  assert.match(
    result.message,
    /First Owner setup is available only/,
  );
}

runCheck("IPv4 loopback is allowed", () => {
  expectAllowed("127.0.0.1");
});

runCheck("IPv6 loopback is allowed", () => {
  expectAllowed("::1");
});

runCheck("IPv4-mapped loopback is allowed", () => {
  expectAllowed("::ffff:127.0.0.1");
});

runCheck("LAN socket is denied", () => {
  expectDenied("192.168.1.50");
});

runCheck("remote socket cannot spoof Host localhost", () => {
  expectDenied(
    "192.168.1.50",
    {
      hostname: "localhost",
      headers: {
        host: "localhost",
      },
    },
  );
});

runCheck("remote socket cannot spoof req.ip loopback", () => {
  expectDenied(
    "192.168.1.50",
    {
      ip: "127.0.0.1",
      hostname: "localhost",
    },
  );
});

runCheck("remote socket cannot spoof forwarded headers", () => {
  expectDenied(
    "192.168.1.50",
    {
      ip: "127.0.0.1",
      hostname: "localhost",
      headers: {
        host: "localhost",
        "x-forwarded-for": "127.0.0.1",
        "x-forwarded-host": "localhost",
      },
    },
  );
});

const falseCompatibilityValues: unknown[] = [
  undefined,
  null,
  "",
  " ",
  "false",
  "FALSE",
  "0",
  "off",
  "OFF",
  "no",
  "NO",
  "unexpected-value",
];

for (const value of falseCompatibilityValues) {
  runCheck(
    `legacy compatibility rejects ${JSON.stringify(value)}`,
    () => {
      assert.equal(
        migrationCompatibilityEnabled(value),
        false,
      );
    },
  );
}

const trueCompatibilityValues: unknown[] = [
  "1",
  "true",
  "TRUE",
  "yes",
  "YES",
  "on",
  "ON",
  " true ",
];

for (const value of trueCompatibilityValues) {
  runCheck(
    `legacy compatibility accepts explicit ${JSON.stringify(value)}`,
    () => {
      assert.equal(
        migrationCompatibilityEnabled(value),
        true,
      );
    },
  );
}

runCheck("Express source explicitly disables trust proxy", () => {
  const appSource = fs.readFileSync(
    path.join(backendDir, "src", "app.ts"),
    "utf8",
  );

  assert.match(
    appSource,
    /app\.set\(["']trust proxy["'],\s*false\)/,
  );

  assert.doesNotMatch(
    appSource,
    /app\.set\(["']trust proxy["'],\s*1\)/,
  );
});

runCheck("production template explicitly disables legacy device auth", () => {
  const template = fs.readFileSync(
    path.join(
      repoRoot,
      "packaging",
      "server",
      "production.env.template",
    ),
    "utf8",
  );

  assert.match(
    template,
    /^ALLOW_LEGACY_DEVICE_AUTH=false$/m,
  );
});

runCheck("production template explicitly disables legacy enrollment fallback", () => {
  const template = fs.readFileSync(
    path.join(
      repoRoot,
      "packaging",
      "server",
      "production.env.template",
    ),
    "utf8",
  );

  assert.match(
    template,
    /^ALLOW_LEGACY_ENROLLMENT_FALLBACK=false$/m,
  );
});

console.log("");
console.log(`SECURITY_REGRESSION_PASS: ${checks} checks`);