import type { AttendanceRecord, Employee, EmployeeFormInput } from "./employees.types";

export function generateEmployeeCode(employees: Employee[]) {
  return `EMP-2026-${String(employees.length + 1).padStart(3, "0")}`;
}

export function createEmployeeFromInput(input: EmployeeFormInput, employees: Employee[]): Employee {
  return {
    ...input,
    id: `emp-${Date.now()}`,
    employeeCode: generateEmployeeCode(employees),
    avatar: input.name
      .split(" ")
      .map((part) => part[0])
      .slice(0, 2)
      .join("")
      .toUpperCase(),
    personalInformation: { dateOfBirth: "1998-01-01", gender: "Not specified", nationality: "Not specified", maritalStatus: "Not specified" },
    contact: { address: input.location, emergencyContact: "Not added" },
    experience: ["New employee profile created"],
    education: ["Not added"],
    documents: [],
    salaryDetails: {
      annualCtc: input.annualCtc,
      monthlySalary: Math.round(input.annualCtc / 12),
      bank: "Not added",
      taxId: "Not added",
    },
    performanceScore: 75,
  };
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
