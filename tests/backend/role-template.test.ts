import test from "node:test";
import assert from "node:assert/strict";
import { configureBackendTestEnv } from "../helpers/backend-env.ts";

configureBackendTestEnv();

test("role template create and edit update the same template without a duplicate", async () => {
  const { roleTemplateService } = await import(
    "../../backend/src/services/role-template.service.ts"
  );
  const { roleTemplateRepository } = await import(
    "../../backend/src/repositories/role-template.repository.ts"
  );
  const { auditService } = await import("../../backend/src/services/audit.service.ts");

  const originalCreate = roleTemplateRepository.create;
  const originalFindById = roleTemplateRepository.findById;
  const originalUpdate = roleTemplateRepository.update;
  const originalAuditRecord = auditService.record;

  const storedTemplates: any[] = [];
  let createCalls = 0;
  let updateCalls = 0;

  roleTemplateRepository.create = (async (input: any) => {
    createCalls += 1;
    const template = { _id: "template-1", ...input };
    storedTemplates.push(template);
    return template;
  }) as any;
  roleTemplateRepository.findById = (async (id: string) =>
    storedTemplates.find((template) => template._id === id) ?? null) as any;
  roleTemplateRepository.update = (async (id: string, updates: any) => {
    updateCalls += 1;
    const index = storedTemplates.findIndex((template) => template._id === id);
    if (index < 0) return null;
    storedTemplates[index] = { ...storedTemplates[index], ...updates };
    return storedTemplates[index];
  }) as any;
  auditService.record = (async () => null) as any;

  try {
    const created = await roleTemplateService.create({
      name: "Project Lead",
      description: "Project lead defaults",
      permissionKeys: ["project.view_stats", "project.create", "project.update"],
    });
    const updated = await roleTemplateService.update(created._id.toString(), {
      name: "Project Lead",
      description: "Updated project lead defaults",
      permissionKeys: ["project.view_stats", "project.update", "project.comment"],
    });
    const reopened = await roleTemplateService.getById(created._id.toString());

    assert.equal(updated._id, created._id);
    assert.equal(reopened._id, created._id);
    assert.equal(reopened.description, "Updated project lead defaults");
    assert.deepEqual(reopened.permissionKeys, [
      "project.view_stats",
      "project.update",
      "project.comment",
    ]);
    assert.equal(createCalls, 1);
    assert.equal(updateCalls, 1);
    assert.equal(storedTemplates.length, 1);
  } finally {
    roleTemplateRepository.create = originalCreate;
    roleTemplateRepository.findById = originalFindById;
    roleTemplateRepository.update = originalUpdate;
    auditService.record = originalAuditRecord;
  }
});

test("custom role creation saves the adjusted template permission snapshot", async () => {
  const { roleService } = await import("../../backend/src/services/role.service.ts");
  const { roleRepository } = await import("../../backend/src/repositories/role.repository.ts");
  const { roleTemplateRepository } = await import(
    "../../backend/src/repositories/role-template.repository.ts"
  );
  const { auditService } = await import("../../backend/src/services/audit.service.ts");

  const originalExistsBySlug = roleRepository.existsBySlug;
  const originalCreate = roleRepository.create;
  const originalFindTemplate = roleTemplateRepository.findById;
  const originalAuditRecord = auditService.record;

  const template = {
    _id: "template-1",
    name: "Project Lead",
    permissionKeys: ["project.view_stats", "project.create", "project.update"],
  };
  const createdRoles: any[] = [];

  roleRepository.existsBySlug = (async () => null) as any;
  roleRepository.create = (async (input: any) => {
    const role = { _id: `role-${createdRoles.length + 1}`, ...input };
    createdRoles.push(role);
    return role;
  }) as any;
  roleTemplateRepository.findById = (async () => template) as any;
  auditService.record = (async () => null) as any;

  try {
    const adjusted = await roleService.create({
      name: "Custom Project Lead",
      description: "Adjusted from template",
      rank: 20,
      templateId: template._id,
      permissionKeys: ["project.view_stats", "project.update", "project.comment"],
    });
    const inherited = await roleService.create({
      name: "Inherited Project Lead",
      rank: 20,
      templateId: template._id,
    });

    assert.deepEqual(adjusted.permissionKeys, [
      "project.view_stats",
      "project.update",
      "project.comment",
    ]);
    assert.equal(adjusted.permissionKeys.includes("project.create"), false);
    assert.equal(adjusted.templateId, template._id);
    assert.deepEqual(inherited.permissionKeys, template.permissionKeys);
    assert.deepEqual(template.permissionKeys, [
      "project.view_stats",
      "project.create",
      "project.update",
    ]);
  } finally {
    roleRepository.existsBySlug = originalExistsBySlug;
    roleRepository.create = originalCreate;
    roleTemplateRepository.findById = originalFindTemplate;
    auditService.record = originalAuditRecord;
  }
});

