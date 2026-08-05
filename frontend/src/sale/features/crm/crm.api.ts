import { getStoredAuthSession, isSessionExpired, refreshSession } from "@shared/auth/auth-service";
import { getApiBaseUrl } from "@shared/lib/env";
import { formatDateTime } from "@shared/lib/utils-helpers";
import type { Lead, LeadFormInput, LeadStage } from "./crm.types";

type CrmResult<T> = { status: "ok"; data: T } | { status: "forbidden" } | { status: "error" };

type BackendLeadStatus = "New" | "Qualified" | "Proposal" | "Won" | "Lost";

type BackendLead = {
  id?: string;
  _id?: string;
  name: string;
  company?: string;
  email?: string;
  phone?: string;
  source: string;
  status: BackendLeadStatus;
  value: number;
  ownerId?: { fullName?: string; email?: string } | string;
  metadata?: {
    nextFollowUp?: string;
    notes?: string[];
    attachments?: { name: string; type?: string; size?: string }[];
    salesperson?: string;
  };
  createdAt: string;
  updatedAt: string;
};

type LeadPayload = {
  name?: string;
  company?: string;
  email?: string;
  phone?: string;
  source?: string;
  status?: BackendLeadStatus;
  value?: number;
  metadata?: Record<string, unknown>;
};

async function getSessionHeader(): Promise<Record<string, string>> {
  let session = getStoredAuthSession();
  if (session && isSessionExpired(session)) {
    session = await refreshSession();
  }
  return session ? { Authorization: `Bearer ${session.accessToken}` } : {};
}

function ownerName(owner: BackendLead["ownerId"]) {
  if (!owner) return "Unassigned";
  if (typeof owner === "string") return "Assigned";
  return owner.fullName ?? owner.email ?? "Assigned";
}

function toBackendStatus(stage: LeadStage): BackendLeadStatus {
  if (stage === "Contacted") return "Qualified";
  if (stage === "Negotiation") return "Proposal";
  return stage;
}

function compactPayload(payload: LeadPayload) {
  return Object.fromEntries(Object.entries(payload).filter(([, value]) => value !== undefined && value !== "")) as LeadPayload;
}

function toLead(record: BackendLead, index: number): Lead {
  const id = record.id ?? record._id ?? `lead-${index}`;
  const stage = record.status as LeadStage;
  return {
    id,
    leadCode: `LEAD-${id.slice(-6).toUpperCase()}`,
    name: record.name,
    company: record.company ?? "Unassigned",
    email: record.email ?? "",
    phone: record.phone ?? "",
    source: record.source,
    stage,
    value: record.value,
    salesperson: record.metadata?.salesperson ?? ownerName(record.ownerId),
    nextFollowUp: record.metadata?.nextFollowUp ?? record.updatedAt.slice(0, 10),
    notes: record.metadata?.notes?.length ? record.metadata.notes : ["Live backend lead"],
    attachments: (record.metadata?.attachments ?? []).map((attachment) => ({
      name: attachment.name,
      type: attachment.type ?? "file",
      size: attachment.size ?? "Unknown",
    })),
    activityTimeline: [
      {
        id: `${id}-updated`,
        title: "Lead synced",
        detail: `${record.name} loaded from backend`,
        time: formatDateTime(record.updatedAt),
      },
    ],
    createdAt: record.createdAt.slice(0, 10),
  };
}

export async function fetchCrmLeads(limit = 100): Promise<CrmResult<Lead[]>> {
  try {
    const response = await fetch(`${getApiBaseUrl()}/leads?limit=${limit}`, {
      cache: "no-store",
      headers: await getSessionHeader(),
    });

    if (response.status === 403) return { status: "forbidden" };
    if (!response.ok) return { status: "error" };

    const json = await response.json().catch(() => null);
    const payload = json?.data;
    const items = Array.isArray(payload) ? payload : payload?.items;
    if (!Array.isArray(items)) return { status: "error" };

    return { status: "ok", data: items.map(toLead) };
  } catch {
    return { status: "error" };
  }
}

async function writeLead(path: string, method: "POST" | "PATCH", payload: LeadPayload): Promise<CrmResult<Lead>> {
  try {
    const response = await fetch(`${getApiBaseUrl()}${path}`, {
      method,
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        ...(await getSessionHeader()),
      },
      body: JSON.stringify(compactPayload(payload)),
    });

    if (response.status === 403) return { status: "forbidden" };
    if (!response.ok) return { status: "error" };

    const json = await response.json().catch(() => null);
    const payloadData = json?.data;
    if (!payloadData) return { status: "error" };
    return { status: "ok", data: toLead(payloadData, 0) };
  } catch {
    return { status: "error" };
  }
}

export function createCrmLead(input: LeadFormInput): Promise<CrmResult<Lead>> {
  return writeLead("/leads", "POST", {
    name: input.name,
    company: input.company,
    email: input.email,
    phone: input.phone,
    source: input.source,
    status: toBackendStatus(input.stage),
    value: input.value,
    metadata: {
      nextFollowUp: input.nextFollowUp,
      notes: input.notes,
      attachments: input.attachments,
      salesperson: input.salesperson,
    },
  });
}

export function updateCrmLead(id: string, update: Partial<Lead>): Promise<CrmResult<Lead>> {
  return writeLead(`/leads/${id}`, "PATCH", {
    name: update.name,
    company: update.company,
    email: update.email,
    phone: update.phone,
    source: update.source,
    status: update.stage ? toBackendStatus(update.stage) : undefined,
    value: update.value,
    metadata:
      update.salesperson || update.nextFollowUp || update.notes || update.attachments
        ? {
            nextFollowUp: update.nextFollowUp,
            notes: update.notes,
            attachments: update.attachments,
            salesperson: update.salesperson,
          }
        : undefined,
  });
}
