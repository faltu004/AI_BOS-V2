import { motion } from "framer-motion";
import {
  ArrowLeft,
  BadgeCheck,
  Bell,
  BriefcaseBusiness,
  Building2,
  Camera,
  Check,
  Code2,
  Download,
  Eye,
  FileText,
  Fingerprint,
  Globe2,
  Headphones,
  Laptop,
  LockKeyhole,
  Mail,
  MapPin,
  MonitorSmartphone,
  Palette,
  Save,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Trophy,
  UserRound,
  UsersRound,
  WalletCards,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getStoredAuthSession } from "@shared/auth/auth-service";
import { ChangePasswordCard } from "@shared/auth/components/ChangePasswordCard";
import type { AuthRole } from "@shared/auth/types";
import { getProfileRole, profileDirectory } from "@shared/profile/profile-directory";
import { getInitials } from "@shared/lib/utils";
import { ThemeToggle } from "@shared/ui/ThemeToggle";
import { Button } from "@shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@shared/ui/card";
import { Input } from "@shared/ui/input";
import { Label } from "@shared/ui/label";
import { useToast } from "@shared/ui/toast-context";

type RoleProfileConfig = {
  name: string;
  title: string;
  company: string;
  department: string;
  employeeId: string;
  email: string;
  phone: string;
  location: string;
  initials: string;
  stats: { label: string; value: string; trend: string; icon: LucideIcon }[];
  skills: string[];
  permissions: string[];
  activity: { title: string; time: string; icon: LucideIcon }[];
};

