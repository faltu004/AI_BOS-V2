import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";

async function readTaskSources() {
  const root = process.cwd();
  const [page, api, routes, service] = await Promise.all([
    readFile(path.join(root, "shared/src/tasks/TasksPage.tsx"), "utf8"),
    readFile(path.join(root, "shared/src/tasks/tasks.api.ts"), "utf8"),
    readFile(path.join(root, "backend/src/routes/task.routes.ts"), "utf8"),
    readFile(path.join(root, "backend/src/services/task.service.ts"), "utf8"),
  ]);
  return { page, api, routes, service };
}

test("task UI exposes status, progress, remaining, blocked reason, checklist, time, and comments", async () => {
  const { page, api } = await readTaskSources();

  assert.match(page, /Save work update/);
  assert.match(page, /Progress \(%\)/);
  assert.match(page, /\{task\.remaining\}% remaining/);
  assert.match(page, /workStatus === "Blocked"/);
  assert.match(page, /Blocked reason/);
  assert.match(page, /onToggleChecklist/);
  assert.match(page, /TaskCommentsPanel taskId=\{task\.id\}/);
  assert.match(page, /Log 1h/);
  assert.match(api, /remaining: record\.remaining \?\? 100 - progress/);
});

test("task UI gates management controls while retaining assigned-user work controls", async () => {
  const { page } = await readTaskSources();

  assert.match(page, /const canUpdateTask = hasPermission\("task\.update"\)/);
  assert.match(page, /const canDeleteTask = hasPermission\("task\.delete"\)/);
  assert.match(page, /const canManageTask = hasAnyPermission/);
  assert.match(page, /onEdit=\{canManageTask \?/);
  assert.match(page, /onDelete=\{canDeleteTask \?/);
  assert.match(page, /canUpdateWork=\{canUpdateTask\}/);
  assert.match(page, /canManage=\{canManageTask\}/);
});

test("task routes protect nested comments and task service restricts employee fields", async () => {
  const { routes, service } = await readTaskSources();

  const commentRoutes = routes.slice(routes.indexOf('"/:id/comments"'));
  assert.match(commentRoutes, /requireTaskAccess[\s\S]*?taskCommentController\.list/);
  assert.match(commentRoutes, /requireTaskAccess[\s\S]*?taskCommentController\.create/);
  assert.match(routes, /requirePermission\("task\.delete"\)[\s\S]*?taskController\.delete/);
  assert.match(service, /employeeWorkUpdateFields = new Set\(\["status", "progress", "blockedReason"\]\)/);
  assert.match(service, /You do not have access to this task/);
});

test("project-task relationship remains projectId-based and is combined with backend task scope", async () => {
  const root = process.cwd();
  const [model, repository, page] = await Promise.all([
    readFile(path.join(root, "backend/src/models/task.model.ts"), "utf8"),
    readFile(path.join(root, "backend/src/repositories/task.repository.ts"), "utf8"),
    readFile(path.join(root, "shared/src/tasks/TasksPage.tsx"), "utf8"),
  ]);

  assert.match(model, /projectId: \{ type: Schema\.Types\.ObjectId, ref: "Project", index: true \}/);
  assert.match(repository, /listByProject\(projectId: string, accessFilter:[\s\S]*?combineTaskFilters\(\{ projectId, isArchived: false \}, accessFilter\)/);
  assert.match(page, /projectId: input\.projectId \|\| undefined/);
});
