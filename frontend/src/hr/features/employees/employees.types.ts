import type { AuthRole } from "@shared/auth/types";

export type EmployeeStatus = "Active" | "On Leave" | "Inactive";
export type AttendanceStatus = "Present" | "Absent" | "On Leave";
export type LeaveStatus = "Pending" | "Approved" | "Rejected";
export type EmployeeModule =
  | "employees"
  | "departments"
  | "designations"
  | "attendance"
  | "leave"
  | "salary"
  | "holidays"
  | "performance"
  | "documents";

export type EmployeeDocument = {
  name: string;
  type: string;
  size: string;
};

export type Employee = {
  id: string;
  employeeCode: string;
  name: string;
  avatar: string;
  email: string;
  phone: string;
  location: string;
  department: string;
  designation: string;
  employmentType: string;
  joiningDate: string;
  status: EmployeeStatus;
  personalInformation: {
    dateOfBirth: string;
    gender: string;
    nationality: string;
    maritalStatus: string;
  };
  contact: {
    address: string;
    emergencyContact: string;
  };
  skills: string[];
  experience: string[];
  education: string[];
  documents: EmployeeDocument[];
  salaryDetails: {
    annualCtc: number;
    monthlySalary: number;
    bank: string;
    taxId: string;
  };
  performanceScore: number;
};

export type AttendanceRecord = {
  id: string;
  employeeId: string;
  date: string;
  checkIn?: string;
  checkOut?: string;
  workingHours: number;
  status: AttendanceStatus;
};

export type LeaveRequest = {
  id: string;
  employeeId: string;
  type: string;
  from: string;
  to: string;
  reason: string;
  status: LeaveStatus;
  approver: string;
};

export type Department = {
  name: string;
  lead: string;
  employees: number;
  budget: number;
};

export type Designation = {
  title: string;
  department: string;
  level: string;
  employees: number;
};

export type Holiday = {
  name: string;
  date: string;
  type: string;
};

export type EmployeeFormInput = Pick<
  Employee,
  "name" | "email" | "phone" | "location" | "department" | "designation" | "employmentType" | "joiningDate" | "status"
> & {
  skills: string[];
  annualCtc: number;
  password: string;
  role: AuthRole;
};