const profileConfigs: Record<AuthRole, RoleProfileConfig> = {
  Owner: {
    ...profileDirectory.Owner,
    company: "AI Business Operating System",
    department: "Executive Office",
    employeeId: "AIBOS-001",
    email: "owner@aibos.company",
    phone: "+91 98765 43210",
    location: "India",
    stats: [
      { label: "Executive Modules", value: "21", trend: "Full access", icon: ShieldCheck },
      { label: "Team Members", value: "248", trend: "All departments", icon: UsersRound },
      { label: "Revenue View", value: "$267K", trend: "+29.6%", icon: WalletCards },
      { label: "AI Coverage", value: "92%", trend: "+7%", icon: Sparkles },
    ],
    skills: ["Strategy", "Finance", "AI Governance", "Leadership", "Business Intelligence", "Admin Oversight"],
    permissions: ["Full owner dashboard", "Admin access", "Finance reports", "People records", "AI configuration"],
    activity: [
      { title: "Reviewed executive operating dashboard", time: "12 min ago", icon: Building2 },
      { title: "Approved admin access policy", time: "1 hr ago", icon: BadgeCheck },
      { title: "Exported board report", time: "Today", icon: FileText },
    ],
  },
  Administrator: {
    ...profileDirectory.Administrator,
    company: "AI Business Operating System",
    department: "System Operations",
    employeeId: "AIBOS-ADM",
    email: "admin@aibos.company",
    phone: "+91 90000 10001",
    location: "India",
    stats: [
      { label: "Managed Users", value: "248", trend: "6 roles", icon: UsersRound },
      { label: "Security Score", value: "99%", trend: "MFA enabled", icon: ShieldCheck },
      { label: "Integrations", value: "8", trend: "7 healthy", icon: BriefcaseBusiness },
      { label: "Audit Events", value: "1.8K", trend: "30 days", icon: FileText },
    ],
    skills: ["RBAC", "Security", "Integrations", "AI Config", "Audit", "System Settings"],
    permissions: ["Admin panel", "AI configuration", "Settings", "Integrations", "User management"],
    activity: [
      { title: "Updated role permissions", time: "18 min ago", icon: ShieldCheck },
      { title: "Checked integration health", time: "Today", icon: BriefcaseBusiness },
      { title: "Exported audit log", time: "Yesterday", icon: FileText },
    ],
  },
  Manager: {
    ...profileDirectory.Manager,
    company: "AI Business Operating System",
    department: "Operations",
    employeeId: "AIBOS-MGR",
    email: "manager@aibos.company",
    phone: "+91 90000 10002",
    location: "India",
    stats: [
      { label: "Projects", value: "18", trend: "4 at risk", icon: BriefcaseBusiness },
      { label: "Open Tasks", value: "74", trend: "8 due today", icon: BadgeCheck },
      { label: "Team Members", value: "32", trend: "5 squads", icon: UsersRound },
      { label: "Reports", value: "12", trend: "Weekly", icon: FileText },
    ],
    skills: ["Projects", "Tasks", "Meetings", "Reports", "Team Planning", "Workflow Automation"],
    permissions: ["Manager dashboard", "Projects", "Tasks", "Meetings", "Analytics reports"],
    activity: [
      { title: "Closed sprint planning task", time: "20 min ago", icon: BadgeCheck },
      { title: "Reviewed project risk", time: "Today", icon: BriefcaseBusiness },
      { title: "Generated weekly report", time: "Yesterday", icon: FileText },
    ],
  },
  HR: {
    ...profileDirectory.HR,
    company: "AI Business Operating System",
    department: "Human Resources",
    employeeId: "AIBOS-HR",
    email: "hr@aibos.company",
    phone: "+91 90000 10003",
    location: "India",
    stats: [
      { label: "Employees", value: "248", trend: "+12 this month", icon: UsersRound },
      { label: "Onboarding", value: "9", trend: "In progress", icon: UserRound },
      { label: "HR Tasks", value: "21", trend: "5 urgent", icon: BadgeCheck },
      { label: "Policy Docs", value: "36", trend: "3 updates", icon: FileText },
    ],
    skills: ["Employee Records", "Onboarding", "Policies", "HR Tasks", "Meetings", "Documents"],
    permissions: ["HR dashboard", "Employees", "Tasks", "Documents", "Meetings"],
    activity: [
      { title: "Approved onboarding checklist", time: "15 min ago", icon: BadgeCheck },
      { title: "Updated employee record", time: "Today", icon: UsersRound },
      { title: "Published leave policy draft", time: "Yesterday", icon: FileText },
    ],
  },
  Sales: {
    ...profileDirectory.Sales,
    company: "AI Business Operating System",
    department: "Sales",
    employeeId: "AIBOS-SAL",
    email: "sales@aibos.company",
    phone: "+91 90000 10004",
    location: "India",
    stats: [
      { label: "Pipeline", value: "$412K", trend: "+18%", icon: WalletCards },
      { label: "Active Leads", value: "64", trend: "12 hot", icon: UsersRound },
      { label: "Products", value: "312", trend: "14 low stock", icon: BriefcaseBusiness },
      { label: "Win Rate", value: "38%", trend: "+4%", icon: Trophy },
    ],
    skills: ["CRM", "Finance", "Products", "Forecasting", "Customer Follow-up", "Reports"],
    permissions: ["Sales dashboard", "CRM", "Finance", "Products", "Tasks", "Meetings"],
    activity: [
      { title: "Moved Orbit Finance to proposal", time: "10 min ago", icon: WalletCards },
      { title: "Updated product forecast", time: "Today", icon: BriefcaseBusiness },
      { title: "Created customer follow-up", time: "Yesterday", icon: BadgeCheck },
    ],
  },
  Employee: {
    ...profileDirectory.Employee,
    company: "AI Business Operating System",
    department: "Operations",
    employeeId: "AIBOS-EMP",
    email: "employee@aibos.company",
    phone: "+91 90000 10005",
    location: "India",
    stats: [
      { label: "Open Tasks", value: "14", trend: "3 due today", icon: BadgeCheck },
      { label: "Meetings", value: "3", trend: "Today", icon: UsersRound },
      { label: "Documents", value: "28", trend: "Shared", icon: FileText },
      { label: "Productivity", value: "91%", trend: "+6%", icon: Trophy },
    ],
    skills: ["Task Execution", "Meetings", "Documents", "Knowledge Base", "AI Copilot"],
    permissions: ["Employee dashboard", "Tasks", "Documents", "Meetings", "AI copilot"],
    activity: [
      { title: "Completed assigned task", time: "8 min ago", icon: BadgeCheck },
      { title: "Joined project sync", time: "Today", icon: UsersRound },
      { title: "Uploaded status document", time: "Yesterday", icon: FileText },
    ],
  },
  Finance: {
    ...profileDirectory.Finance,
    company: "AI Business Operating System",
    department: "Finance",
    employeeId: "AIBOS-FIN",
    email: "finance@aibos.company",
    phone: "+91 90000 10006",
    location: "India",
    stats: [
      { label: "Reports", value: "18", trend: "This quarter", icon: FileText },
      { label: "Analytics Views", value: "62", trend: "+9%", icon: BriefcaseBusiness },
      { label: "Consultant Runs", value: "24", trend: "AI-assisted", icon: Sparkles },
      { label: "Budget Accuracy", value: "96%", trend: "+2%", icon: Trophy },
    ],
    skills: ["Financial Planning", "Analytics", "Reporting", "Forecasting", "AI Consultant", "Compliance"],
    permissions: ["Analytics view", "Report generation", "AI consultant analysis", "Policy view"],
    activity: [
      { title: "Generated quarterly report", time: "22 min ago", icon: FileText },
      { title: "Reviewed project cost analytics", time: "Today", icon: BriefcaseBusiness },
      { title: "Ran AI consultant analysis", time: "Yesterday", icon: Sparkles },
    ],
  },
  Support: {
    ...profileDirectory.Support,
    company: "AI Business Operating System",
    department: "Customer Success",
    employeeId: "AIBOS-SUP",
    email: "support@aibos.company",
    phone: "+91 90000 10007",
    location: "India",
    stats: [
      { label: "Open Tickets", value: "9", trend: "3 urgent", icon: Headphones },
      { label: "Resolved Today", value: "17", trend: "+5", icon: BadgeCheck },
      { label: "Users Assisted", value: "248", trend: "This month", icon: UsersRound },
      { label: "Satisfaction", value: "94%", trend: "+3%", icon: Trophy },
    ],
    skills: ["Customer Support", "Troubleshooting", "User Directory", "Memory Management", "AI Consultant"],
    permissions: ["User directory view", "Memory management", "AI consultant analysis"],
    activity: [
      { title: "Resolved user access issue", time: "5 min ago", icon: Headphones },
      { title: "Escalated memory sync bug", time: "Today", icon: BadgeCheck },
      { title: "Updated support playbook", time: "Yesterday", icon: FileText },
    ],
  },
  Developer: {
    ...profileDirectory.Developer,
    company: "AI Business Operating System",
    department: "Engineering",
    employeeId: "AIBOS-DEV",
    email: "developer@aibos.company",
    phone: "+91 90000 10008",
    location: "India",
    stats: [
      { label: "Integrations", value: "8", trend: "7 healthy", icon: Code2 },
      { label: "AI Configs Viewed", value: "14", trend: "Read-only", icon: Sparkles },
      { label: "Memory Records", value: "312", trend: "Read-only", icon: FileText },
      { label: "Uptime", value: "99.9%", trend: "30 days", icon: Trophy },
    ],
    skills: ["Integrations", "AI Systems", "Automation", "Memory Architecture", "Platform Reliability"],
    permissions: ["Integration management", "AI configuration view", "Memory view"],
    activity: [
      { title: "Reconnected Slack integration", time: "14 min ago", icon: Code2 },
      { title: "Reviewed AI model configuration", time: "Today", icon: Sparkles },
      { title: "Audited memory retention rules", time: "Yesterday", icon: FileText },
    ],
  },
  Guest: {
    ...profileDirectory.Guest,
    company: "AI Business Operating System",
    department: "External",
    employeeId: "AIBOS-GST",
    email: "guest@aibos.company",
    phone: "+91 90000 10009",
    location: "India",
    stats: [
      { label: "Access Level", value: "Restricted", trend: "Read-only", icon: Eye },
      { label: "Visible Modules", value: "2", trend: "Minimal", icon: LockKeyhole },
      { label: "Session Length", value: "1", trend: "Active", icon: UserRound },
      { label: "Data Exposure", value: "Low", trend: "By design", icon: ShieldCheck },
    ],
    skills: ["Read-Only Access"],
    permissions: ["No mutating access"],
    activity: [{ title: "Signed in as guest", time: "Just now", icon: Eye }],
  },
};

