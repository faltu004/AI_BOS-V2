export function formatDate(value?: string): string {
 if (!value) return "Never";
 return new Date(value).toLocaleDateString("en-US", {
 month: "short",
 day: "numeric",
 year: "numeric",
 });
}

export function formatDateTime(value?: string): string {
 if (!value) return "Never";
 return new Date(value).toLocaleString("en-US", {
 month: "short",
 day: "numeric",
 hour: "numeric",
 minute: "2-digit",
 hour12: true,
 });
}

/** Formats an ISO timestamp or Date as a 12-hour clock time, e.g. "6:10 PM". */
export function formatClockTime(value?: string | Date | null): string {
 if (!value) return "--";
 const date = typeof value === "string" ? new Date(value) : value;
 if (Number.isNaN(date.getTime())) return "--";
 return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
}

/** Formats a 24-hour "HH:MM" string as 12-hour clock time, e.g. "18:10" -> "6:10 PM". Already-12-hour strings (with AM/PM) pass through unchanged. */
export function formatClockTimeString(value?: string): string {
 if (!value) return "--";
 if (/[AaPp][Mm]/.test(value)) return value;
 const match = /^(\d{1,2}):(\d{2})/.exec(value);
 if (!match) return value;
 const hours = Number(match[1]);
 const minutes = match[2];
 const period = hours >= 12 ? "PM" : "AM";
 const hour12 = hours % 12 === 0 ? 12 : hours % 12;
 return `${hour12}:${minutes} ${period}`;
}

/** Formats a decimal hour count as "Xh Ym", e.g. 3.9 -> "3h 54m". */
export function formatDuration(hours: number): string {
 if (!Number.isFinite(hours) || hours <= 0) return "0m";
 const totalMinutes = Math.round(hours * 60);
 const wholeHours = Math.floor(totalMinutes / 60);
 const minutes = totalMinutes % 60;
 if (wholeHours === 0) return `${minutes}m`;
 if (minutes === 0) return `${wholeHours}h`;
 return `${wholeHours}h ${minutes}m`;
}

export function formatFileSize(bytes: number): string {
 if (bytes === 0) return "0 B";
 const k = 1024;
 const sizes = ["B", "KB", "MB", "GB", "TB"];
 const i = Math.floor(Math.log(bytes) / Math.log(k));
 return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

export function truncateText(text: string, maxLength: number): string {
 if (text.length <= maxLength) return text;
 return `${text.slice(0, maxLength)}...`;
}

export function capitalize(str: string): string {
 return str.charAt(0).toUpperCase() + str.slice(1);
}

export function getInitials(name: string): string {
 return name
 .split(" ")
 .map((part) => part[0])
 .join("")
 .toUpperCase();
}

export function downloadFile(content: string, filename: string, type: string) {
 const blob = new Blob([content], { type });
 const url = URL.createObjectURL(blob);
 const link = document.createElement("a");
 link.href = url;
 link.download = filename;
 link.click();
 URL.revokeObjectURL(url);
}

export function downloadBlob(blob: Blob, filename: string) {
 const url = URL.createObjectURL(blob);
 const link = document.createElement("a");
 link.href = url;
 link.download = filename;
 link.click();
 URL.revokeObjectURL(url);
}