import test from "node:test";
import assert from "node:assert/strict";
import { configureBackendTestEnv } from "../helpers/backend-env.ts";

configureBackendTestEnv();

test("user repository builds normalized email queries without executing them", async () => {
  const { userRepository } = await import("../../backend/src/repositories/user.repository.ts");
  const { UserModel } = await import("../../backend/src/models/user.model.ts");

  const originalFindOne = UserModel.findOne;
  const queries: unknown[] = [];

  UserModel.findOne = ((query: unknown) => {
    queries.push(query);
    return { select: () => "with-password" };
  }) as any;

  try {
    assert.equal(typeof (await userRepository.findByEmail("USER@EXAMPLE.COM") as any).select, "function");
    assert.equal(await userRepository.findByEmailWithPassword("USER@EXAMPLE.COM"), "with-password");
    assert.deepEqual(queries, [{ email: "user@example.com" }, { email: "user@example.com" }]);
  } finally {
    UserModel.findOne = originalFindOne;
  }
});

test("user repository builds common update and list queries", async () => {
  const { userRepository } = await import("../../backend/src/repositories/user.repository.ts");
  const { UserModel } = await import("../../backend/src/models/user.model.ts");

  const originalFind = UserModel.find;
  const originalFindByIdAndUpdate = UserModel.findByIdAndUpdate;
  const calls: unknown[] = [];

  UserModel.find = ((filter: unknown) => {
    calls.push(["find", filter]);
    const populateCalls: unknown[] = [];
    const query = {
      populate: (path: string, select: string) => {
        populateCalls.push([path, select]);
        return query;
      },
      sort: (sort: unknown) => ["populated-sorted", populateCalls, sort],
    };
    return {
      populate: query.populate,
      sort: query.sort,
    };
  }) as any;
  UserModel.findByIdAndUpdate = ((id: string, update: unknown, options: unknown) => {
    calls.push(["update", id, update, options]);
    return "updated";
  }) as any;

  try {
    assert.deepEqual(await userRepository.findMany({ role: "Employee" } as any), [
      "populated-sorted",
      [
        ["departmentId", "name"],
        ["managerId", "fullName email role"],
      ],
      { createdAt: -1 },
    ]);
    assert.equal(await userRepository.updatePassword("user-1", "hash"), "updated");
    assert.equal(await userRepository.updateLastLogin("user-1"), "updated");
    assert.deepEqual(calls[0], ["find", { role: "Employee" }]);
    const passwordUpdateCall = calls[1] as any[];
    assert.equal(passwordUpdateCall[0], "update");
    assert.equal(passwordUpdateCall[1], "user-1");
    assert.equal(passwordUpdateCall[2].$set.passwordHash, "hash");
    assert.equal(passwordUpdateCall[2].$set.mustChangePassword, false);
    assert.ok(passwordUpdateCall[2].$set.passwordChangedAt instanceof Date);
    assert.deepEqual(passwordUpdateCall[2].$unset, { temporaryPasswordExpiresAt: "" });
    assert.deepEqual(passwordUpdateCall[3], { new: true });
    assert.ok((calls[2] as any[])[2].lastLoginAt instanceof Date);
  } finally {
    UserModel.find = originalFind;
    UserModel.findByIdAndUpdate = originalFindByIdAndUpdate;
  }
});

test("device application snapshot repository preserves fields omitted by partial reporters", async () => {
  const { deviceApplicationSnapshotRepository } = await import(
    "../../backend/src/repositories/device-application-snapshot.repository.ts"
  );
  const { DeviceApplicationSnapshotModel } = await import(
    "../../backend/src/models/device-application-snapshot.model.ts"
  );

  const originalFindOneAndUpdate = DeviceApplicationSnapshotModel.findOneAndUpdate;
  const calls: unknown[] = [];

  DeviceApplicationSnapshotModel.findOneAndUpdate = ((filter: unknown, update: unknown, options: unknown) => {
    calls.push([filter, update, options]);
    return { lean: () => ({ deviceId: (filter as any).deviceId }) };
  }) as any;

  try {
    await deviceApplicationSnapshotRepository.upsertSnapshot({
      deviceId: "device-1",
      runningApplications: [
        {
          processName: "Code",
          pid: 123,
          startedAt: null,
          cpuUsage: 1.5,
          memoryBytes: 1024,
        },
      ],
      collectedAt: new Date("2026-08-14T00:00:00.000Z"),
      reporterSource: "session-helper",
    });

    await deviceApplicationSnapshotRepository.upsertSnapshot({
      deviceId: "device-1",
      installedApplications: [
        {
          name: "Visual Studio Code",
          version: "1.0.0",
          publisher: "Microsoft",
          installDate: null,
          scope: "machine",
          architecture: "64-bit",
          source: "registry",
        },
      ],
      collectedAt: new Date("2026-08-14T01:00:00.000Z"),
      reporterSource: "agent-interactive",
    });

    const runningOnlyUpdate = (calls[0] as any[])[1];
    assert.equal("runningApplications" in runningOnlyUpdate.$set, true);
    assert.equal("installedApplications" in runningOnlyUpdate.$set, false);

    const installedOnlyUpdate = (calls[1] as any[])[1];
    assert.equal("installedApplications" in installedOnlyUpdate.$set, true);
    assert.equal("runningApplications" in installedOnlyUpdate.$set, false);
  } finally {
    DeviceApplicationSnapshotModel.findOneAndUpdate = originalFindOneAndUpdate;
  }
});