const nexoraProfileOverrides: Record<AuthRole, Partial<RoleProfileConfig>> = {
  Owner: {
    company: "Nexora Softworks Pvt. Ltd.",
    department: "Executive",
    employeeId: "NEX-2026-001",
    email: "aarav.mehta@nexorasoftworks.dev",
    phone: "+91 90080 51001",
    location: "Bengaluru HQ",
  },
  Administrator: {
    company: "Nexora Softworks Pvt. Ltd.",
    department: "Operations",
    employeeId: "NEX-2026-002",
    email: "isha.sinha@nexorasoftworks.dev",
    phone: "+91 90080 51002",
    location: "Bengaluru HQ",
  },
  Manager: {
    company: "Nexora Softworks Pvt. Ltd.",
    department: "Product",
    employeeId: "NEX-2026-003",
    email: "kabir.arora@nexorasoftworks.dev",
    phone: "+91 90080 51003",
    location: "Bengaluru HQ",
  },
  HR: {
    company: "Nexora Softworks Pvt. Ltd.",
    department: "Human Resources",
    employeeId: "NEX-2026-004",
    email: "naina.rao@nexorasoftworks.dev",
    phone: "+91 90080 51004",
    location: "Bengaluru HQ",
  },
  Sales: {
    company: "Nexora Softworks Pvt. Ltd.",
    department: "Sales",
    employeeId: "NEX-2026-006",
    email: "rhea.kapoor@nexorasoftworks.dev",
    phone: "+91 90080 51006",
    location: "Mumbai Client Office",
  },
  Employee: {
    company: "Nexora Softworks Pvt. Ltd.",
    department: "Engineering",
    employeeId: "NEX-2026-013",
    email: "arjun.nair@nexorasoftworks.dev",
    phone: "+91 90080 51013",
    location: "Bengaluru HQ",
  },
  Finance: {
    company: "Nexora Softworks Pvt. Ltd.",
    department: "Finance",
    employeeId: "NEX-2026-005",
    email: "devika.menon@nexorasoftworks.dev",
    phone: "+91 90080 51005",
    location: "Bengaluru HQ",
  },
  Support: {
    company: "Nexora Softworks Pvt. Ltd.",
    department: "Customer Success",
    employeeId: "NEX-2026-007",
    email: "manav.bansal@nexorasoftworks.dev",
    phone: "+91 90080 51007",
    location: "Bengaluru HQ",
  },
  Developer: {
    company: "Nexora Softworks Pvt. Ltd.",
    department: "Engineering",
    employeeId: "NEX-2026-008",
    email: "tara.kulkarni@nexorasoftworks.dev",
    phone: "+91 90080 51008",
    location: "Bengaluru HQ",
  },
  Guest: {
    company: "Nexora Softworks Pvt. Ltd.",
    department: "Executive",
    employeeId: "NEX-2026-018",
    email: "leena.thomas@nexorasoftworks.dev",
    phone: "+91 90080 51018",
    location: "Remote",
  },
};

