import { getStoredAuthSession, isSessionExpired, refreshSession } from "@shared/auth/auth-service";
import type { AuthRole } from "@shared/auth/types";
import { getApiBaseUrl } from "@shared/lib/env";
import type { Employee, EmployeeFormInput } from "./employees.types";

export type EmployeesResult<T> = { status: "ok"; data: T } | { status: "forbidden" } | { status: "error" };

export type BackendEmployee = {
  id: string;
  fullName: string;
  companyName: string;
  email: string;
  role: AuthRole;
  isActive: boolean;
  lastLoginAt?: string;
  createdAt?: string;
  avatar?: string;
  departmentId?: string;
  department?: string;
  employeeCode?: string;
  phone?: string;
  location?: string;
  designation?: string;
  employmentType?: string;
  joiningDate?: string;
  employmentStatus?: Employee["status"];
  personalInformation?: Partial<Employee["personalInformation"]>;
  contact?: Partial<Employee["contact"]>;
  skills?: string[];
  experience?: string[];
  education?: string[];
  documents?: Employee["documents"];
  salaryDetails?: Partial<Employee["salaryDetails"]>;
  performanceScore?: number;
};

export type DepartmentOption = {
  id: string;
  name: string;
  lead: string;
  budget: number;
  employees: number;
};

async function getSessionHeader(): Promise<Record<string, string>> {
  let session = getStoredAuthSession();
  if (session && isSessionExpired(session)) {
    session = await refreshSession();
  }
  return session ? { Authorization: `Bearer ${session.accessToken}` } : {};
}

async function fetchJson<T>(endpoint: string): Promise<EmployeesResult<T>> {
  try {
    const response = await fetch(`${getApiBaseUrl()}${endpoint}`, {
      headers: await getSessionHeader(),
    });

    if (response.status === 403) return { status: "forbidden" };
    if (!response.ok) return { status: "error" };

    const json = await response.json().catch(() => null);
    return json ? { status: "ok", data: json.data as T } : { status: "error" };
  } catch {
    return { status: "error" };
  }
}

function fallbackInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function toEmployee(record: BackendEmployee): Employee {
  const annualCtc = record.salaryDetails?.annualCtc ?? 0;
  return {
    id: record.id,
    employeeCode: record.employeeCode ?? `EMP-${record.id.slice(-6).toUpperCase()}`,
    name: record.fullName,
    avatar: record.avatar ?? fallbackInitials(record.fullName),
    email: record.email,
    phone: record.phone ?? "Not added",
    location: record.location ?? "Not added",
    department: record.department ?? "Unassigned",
    departmentId: record.departmentId,
    designation: record.designation ?? record.role,
    employmentType: record.employmentType ?? "Full Time",
    joiningDate: record.joiningDate?.slice(0, 10) ?? record.createdAt?.slice(0, 10) ?? "Not added",
    status: record.employmentStatus ?? (record.isActive ? "Active" : "Inactive"),
    personalInformation: {
      dateOfBirth: record.personalInformation?.dateOfBirth ?? "Not added",
      gender: record.personalInformation?.gender ?? "Not added",
      nationality: record.personalInformation?.nationality ?? "Not added",
      maritalStatus: record.personalInformation?.maritalStatus ?? "Not added",
    },
    contact: {
      address: record.contact?.address ?? record.location ?? "Not added",
      emergencyContact: record.contact?.emergencyContact ?? "Not added",
    },
    skills: record.skills?.length ? record.skills : ["Not added"],
    experience: record.experience?.length ? record.experience : ["Not added"],
    education: record.education?.length ? record.education : ["Not added"],
    documents: record.documents ?? [],
    salaryDetails: {
      annualCtc,
      monthlySalary: record.salaryDetails?.monthlySalary ?? Math.round(annualCtc / 12),
      bank: record.salaryDetails?.bank ?? "Not added",
      taxId: record.salaryDetails?.taxId ?? "Not added",
    },
    performanceScore: record.performanceScore ?? 75,
  };
}

export async function fetchEmployees() {
  const result = await fetchJson<BackendEmployee[]>("/users");
  if (result.status !== "ok") return result;
  return { status: "ok", data: result.data.map(toEmployee) } satisfies EmployeesResult<Employee[]>;
}

export function fetchEmployeeUsers() {
  return fetchJson<BackendEmployee[]>("/users");
}

type DepartmentApiRecord = { id?: string; _id?: string; name: string; lead?: string; budget?: number };
type DepartmentApiResponse = DepartmentApiRecord[] | { items: DepartmentApiRecord[] };

export async function fetchDepartments() {
  const result = await fetchJson<DepartmentApiResponse>("/organization/departments?limit=100");
  if (result.status !== "ok") return result;
  const items = Array.isArray(result.data) ? result.data : result.data.items;
  return {
    status: "ok",
    data: items.map((department) => ({
      id: department.id ?? department._id ?? department.name,
      name: department.name,
      lead: department.lead ?? "Unassigned",
      budget: department.budget ?? 0,
      employees: 0,
    })),
  } satisfies EmployeesResult<DepartmentOption[]>;
}

export async function fetchAssignableRoles() {
  return fetchJson<AuthRole[]>("/users/assignable-roles");
}

export async function createEmployee(input: EmployeeFormInput, departmentId?: string): Promise<Employee> {
  const annualCtc = input.annualCtc;
  const validDepartmentId = departmentId && /^[a-f\d]{24}$/i.test(departmentId) ? departmentId : undefined;
  const response = await fetch(`${getApiBaseUrl()}/users`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(await getSessionHeader()),
    },
    body: JSON.stringify({
      fullName: input.name,
      email: input.email,
      password: input.password,
      role: input.role,
      departmentId: validDepartmentId,
      employeeProfile: {
        phone: input.phone,
        location: input.location,
        designation: input.designation,
        employmentType: input.employmentType,
        joiningDate: input.joiningDate,
        employmentStatus: input.status,
        skills: input.skills,
        contact: {
          address: input.location,
          emergencyContact: "Not added",
        },
        experience: ["New employee profile created"],
        education: ["Not added"],
        documents: [],
        salaryDetails: {
          annualCtc,
          monthlySalary: Math.round(annualCtc / 12),
          bank: "Not added",
          taxId: "Not added",
        },
        performanceScore: 75,
      },
    }),
  });

  const json = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(json?.message ?? "Unable to create this employee.");
  }

  return toEmployee(json.data as BackendEmployee);
}
