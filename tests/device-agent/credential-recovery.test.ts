import test from "node:test";
import assert from "node:assert/strict";
import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import os from "node:os";

process.env.NODE_ENV = "test";
process.env.BACKEND_URL = "https://ADMIN-WORKNAI:5443";
process.env.DEVICE_ID = "";
process.env.DEVICE_TOKEN = "";
process.env.DEVICE_ENROLLMENT_KEY = "";
process.env.HEARTBEAT_INTERVAL = "30000";

const originalPath = process.env.PATH;

const testRoot = path.join(
  os.tmpdir(),
  "AI BOS Device Recovery Test " + Date.now().toString(36),
);

process.env.ProgramData = path.join(testRoot, "ProgramData");
process.env.PROGRAMDATA = process.env.ProgramData;

const si = (await import(
  "../../device-agent/node_modules/systeminformation/lib/index.js"
)).default as any;
si.osInfo = async () => ({
  hostname: "SIDHI-PC-04",
  distro: "Windows",
  release: "11",
  arch: "x64",
});
si.cpu = async () => ({ manufacturer: "Test", brand: "CPU" });
si.mem = async () => ({ total: 16 });
si.diskLayout = async () => [];
si.graphics = async () => ({ controllers: [], displays: [] });
si.system = async () => ({ uuid: "stable-test-machine-uuid" });
si.bios = async () => ({ serial: "stable-test-machine-serial" });
si.networkInterfaces = async () => [
  {
    default: true,
    internal: false,
    virtual: false,
    mac: "00:11:22:33:44:55",
    operstate: "up",
    ip4: "127.0.0.1",
  },
];
si.currentLoad = async () => ({ currentLoad: 10 });
si.fsSize = async () => [{ mount: "C:", use: 20 }];
si.battery = async () => ({ hasBattery: false });

const axios = (await import(
  "../../device-agent/node_modules/axios/index.js"
)).default as any;
const originalPost = axios.post;

process.env.PATH = "";

const {
  isDeviceEnrollmentRequiredError,
  isInvalidDeviceAuthenticationError,
  prepareDeviceIdentity,
} = await import("../../device-agent/src/device-enrollment.ts");

const { startHeartbeat } = await import("../../device-agent/src/heartbeat.ts");
const {
  clearSessionTelemetryForTest,
  updateLatestSessionTelemetry,
} = await import("../../device-agent/src/session-telemetry.ts");

const protectedRoot = path.join(
  process.env.ProgramData,
  "AI BOS",
  "DeviceAgent",
);
const protectedEnv = path.join(protectedRoot, ".env");
const bootstrapEnv = path.join(protectedRoot, ".bootstrap-enrollment.env");

async function resetFiles(): Promise<void> {
  await rm(testRoot, {
    recursive: true,
    force: true,
  });

  await mkdir(protectedRoot, {
    recursive: true,
  });
}

async function writeEnv(
  content: string,
): Promise<void> {
  await mkdir(protectedRoot, {
    recursive: true,
  });

  await writeFile(
    protectedEnv,
    content,
    "utf8",
  );
}

async function readEnv():
  Promise<string> {
  return readFile(
    protectedEnv,
    "utf8",
  );
}

function invalidAuthError(): unknown {
  return {
    isAxiosError: true,
    response: {
      status: 401,
      data: {
        success: false,
        message:
          "Invalid device authentication",
      },
    },
  };
}

async function waitFor(
  predicate: () => boolean,
): Promise<void> {
  const deadline =
    Date.now() + 2000;

  while (Date.now() < deadline) {
    if (predicate()) {
      return;
    }

    await new Promise(
      (resolve) =>
        setTimeout(
          resolve,
          20,
        ),
    );
  }

  throw new Error(
    "Timed out waiting for condition",
  );
}

test.after(async () => {
  axios.post = originalPost;
  process.env.PATH = originalPath;
  clearSessionTelemetryForTest();

  await rm(testRoot, {
    recursive: true,
    force: true,
  });
});

