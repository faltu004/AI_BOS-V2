import { getApiBaseUrl } from "@shared/lib/env";
import { getStoredAuthSession, isSessionExpired, refreshSession } from "@shared/auth/auth-service";

export type FaceEnrollmentStatus = {
  enrolled: boolean;
  status: "active" | "revoked" | "reset_required" | "not_enrolled";
  enrolledAt?: string;
  provider?: string;
  templateVersion?: string;
};

async function getSessionHeader(): Promise<Record<string, string>> {
  let session = getStoredAuthSession();
  if (session && isSessionExpired(session)) {
    session = await refreshSession();
  }
  return session ? { Authorization: `Bearer ${session.accessToken}` } : {};
}

async function requestJson<T>(endpoint: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${getApiBaseUrl()}${endpoint}`, {
    ...init,
    headers: {
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...(init.headers ?? {}),
      ...(await getSessionHeader()),
    },
  });
  const json = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(json?.message ?? "Face enrollment request failed.");
  }
  return json.data as T;
}

export function fetchMyFaceEnrollment() {
  return requestJson<FaceEnrollmentStatus>("/face-enrollment/me");
}

export function enrollMyFace(samples: string[]) {
  return requestJson<FaceEnrollmentStatus>("/face-enrollment/me", {
    method: "POST",
    body: JSON.stringify({ consentAccepted: true, samples }),
  });
}
