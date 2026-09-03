import test from "node:test";
import assert from "node:assert/strict";
import { installStorageMocks } from "../helpers/storage.ts";
import { clearAuthSession, getStoredAuthSession, persistSession } from "../../shared/src/auth/auth-service.ts";
import type { JwtReadySession } from "../../shared/src/auth/types.ts";

installStorageMocks();

const deviceUserSyncCalls: Array<[
  string,
  boolean | undefined,
]> = [];

Object.defineProperty(globalThis, "window", {
  configurable: true,
  value: {
    caches: { delete: async () => true },
    dispatchEvent: () => true,
    localStorage,
    sessionStorage,
    electronAPI: {
      ensureDeviceEnrollment: async (
        accessToken: string,
        active?: boolean,
      ) => {
        deviceUserSyncCalls.push([
          accessToken,
          active,
        ]);
        return { state: "enrolled" };
      },
    },
  },
});

function buildSession(email: string, role: JwtReadySession["user"]["role"]): JwtReadySession {
  return {
    accessToken: "access-token",
    refreshToken: "refresh-token",
    tokenType: "Bearer",
    expiresIn: 3600,
    user: { email, role },
  };
}

test("persistSession stores remembered sessions in localStorage", () => {
  clearAuthSession();

  const session = persistSession(buildSession("ceo@example.com", "Owner"), true);

  assert.equal(session.user.role, "Owner");
  assert.equal(getStoredAuthSession()?.user.email, "ceo@example.com");
  assert.equal(session.tokenType, "Bearer");
});

test("persistSession stores non-remembered sessions in sessionStorage", () => {
  clearAuthSession();

  persistSession(buildSession("employee@example.com", "Employee"), false);

  assert.equal(localStorage.getItem("ai_bos_auth_session"), null);
  assert.equal(getStoredAuthSession()?.user.role, "Employee");
});

test("clearAuthSession removes both storage locations", () => {
  deviceUserSyncCalls.length = 0;
  persistSession(buildSession("hr@example.com", "HR"), true);
  clearAuthSession();

  assert.equal(getStoredAuthSession(), null);
  assert.deepEqual(deviceUserSyncCalls, [
    ["access-token", false],
  ]);
});

test("a remembered session in another tab does not hijack this tab's active session", () => {
  clearAuthSession();

  // Tab A: Admin logs in with "remember me" -> written to shared localStorage.
  persistSession(buildSession("admin@example.com", "Administrator"), true);

  // Tab B (same origin/port, e.g. the employee portal): Manager logs in without
  // "remember me" -> only writes to this tab's own sessionStorage.
  persistSession(buildSession("manager@example.com", "Manager"), false);

  // Tab B must keep seeing its own Manager session, not Admin's from localStorage.
  assert.equal(getStoredAuthSession()?.user.role, "Manager");
  assert.equal(getStoredAuthSession()?.user.email, "manager@example.com");
});

test("switching from Administrator to Manager clears role-sensitive browser state", () => {
  clearAuthSession();
  persistSession(buildSession("admin@example.com", "Administrator"), true);
  localStorage.setItem("ai-bos-recent-pages", JSON.stringify(["/admin"]));
  localStorage.setItem("ai-bos-favorite-pages", JSON.stringify(["/monitoring"]));
  sessionStorage.setItem("admin-completed", "true");

  persistSession(buildSession("manager@example.com", "Manager"), false);

  assert.equal(localStorage.getItem("ai-bos-recent-pages"), null);
  assert.equal(localStorage.getItem("ai-bos-favorite-pages"), null);
  assert.equal(sessionStorage.getItem("admin-completed"), null);
  assert.equal(getStoredAuthSession()?.user.role, "Manager");
});

test("switching away from Manager clears Manager navigation and dashboard state", () => {
  clearAuthSession();
  persistSession(buildSession("manager@example.com", "Manager"), true);
  localStorage.setItem("ai-bos-recent-pages", JSON.stringify(["/projects", "/analytics"]));
  localStorage.setItem("ai-bos-favorite-pages", JSON.stringify(["/workflows"]));
  localStorage.setItem("manager-completed", JSON.stringify(["Review delivery plan"]));

  persistSession(buildSession("employee@example.com", "Employee"), false);

  assert.equal(localStorage.getItem("ai-bos-recent-pages"), null);
  assert.equal(localStorage.getItem("ai-bos-favorite-pages"), null);
  assert.equal(localStorage.getItem("manager-completed"), null);
  assert.equal(getStoredAuthSession()?.user.role, "Employee");
});