test("invalid device authentication classifier only matches explicit backend auth rejection", () => {
  assert.equal(
    isInvalidDeviceAuthenticationError(
      invalidAuthError(),
    ),
    true,
  );

  assert.equal(
    isInvalidDeviceAuthenticationError({
      isAxiosError: true,
      response: {
        status: 500,
        data: {
          message:
            "Invalid device authentication",
        },
      },
    }),
    false,
  );
});

test("valid permanent credential proceeds without enrollment", async () => {
  await resetFiles();

  await writeEnv(
    [
      "DEVICE_ID=DEV-VALID",
      "DEVICE_TOKEN=aibos_device_valid_permanent_token",
    ].join("\n"),
  );

  let registerAttempts =
    0;
  let enrollAttempts =
    0;

  axios.post = async (
    url: string,
    body: any,
    options: any,
  ) => {
    if (url.endsWith("/api/v1/devices/register")) {
      registerAttempts += 1;
      assert.equal(
        options.headers["x-device-id"],
        "DEV-VALID",
      );
      assert.equal(
        options.headers["x-device-token"],
        "aibos_device_valid_permanent_token",
      );

      return {
        data: {
          success: true,
          data: {
            deviceId:
              body.deviceId,
          },
        },
      };
    }

    if (url.endsWith("/api/v1/devices/enroll")) {
      enrollAttempts += 1;
    }

    throw new Error(
      "Unexpected request " + url,
    );
  };

  assert.equal(
    await prepareDeviceIdentity(),
    "DEV-VALID",
  );
  assert.equal(
    registerAttempts,
    1,
  );
  assert.equal(
    enrollAttempts,
    0,
  );
});

test("invalid credential without bootstrap is classified without stale-token retry", async () => {
  await resetFiles();

  await writeEnv(
    [
      "DEVICE_ID=DEV-STALE",
      "DEVICE_TOKEN=aibos_device_stale_token",
    ].join("\n"),
  );

  let registerAttempts =
    0;
  let enrollAttempts =
    0;

  axios.post = async (
    url: string,
  ) => {
    if (url.endsWith("/api/v1/devices/register")) {
      registerAttempts += 1;
      throw invalidAuthError();
    }

    if (url.endsWith("/api/v1/devices/enroll")) {
      enrollAttempts += 1;
    }

    throw new Error(
      "Unexpected request " + url,
    );
  };

  await assert.rejects(
    prepareDeviceIdentity(),
    isDeviceEnrollmentRequiredError,
  );

  assert.equal(
    registerAttempts,
    1,
  );
  assert.equal(
    enrollAttempts,
    0,
  );
});

