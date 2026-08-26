import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

process.env.NODE_ENV = "test";

test("requestDeviceCredentialRotation is wired to the exact admin-facing rotation-request endpoint, method, and reason field", async () => {
  /*
   * monitoring.api.ts uses the @shared/* path aliases that only Vite
   * resolves; no existing test in this codebase dynamically imports
   * an admin/shared source file for that reason, so this is a
   * source-text contract check, matching the convention already used
   * by administrator-monitoring-access.test.ts. It confirms the exact
   * backend route the Rotate button reaches through
   * requestDeviceCredentialRotation -- the same function proven wired
   * to the button's onSubmit handler by the tests above.
   */
  const source = await readFile(
    "admin/src/admin/features/monitoring/monitoring.api.ts",
    "utf8",
  );

  const functionMatch = source.match(
    /export function requestDeviceCredentialRotation\(([\s\S]*?)\n\}/,
  );

  assert.ok(
    functionMatch,
    "requestDeviceCredentialRotation must exist in monitoring.api.ts",
  );

  const functionBody = functionMatch![0];

  assert.match(
    functionBody,
    /postRequest</,
    "must use the POST request helper, not a GET",
  );

  assert.match(
    functionBody,
    /"\/credential\/rotation-request"/,
  );

  assert.match(
    functionBody,
    /reason,/,
  );
});

test("DeviceCredentialPanel no longer uses window.prompt/window.confirm for the Rotate action", async () => {
  /*
   * Regression test for the runtime bug where clicking "Rotate
   * Credential" silently did nothing: window.prompt() is not used
   * anywhere else in this codebase and is unreliable/unsupported in
   * many Electron BrowserWindow configurations, where it returns null
   * immediately with no error. The handler treated that exactly like
   * "user cancelled," so no network request was ever sent and no
   * error was ever shown. The fix replaces both window.prompt() and
   * window.confirm() with the same in-app dialog primitives already
   * proven to work elsewhere in this app (Input/Label for the reason
   * field, useConfirm() for the Revoke confirmation).
   */
  const source = await readFile(
    "admin/src/admin/features/monitoring/DeviceCredentialPanel.tsx",
    "utf8",
  );

  assert.doesNotMatch(
    source,
    /window\.prompt\(/,
    "DeviceCredentialPanel must not use window.prompt()",
  );

  assert.doesNotMatch(
    source,
    /window\.confirm\(/,
    "DeviceCredentialPanel must not use window.confirm()",
  );

  assert.match(
    source,
    /useConfirm/,
    "Revoke must use the proven in-app confirm dialog",
  );

  assert.match(
    source,
    /RotateCredentialModal/,
    "Rotate must use an in-app modal instead of a native prompt dialog",
  );
});

test("no file in the admin app uses window.prompt (the only known-unreliable native dialog in this Electron app)", async () => {
  const { execFile } = await import("node:child_process");
  const { promisify } = await import("node:util");
  const execFileAsync = promisify(execFile);

  let matches = "";

  try {
    const result = await execFileAsync("git", [
      "grep",
      "-l",
      "window.prompt(",
      "--",
      "admin/src",
      "shared/src",
    ]);
    matches = result.stdout;
  } catch (error) {
    // git grep exits 1 when there are no matches -- that is the
    // desired outcome, not a test infrastructure failure.
    const execError = error as { code?: number; stdout?: string };
    if (execError.code !== 1) {
      throw error;
    }
    matches = execError.stdout ?? "";
  }

  assert.equal(
    matches.trim(),
    "",
    "window.prompt() must not be used anywhere in admin/shared source: " +
      matches,
  );
});
