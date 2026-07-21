import type { JwtReadyAuthPayload, JwtReadySession } from "./types";

function createMockToken(prefix: string) {
  const random = crypto.getRandomValues(new Uint32Array(4)).join("");
  return `${prefix}.${btoa(random)}.${Date.now()}`;
}

export function createJwtReadySession(payload: JwtReadyAuthPayload): JwtReadySession {
  return {
    accessToken: createMockToken("access"),
    refreshToken: createMockToken("refresh"),
    tokenType: "Bearer",
    expiresIn: payload.rememberMe ? 60 * 60 * 24 * 30 : 60 * 60 * 8,
    user: payload,
  };
}

export function persistAuthIntent(payload: JwtReadyAuthPayload) {
  const session = createJwtReadySession(payload);
  const storage = payload.rememberMe ? localStorage : sessionStorage;

  storage.setItem("ai_bos_auth_session", JSON.stringify(session));

  return session;
}

export function getStoredAuthSession(): JwtReadySession | null {
  const rawSession =
    localStorage.getItem("ai_bos_auth_session") ??
    sessionStorage.getItem("ai_bos_auth_session");

  if (!rawSession) {
    return null;
  }

  try {
    return JSON.parse(rawSession) as JwtReadySession;
  } catch {
    return null;
  }
}

export function clearAuthSession() {
  localStorage.removeItem("ai_bos_auth_session");
  sessionStorage.removeItem("ai_bos_auth_session");
}
