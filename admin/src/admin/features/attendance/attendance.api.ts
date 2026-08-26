import { getStoredAuthSession, isSessionExpired, refreshSession } from "@shared/auth/auth-service";
import { getApiBaseUrl } from "@shared/lib/env";

export type AdminAttendanceRecord = {
  id: string;
  date: string;
  status: "Present" | "Checked Out";
  checkInAt: string;
  checkOutAt?: string;
  checkInMethod: "face" | "manual";
  checkOutMethod?: "face" | "manual";
  checkInFaceVerified: boolean;
  checkOutFaceVerified: boolean;
  checkInManualReason?: string;
  checkOutManualReason?: string;
  employee: { id: string; fullName: string; email: string; role: string; employeeCode?: string };
  enrollmentStatus: "active" | "revoked" | "reset_required" | "not_enrolled";
};

export type AdminAttendanceOverview = {
  records: AdminAttendanceRecord[];
  total: number;
  page: number;
  limit: number;
  date: string;
};

export type AttendanceOverviewFilters = {
  date: string;
  search?: string;
  status?: "Present" | "Checked Out";
  method?: "face" | "manual";
};

async function token() {
  let session = getStoredAuthSession();
  if (session && isSessionExpired(session)) session = await refreshSession();
  return session?.accessToken;
}

async function request<T>(path: string, init: RequestInit = {}) {
  const accessToken = await token();
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    cache: "no-store",
    ...init,
    headers: {
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...init.headers,
    },
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(body?.message ?? "Attendance request failed.");
  return body.data as T;
}

export function fetchAdminAttendanceOverview(filters: AttendanceOverviewFilters) {
  const query = new URLSearchParams({ date: filters.date, limit: "200" });
  if (filters.search) query.set("search", filters.search);
  if (filters.status) query.set("status", filters.status);
  if (filters.method) query.set("method", filters.method);
  return request<AdminAttendanceOverview>(`/attendance/admin/overview?${query.toString()}`);
}

export function resetEmployeeFaceEnrollment(userId: string, reason: string) {
  return request<{ reset: true }>(`/face-enrollment/users/${encodeURIComponent(userId)}/reset`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
}