function SectionCard({ children, subtitle, title }: { children: ReactNode; subtitle?: string; title: string }) {
  return (
    <Card className="glass rounded-lg">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {subtitle && <p className="text-sm leading-6 text-muted-foreground">{subtitle}</p>}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function downloadProfile(config: RoleProfileConfig, role: AuthRole) {
  const blob = new Blob([JSON.stringify({ role, profile: config }, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${role.toLowerCase()}-profile.json`;
  link.click();
  URL.revokeObjectURL(url);
}

export function RoleProfilePage() {
  const session = getStoredAuthSession();
  const role = getProfileRole(session?.user.role);
  const config = { ...profileConfigs[role], ...nexoraProfileOverrides[role] };
  const displayName = session?.user.fullName ?? config.name;
  const initials = session?.user.fullName ? getInitials(session.user.fullName) : config.initials;
  const [email, setEmail] = useState(session?.user.email ?? config.email);
  const [phone, setPhone] = useState(config.phone);
  const [saved, setSaved] = useState(false);
  const { toast } = useToast();

  const personalInfo = useMemo(
    () => [
      { label: "Full Name", value: displayName },
      { label: "Email", value: email },
      { label: "Phone", value: phone },
      { label: "Location", value: config.location },
    ],
    [config, displayName, email, phone],
  );

  const saveProfile = () => {
    setSaved(true);
    toast({ title: "Profile saved", description: `${role} profile updated locally.`, type: "success" });
  };

  return (
    <main className="min-h-screen bg-enterprise">
      <header className="sticky top-0 z-40 border-b bg-background/78 backdrop-blur-xl">
        <div className="container flex h-16 items-center justify-between gap-4">
          <Button asChild variant="ghost">
            <Link to="/dashboard">
              <ArrowLeft className="h-4 w-4" />
              Dashboard
            </Link>
          </Button>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button onClick={() => downloadProfile(config, role)} type="button" variant="outline">
              <Download className="h-4 w-4" />
              Export
            </Button>
            <Button onClick={saveProfile} type="button">
              <Save className="h-4 w-4" />
              Save
            </Button>
          </div>
        </div>
      </header>

      <div className="container space-y-6 py-6">
        <motion.section animate={{ opacity: 1, y: 0 }} className="overflow-hidden rounded-lg border bg-card/70 shadow-glass backdrop-blur-2xl" initial={{ opacity: 0, y: 20 }} transition={{ duration: 0.35 }}>
          <div className="relative h-44 bg-[linear-gradient(120deg,rgba(37,99,235,0.82),rgba(16,185,129,0.62),rgba(245,158,11,0.48)),url('https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1200&q=70')] bg-cover bg-center">
            <Button className="absolute right-4 top-4 bg-background/85 text-foreground hover:bg-background" onClick={() => toast({ title: "Cover updated", description: "Profile cover preference saved.", type: "success" })} size="sm" type="button">
              <Camera className="h-4 w-4" />
              Cover
            </Button>
          </div>
          <div className="flex flex-col gap-5 px-5 pb-6 sm:flex-row sm:items-end sm:px-7">
            <div className="-mt-14 flex h-28 w-28 items-center justify-center rounded-lg border-4 border-background bg-primary text-3xl font-bold text-primary-foreground shadow-glass">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
                <div>
                  <p className="text-sm font-semibold text-primary">{role} Profile</p>
                  <h1 className="mt-2 text-3xl font-bold">{displayName}</h1>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {config.title} - {config.company}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-md bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">{role}</span>
                  <span className="rounded-md bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-300">
                    {saved ? "Saved" : "Verified"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </motion.section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {config.stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <motion.div animate={{ opacity: 1, y: 0 }} initial={{ opacity: 0, y: 14 }} key={stat.label} transition={{ delay: index * 0.04 }}>
                <Card className="glass rounded-lg">
                  <CardContent className="p-5">
                    <Icon className="mb-4 h-5 w-5 text-primary" />
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                    <p className="mt-3 text-3xl font-bold">{stat.value}</p>
                    <p className="mt-3 text-sm font-semibold text-emerald-600 dark:text-emerald-300">{stat.trend}</p>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </section>

        <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-6">
            <SectionCard subtitle="Role-correct identity for the current signed-in session." title="Personal Information">
              <div className="grid gap-4 sm:grid-cols-2">
                {personalInfo.map((item) => (
                  <div className="rounded-lg border bg-background/60 p-4" key={item.label}>
                    <p className="text-xs font-semibold uppercase text-muted-foreground">{item.label}</p>
                    <p className="mt-2 text-sm font-semibold">{item.value}</p>
                  </div>
                ))}
              </div>
            </SectionCard>

            <SectionCard subtitle="Editable local profile fields." title="Contact Settings">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="profileEmail">Email</Label>
                  <Input id="profileEmail" value={email} onChange={(event) => setEmail(event.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="profilePhone">Phone</Label>
                  <Input id="profilePhone" value={phone} onChange={(event) => setPhone(event.target.value)} />
                </div>
              </div>
            </SectionCard>

            <SectionCard subtitle="Company membership and role scope." title="Company Information">
              <div className="grid gap-4 sm:grid-cols-2">
                {[
                  { label: "Company", value: config.company },
                  { label: "Department", value: config.department },
                  { label: "Role", value: role },
                  { label: "Employee ID", value: config.employeeId },
                ].map((item) => (
                  <div className="rounded-lg border bg-background/60 p-4" key={item.label}>
                    <p className="text-xs font-semibold uppercase text-muted-foreground">{item.label}</p>
                    <p className="mt-2 text-sm font-semibold">{item.value}</p>
                  </div>
                ))}
              </div>
            </SectionCard>

            <SectionCard title="Skills">
              <div className="flex flex-wrap gap-2">
                {config.skills.map((skill) => (
                  <span className="rounded-md border bg-background/60 px-3 py-1.5 text-sm font-semibold" key={skill}>
                    {skill}
                  </span>
                ))}
              </div>
            </SectionCard>

            <SectionCard title="Recent Activity">
              <div className="space-y-3">
                {config.activity.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div className="flex items-start gap-3 rounded-lg border bg-background/60 p-4" key={item.title}>
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Icon className="h-4 w-4" />
                      </span>
                      <div>
                        <p className="text-sm font-semibold">{item.title}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{item.time}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </SectionCard>
          </div>

          <div className="space-y-6">
            <SectionCard subtitle="What this role can access." title="Permissions">
              <div className="space-y-3">
                {config.permissions.map((permission) => (
                  <div className="flex items-center justify-between gap-4 rounded-lg border bg-background/60 p-4" key={permission}>
                    <span className="text-sm font-semibold">{permission}</span>
                    <Check className="h-4 w-4 text-emerald-500" />
                  </div>
                ))}
              </div>
            </SectionCard>

            <SectionCard subtitle="Authentication and account controls." title="Security">
              <div className="space-y-3">
                {[
                  { label: "Two-factor authentication", value: "Enabled", icon: ShieldCheck },
                  { label: "Biometric access", value: "Available", icon: Fingerprint },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <div className="flex items-center justify-between gap-4 rounded-lg border bg-background/60 p-4" key={item.label}>
                      <div className="flex items-center gap-3">
                        <Icon className="h-4 w-4 text-primary" />
                        <span className="text-sm font-semibold">{item.label}</span>
                      </div>
                      <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-300">{item.value}</span>
                    </div>
                  );
                })}
              </div>
            </SectionCard>

            <SectionCard subtitle="Update the password used to sign in." title="Change Password">
              <ChangePasswordCard />
            </SectionCard>

            <SectionCard title="Sessions">
              <div className="space-y-3">
                {[
                  { browser: "Chrome on Windows", location: "Delhi, India", status: "Current session", icon: MonitorSmartphone },
                  { browser: "Mobile browser", location: "Mumbai, India", status: "Active 2h ago", icon: Smartphone },
                  { browser: "Laptop", location: "Bengaluru, India", status: "Active yesterday", icon: Laptop },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <div className="rounded-lg border bg-background/60 p-4" key={item.browser}>
                      <div className="flex items-start gap-3">
                        <Icon className="mt-0.5 h-4 w-4 text-primary" />
                        <div>
                          <p className="text-sm font-semibold">{item.browser}</p>
                          <p className="mt-1 text-xs text-muted-foreground">{item.location}</p>
                          <p className="mt-2 text-xs font-semibold text-emerald-600 dark:text-emerald-300">{item.status}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </SectionCard>

            <SectionCard title="Preferences">
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  { label: "Theme", value: "Dark and light mode", icon: Palette },
                  { label: "Language", value: "English", icon: Globe2 },
                  { label: "Timezone", value: "Asia/Kolkata", icon: MapPin },
                  { label: "Digest", value: `${role} updates`, icon: Bell },
                  { label: "Email", value: email, icon: Mail },
                  { label: "Workspace", value: `${role} view`, icon: BriefcaseBusiness },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <div className="rounded-lg border bg-background/60 p-4" key={item.label}>
                      <Icon className="mb-3 h-4 w-4 text-primary" />
                      <p className="text-sm font-semibold">{item.label}</p>
                      <p className="mt-1 truncate text-xs text-muted-foreground">{item.value}</p>
                    </div>
                  );
                })}
              </div>
            </SectionCard>

            <Card className="rounded-lg bg-foreground text-background dark:bg-white dark:text-slate-950">
              <CardContent className="p-5">
                <LockKeyhole className="mb-4 h-5 w-5" />
                <p className="text-sm font-semibold">Security Tip</p>
                <p className="mt-2 text-sm leading-6 opacity-75">Review sessions and trusted devices weekly for safer company access.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </main>
  );
}
