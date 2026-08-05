import { getStoredAuthSession, isSessionExpired, refreshSession } from "@shared/auth/auth-service";
import { getApiBaseUrl } from "@shared/lib/env";
import { notifyLocalDataChanged } from "@shared/realtime/data-sync";

export type LeaveType = "Paid Leave" | "Sick Leave" | "Casual Leave" | "Unpaid Leave";
export type LeaveStatus = "Pending" | "Approved" | "Rejected" | "Cancelled";

export type LeavePerson = {
 _id?: string;
 id?: string;
 fullName?: string;
 email?: string;
 role?: string;
};

export type LeaveRequestPayload = {
 type: LeaveType;
 from: string;
 to: string;
 reason: string;
};

export type LeaveRequestRecord = {
 _id?: string;
 id?: string;
 userId: string | LeavePerson;
 approverId: string | LeavePerson;
 type: LeaveType;
 from: string;
 to: string;
 reason: string;
 status: LeaveStatus;
 decidedAt?: string;
 decisionNote?: string;
 createdAt?: string;
 updatedAt?: string;
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
 throw new Error(fieldErrors[0] ?? json?.message ?? "Leave request failed.");
 }

 return json.data as T;
}

export function fetchMyLeaveRequests(limit = 50) {
 return requestJson<LeaveRequestRecord[]>(`/leave-requests/me?limit=${limit}`);
}

export function fetchLeaveApprovals(status?: LeaveStatus, limit = 50) {
 const query = status ? `?status=${status}&limit=${limit}` : `?limit=${limit}`;
 return requestJson<LeaveRequestRecord[]>(`/leave-requests/approvals${query}`);
}

export async function applyForLeave(payload: LeaveRequestPayload) {
 const record = await requestJson<LeaveRequestRecord>("/leave-requests", {
 method: "POST",
 body: JSON.stringify(payload),
 });
 notifyLocalDataChanged({ at: new Date().toISOString(), method: "POST", path: "/leave-requests", resource: "leave-requests" });
 return record;
}

export async function cancelLeaveRequest(id: string) {
 const record = await requestJson<LeaveRequestRecord>(`/leave-requests/${id}/cancel`, { method: "POST" });
 notifyLocalDataChanged({ at: new Date().toISOString(), method: "POST", path: `/leave-requests/${id}/cancel`, resource: "leave-requests" });
 return record;
}

export async function decideLeaveRequest(id: string, status: "Approved" | "Rejected", decisionNote?: string) {
 const record = await requestJson<LeaveRequestRecord>(`/leave-requests/${id}/decision`, {
 method: "POST",
 body: JSON.stringify({ status, decisionNote }),
 });
 notifyLocalDataChanged({ at: new Date().toISOString(), method: "POST", path: `/leave-requests/${id}/decision`, resource: "leave-requests" });
 return record;
}