test("role edits do not mutate templates and full-access system roles remain protected", async () => {
  const { roleService } = await import("../../backend/src/services/role.service.ts");
  const { roleRepository } = await import("../../backend/src/repositories/role.repository.ts");
  const { roleHistoryRepository } = await import(
    "../../backend/src/repositories/role-history.repository.ts"
  );
  const { auditService } = await import("../../backend/src/services/audit.service.ts");

  const originalFindById = roleRepository.findById;
  const originalUpdate = roleRepository.update;
  const originalLatestVersion = roleHistoryRepository.latestVersion;
  const originalCreateHistory = roleHistoryRepository.create;
  const originalAuditRecord = auditService.record;

  const templatePermissionKeys = ["project.view_stats", "project.update"];
  const customRole: any = {
    _id: "custom-role",
    name: "Custom Project Lead",
    isSystem: false,
    hasFullAccess: false,
    permissionKeys: [...templatePermissionKeys],
  };
  const protectedRole: any = {
    _id: "owner-role",
    name: "Owner",
    isSystem: true,
    hasFullAccess: true,
    permissionKeys: [],
  };
  let updateCalls = 0;

  roleRepository.findById = (async (id: string) =>
    id === protectedRole._id ? protectedRole : customRole) as any;
  roleRepository.update = (async (_id: string, updates: any) => {
    updateCalls += 1;
    return { ...customRole, ...updates };
  }) as any;
  roleHistoryRepository.latestVersion = (async () => 0) as any;
  roleHistoryRepository.create = (async (input: any) => input) as any;
  auditService.record = (async () => null) as any;

  try {
    const updated = await roleService.update(customRole._id, {
      permissionKeys: ["project.view_stats", "project.comment"],
    });

    assert.deepEqual(updated.permissionKeys, ["project.view_stats", "project.comment"]);
    assert.deepEqual(templatePermissionKeys, ["project.view_stats", "project.update"]);
    await assert.rejects(
      () => roleService.update(protectedRole._id, { permissionKeys: ["project.view_stats"] }),
      (error: any) => error?.statusCode === 403 && error?.message === "Full-access system roles cannot be edited",
    );
    assert.equal(updateCalls, 1);
  } finally {
    roleRepository.findById = originalFindById;
    roleRepository.update = originalUpdate;
    roleHistoryRepository.latestVersion = originalLatestVersion;
    roleHistoryRepository.create = originalCreateHistory;
    auditService.record = originalAuditRecord;
  }
});

test("role template validation rejects permissions outside the existing catalog", async () => {
  const { updateRoleTemplateSchema } = await import(
    "../../backend/src/validation/role-template.validation.ts"
  );

  assert.equal(
    updateRoleTemplateSchema.safeParse({
      permissionKeys: ["project.view_stats", "project.comment"],
    }).success,
    true,
  );
  assert.equal(
    updateRoleTemplateSchema.safeParse({
      permissionKeys: ["project.view_stats", "unknown.permission"],
    }).success,
    false,
  );
});
