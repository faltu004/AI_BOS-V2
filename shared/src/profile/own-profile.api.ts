import { getApiBaseUrl } from "@shared/lib/env";
import { getStoredAuthSession, isSessionExpired, refreshSession } from "@shared/auth/auth-service";

export type OwnProfileUpdateInput = {
 fullName?: string;
 avatar?: string | null;
 phone?: string;
 location?: string;
 personalInformation?: {
 dateOfBirth?: string;
 gender?: string;
 nationality?: string;
 maritalStatus?: string;
 };
 contact?: {
 address?: string;
 emergencyContact?: string;
 };
};

export type OwnProfileResult = {
 id: string;
 fullName: string;
 email: string;
 avatar: string;
 phone?: string;
 location?: string;
 personalInformation?: OwnProfileUpdateInput["personalInformation"];
 contact?: OwnProfileUpdateInput["contact"];
};

async function getSessionHeader(): Promise<Record<string, string>> {
 let session = getStoredAuthSession();
 if (session && isSessionExpired(session)) {
 session = await refreshSession();
 }
 return session ? { Authorization: `Bearer ${session.accessToken}` } : {};
}

export async function fetchOwnProfile(): Promise<OwnProfileResult> {
 const response = await fetch(`${getApiBaseUrl()}/users/me`, {
 cache: "no-store",
 headers: await getSessionHeader(),
 });

 const json = await response.json().catch(() => null);

 if (!response.ok) {
 throw new Error(json?.message ?? "Unable to load your profile.");
 }

 return json.data as OwnProfileResult;
}

export async function updateOwnProfile(input: OwnProfileUpdateInput): Promise<OwnProfileResult> {
 const response = await fetch(`${getApiBaseUrl()}/users/me`, {
 method: "PATCH",
 headers: {
 "Content-Type": "application/json",
 ...(await getSessionHeader()),
 },
 body: JSON.stringify(input),
 });

 const json = await response.json().catch(() => null);

 if (!response.ok) {
 const fieldErrors =
 json?.errors && typeof json.errors === "object"
 ? Object.values(json.errors).flat().filter((value): value is string => typeof value === "string")
 : [];
 throw new Error(fieldErrors[0] ?? json?.message ?? "Unable to save your profile. Please try again.");
 }

 return json.data as OwnProfileResult;
}
