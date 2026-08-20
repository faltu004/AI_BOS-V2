import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { configureBackendTestEnv } from "../helpers/backend-env.ts";

configureBackendTestEnv();

test("Owner-enabled Device Management access is required to issue enrollment credentials", async () => {
  const routeSource = await readFile(
    "backend/src/routes/device.routes.ts",
    "utf8",
  );

  assert.match(
    routeSource,
    /deviceRoutes\.post\(\s*"\/enrollment-credentials"[\s\S]*authenticate[\s\S]*requireAdministratorMonitoringPermission\(\)[\s\S]*deviceEnrollmentTokenController\s*\.issue/,
  );
});

test("one-time device enrollment credential is generated without storing the raw secret", async () => {
  const { deviceEnrollmentTokenService } = await import(
    "../../backend/src/services/device-enrollment-token.service.ts"
  );
  const { deviceEnrollmentTokenRepository } = await import(
    "../../backend/src/repositories/device-enrollment-token.repository.ts"
  );

  const originalCreate = deviceEnrollmentTokenRepository.create;
  let createdInput: any;

  deviceEnrollmentTokenRepository.create = (async (input: any) => {
    createdInput = input;

    return {
      id: "token-1",
      createdBy: input.createdBy,
      createdAt: input.createdAt,
      expiresAt: input.expiresAt,
      consumedAt: null,
    };
  }) as any;

  try {
    const issued = await deviceEnrollmentTokenService.issue({
      createdBy: "admin-1",
      ttlMinutes: 10,
    });

    assert.match(
      issued.enrollmentKey,
      /^aibos_enroll_ot_[A-Za-z0-9_-]+$/,
    );
    assert.equal(
      issued.ttlMinutes,
      10,
    );
    assert.equal(
      createdInput.createdBy,
      "admin-1",
    );
    assert.match(
      createdInput.tokenHash,
      /^[a-f0-9]{64}$/,
    );
    assert.notEqual(
      createdInput.tokenHash,
      issued.enrollmentKey,
    );
  } finally {
    deviceEnrollmentTokenRepository.create = originalCreate;
  }
});

test("one-time enrollment credential expiry and consumption are enforced by repository queries", async () => {
  const { deviceEnrollmentTokenRepository } = await import(
    "../../backend/src/repositories/device-enrollment-token.repository.ts"
  );
  const { DeviceEnrollmentTokenModel } = await import(
    "../../backend/src/models/device-enrollment-token.model.ts"
  );

  const originalFindOne = DeviceEnrollmentTokenModel.findOne;
  const originalFindOneAndUpdate = DeviceEnrollmentTokenModel.findOneAndUpdate;
  const calls: unknown[] = [];

  DeviceEnrollmentTokenModel.findOne = ((query: unknown) => {
    calls.push(["findOne", query]);

    return {
      select: () => ({
        lean: () => null,
      }),
    };
  }) as any;

  DeviceEnrollmentTokenModel.findOneAndUpdate = ((
    query: unknown,
    update: unknown,
    options: unknown,
  ) => {
    calls.push(["findOneAndUpdate", query, update, options]);

    return {
      select: () => ({
        lean: () => null,
      }),
    };
  }) as any;

  try {
    const now = new Date("2026-08-18T00:00:00.000Z");

    await deviceEnrollmentTokenRepository.findUsableByHash(
      "a".repeat(64),
      now,
    );

    await deviceEnrollmentTokenRepository.consumeByHash(
      "b".repeat(64),
      now,
    );

    assert.deepEqual((calls[0] as any[])[1], {
      tokenHash: "a".repeat(64),
      consumedAt: null,
      expiresAt: {
        $gt: now,
      },
    });

    assert.deepEqual((calls[1] as any[])[1], {
      tokenHash: "b".repeat(64),
      consumedAt: null,
      expiresAt: {
        $gt: now,
      },
    });
    assert.deepEqual((calls[1] as any[])[2], {
      $set: {
        consumedAt: now,
      },
    });
  } finally {
    DeviceEnrollmentTokenModel.findOne = originalFindOne;
    DeviceEnrollmentTokenModel.findOneAndUpdate = originalFindOneAndUpdate;
  }
});

test("one-time enrollment token consumption rejects replay", async () => {
  const { deviceEnrollmentTokenService } = await import(
    "../../backend/src/services/device-enrollment-token.service.ts"
  );
  const { deviceEnrollmentTokenRepository } = await import(
    "../../backend/src/repositories/device-enrollment-token.repository.ts"
  );

  const originalConsume = deviceEnrollmentTokenRepository.consumeByHash;
  let attempts = 0;

  deviceEnrollmentTokenRepository.consumeByHash = (async () => {
    attempts += 1;

    return attempts === 1
      ? {
          consumedAt: new Date(),
        }
      : null;
  }) as any;

  try {
    await deviceEnrollmentTokenService.consume(
      "c".repeat(64),
    );

    await assert.rejects(
      deviceEnrollmentTokenService.consume(
        "c".repeat(64),
      ),
      /already consumed or expired/,
    );
  } finally {
    deviceEnrollmentTokenRepository.consumeByHash = originalConsume;
  }
});
