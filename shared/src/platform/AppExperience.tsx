import { AnimatePresence, motion } from "framer-motion";
import {
 HelpCircle,
 Sparkles,
 X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@shared/ui/button";
import { useToast } from "@shared/ui/toast-context";
import { quickActionsOpenEvent } from "./events";
import type { WorkspaceSearchItem } from "./types";
import { cn } from "@shared/lib/utils";

type PageItem = {
 href: string;
 label: string;
 category: string;
};

const recentStorageKey = "ai-bos-recent-pages";
const onboardingStorageKey = "ai-bos-onboarding-complete";

const routeLabels: Record<string, string> = {
 "/": "Home",
 "/dashboard": "Dashboard",
 "/profile": "Profile",
 "/settings": "Settings",
 "/projects": "Projects",
 "/tasks": "Tasks",
 "/employees": "Employees",
 "/crm": "CRM",
 "/finance": "Finance",
 "/products": "Products",
 "/documents": "Documents",
 "/meetings": "Meetings",
 "/analytics": "Analytics",
 "/admin": "Admin",
 "/login": "Login",
 "/forgot-password": "Forgot Password",
 "/reset-password": "Reset Password",
 "/verify-email": "Email Verification",
 "/change-password-required": "Change Password",
 "/complete-profile": "Complete Profile",
 "/face-enrollment": "Face Setup",
};

const onboardingSteps = [
 {
 title: "One Command Center",
 description: "Use the dashboard to monitor revenue, projects, people, customers, documents, and upcoming deadlines in one place.",
 },
 {
 title: "Search Everything",
 description: "Press Ctrl K to open the command palette and move across modules, records, reports, and settings without hunting through menus.",
 },
 {
 title: "Quick Create",
 description: "Press Alt N or use the floating create button to start projects, tasks, employees, meetings, invoices, and documents instantly.",
 },
 {
 title: "Personal Workspace",
 description: "Favorite pages and revisit recently opened modules from the quick access panel whenever your workflow gets busy.",
 },
];

const actionWords = [
 "save",
 "create",
 "add",
 "upload",
 "generate",
 "download",
 "email",
 "export",
 "update",
 "archive",
 "duplicate",
 "approve",
 "reject",
 "convert",
 "restore",
 "check in",
 "check out",
 "start",
 "book",
 "login",
 "register",
];

function readStoredPages(key: string) {
 try {
 const raw = window.localStorage.getItem(key);
 return raw ? (JSON.parse(raw) as PageItem[]) : [];
 } catch {
 return [];
 }
}

function getRouteLabel(pathname: string) {
 if (routeLabels[pathname]) return routeLabels[pathname];
 const projectMatch = pathname.match(/^\/projects\/(.+)/);
 if (projectMatch) return "Project Details";
 return pathname
 .split("/")
 .filter(Boolean)
 .map((part) => part.replace(/-/g, " "))
 .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
 .join(" / ");
}

function isAppRoute(pathname: string) {
 return !["/", "/login", "/forgot-password", "/change-password-required", "/complete-profile", "/face-enrollment"].some((route) => pathname === route)
 && !pathname.startsWith("/reset-password")
 && !pathname.startsWith("/verify-email");
}

function OnboardingTour({ open, onClose }: { open: boolean; onClose: () => void }) {
 const [step, setStep] = useState(0);
 const current = onboardingSteps[step];
 const isLast = step === onboardingSteps.length - 1;

 const finish = () => {
 window.localStorage.setItem(onboardingStorageKey, "true");
 onClose();
 };

 return (
 <AnimatePresence>
 {open && (
 <motion.div animate={{ opacity: 1 }} className="fixed inset-0 z-[85] flex items-center justify-center bg-foreground/30 p-4" exit={{ opacity: 0 }} initial={{ opacity: 0 }}>
 <motion.div
 animate={{ opacity: 1, scale: 1, y: 0 }}
 className="w-full max-w-xl overflow-hidden rounded-3xl border bg-background shadow-glass"
 exit={{ opacity: 0, scale: 0.98, y: 16 }}
 initial={{ opacity: 0, scale: 0.98, y: 16 }}
 >
 <div className="animated-gradient p-6">
 <div className="flex items-start justify-between gap-4">
 <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-glow">
 <Sparkles className="h-5 w-5" />
 </span>
 <Button aria-label="Skip onboarding" onClick={finish} size="icon" type="button" variant="glass">
 <X className="h-4 w-4" />
 </Button>
 </div>
 <p className="mt-8 text-sm font-semibold text-primary">Welcome to Nexora Softworks</p>
 <h2 className="mt-2 text-3xl font-bold tracking-tight">{current.title}</h2>
 <p className="mt-3 text-sm leading-7 text-muted-foreground">{current.description}</p>
 </div>
 <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
 <div className="flex gap-2">
 {onboardingSteps.map((_, index) => (
 <span className={cn("h-2 rounded-full transition-all", index === step ? "w-8 bg-primary" : "w-2 bg-muted")} key={index} />
 ))}
 </div>
 <div className="flex gap-2">
 {step > 0 && (
 <Button onClick={() => setStep((value) => value - 1)} type="button" variant="outline">
 Back
 </Button>
 )}
 <Button onClick={() => (isLast ? finish() : setStep((value) => value + 1))} type="button">
 {isLast ? "Start Working" : "Next"}
 </Button>
 </div>
 </div>
 </motion.div>
 </motion.div>
 )}
 </AnimatePresence>
 );
}

function ShortcutHelp({ open, onClose }: { open: boolean; onClose: () => void }) {
 const shortcuts = [
 ["Ctrl K", "Command palette"],
 ["Alt N", "Quick create"],
 ["Alt D", "Dashboard"],
 ["Alt P", "Projects"],
 ["Alt T", "Tasks"],
 ["Alt E", "Employees"],
 ["Alt M", "Meetings"],
 ["Alt S", "Settings"],
 ["?", "Keyboard shortcuts"],
 ];

 return (
 <AnimatePresence>
 {open && (
 <motion.div animate={{ opacity: 1 }} className="fixed inset-0 z-[84] flex items-center justify-center bg-foreground/30 p-4" exit={{ opacity: 0 }} initial={{ opacity: 0 }}>
 <motion.div animate={{ opacity: 1, y: 0 }} className="w-full max-w-lg rounded-2xl border bg-background p-5 shadow-glass" exit={{ opacity: 0, y: 12 }} initial={{ opacity: 0, y: 12 }}>
 <div className="flex items-center justify-between gap-4">
 <div>
 <p className="text-sm font-semibold text-primary">Keyboard Shortcuts</p>
 <h2 className="mt-1 text-xl font-bold">Move faster across Nexora</h2>
 </div>
 <Button aria-label="Close shortcuts" onClick={onClose} size="icon" type="button" variant="ghost">
 <X className="h-4 w-4" />
 </Button>
 </div>
 <div className="mt-5 grid gap-2">
 {shortcuts.map(([keys, label]) => (
 <div className="flex items-center justify-between gap-4 rounded-2xl border bg-card p-3" key={keys}>
 <span className="text-sm font-semibold">{label}</span>
 <kbd className="rounded-xl border bg-background px-2.5 py-1 text-xs font-bold text-muted-foreground">{keys}</kbd>
 </div>
 ))}
 </div>
 </motion.div>
 </motion.div>
 )}
 </AnimatePresence>
 );
}

export function AppExperience({ items }: { items: WorkspaceSearchItem[] }) {
 const location = useLocation();
 const navigate = useNavigate();
 const { toast } = useToast();
 const [recentPages, setRecentPages] = useState<PageItem[]>(() => readStoredPages(recentStorageKey));
 const [shortcutsOpen, setShortcutsOpen] = useState(false);
 const [onboardingOpen, setOnboardingOpen] = useState(false);

 const currentPage = useMemo<PageItem>(() => {
 const searchItem = items.find((item) => item.href === location.pathname);
 return {
 href: location.pathname,
 label: searchItem?.title ?? getRouteLabel(location.pathname),
 category: searchItem?.category ?? "Navigation",
 };
 }, [items, location.pathname]);

 useEffect(() => {
 if (!isAppRoute(location.pathname)) return;
 setRecentPages((current) => {
 const next = [currentPage, ...current.filter((item) => item.href !== currentPage.href)].slice(0, 8);
 window.localStorage.setItem(recentStorageKey, JSON.stringify(next));
 return next;
 });
 }, [currentPage, location.pathname]);

 useEffect(() => {
 if (isAppRoute(location.pathname) && window.localStorage.getItem(onboardingStorageKey) !== "true") {
 const timeout = window.setTimeout(() => setOnboardingOpen(true), 700);
 return () => window.clearTimeout(timeout);
 }
 }, [location.pathname]);

 useEffect(() => {
 const onKeyDown = (event: KeyboardEvent) => {
 const target = event.target as HTMLElement | null;
 const isTyping = target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.isContentEditable;
 if (event.key === "?" && !isTyping) {
 event.preventDefault();
 setShortcutsOpen(true);
 }
 if (event.altKey && !event.ctrlKey && !event.metaKey) {
 const shortcuts: Record<string, string> = {
 d: "/dashboard",
 p: "/projects",
 t: "/tasks",
 e: "/employees",
 m: "/meetings",
 s: "/settings",
 };
 const href = shortcuts[event.key.toLowerCase()];
 if (href) {
 event.preventDefault();
 navigate(href);
 }
 if (event.key.toLowerCase() === "n") {
 event.preventDefault();
 window.dispatchEvent(new Event(quickActionsOpenEvent));
 }
 }
 };
 window.addEventListener("keydown", onKeyDown);
 return () => window.removeEventListener("keydown", onKeyDown);
 }, [navigate]);

 useEffect(() => {
 const onClick = (event: MouseEvent) => {
 const target = event.target as HTMLElement | null;
 const actionElement = target?.closest("button, a") as HTMLElement | null;
 if (!actionElement || actionElement.closest("[data-no-action-toast='true']")) return;
 const label = `${actionElement.getAttribute("aria-label") ?? ""} ${actionElement.textContent ?? ""}`.replace(/\s+/g, " ").trim();
 const lower = label.toLowerCase();
 const matched = actionWords.find((word) => lower.includes(word));
 if (!matched) return;
 window.setTimeout(() => {
 toast({
 title: label.length > 42 ? "Action completed" : `${label} completed`,
 description: "Your workspace has been updated.",
 type: matched === "delete" || matched === "archive" || matched === "reject" ? "warning" : "success",
 });
 }, 120);
 };
 document.addEventListener("click", onClick, true);
 return () => document.removeEventListener("click", onClick, true);
 }, [toast]);

 return (
 <>
 <OnboardingTour onClose={() => setOnboardingOpen(false)} open={onboardingOpen} />
 <ShortcutHelp onClose={() => setShortcutsOpen(false)} open={shortcutsOpen} />
 <button
 aria-label="Keyboard shortcuts"
 className="fixed bottom-5 left-5 z-40 flex h-11 w-11 items-center justify-center rounded-2xl border bg-background text-muted-foreground shadow-sm transition-all hover:-translate-y-0.5 hover:text-foreground lg:hidden"
 onClick={() => setShortcutsOpen(true)}
 type="button"
 >
 <HelpCircle className="h-4 w-4" />
 </button>
 </>
 );
}
