import test from "node:test";
import assert from "node:assert/strict";
import { configureBackendTestEnv } from "../helpers/backend-env.ts";

configureBackendTestEnv();

test("classifyRequest logs auth login, skips rbac (already covered by PermissionAuditLog), and falls back to crud", async () => {
  const { classifyRequest } = await import("../../backend/src/middleware/audit.middleware.ts");

  assert.deepEqual(classifyRequest("POST", "/auth/login"), { category: "login" });
  assert.equal(classifyRequest("PATCH", "/rbac/roles/123"), null);
  assert.equal(classifyRequest("DELETE", "/rbac/roles/123"), null);
  assert.deepEqual(classifyRequest("POST", "/organization/departments"), {
    category: "crud",
    resourceType: "organization",
  });
  assert.equal(classifyRequest("GET", "/organization/departments"), null);
});

test("classifyRequest recognizes settings and file activity routes", async () => {
  const { classifyRequest } = await import("../../backend/src/middleware/audit.middleware.ts");

  assert.deepEqual(classifyRequest("PATCH", "/organization/settings"), { category: "settings_change", resourceType: "organization" });
  assert.deepEqual(classifyRequest("POST", "/collaboration/rooms/1/attachments"), {
    category: "file_activity",
    resourceType: "collaboration",
  });
});

test("encryptBuffer/decryptBuffer round-trips arbitrary binary data", async () => {
  const { encryptBuffer, decryptBuffer } = await import("../../backend/src/utils/crypto.ts");

  const original = Buffer.from(JSON.stringify({ hello: "world", n: 42 }));
  const encrypted = encryptBuffer(original);

  assert.notDeepEqual(encrypted, original);
  assert.deepEqual(decryptBuffer(encrypted), original);
});

test("database backup target re-selects select:false fields so restore doesn't corrupt hidden data", async () => {
  const { selectHiddenFields } = await import("../../backend/src/backup/targets/database.ts");
  const { UserModel } = await import("../../backend/src/models/user.model.ts");

  const selection = selectHiddenFields(UserModel as never);
  assert.ok(selection.includes("+passwordHash"), `expected +passwordHash in "${selection}"`);
});

test("backupService.restoreBackup rejects without an explicit confirm:true", async () => {
  const { backupService } = await import("../../backend/src/services/backup.service.ts");

  await assert.rejects(() => backupService.restoreBackup("some-id", false), /destructive|confirm/i);
});