test("invalid credential with protected bootstrap re-enrolls, consumes bootstrap, and allows heartbeat", async () => {
  await resetFiles();

  const staleToken =
    "aibos_device_stale_token_before_reenroll";
  const bootstrapSecret =
    "bootstrap-secret-for-test";
  const newToken =
    "aibos_device_new_reenrolled_token";
  const capturedLogs: string[] =
    [];
  const originalWarn =
    console.warn;
  const originalLog =
    console.log;
  const originalError =
    console.error;

  await writeEnv(
    [
      "DEVICE_ID=DEV-STALE",
      "DEVICE_TOKEN=" + staleToken,
    ].join("\n"),
  );

  await writeFile(
    bootstrapEnv,
    "DEVICE_ENROLLMENT_KEY=" +
      bootstrapSecret +
      "\n",
    "utf8",
  );

  let registerAttempts =
    0;
  let enrollAttempts =
    0;
  let heartbeatAttempts =
    0;

  axios.post = async (
    url: string,
    body: any,
    options: any,
  ) => {
    if (url.endsWith("/api/v1/devices/register")) {
      registerAttempts += 1;

      if (
        options.headers["x-device-token"] ===
        staleToken
      ) {
        throw invalidAuthError();
      }

      assert.equal(
        options.headers["x-device-token"],
        newToken,
      );

      return {
        data: {
          success: true,
          data: {
            deviceId:
              body.deviceId,
          },
        },
      };
    }

    if (url.endsWith("/api/v1/devices/enroll")) {
      enrollAttempts += 1;
      assert.equal(
        options.headers["x-device-enrollment-key"],
        bootstrapSecret,
      );

      return {
        data: {
          success: true,
          data: {
            device: {
              deviceId:
                "DEV-REENROLLED",
            },
            credential: {
              deviceToken:
                newToken,
              credentialVersion:
                2,
              issuedAt:
                "2026-08-18T00:00:00.000Z",
            },
          },
        },
      };
    }

    if (url.endsWith("/api/v1/devices/heartbeat")) {
      heartbeatAttempts += 1;
      assert.equal(
        body.deviceId,
        "DEV-REENROLLED",
      );
      assert.equal(
        body.currentUser,
        "interactive-user",
      );
      assert.equal(
        body.sessionState,
        "active",
      );
      assert.equal(
        body.sessionTelemetryStale,
        false,
      );
      assert.equal(
        body.currentApplication.processName,
        "Code.exe",
      );
      assert.equal(
        options.headers["x-device-token"],
        newToken,
      );

      return {
        data: {
          success: true,
        },
      };
    }

    throw new Error(
      "Unexpected request " + url,
    );
  };

  console.warn = (...args: unknown[]) => {
    capturedLogs.push(
      args.join(" "),
    );
  };
  console.log = (...args: unknown[]) => {
    capturedLogs.push(
      args.join(" "),
    );
  };
  console.error = (...args: unknown[]) => {
    capturedLogs.push(
      args.join(" "),
    );
  };

  try {
    assert.equal(
      await prepareDeviceIdentity(),
      "DEV-REENROLLED",
    );

    assert.equal(
      registerAttempts,
      2,
    );
    assert.equal(
      enrollAttempts,
      1,
    );

    const envContent =
      await readEnv();
    assert.match(
      envContent,
      /DEVICE_ID=DEV-REENROLLED/,
    );
    assert.match(
      envContent,
      /DEVICE_TOKEN=aibos_device_new_reenrolled_token/,
    );

    await assert.rejects(
      stat(
        bootstrapEnv,
      ),
      /ENOENT/,
    );

    updateLatestSessionTelemetry({
      deviceId:
        "DEV-REENROLLED",
      currentUser:
        "interactive-user",
      sessionState:
        "active",
      currentApplication: {
        processName:
          "Code.exe",
        pid:
          4321,
        capturedAt:
          new Date()
            .toISOString(),
      },
      collectedAt:
        new Date()
          .toISOString(),
    });

    const stopHeartbeat =
      startHeartbeat({
        deviceId:
          "DEV-REENROLLED",
      });

    await waitFor(
      () =>
        heartbeatAttempts >
        0,
    );

    await stopHeartbeat();

    const joinedLogs =
      capturedLogs.join("\n");
    assert.equal(
      joinedLogs.includes(
        staleToken,
      ),
      false,
    );
    assert.equal(
      joinedLogs.includes(
        bootstrapSecret,
      ),
      false,
    );
    assert.equal(
      joinedLogs.includes(
        newToken,
      ),
      false,
    );
  } finally {
    console.warn =
      originalWarn;
    console.log =
      originalLog;
    console.error =
      originalError;
  }
});

test("server and network failures do not erase stale credential or bootstrap artifact", async () => {
  await resetFiles();

  const staleToken =
    "aibos_device_stale_token_preserved_on_5xx";

  await writeEnv(
    [
      "DEVICE_ID=DEV-STALE",
      "DEVICE_TOKEN=" + staleToken,
    ].join("\n"),
  );

  await writeFile(
    bootstrapEnv,
    "DEVICE_ENROLLMENT_KEY=bootstrap-preserved-on-5xx\n",
    "utf8",
  );

  axios.post = async (
    url: string,
  ) => {
    if (url.endsWith("/api/v1/devices/register")) {
      throw {
        isAxiosError: true,
        response: {
          status: 500,
          data: {
            message:
              "temporary server error",
          },
        },
      };
    }

    throw new Error(
      "Unexpected request " + url,
    );
  };

  await assert.rejects(
    prepareDeviceIdentity(),
  );

  assert.match(
    await readEnv(),
    /DEVICE_TOKEN=aibos_device_stale_token_preserved_on_5xx/,
  );
  await stat(
    bootstrapEnv,
  );
});
