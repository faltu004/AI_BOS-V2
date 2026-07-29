import { motion } from "framer-motion";
import {
  BadgeCheck,
  Banknote,
  BriefcaseBusiness,
  Building2,
  CalendarCheck,
  CalendarDays,
  Check,
  Clock3,
  FileText,
  GraduationCap,
  Phone,
  Plus,
  Search,
  ShieldCheck,
  Star,
  UserRound,
  UsersRound,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "react-router-dom";
import type { AuthRole } from "@shared/auth/types";
import { ThemeToggle } from "@shared/ui/ThemeToggle";
import { Button } from "@shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@shared/ui/card";
import { Dialog } from "@shared/ui/dialog";
import { Input } from "@shared/ui/input";
import { Label } from "@shared/ui/label";
import { PasswordInput } from "@shared/ui/password-input";
import { useToast } from "@shared/ui/toast-context";
import { cn } from "@shared/lib/utils";
import { createEmployee, fetchAssignableRoles, fetchDepartments, fetchEmployees } from "./employees.api";
import {
  departments,
  designations,
  holidays,
  seedAttendance,
  seedLeaveRequests,
} from "./employees.data";
import { employeeFormSchema, type EmployeeFormValues } from "./employees.schema";
import type { AttendanceRecord, Employee, EmployeeFormInput, EmployeeModule, LeaveRequest } from "./employees.types";
import { formatMoney, getEmployeeDashboardStats } from "./employees.utils";

const modules: { id: EmployeeModule; label: string; icon: typeof UsersRound }[] = [
  { id: "employees", label: "Employees", icon: UsersRound },
  { id: "departments", label: "Departments", icon: Building2 },
  { id: "designations", label: "Designations", icon: BriefcaseBusiness },
  { id: "attendance", label: "Attendance", icon: Clock3 },
  { id: "leave", label: "Leave", icon: CalendarCheck },
  { id: "salary", label: "Salary", icon: Banknote },
  { id: "holidays", label: "Holidays", icon: CalendarDays },
  { id: "performance", label: "Performance", icon: Star },
  { id: "documents", label: "Documents", icon: FileText },
];

const emptyEmployeeForm: EmployeeFormInput = {
  name: "",
  email: "",
  password: "",
  role: "Employee",
  phone: "",
  location: "",
  department: departments[0].name,
  designation: designations[0].title,
  employmentType: "Full Time",
  joiningDate: new Date().toISOString().slice(0, 10),
  status: "Active",
  skills: [],
  annualCtc: 120000,
};

function parseList(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function EmployeeFormModal({
  onClose,
  departmentOptions,
  onSubmit,
  submitting,
}: {
  onClose: () => void;
  departmentOptions: { id: string; name: string }[];
  onSubmit: (input: EmployeeFormInput) => void;
  submitting: boolean;
}) {
  const [assignableRoles, setAssignableRoles] = useState<AuthRole[]>([]);
  const {
    control,
    formState: { errors },
    handleSubmit,
    register,
    setValue,
  } = useForm<EmployeeFormValues>({
    resolver: zodResolver(employeeFormSchema),
    defaultValues: { ...emptyEmployeeForm, department: departmentOptions[0]?.name ?? emptyEmployeeForm.department },
  });

  useEffect(() => {
    fetchAssignableRoles().then((result) => {
      if (result.status !== "ok" || result.data.length === 0) return;
      setAssignableRoles(result.data);
      setValue("role", result.data[0]);
    });
  }, [setValue]);

  return (
    <Dialog as="form" className="max-w-4xl" onClose={onClose} onSubmit={handleSubmit(onSubmit)}>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Add Employee</h2>
          <p className="mt-1 text-sm text-muted-foreground">Create a complete employee profile foundation.</p>
        </div>
        <Button onClick={onClose} type="button" variant="outline">
          Close
        </Button>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" className={cn(errors.name && "border-destructive focus-visible:ring-destructive/20")} {...register("name")} />
            {errors.name && <p className="text-xs font-medium text-destructive">{errors.name.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" className={cn(errors.email && "border-destructive focus-visible:ring-destructive/20")} {...register("email")} />
            {errors.email && <p className="text-xs font-medium text-destructive">{errors.email.message}</p>}
          </div>
          <div className="space-y-2 md:col-span-2">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="password">Temporary password</Label>
                <PasswordInput id="password" className={cn(errors.password && "border-destructive focus-visible:ring-destructive/20")} {...register("password")} />
                {errors.password && <p className="text-xs font-medium text-destructive">{errors.password.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Login role</Label>
                <select
                  className="h-11 w-full rounded-md border bg-background px-3 text-sm"
                  disabled={assignableRoles.length === 0}
                  id="role"
                  {...register("role")}
                >
                  {assignableRoles.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
                {errors.role && <p className="text-xs font-medium text-destructive">{errors.role.message}</p>}
              </div>
            </div>
            {assignableRoles.length === 0 ? (
              <p className="text-xs text-muted-foreground">Loading roles you're allowed to assign…</p>
            ) : (
              <p className="text-xs text-muted-foreground">Share this password with the employee — they can change it after signing in.</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" {...register("phone")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input id="location" {...register("location")} />
          </div>
          <div className="space-y-2">
            <Label>Department</Label>
            <select className="h-11 w-full rounded-md border bg-background px-3 text-sm" {...register("department")}>
              {departmentOptions.map((department) => (
                <option key={department.id}>{department.name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label>Designation</Label>
            <select className="h-11 w-full rounded-md border bg-background px-3 text-sm" {...register("designation")}>
              {designations.map((designation) => (
                <option key={designation.title}>{designation.title}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label>Employment Type</Label>
            <select className="h-11 w-full rounded-md border bg-background px-3 text-sm" {...register("employmentType")}>
              {["Full Time", "Part Time", "Contract", "Intern"].map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="joiningDate">Joining Date</Label>
            <Input id="joiningDate" type="date" {...register("joiningDate")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="annualCtc">Annual CTC</Label>
            <Input
              id="annualCtc"
              min={0}
              type="number"
              className={cn(errors.annualCtc && "border-destructive focus-visible:ring-destructive/20")}
              {...register("annualCtc", { valueAsNumber: true })}
            />
            {errors.annualCtc && <p className="text-xs font-medium text-destructive">{errors.annualCtc.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="skills">Skills</Label>
            <Controller
              control={control}
              name="skills"
              render={({ field }) => (
                <Input
                  id="skills"
                  placeholder="React, Sales, Finance"
                  value={field.value.join(", ")}
                  onChange={(event) => field.onChange(parseList(event.target.value))}
                />
              )}
            />
          </div>
        </div>
      <div className="mt-6 flex justify-end gap-3">
        <Button onClick={onClose} type="button" variant="outline">
          Cancel
        </Button>
        <Button disabled={submitting || assignableRoles.length === 0} type="submit">
          {submitting ? "Creating..." : "Create Employee"}
        </Button>
      </div>
    </Dialog>
  );
}

function EmployeeProfile({ employee }: { employee: Employee }) {
  return (
    <Card className="glass overflow-hidden">
      <div className="h-28 bg-gradient-to-r from-primary/30 via-emerald-400/20 to-accent/30" />
      <CardContent className="-mt-10 space-y-6 p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-end gap-4">
            <span className="flex h-20 w-20 items-center justify-center rounded-lg border bg-background text-xl font-bold text-primary shadow-glass">
              {employee.avatar}
            </span>
            <div>
              <p className="text-xs font-semibold text-primary">{employee.employeeCode}</p>
              <h2 className="mt-1 text-2xl font-bold">{employee.name}</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {employee.designation} - {employee.department}
              </p>
            </div>
          </div>
          <span className="w-fit rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-300">
            {employee.status}
          </span>
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          <InfoBlock icon={UserRound} title="Personal Information" rows={[
            ["DOB", employee.personalInformation.dateOfBirth],
            ["Gender", employee.personalInformation.gender],
            ["Nationality", employee.personalInformation.nationality],
            ["Marital", employee.personalInformation.maritalStatus],
          ]} />
          <InfoBlock icon={Phone} title="Contact" rows={[
            ["Email", employee.email],
            ["Phone", employee.phone],
            ["Address", employee.contact.address],
            ["Emergency", employee.contact.emergencyContact],
          ]} />
          <InfoBlock icon={Banknote} title="Salary Details" rows={[
            ["Annual CTC", formatMoney(employee.salaryDetails.annualCtc)],
            ["Monthly", formatMoney(employee.salaryDetails.monthlySalary)],
            ["Bank", employee.salaryDetails.bank],
            ["Tax ID", employee.salaryDetails.taxId],
          ]} />
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          <DetailList icon={BadgeCheck} title="Skills" items={employee.skills} />
          <DetailList icon={BriefcaseBusiness} title="Experience" items={employee.experience} />
          <DetailList icon={GraduationCap} title="Education" items={employee.education} />
        </div>
        <Card className="bg-background/65">
          <CardHeader>
            <CardTitle>Documents</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            {employee.documents.map((document) => (
              <div className="flex items-center justify-between gap-3 rounded-lg border bg-card/70 p-3" key={document.name}>
                <div className="flex min-w-0 items-center gap-3">
                  <FileText className="h-4 w-4 shrink-0 text-primary" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{document.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {document.type} - {document.size}
                    </p>
                  </div>
                </div>
                <ShieldCheck className="h-4 w-4 text-emerald-500" />
              </div>
            ))}
          </CardContent>
        </Card>
      </CardContent>
    </Card>
  );
}

function InfoBlock({ icon: Icon, rows, title }: { icon: typeof UserRound; rows: [string, string][]; title: string }) {
  return (
    <Card className="bg-background/65">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon className="h-4 w-4 text-primary" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {rows.map(([label, value]) => (
          <div className="flex justify-between gap-3 text-sm" key={label}>
            <span className="text-muted-foreground">{label}</span>
            <span className="max-w-[62%] text-right font-semibold">{value}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function DetailList({ icon: Icon, items, title }: { icon: typeof BadgeCheck; items: string[]; title: string }) {
  return (
    <Card className="bg-background/65">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon className="h-4 w-4 text-primary" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.map((item) => (
          <div className="rounded-lg border bg-card/70 px-3 py-2 text-sm text-muted-foreground" key={item}>
            {item}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departmentOptions, setDepartmentOptions] = useState(departments.map((department) => ({ ...department, id: department.name })));
  const [attendance, setAttendance] = useState(seedAttendance);
  const [leaveRequests, setLeaveRequests] = useState(seedLeaveRequests);
  const [activeModule, setActiveModule] = useState<EmployeeModule>("employees");
  const [search, setSearch] = useState("");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>();
  const [isAddingEmployee, setIsAddingEmployee] = useState(false);
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);
  const [loadingEmployees, setLoadingEmployees] = useState(true);
  const [employeesAccess, setEmployeesAccess] = useState<"ok" | "forbidden" | "error">("ok");
  const { toast } = useToast();
  const [leaveForm, setLeaveForm] = useState({
    employeeId: "",
    type: "Paid Leave",
    from: new Date().toISOString().slice(0, 10),
    to: new Date().toISOString().slice(0, 10),
    reason: "",
  });

  useEffect(() => {
    let mounted = true;

    async function loadEmployees() {
      setLoadingEmployees(true);
      const [employeeResult, departmentResult] = await Promise.all([fetchEmployees(), fetchDepartments()]);

      if (!mounted) return;

      if (departmentResult.status === "ok" && departmentResult.data.length > 0) {
        setDepartmentOptions(departmentResult.data);
      }

      if (employeeResult.status === "ok") {
        setEmployees(employeeResult.data);
        setEmployeesAccess("ok");
        setSelectedEmployeeId((current) => current ?? employeeResult.data[0]?.id);
        setLeaveForm((current) => ({ ...current, employeeId: current.employeeId || employeeResult.data[0]?.id || "" }));
      } else {
        setEmployeesAccess(employeeResult.status);
      }
      setLoadingEmployees(false);
    }

    void loadEmployees();

    return () => {
      mounted = false;
    };
  }, []);

  const selectedEmployee = employees.find((employee) => employee.id === selectedEmployeeId) ?? employees[0];
  const filteredEmployees = useMemo(
    () =>
      employees.filter((employee) =>
        `${employee.name} ${employee.employeeCode} ${employee.email} ${employee.department} ${employee.designation}`
          .toLowerCase()
          .includes(search.toLowerCase()),
      ),
    [employees, search],
  );
  const stats = getEmployeeDashboardStats(employees, attendance);

  const addEmployee = async (input: EmployeeFormInput) => {
    setIsCreatingAccount(true);
    try {
      const departmentId = departmentOptions.find((department) => department.name === input.department)?.id;
      const employee = await createEmployee(input, departmentId);
      setEmployees((current) => [employee, ...current]);
      setSelectedEmployeeId(employee.id);
      setLeaveForm((current) => ({ ...current, employeeId: current.employeeId || employee.id }));
      setIsAddingEmployee(false);
      toast({ title: "Employee added", description: `${input.name} can now sign in as ${input.role}.`, type: "success" });
    } catch (error) {
      toast({ title: "Could not create login account", description: (error as Error).message, type: "error" });
    } finally {
      setIsCreatingAccount(false);
    }
  };

  const checkIn = (employeeId: string) => {
    const today = new Date().toISOString().slice(0, 10);
    const time = new Date().toTimeString().slice(0, 5);
    setAttendance((current) => {
      const existing = current.find((record) => record.employeeId === employeeId && record.date === today);
      if (existing) {
        return current.map((record) => (record.id === existing.id ? { ...record, checkIn: record.checkIn ?? time, status: "Present" } : record));
      }
      return [{ id: `att-${Date.now()}`, employeeId, date: today, checkIn: time, workingHours: 0, status: "Present" }, ...current];
    });
  };

  const checkOut = (employeeId: string) => {
    const today = new Date().toISOString().slice(0, 10);
    const time = new Date().toTimeString().slice(0, 5);
    setAttendance((current) =>
      current.map((record) =>
        record.employeeId === employeeId && record.date === today
          ? { ...record, checkOut: time, workingHours: Math.max(record.workingHours, 8) }
          : record,
      ),
    );
  };

  const submitLeave = () => {
    if (!leaveForm.employeeId) return;
    const request: LeaveRequest = {
      ...leaveForm,
      id: `leave-${Date.now()}`,
      status: "Pending",
      approver: "Naina Rao",
    };
    setLeaveRequests((current) => [request, ...current]);
    setLeaveForm((current) => ({ ...current, reason: "" }));
  };

  const updateLeaveStatus = (id: string, status: LeaveRequest["status"]) => {
    setLeaveRequests((current) => current.map((request) => (request.id === id ? { ...request, status } : request)));
  };

  const statCards = [
    { label: "Total Employees", value: stats.total, icon: UsersRound },
    { label: "Present", value: stats.present, icon: Check },
    { label: "Absent", value: stats.absent, icon: X },
    { label: "On Leave", value: stats.onLeave, icon: CalendarCheck },
  ];

  return (
    <main className="min-h-screen bg-enterprise">
      <header className="sticky top-0 z-40 border-b bg-background/78 backdrop-blur-xl">
        <div className="container flex min-h-16 flex-wrap items-center justify-between gap-3 py-3">
          <div>
            <p className="text-sm font-semibold text-primary">Human Resources</p>
            <h1 className="text-2xl font-bold">Employee Management</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild type="button" variant="outline">
              <Link to="/dashboard">Dashboard</Link>
            </Button>
            <ThemeToggle />
            <Button onClick={() => setIsAddingEmployee(true)} type="button">
              <Plus className="h-4 w-4" />
              Add Employee
            </Button>
          </div>
        </div>
      </header>

      <div className="container space-y-6 py-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {statCards.map((card, index) => {
            const Icon = card.icon;
            return (
              <motion.div animate={{ opacity: 1, y: 0 }} initial={{ opacity: 0, y: 16 }} key={card.label} transition={{ delay: index * 0.04 }}>
                <Card className="glass h-full">
                  <CardContent className="p-5">
                    <Icon className="mb-4 h-5 w-5 text-primary" />
                    <p className="text-sm text-muted-foreground">{card.label}</p>
                    <p className="mt-2 text-3xl font-bold">{card.value}</p>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        <Card className="glass">
          <CardContent className="space-y-4 p-4">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-9" placeholder="Search employees, departments, designations..." value={search} onChange={(event) => setSearch(event.target.value)} />
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {modules.map((module) => {
                const Icon = module.icon;
                return (
                  <Button
                    className="shrink-0"
                    key={module.id}
                    onClick={() => setActiveModule(module.id)}
                    type="button"
                    variant={activeModule === module.id ? "default" : "outline"}
                  >
                    <Icon className="h-4 w-4" />
                    {module.label}
                  </Button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <section className="space-y-4">
            {activeModule === "employees" && (
              <Card className="glass">
                <CardHeader>
                  <CardTitle>Employees</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {loadingEmployees && <p className="text-sm text-muted-foreground">Loading live employee records...</p>}
                  {!loadingEmployees && employeesAccess === "forbidden" && (
                    <p className="text-sm text-muted-foreground">Your role does not have access to view all employees.</p>
                  )}
                  {!loadingEmployees && employeesAccess === "error" && (
                    <p className="text-sm text-muted-foreground">Could not load employees from the backend. Please try again.</p>
                  )}
                  {!loadingEmployees && employeesAccess === "ok" && filteredEmployees.length === 0 && (
                    <p className="text-sm text-muted-foreground">No employees match your search.</p>
                  )}
                  {!loadingEmployees && employeesAccess === "ok" && filteredEmployees.map((employee) => (
                    <button
                      className={cn(
                        "flex w-full items-center justify-between gap-4 rounded-lg border bg-background/65 p-4 text-left transition-all hover:-translate-y-0.5 hover:border-primary/40",
                        selectedEmployeeId === employee.id && "border-primary/50 bg-primary/5",
                      )}
                      key={employee.id}
                      onClick={() => setSelectedEmployeeId(employee.id)}
                      type="button"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-primary/10 text-sm font-bold text-primary">
                          {employee.avatar}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate font-semibold">{employee.name}</p>
                          <p className="truncate text-sm text-muted-foreground">{employee.designation}</p>
                        </div>
                      </div>
                      <span className="hidden rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground sm:inline-flex">
                        {employee.department}
                      </span>
                    </button>
                  ))}
                </CardContent>
              </Card>
            )}

            {activeModule === "departments" && (
              <SimpleGrid title="Departments" rows={departmentOptions.map((item) => [item.name, item.lead, `${employees.filter((employee) => employee.department === item.name).length} employees`, formatMoney(item.budget)])} />
            )}
            {activeModule === "designations" && (
              <SimpleGrid title="Designations" rows={designations.map((item) => [item.title, item.department, item.level, `${item.employees} employees`])} />
            )}
            {activeModule === "attendance" && (
              <AttendancePanel attendance={attendance} employees={employees} onCheckIn={checkIn} onCheckOut={checkOut} />
            )}
            {activeModule === "leave" && (
              <LeavePanel
                employees={employees}
                form={leaveForm}
                leaveRequests={leaveRequests}
                onFormChange={setLeaveForm}
                onSubmit={submitLeave}
                onUpdate={updateLeaveStatus}
              />
            )}
            {activeModule === "salary" && (
              <SimpleGrid title="Salary" rows={employees.map((employee) => [employee.name, employee.department, formatMoney(employee.salaryDetails.monthlySalary), formatMoney(employee.salaryDetails.annualCtc)])} />
            )}
            {activeModule === "holidays" && (
              <SimpleGrid title="Holidays" rows={holidays.map((holiday) => [holiday.name, holiday.date, holiday.type, "Company calendar"])} />
            )}
            {activeModule === "performance" && (
              <SimpleGrid title="Performance" rows={employees.map((employee) => [employee.name, employee.designation, `${employee.performanceScore}%`, employee.performanceScore >= 90 ? "Excellent" : "Strong"])} />
            )}
            {activeModule === "documents" && (
              <SimpleGrid
                title="Documents"
                rows={employees.flatMap((employee) => employee.documents.map((document) => [employee.name, document.name, document.type, document.size]))}
              />
            )}
          </section>

          <section>
            {selectedEmployee ? (
              <EmployeeProfile employee={selectedEmployee} />
            ) : (
              <Card className="glass">
                <CardContent className="p-6 text-sm text-muted-foreground">Select an employee after records load.</CardContent>
              </Card>
            )}
          </section>
        </div>
      </div>

      {isAddingEmployee && (
        <EmployeeFormModal
          departmentOptions={departmentOptions}
          onClose={() => setIsAddingEmployee(false)}
          onSubmit={addEmployee}
          submitting={isCreatingAccount}
        />
      )}
    </main>
  );
}

function SimpleGrid({ rows, title }: { rows: string[][]; title: string }) {
  return (
    <Card className="glass overflow-hidden">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {rows.map((row) => (
          <div className="grid gap-2 rounded-lg border bg-background/65 p-4 text-sm sm:grid-cols-4" key={row.join("-")}>
            {row.map((item, index) => (
              <span className={cn(index === 0 ? "font-semibold" : "text-muted-foreground")} key={`${item}-${index}`}>
                {item}
              </span>
            ))}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function AttendancePanel({
  attendance,
  employees,
  onCheckIn,
  onCheckOut,
}: {
  attendance: AttendanceRecord[];
  employees: Employee[];
  onCheckIn: (employeeId: string) => void;
  onCheckOut: (employeeId: string) => void;
}) {
  return (
    <Card className="glass">
      <CardHeader>
        <CardTitle>Attendance</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {employees.map((employee) => {
          const record = attendance.find((item) => item.employeeId === employee.id);
          return (
            <div className="grid gap-3 rounded-lg border bg-background/65 p-4 lg:grid-cols-[1fr_90px_90px_100px_auto]" key={employee.id}>
              <div>
                <p className="font-semibold">{employee.name}</p>
                <p className="text-sm text-muted-foreground">{employee.department}</p>
              </div>
              <span className="text-sm text-muted-foreground">{record?.checkIn ?? "--"}</span>
              <span className="text-sm text-muted-foreground">{record?.checkOut ?? "--"}</span>
              <span className="text-sm font-semibold">{record?.workingHours ?? 0}h</span>
              <div className="flex gap-2">
                <Button onClick={() => onCheckIn(employee.id)} size="sm" type="button" variant="outline">
                  Check In
                </Button>
                <Button onClick={() => onCheckOut(employee.id)} size="sm" type="button" variant="outline">
                  Check Out
                </Button>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

function LeavePanel({
  employees,
  form,
  leaveRequests,
  onFormChange,
  onSubmit,
  onUpdate,
}: {
  employees: Employee[];
  form: { employeeId: string; type: string; from: string; to: string; reason: string };
  leaveRequests: LeaveRequest[];
  onFormChange: (value: { employeeId: string; type: string; from: string; to: string; reason: string }) => void;
  onSubmit: () => void;
  onUpdate: (id: string, status: LeaveRequest["status"]) => void;
}) {
  const employeeName = (id: string) => employees.find((employee) => employee.id === id)?.name ?? "Employee";

  return (
    <Card className="glass">
      <CardHeader>
        <CardTitle>Leave</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 rounded-lg border bg-background/65 p-4 md:grid-cols-2">
          <select className="h-11 rounded-md border bg-background px-3 text-sm" value={form.employeeId} onChange={(event) => onFormChange({ ...form, employeeId: event.target.value })}>
            {employees.map((employee) => (
              <option key={employee.id} value={employee.id}>
                {employee.name}
              </option>
            ))}
          </select>
          <select className="h-11 rounded-md border bg-background px-3 text-sm" value={form.type} onChange={(event) => onFormChange({ ...form, type: event.target.value })}>
            {["Paid Leave", "Sick Leave", "Casual Leave", "Work From Home"].map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
          <Input type="date" value={form.from} onChange={(event) => onFormChange({ ...form, from: event.target.value })} />
          <Input type="date" value={form.to} onChange={(event) => onFormChange({ ...form, to: event.target.value })} />
          <Input className="md:col-span-2" placeholder="Reason" value={form.reason} onChange={(event) => onFormChange({ ...form, reason: event.target.value })} />
          <Button className="md:col-span-2" onClick={onSubmit} type="button">
            Apply Leave
          </Button>
        </div>
        {leaveRequests.map((request) => (
          <div className="rounded-lg border bg-background/65 p-4" key={request.id}>
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div>
                <p className="font-semibold">{employeeName(request.employeeId)}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {request.type} - {request.from} to {request.to}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">{request.reason}</p>
              </div>
              <span className="w-fit rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground">{request.status}</span>
            </div>
            {request.status === "Pending" && (
              <div className="mt-3 flex gap-2">
                <Button onClick={() => onUpdate(request.id, "Approved")} size="sm" type="button">
                  Approve
                </Button>
                <Button onClick={() => onUpdate(request.id, "Rejected")} size="sm" type="button" variant="outline">
                  Reject
                </Button>
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
