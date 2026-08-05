import { getApiBaseUrl } from "@shared/lib/env";
import { getStoredAuthSession, isSessionExpired, refreshSession } from "@shared/auth/auth-service";
import type { CompleteProfileFormValues } from "./complete-profile.schema";

async function getSessionHeader(): Promise<Record<string, string>> {
 let session = getStoredAuthSession();
 if (session && isSessionExpired(session)) {
 session = await refreshSession();
 }
 return session ? { Authorization: `Bearer ${session.accessToken}` } : {};
}

export async function completeProfile(input: CompleteProfileFormValues): Promise<void> {
 const response = await fetch(`${getApiBaseUrl()}/users/me/profile`, {
 method: "PATCH",
 headers: {
 "Content-Type": "application/json",
 ...(await getSessionHeader()),
 },
 body: JSON.stringify({
 designation: input.designation,
 employmentType: input.employmentType,
 joiningDate: input.joiningDate,
 personalInformation: {
 dateOfBirth: input.dateOfBirth,
 gender: input.gender,
 },
 contact: {
 address: input.address,
 emergencyContact: input.emergencyContact,
 },
 }),
 });

 const json = await response.json().catch(() => null);

 if (!response.ok) {
 throw new Error(json?.message ?? "Unable to save your profile. Please try again.");
 }
}
