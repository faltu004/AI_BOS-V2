export function decodeUserIdFromToken(token: string): string | null {
 try {
 const [, payload] = token.split(".");
 if (!payload) return null;

 const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
 const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=");
 const parsed = JSON.parse(atob(padded)) as { sub?: string };
 return parsed.sub ?? null;
 } catch {
 return null;
 }
}
