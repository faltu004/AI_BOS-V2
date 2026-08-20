import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();

async function source(relativePath: string): Promise<string> {
  return readFile(path.join(root, relativePath), "utf8");
}

test("installed application inventory uses safe Windows registry sources", async () => {
  const collector = await source("device-agent/src/applications.ts");

  assert.equal(collector.includes('"reg.exe"'), true);
  assert.equal(collector.includes("CurrentVersion\\\\Uninstall"), true);
  assert.equal(collector.includes("WOW6432Node"), true);
  assert.equal(collector.includes("HKCU\\\\Software"), true);
  assert.equal(collector.includes('"msiexec"'), false);
  assert.equal(collector.includes("Win32_Product"), false);
  assert.equal(collector.includes("source: \"registry\""), true);
});

test("interactive application snapshots and usage stay behind SYSTEM Agent proxy", async () => {
  const helper = await source("device-agent/src/session-helper.ts");
  const client = await source("device-agent/src/local-agent-application-client.ts");
  const server = await source("device-agent/src/session-telemetry-server.ts");
  const agent = await source("device-agent/src/index.ts");

  assert.equal(helper.includes("startApplicationReporter"), true);
  assert.equal(helper.includes("startApplicationSessionReporter"), true);
  assert.equal(helper.includes("startApplicationPolicyEnforcer"), true);
  assert.equal(helper.includes("device-auth"), false);
  assert.equal(client.includes("/applications/snapshot"), true);
  assert.equal(client.includes("/applications/session"), true);
  assert.equal(server.includes("/api/v1/devices/applications/snapshot"), true);
  assert.equal(server.includes("/api/v1/devices/applications/session"), true);
  assert.equal(server.includes("/api/v1/devices/application-policy/status"), true);
  assert.equal(server.includes("getDeviceAuthHeaders"), true);
  assert.equal(agent.includes("Interactive application collection is owned by Session Helper"), true);
});

test("Device Details uses real application, command, policy, and current remote-session contracts", async () => {
  const api = await source("admin/src/admin/features/monitoring/monitoring.api.ts");
  const details = await source("admin/src/admin/features/monitoring/DeviceDetailsPage.tsx");
  const applications = await source("admin/src/admin/features/monitoring/DeviceApplicationsPanel.tsx");
  const usage = await source("admin/src/admin/features/monitoring/DeviceApplicationUsageHistory.tsx");
  const tracker = await source("device-agent/src/foreground-tracker.ts");
  const commands = await source("admin/src/admin/features/monitoring/DeviceCommandsPanel.tsx");
  const policy = await source("admin/src/admin/features/monitoring/DeviceApplicationPolicyPanel.tsx");
  const remote = await source("admin/src/admin/features/monitoring/DeviceRemoteSupportPanel.tsx");

  assert.equal(api.includes("/applications`"), true);
  assert.equal(api.includes("/application-sessions?range="), true);
  assert.equal(api.includes("/commands"), true);
  assert.equal(api.includes("/application-policy"), true);
  assert.equal(api.includes("/remote-sessions/current"), true);
  assert.equal(details.includes("DeviceApplicationsPanel"), true);
  assert.equal(details.includes("DeviceCommandsPanel"), true);
  assert.equal(details.includes("DeviceApplicationPolicyPanel"), true);
  assert.equal(details.includes("DeviceRemoteSupportPanel"), true);
  assert.equal(applications.includes("have not been reported yet"), true);
  assert.equal(usage.includes("No foreground usage recorded"), true);
  assert.equal(tracker.includes("IDLE_SESSION_THRESHOLD_SECONDS"), true);
  assert.equal(commands.includes("No commands have been sent"), true);
  assert.equal(commands.includes("Requested By"), true);
  assert.equal(policy.includes("No policy assigned"), true);
  assert.equal(policy.includes("enforcementStatus"), true);
  assert.equal(remote.includes("Employee session unavailable"), true);
});

test("active Device Details production sources contain no random or fake data fallbacks", async () => {
  const files = [
    "admin/src/admin/features/monitoring/DeviceDetailsPage.tsx",
    "admin/src/admin/features/monitoring/DeviceApplicationsPanel.tsx",
    "admin/src/admin/features/monitoring/DeviceApplicationUsageHistory.tsx",
    "admin/src/admin/features/monitoring/DeviceCommandsPanel.tsx",
    "admin/src/admin/features/monitoring/DeviceSoftwareManagementPanel.tsx",
    "admin/src/admin/features/monitoring/DeviceApplicationPolicyPanel.tsx",
    "admin/src/admin/features/monitoring/DeviceRemoteSupportPanel.tsx",
  ];

  for (const file of files) {
    const content = await source(file);
    assert.equal(content.includes("Math.random"), false, file);
    assert.equal(content.includes("dummy"), false, file);
    assert.equal(content.includes("sample data"), false, file);
  }
});
