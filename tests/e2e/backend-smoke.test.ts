import test from "node:test";
import assert from "node:assert/strict";
import { configureBackendTestEnv } from "../helpers/backend-env.ts";

configureBackendTestEnv();

async function withServer(run: (baseUrl: string) => Promise<void>) {
  const { createApp } = await import("../../backend/src/app.ts");
  const app = createApp();
  const server = app.listen(0);

  await new Promise<void>((resolve) => server.once("listening", resolve));
  const address = server.address();
  assert.equal(typeof address, "object");
  const baseUrl = `http://127.0.0.1:${address!.port}`;

  try {
    await run(baseUrl);
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  }
}

test("E2E backend health and API root respond over HTTP", async () => {
  await withServer(async (baseUrl) => {
    const health = await fetch(`${baseUrl}/health`);
    assert.equal(health.status, 200);
    assert.equal((await health.json()).success, true);

    const root = await fetch(`${baseUrl}/api/v1`);
    assert.equal(root.status, 200);
    assert.equal((await root.json()).message, "AI BOS API v1");
  });
});

test("E2E unauthenticated profile creation is rejected before database writes", async () => {
  await withServer(async (baseUrl) => {
    // Public self-registration no longer exists — profile creation requires an
    // authenticated, hierarchy-permitted caller (see backend/src/services/user.service.ts).
    const response = await fetch(`${baseUrl}/api/v1/users`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fullName: "Bad Actor", email: "bad@example.com", password: "weak", role: "Owner" }),
    });

    assert.equal(response.status, 401);
    assert.equal((await response.json()).success, false);
  });
});
