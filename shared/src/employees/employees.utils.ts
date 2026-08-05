import type { AttendanceRecord, Employee } from "./employees.types";

export function generateEmployeeCode(employees: Employee[]) {
 return `EMP-2026-${String(employees.length + 1).padStart(3, "0")}`;
}

export function getEmployeeDashboardStats(employees: Employee[], attendance: AttendanceRecord[]) {
 return {
 total: employees.length,
 present: attendance.filter((record) => record.status === "Present").length,
 absent: attendance.filter((record) => record.status === "Absent").length,
 onLeave: attendance.filter((record) => record.status === "On Leave").length,
 };
}

export function formatMoney(value: number) {
 return new Intl.NumberFormat("en-US", {
 currency: "USD",
 maximumFractionDigits: 0,
 style: "currency",
 }).format(value);
}
