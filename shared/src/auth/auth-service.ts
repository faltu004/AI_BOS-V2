import { getApiBaseUrl } from "../lib/env";
import { decodeJwtPayload, type AuthRole, type JwtReadySession } from "./types";

export const authSessionChangedEvent = "ai_bos_auth_session_changed";

type LoginResponse = {
 user: { email: string; role: AuthRole | "Admin" | "CEO"; fullName: string; isProfileComplete?: boolean; avatar?: string };
 tokens: {
 accessToken: string;
 refreshToken: string;
 tokenType: "Bearer";
 expiresIn: number;
 };
};

function normalizeAuthRole(role: AuthRole | "Admin" | "CEO"): AuthRole {
 if (role === "Admin") return "Administrator";
 if (role === "CEO") return "Owner";
 return role;
}

function normalizeSession(session: JwtReadySession): JwtReadySession {
 const legacyRole = session.user.role as AuthRole | "Admin" | "CEO";
 return {
 ...session,
 user: {
 ...session.user,
 role: normalizeAuthRole(legacyRole),
 // Sessions stored before this field existed have no `isProfileComplete` at
 // all — treat them as already-complete so already-onboarded users aren't
 // retroactively locked out until their next real login/refresh.
 isProfileComplete: session.user.isProfileComplete ?? true,
 },
 };
}

function notifyAuthSessionChanged() {
 if (typeof window !== "undefined") {
 window.dispatchEvent(new Event(authSessionChangedEvent));
 }
}

export function persistSession(session: JwtReadySession, rememberMe: boolean) {
 const normalizedSession = normalizeSession(session);

 // Always write to sessionStorage so this tab's session is isolated from
 // other tabs on the same origin/port (e.g. Admin and Manager both on :8081).
 sessionStorage.setItem("ai_bos_auth_session", JSON.stringify(normalizedSession));

 if (rememberMe) {
 localStorage.setItem("ai_bos_auth_session", JSON.stringify(normalizedSession));
 } else {
 localStorage.removeItem("ai_bos_auth_session");
 }

 notifyAuthSessionChanged();

 return normalizedSession;
}

/** Patches the signed-in user's own profile fields (e.g. after a self-service edit) in whichever storage already holds the session, without needing to know the original `rememberMe` choice. */
export function updateStoredSessionUser(patch: Partial<JwtReadySession["user"]>) {
 for (const storage of [sessionStorage, localStorage]) {
 const raw = storage.getItem("ai_bos_auth_session");
 if (!raw) continue;
 try {
 const session = JSON.parse(raw) as JwtReadySession;
 storage.setItem("ai_bos_auth_session", JSON.stringify({ ...session, user: { ...session.user, ...patch } }));
 } catch {
 // ignore malformed stored session
 }
 }
 notifyAuthSessionChanged();
}

/** Authenticates against the real backend — the account's role decides access, not the login form. */
export async function login(email: string, password: string, rememberMe: boolean): Promise<JwtReadySession> {
 const response = await fetch(`${getApiBaseUrl()}/auth/login`, {
 method: "POST",
 headers: { "Content-Type": "application/json" },
 body: JSON.stringify({ email, password }),
 });

 const json = await response.json().catch(() => null);

 if (!response.ok) {
 throw new Error(json?.message ?? "Unable to sign in. Please try again.");
 }

 const data = json.data as LoginResponse;
 const session: JwtReadySession = {
 accessToken: data.tokens.accessToken,
 refreshToken: data.tokens.refreshToken,
 tokenType: data.tokens.tokenType,
 expiresIn: data.tokens.expiresIn,
 user: {
 email: data.user.email,
 role: normalizeAuthRole(data.user.role),
 fullName: data.user.fullName,
 isProfileComplete: data.user.isProfileComplete ?? true,
 avatar: data.user.avatar,
 },
 };

 return persistSession(session, rememberMe);
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
 const session = getStoredAuthSession();
 const response = await fetch(`${getApiBaseUrl()}/auth/change-password`, {
 method: "PATCH",
 headers: {
 "Content-Type": "application/json",
 ...(session ? { Authorization: `Bearer ${session.accessToken}` } : {}),
 },
 body: JSON.stringify({ currentPassword, newPassword }),
 });

 const json = await response.json().catch(() => null);

 if (!response.ok) {
 throw new Error(json?.message ?? "Unable to change password. Please try again.");
 }
}

export function getStoredAuthSession(): JwtReadySession | null {
 // Check this tab's own session first. Only a brand-new tab (nothing in
 // sessionStorage yet) falls back to a remembered localStorage session.
 const rawSession =
 sessionStorage.getItem("ai_bos_auth_session") ??
 localStorage.getItem("ai_bos_auth_session");

 if (!rawSession) {
 return null;
 }

 try {
 return normalizeSession(JSON.parse(rawSession) as JwtReadySession);
 } catch {
 return null;
 }
}

export function clearAuthSession() {
 localStorage.removeItem("ai_bos_auth_session");
 sessionStorage.removeItem("ai_bos_auth_session");
 notifyAuthSessionChanged();
}

/** True once the access token's own `exp` claim has passed. Returns false for non-JWT/opaque tokens (e.g. in tests) rather than guessing. */
export function isSessionExpired(session: JwtReadySession): boolean {
 const payload = decodeJwtPayload(session.accessToken);
 const role = payload?.role;
 if (role === "CEO" || role === "Admin") return true;
 const exp = typeof payload?.exp === "number" ? payload.exp : null;
 return exp !== null && Date.now() >= exp * 1000;
}

let inFlightRefresh: Promise<JwtReadySession | null> | null = null;

/** Exchanges the stored refresh token for a new session. De-duplicates concurrent callers so a burst of expired API calls only rotates the refresh token once. */
export function refreshSession(): Promise<JwtReadySession | null> {
 if (!inFlightRefresh) {
 inFlightRefresh = performRefresh().finally(() => {
 inFlightRefresh = null;
 });
 }
 return inFlightRefresh;
}

async function performRefresh(): Promise<JwtReadySession | null> {
 const current = getStoredAuthSession();
 if (!current) return null;

 const wasRemembered = localStorage.getItem("ai_bos_auth_session") !== null;

 try {
 const response = await fetch(`${getApiBaseUrl()}/auth/refresh-token`, {
 method: "POST",
 headers: { "Content-Type": "application/json" },
 body: JSON.stringify({ refreshToken: current.refreshToken }),
 });

 if (!response.ok) {
 clearAuthSession();
 return null;
 }

 const json = await response.json().catch(() => null);
 const data = json?.data as LoginResponse | undefined;
 if (!data) {
 clearAuthSession();
 return null;
 }

 const session: JwtReadySession = {
 accessToken: data.tokens.accessToken,
 refreshToken: data.tokens.refreshToken,
 tokenType: data.tokens.tokenType,
 expiresIn: data.tokens.expiresIn,
 user: {
 email: data.user.email,
 role: normalizeAuthRole(data.user.role),
 fullName: data.user.fullName,
 isProfileComplete: data.user.isProfileComplete ?? true,
 avatar: data.user.avatar,
 },
 };

 return persistSession(session, wasRemembered);
 } catch {
 clearAuthSession();
 return null;
 }
}
