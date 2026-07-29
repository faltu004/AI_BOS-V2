import {
  BadgeCheck,
  BriefcaseBusiness,
  Building2,
  Chrome,
  Code2,
  FileText,
  Fingerprint,
  FolderKanban,
  Globe2,
  KeyRound,
  Laptop,
  MapPin,
  MonitorSmartphone,
  Palette,
  ShieldCheck,
  Sparkles,
  Smartphone,
  Trophy,
  UsersRound,
} from "lucide-react";

export const profileSummary = {
  name: "Aman Tiwari",
  role: "Owner",
  title: "Founder and Operating Lead",
  location: "India",
  email: "aman@aibos.company",
  phone: "+91 98765 43210",
  company: "AI Business Operating System",
  department: "Executive Office",
  employeeId: "AIBOS-001",
};

export const personalInfo = [
  { label: "Full Name", value: profileSummary.name },
  { label: "Email", value: profileSummary.email },
  { label: "Phone", value: profileSummary.phone },
  { label: "Location", value: profileSummary.location },
];

export const companyInfo = [
  { label: "Company", value: profileSummary.company },
  { label: "Department", value: profileSummary.department },
  { label: "Role", value: profileSummary.role },
  { label: "Employee ID", value: profileSummary.employeeId },
];

export const profileStats = [
  { label: "Active Projects", value: "18", trend: "+4 this month" },
  { label: "Team Members", value: "248", trend: "12 departments" },
  { label: "Documents", value: "1.2K", trend: "86 shared" },
  { label: "Automation Score", value: "91%", trend: "+7%" },
];

export const skills = [
  "Business Strategy",
  "AI Automation",
  "Product Leadership",
  "Operations",
  "CRM",
  "Finance Systems",
  "Team Management",
  "Analytics",
];

export const experience = [
  {
    role: "Founder and CEO",
    company: "AI BOS",
    period: "2026 - Present",
    description: "Building an AI-first operating system for internal company operations.",
  },
  {
    role: "Business Systems Lead",
    company: "WorknAI",
    period: "2024 - 2026",
    description: "Designed workflows for CRM, HR, projects, finance, and analytics teams.",
  },
];

export const activity = [
  { title: "Updated company operating dashboard", time: "12 min ago", icon: Building2 },
  { title: "Generated finance performance report", time: "1 hr ago", icon: BadgeCheck },
  { title: "Added onboarding tasks for HR team", time: "Today", icon: UsersRound },
  { title: "Reviewed AI assistant workflow summary", time: "Yesterday", icon: Code2 },
];

export const achievements = [
  { title: "Operating Excellence", detail: "Reached 99.9% uptime across core workflows", icon: Trophy },
  { title: "AI Adoption Lead", detail: "Launched AI-assisted summaries for executive reviews", icon: Sparkles },
  { title: "Verified Workspace Owner", detail: "Completed company identity and access checks", icon: ShieldCheck },
];

export const recentProjects = [
  { name: "AI Sales Copilot", status: "On Track", progress: 82, href: "/projects/p-1", icon: FolderKanban },
  { name: "Finance Automation", status: "Review", progress: 64, href: "/projects/p-2", icon: FolderKanban },
  { name: "Employee Portal", status: "Planning", progress: 38, href: "/projects/p-3", icon: FolderKanban },
];

export const recentDocuments = [
  { name: "Q3 Operating Report.pdf", type: "PDF", updated: "Today", href: "/documents", icon: FileText },
  { name: "Board Review Deck.pptx", type: "PPTX", updated: "Yesterday", href: "/documents", icon: FileText },
  { name: "Security Policy.docx", type: "DOCX", updated: "Jul 16", href: "/documents", icon: FileText },
];

export const securityItems = [
  { label: "Two-factor authentication", value: "Enabled", icon: ShieldCheck },
  { label: "Password strength", value: "Strong", icon: KeyRound },
  { label: "Biometric access", value: "Available", icon: Fingerprint },
];

export const sessions = [
  { browser: "Chrome on Windows", location: "Delhi, India", status: "Current session", icon: Chrome },
  { browser: "Safari on iPhone", location: "Mumbai, India", status: "Active 2h ago", icon: Smartphone },
  { browser: "Edge on Laptop", location: "Bengaluru, India", status: "Active yesterday", icon: Laptop },
];

export const devices = [
  { name: "Windows Workstation", type: "Primary device", icon: MonitorSmartphone },
  { name: "iPhone 15", type: "Trusted mobile", icon: Smartphone },
  { name: "MacBook Pro", type: "Backup device", icon: Laptop },
];

export const notificationSettings = [
  "Project updates",
  "Employee approvals",
  "Finance alerts",
  "Meeting reminders",
  "AI assistant summaries",
];

export const preferenceCards = [
  { label: "Theme", value: "Dark and light mode", icon: Palette },
  { label: "Language", value: "English", icon: Globe2 },
  { label: "Timezone", value: "Asia/Kolkata", icon: MapPin },
  { label: "Workspace", value: "Executive view", icon: BriefcaseBusiness },
];
