import type { LucideIcon } from "lucide-react";
import {
  AreaChart,
  BadgeCheck,
  Bot,
  BriefcaseBusiness,
  Building2,
  ChartNoAxesCombined,
  CircleDollarSign,
  Cloud,
  ContactRound,
  FileText,
  FolderKanban,
  Gauge,
  Headphones,
  LineChart,
  LockKeyhole,
  MessageSquareText,
  PanelsTopLeft,
  Rocket,
  Settings,
  ShieldCheck,
  Sparkles,
  UsersRound,
  Workflow,
} from "lucide-react";

export type IconItem = {
  title: string;
  description: string;
  icon: LucideIcon;
};

export const navItems = [
  { label: "Home", href: "#home" },
  { label: "Features", href: "#features" },
  { label: "Solutions", href: "#solutions" },
  { label: "Modules", href: "#modules" },
  { label: "About", href: "#about" },
  { label: "Contact", href: "#contact" },
];

export const trustedCompanies = [
  "Google",
  "Microsoft",
  "Amazon",
  "OpenAI",
  "IBM",
  "Oracle",
];

export const features: IconItem[] = [
  {
    title: "AI Assistant",
    description:
      "Delegate follow-ups, summarize work, draft notes, and guide teams with contextual business intelligence.",
    icon: Bot,
  },
  {
    title: "Project Management",
    description:
      "Plan milestones, track delivery health, align owners, and keep execution visible across departments.",
    icon: FolderKanban,
  },
  {
    title: "CRM",
    description:
      "Manage pipelines, customers, accounts, and revenue activity from one shared operating layer.",
    icon: ContactRound,
  },
  {
    title: "HR Management",
    description:
      "Unify employee records, onboarding, time-off, performance signals, and people operations.",
    icon: UsersRound,
  },
  {
    title: "Finance",
    description:
      "Monitor cash flow, invoices, expenses, forecasts, and financial approvals with live visibility.",
    icon: CircleDollarSign,
  },
  {
    title: "Analytics",
    description:
      "Turn operational data into executive dashboards, live KPIs, and decision-ready insights.",
    icon: ChartNoAxesCombined,
  },
  {
    title: "Meetings",
    description:
      "Capture agendas, action items, owners, decisions, and follow-ups across every recurring ritual.",
    icon: Headphones,
  },
  {
    title: "Documents",
    description:
      "Centralize policies, proposals, contracts, and internal knowledge with permission-aware access.",
    icon: FileText,
  },
  {
    title: "Automation",
    description:
      "Create cross-functional workflows for approvals, alerts, assignments, and business processes.",
    icon: Workflow,
  },
];

export const modules: IconItem[] = [
  { title: "Projects", description: "Delivery, tasks, risks, and milestones.", icon: BriefcaseBusiness },
  { title: "HR", description: "People records, onboarding, and reviews.", icon: UsersRound },
  { title: "CRM", description: "Contacts, accounts, deals, and activity.", icon: ContactRound },
  { title: "Finance", description: "Budgets, invoices, expenses, and cash flow.", icon: CircleDollarSign },
  { title: "Products", description: "Catalogs, launches, inventory, and roadmaps.", icon: PanelsTopLeft },
  { title: "Documents", description: "Knowledge, files, contracts, and policies.", icon: FileText },
  { title: "Reports", description: "Executive updates and operating reviews.", icon: AreaChart },
  { title: "AI Chat", description: "Assistants connected to your workspace.", icon: MessageSquareText },
  { title: "Analytics", description: "KPI dashboards and business intelligence.", icon: LineChart },
  { title: "Settings", description: "Roles, permissions, billing, and controls.", icon: Settings },
];

export const whyChoose: IconItem[] = [
  {
    title: "Enterprise Security",
    description: "Role-based access, audit-ready controls, and privacy-first architecture.",
    icon: ShieldCheck,
  },
  {
    title: "Fast Performance",
    description: "Responsive workflows designed for teams that operate at speed.",
    icon: Gauge,
  },
  {
    title: "AI Powered",
    description: "Assistive intelligence embedded directly into business operations.",
    icon: Sparkles,
  },
  {
    title: "Cloud Ready",
    description: "A flexible foundation for distributed teams and modern deployment.",
    icon: Cloud,
  },
  {
    title: "Modern UI",
    description: "Premium interactions, clean information hierarchy, and low-friction navigation.",
    icon: BadgeCheck,
  },
  {
    title: "Scalable",
    description: "Built to grow from founder-led teams to multi-department enterprises.",
    icon: Rocket,
  },
];

export const stats = [
  { value: "1000+", label: "Businesses" },
  { value: "50000+", label: "Employees" },
  { value: "100000+", label: "Projects" },
  { value: "99.9%", label: "Uptime" },
];

export const testimonials = [
  {
    role: "CEO",
    name: "Maya Chen",
    quote:
      "AI BOS gives our leadership team a single place to understand the business, spot blockers, and move faster.",
  },
  {
    role: "Founder",
    name: "Arjun Mehta",
    quote:
      "It feels like the operating rhythm of the company finally has a home. Clean, calm, and incredibly focused.",
  },
  {
    role: "Manager",
    name: "Sofia Alvarez",
    quote:
      "Projects, people, and customer context are easy to scan. My team spends less time chasing status.",
  },
  {
    role: "Developer",
    name: "Noah Brooks",
    quote:
      "The interface stays out of the way while still making complex workflows feel structured and reliable.",
  },
];

export const faqs = [
  {
    question: "Is AI BOS only a landing page in Phase 1?",
    answer:
      "Yes. Phase 1 establishes the frontend foundation, visual language, routing, reusable components, and responsive homepage.",
  },
  {
    question: "Can the platform support multiple business modules later?",
    answer:
      "The structure is prepared for future modules such as CRM, HR, finance, projects, analytics, automation, and AI assistants.",
  },
  {
    question: "Does this include a backend or authentication?",
    answer:
      "No backend is included in this phase. Login and onboarding can be connected once API and auth requirements are defined.",
  },
  {
    question: "Is the design responsive and theme-aware?",
    answer:
      "Yes. The interface supports dark and light themes, responsive layouts, glass surfaces, and smooth motion patterns.",
  },
];

export const footerLinks = {
  Company: ["About", "Careers", "Contact", "Press"],
  Product: ["Features", "Modules", "Security", "Roadmap"],
  Resources: ["Blog", "Guides", "API Docs", "Community"],
  Support: ["Help Center", "Status", "Privacy", "Terms"],
};

export const securityItems = [
  { label: "SSO Ready", icon: LockKeyhole },
  { label: "Cloud Native", icon: Building2 },
  { label: "AI Governance", icon: Sparkles },
];
