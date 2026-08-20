import test from "node:test";
import assert from "node:assert/strict";

process.env.NODE_ENV = "test";

test("repeated application snapshots never throw Duplicate type name 'DWORD'", async () => {
  const { getApplicationSnapshot } = await import(
    "../../device-agent/src/applications.ts"
  );

  for (let attempt = 1; attempt <= 5; attempt += 1) {
    await assert.doesNotReject(
      async () => {
        await getApplicationSnapshot();
      },
      undefined,
      `snapshot #${attempt} must not throw`,
    );
  }
});

test("running application collection is stable across concurrent snapshot calls", async () => {
  const { getApplicationSnapshot } = await import(
    "../../device-agent/src/applications.ts"
  );

  const results = await Promise.all([
    getApplicationSnapshot(),
    getApplicationSnapshot(),
    getApplicationSnapshot(),
  ]);

  for (const snapshot of results) {
    assert.equal(Array.isArray(snapshot.runningApplications), true);
    assert.equal(Array.isArray(snapshot.installedApplications), true);
  }
});
