import type { AdminModule, AdminPermission, AdminRecord, AdminRole } from "./admin.types";

export function canAccess(role: AdminRole, moduleId: string, permission: AdminPermission) {
 return role.permissions[moduleId]?.includes(permission) ?? false;
}

export function createEmptyRecord(module: AdminModule): AdminRecord {
 return module.fields.reduce<AdminRecord>(
 (record, field) => {
 if (field.type === "number") record[field.key] = 0;
 else if (field.type === "tags") record[field.key] = [];
 else if (field.type === "password") record[field.key] = "";
 else record[field.key] = field.options?.[0] ?? "";
 return record;
 },
 { id: `${module.id}-${Date.now()}` },
 );
}

export function formatAdminValue(value: unknown) {
 if (Array.isArray(value)) return value.join(", ");
 if (typeof value === "number") return value.toLocaleString();
 if (typeof value === "boolean") return value ? "Yes" : "No";
 return String(value ?? "");
}

export function parseAdminFieldValue(value: string, type: string) {
 if (type === "number") return Number(value);
 if (type === "tags") {
 return value
 .split(",")
 .map((item) => item.trim())
 .filter(Boolean);
 }
 return value;
}

export function downloadAdminBackup(payload: unknown) {
 const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
 const url = URL.createObjectURL(blob);
 const anchor = document.createElement("a");
 anchor.href = url;
 anchor.download = `ai-bos-admin-backup-${new Date().toISOString().slice(0, 10)}.json`;
 anchor.click();
 URL.revokeObjectURL(url);
}
