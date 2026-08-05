import { getStoredAuthSession, isSessionExpired, refreshSession } from "@shared/auth/auth-service";
import { getApiBaseUrl } from "@shared/lib/env";
import { notifyLocalDataChanged } from "@shared/realtime/data-sync";

export type AttendanceLocationPayload = {
 latitude: number;
 longitude: number;
 accuracy?: number;
};

export type AttendanceMarkPayload = AttendanceLocationPayload & {
 faceImage: string;
};

export type AttendanceLocation = AttendanceLocationPayload & {
 distanceMeters?: number;
};

export type AttendanceOffice = {
 name?: string;
 latitude: number;
 longitude: number;
 radiusMeters: number;
};

export type AttendanceRecord = {
 _id?: string;
 id?: string;
 userId?: string;
 date: string;
 status: "Present" | "Checked Out";
 checkInAt: string;
 checkOutAt?: string;
 checkInLocation: AttendanceLocation;
 checkOutLocation?: AttendanceLocation;
 checkInFaceImage?: string;
 checkOutFaceImage?: string;
 createdAt?: string;
 updatedAt?: string;
};

export type AttendanceToday = {
 record: AttendanceRecord | null;
 office: AttendanceOffice;
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
 cache: "no-store",
 ...init,
 headers: {
 ...(init.body ? { "Content-Type": "application/json" } : {}),
 ...(init.headers ?? {}),
 ...(await getSessionHeader()),
 },
 });
 const json = await response.json().catch(() => null);

 if (!response.ok) {
 const fieldErrors =
 json?.errors && typeof json.errors === "object"
 ? Object.values(json.errors).flat().filter((value): value is string => typeof value === "string")
 : [];
 throw new Error(fieldErrors[0] ?? json?.message ?? "Attendance request failed.");
 }

 return json.data as T;
}

export function fetchTodayAttendance() {
 return requestJson<AttendanceToday>("/attendance/me/today");
}

export function fetchAttendanceHistory(limit = 100) {
 return requestJson<AttendanceRecord[]>(`/attendance/me/history?limit=${limit}`);
}

export function fetchAttendanceOffice() {
 return requestJson<AttendanceOffice>("/attendance/office");
}

export async function checkInAttendance(location: AttendanceMarkPayload) {
 const record = await requestJson<AttendanceRecord>("/attendance/check-in", {
 method: "POST",
 body: JSON.stringify(location),
 });
 notifyLocalDataChanged({ at: new Date().toISOString(), method: "POST", path: "/attendance/check-in", resource: "attendance" });
 return record;
}

export async function checkOutAttendance(location: AttendanceMarkPayload) {
 const record = await requestJson<AttendanceRecord>("/attendance/check-out", {
 method: "POST",
 body: JSON.stringify(location),
 });
 notifyLocalDataChanged({ at: new Date().toISOString(), method: "POST", path: "/attendance/check-out", resource: "attendance" });
 return record;
}
