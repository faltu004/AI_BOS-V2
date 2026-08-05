import { getStoredAuthSession, isSessionExpired, refreshSession } from "@shared/auth/auth-service";
import { getApiBaseUrl } from "@shared/lib/env";

export type AnalyticsResult<T> = { status: "ok"; data: T } | { status: "forbidden" } | { status: "error" };

export type OverviewAnalytics = {
 projects: { total: number; active: number; completed: number; delayed: number };
 tasks: { total: number; completed: number; overdue: number; completionRate: number; byStatus: { status: string; count: number }[] };
 employees: { total: number; active: number };
};

export type SalesAnalytics = {
 totalLeads: number;
 pipelineValue: number;
 wonValue: number;
 winRate: number;
 byStatus: { status: string; count: number }[];
};

async function getSessionHeader(): Promise<Record<string, string>> {
 let session = getStoredAuthSession();
 if (session && isSessionExpired(session)) {
 session = await refreshSession();
 }
 return session ? { Authorization: `Bearer ${session.accessToken}` } : {};
}

async function fetchSection<T>(section: "overview" | "sales"): Promise<AnalyticsResult<T>> {
 try {
 const response = await fetch(`${getApiBaseUrl()}/analytics?section=${section}`, {
 headers: await getSessionHeader(),
 });

 if (response.status === 403) return { status: "forbidden" };
 if (!response.ok) return { status: "error" };

 const json = await response.json().catch(() => null);
 return json ? { status: "ok", data: json.data.data as T } : { status: "error" };
 } catch {
 return { status: "error" };
 }
}

export function fetchOverviewAnalytics() {
 return fetchSection<OverviewAnalytics>("overview");
}

export function fetchSalesAnalytics() {
 return fetchSection<SalesAnalytics>("sales");
}
