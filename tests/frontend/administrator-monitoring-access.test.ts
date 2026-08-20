import test from "node:test";
import assert from "node:assert/strict";
import {
  readFile,
} from "node:fs/promises";

test("Admin Monitoring navigation and direct routes are guarded by Owner-controlled access", async () => {
  const [
    appSource,
    settingsSource,
    detailsSource,
  ] =
    await Promise.all([
      readFile(
        "admin/src/App.tsx",
        "utf8",
      ),
      readFile(
        "admin/src/admin/features/settings/SettingsPage.tsx",
        "utf8",
      ),
      readFile(
        "admin/src/admin/features/monitoring/DeviceDetailsPage.tsx",
        "utf8",
      ),
    ]);

  assert.match(
    appSource,
    /nav-monitoring/,
  );
  assert.match(
    appSource,
    /MonitoringAccessGate><MonitoringDashboardPage/,
  );
  assert.match(
    appSource,
    /MonitoringAccessGate><DeviceDetailsPage/,
  );
  assert.match(
    appSource,
    /settings\/administrator-access[\s\S]*allowFullAccessBypass: false/,
  );
  assert.match(
    settingsSource,
    /Owner-controlled Monitoring and Device Management permissions/,
  );
  assert.match(
    detailsSource,
    /device\.command\.view/,
  );
  assert.match(
    detailsSource,
    /device\.software\.manage/,
  );
  assert.match(
    detailsSource,
    /device\.restriction\.manage/,
  );
  assert.match(
    detailsSource,
    /device\.remote_support\.create/,
  );
});
