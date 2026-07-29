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
    return {
      populate: (path: string, select: string) => ({
        sort: (sort: unknown) => ["populated-sorted", path, select, sort],
      }),
    };
  }) as any;
  UserModel.findByIdAndUpdate = ((id: string, update: unknown, options: unknown) => {
    calls.push(["update", id, update, options]);
    return "updated";
  }) as any;

  try {
    assert.deepEqual(await userRepository.findMany({ role: "Employee" } as any), ["populated-sorted", "departmentId", "name", { createdAt: -1 }]);
    assert.equal(await userRepository.updatePassword("user-1", "hash"), "updated");
    assert.equal(await userRepository.updateLastLogin("user-1"), "updated");
    assert.deepEqual(calls[0], ["find", { role: "Employee" }]);
    assert.deepEqual(calls[1], ["update", "user-1", { passwordHash: "hash" }, { new: true }]);
    assert.ok((calls[2] as any[])[2].lastLoginAt instanceof Date);
  } finally {
    UserModel.find = originalFind;
    UserModel.findByIdAndUpdate = originalFindByIdAndUpdate;
  }
});
