import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";

async function readPermissionGroupSources() {
  const root = process.cwd();
  const [page, api] = await Promise.all([
    readFile(path.join(root, "admin/src/admin/features/rbac/RBACPage.tsx"), "utf8"),
    readFile(path.join(root, "admin/src/admin/features/rbac/rbac.api.ts"), "utf8"),
  ]);
  return { page, api };
}

test("permission group edit action uses the existing PATCH endpoint", async () => {
  const { page, api } = await readPermissionGroupSources();

  assert.match(
    api,
    /updatePermissionGroup[\s\S]*?`\/rbac\/permission-groups\/\$\{id\}`[\s\S]*?method: "PATCH"/,
  );
  assert.match(page, /<Button onClick=\{\(\) => startEditGroup\(group\)\}[\s\S]*?>[\s\S]*?Edit/);
  assert.match(page, /await updatePermissionGroup\(editingGroupId, groupForm, token\)/);
  assert.match(
    page,
    /current\.map\(\(group\) => \(group\._id === updated\._id \? updated : group\)\)/,
  );
});

test("editing preloads fields and checks existing catalog permissions", async () => {
  const { page } = await readPermissionGroupSources();

  assert.match(
    page,
    /setGroupForm\(\{[\s\S]*?name: group\.name,[\s\S]*?description: group\.description \?\? "",[\s\S]*?permissionKeys: group\.permissionKeys\.filter\(\(key\) => catalogKeys\.has\(key\)\)/,
  );
  assert.match(page, /checked=\{groupForm\.permissionKeys\.includes\(entry\.key\)\}/);
  assert.match(page, /onChange=\{\(\) => toggleGroupPermission\(entry\.key\)\}/);
  assert.match(page, /editingGroupId \? "Save Changes" : "Create Group"/);
});

test("create remains separate from edit and still submits selected permissions", async () => {
  const { page } = await readPermissionGroupSources();

  assert.match(page, /const created = await createPermissionGroup\(groupForm, token\)/);
  assert.match(page, /setGroups\(\(current\) => \[\.\.\.current, created\]\)/);
  assert.match(page, /setEditingGroupId\(null\)/);
  assert.match(page, /permissionKeys: current\.permissionKeys\.includes\(key\)/);
});
