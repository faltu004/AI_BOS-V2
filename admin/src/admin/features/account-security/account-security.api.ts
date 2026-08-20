import { getApiBaseUrl } from "@shared/lib/env";

const apiBaseUrl = getApiBaseUrl();

type ApiEnvelope<T> = {
  success: boolean;
  message: string;
  data: T;
};

function authHeaders(token?: string) {
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function request<T>(path: string, token: string | undefined, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: authHeaders(token),
  });
  const body = (await response.json().catch(() => null)) as (ApiEnvelope<T> & { message?: string }) | null;
  if (!response.ok) {
    throw new Error(body?.message ?? `Request failed (${response.status})`);
  }
  return body!.data;
}

export type OwnerBootstrapStatus = {
  available: boolean;
};

export type FirstOwnerInput = {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
};

export type AdministratorCredentialStatus = {
  configured: boolean;
  email?: string;
  fullName?: string;
  updatedAt?: string;
};

export type AdministratorCredentialInput = {
  email?: string;
  password?: string;
  confirmPassword?: string;
};

export function fetchOwnerBootstrapStatus() {
  return request<OwnerBootstrapStatus>("/protected-accounts/owner-bootstrap/status", undefined);
}

export function createFirstOwner(input: FirstOwnerInput) {
  return request<{ created: boolean }>("/protected-accounts/owner-bootstrap", undefined, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function fetchAdministratorCredentialStatus(token?: string) {
  return request<AdministratorCredentialStatus>("/protected-accounts/administrator", token);
}

export function saveAdministratorCredentials(input: AdministratorCredentialInput, token?: string) {
  return request<AdministratorCredentialStatus>("/protected-accounts/administrator", token, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}
