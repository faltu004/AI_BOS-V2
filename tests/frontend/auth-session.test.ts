import test from "node:test";
import assert from "node:assert/strict";
import { installStorageMocks } from "../helpers/storage.ts";
import { clearAuthSession, getStoredAuthSession, persistSession } from "../../shared/src/auth/auth-service.ts";
import type { JwtReadySession } from "../../shared/src/auth/types.ts";

installStorageMocks();

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
  persistSession(buildSession("hr@example.com", "HR"), true);
  clearAuthSession();

  assert.equal(getStoredAuthSession(), null);
});

test("a remembered session in another tab does not hijack this tab's active session", () => {
  clearAuthSession();

  // Tab A: Admin logs in with "remember me" -> written to shared localStorage.
  persistSession(buildSession("admin@example.com", "Administrator"), true);

  // Tab B (same origin/port, e.g. the admin portal): Manager logs in without
  // "remember me" -> only writes to this tab's own sessionStorage.
  persistSession(buildSession("manager@example.com", "Manager"), false);

  // Tab B must keep seeing its own Manager session, not Admin's from localStorage.
  assert.equal(getStoredAuthSession()?.user.role, "Manager");
  assert.equal(getStoredAuthSession()?.user.email, "manager@example.com");
});
