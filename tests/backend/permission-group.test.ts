import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { configureBackendTestEnv } from "../helpers/backend-env.ts";

configureBackendTestEnv();

test("permission group create and edit update the same group without a duplicate", async () => {
  const { permissionGroupService } = await import(
    "../../backend/src/services/permission-group.service.ts"
  );
  const { permissionGroupRepository } = await import(
    "../../backend/src/repositories/permission-group.repository.ts"
  );
  const { auditService } = await import("../../backend/src/services/audit.service.ts");

  const originalCreate = permissionGroupRepository.create;
  const originalFindById = permissionGroupRepository.findById;
  const originalUpdate = permissionGroupRepository.update;
  const originalAuditRecord = auditService.record;

  const storedGroups: any[] = [];
  let createCalls = 0;
  let updateCalls = 0;

  permissionGroupRepository.create = (async (input: any) => {
    createCalls += 1;
    const group = { _id: "group-1", ...input };
    storedGroups.push(group);
    return group;
  }) as any;
  permissionGroupRepository.findById = (async (id: string) =>
    storedGroups.find((group) => group._id === id) ?? null) as any;
  permissionGroupRepository.update = (async (id: string, updates: any) => {
    updateCalls += 1;
    const index = storedGroups.findIndex((group) => group._id === id);
    if (index < 0) return null;
    storedGroups[index] = { ...storedGroups[index], ...updates };
    return storedGroups[index];
  }) as any;
  auditService.record = (async () => null) as any;

  try {
    const created = await permissionGroupService.create({
      name: "Project Management",
      description: "Project delivery permissions",
      permissionKeys: [
        "project.view_stats",
        "project.create",
        "project.update",
        "task.create",
        "task.update",
      ],
    });

    const updated = await permissionGroupService.update(created._id.toString(), {
      name: "Project Management",
      description: "Updated project delivery permissions",
      permissionKeys: [
        "project.view_stats",
        "project.update",
        "project.comment",
        "task.create",
        "task.update",
      ],
    });
    const reopened = await permissionGroupService.getById(created._id.toString());

    assert.equal(created._id, "group-1");
    assert.equal(updated._id, created._id);
    assert.equal(reopened._id, created._id);
    assert.equal(reopened.description, "Updated project delivery permissions");
    assert.deepEqual(reopened.permissionKeys, [
      "project.view_stats",
      "project.update",
      "project.comment",
      "task.create",
      "task.update",
    ]);
    assert.equal(reopened.permissionKeys.includes("project.create"), false);
    assert.equal(createCalls, 1);
    assert.equal(updateCalls, 1);
    assert.equal(storedGroups.length, 1);
  } finally {
    permissionGroupRepository.create = originalCreate;
    permissionGroupRepository.findById = originalFindById;
    permissionGroupRepository.update = originalUpdate;
    auditService.record = originalAuditRecord;
  }
});

test("permission group validation accepts catalog keys and rejects unknown keys", async () => {
  const { updatePermissionGroupSchema } = await import(
    "../../backend/src/validation/permission-group.validation.ts"
  );

  assert.equal(
    updatePermissionGroupSchema.safeParse({
      permissionKeys: ["project.view_stats", "project.comment", "task.update"],
    }).success,
    true,
  );
  assert.equal(
    updatePermissionGroupSchema.safeParse({
      permissionKeys: ["project.view_stats", "unknown.permission"],
    }).success,
    false,
  );
});

test("permission group updates remain independent from role and role-template permission snapshots", async () => {
  const root = process.cwd();
  const roleModel = await readFile(path.join(root, "backend/src/models/role.model.ts"), "utf8");
  const templateModel = await readFile(
    path.join(root, "backend/src/models/role-template.model.ts"),
    "utf8",
  );
  const groupService = await readFile(
    path.join(root, "backend/src/services/permission-group.service.ts"),
    "utf8",
  );

  assert.equal(roleModel.includes("permissionGroupId"), false);
  assert.equal(roleModel.includes("permissionGroupIds"), false);
  assert.equal(templateModel.includes("permissionGroupId"), false);
  assert.equal(templateModel.includes("permissionGroupIds"), false);
  assert.equal(groupService.includes("roleRepository"), false);
  assert.equal(groupService.includes("roleTemplateRepository"), false);
  assert.equal(groupService.includes("permissionGroupRepository.update(id, input)"), true);
});
