import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

async function source(path: string) {
  return readFile(path, "utf8");
}

test("Admin AI page and navigation are restricted to Owner and Administrator", async () => {
  const [appSource, workspaceSource, dashboardSource] = await Promise.all([
    source("admin/src/App.tsx"),
    source("admin/src/data/workspace.ts"),
    source("admin/src/common/features/dashboard/AdminDashboardPage.tsx"),
  ]);

  assert.match(appSource, /path: "\/ai-assistant"[^\n]*allowedRoles: adminRoles/);
  assert.match(workspaceSource, /title: "AI Assistant"[^\n]*roles: \["Administrator", "Owner"\]/);
  assert.match(dashboardSource, /label: "AI Assistant", href: "\/ai-assistant"/);
  assert.doesNotMatch(appSource.match(/path: "\/ai-assistant"[^\n]*/)?.[0] ?? "", /Manager|Employee/);
});

test("Admin AI UI calls only read-only AI inference endpoints and keeps no persisted transcript", async () => {
  const [pageSource, apiSource] = await Promise.all([
    source("admin/src/admin/features/ai/AIPage.tsx"),
    source("admin/src/admin/features/ai/ai.api.ts"),
  ]);

  for (const endpoint of [
    "/ai/status",
    "/ai/context",
    "/ai/query",
    "/ai/monitoring/summary",
    "/ai/alerts/prioritize",
    "/explain",
    "/troubleshoot",
  ]) {
    assert.match(apiSource, new RegExp(endpoint.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }

  assert.match(pageSource, /Provider not configured/);
  assert.match(pageSource, /Read-only/);
  assert.match(pageSource, /No open alerts/);
  assert.match(pageSource, /No managed devices/);
  assert.doesNotMatch(pageSource + apiSource, /localStorage|sessionStorage|fallback|demo|mock/i);
  assert.doesNotMatch(apiSource, /shutdown|restart|install|uninstall|revoke|delete|rbac|remote-control/i);
});
