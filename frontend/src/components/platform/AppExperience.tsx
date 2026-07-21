import { AnimatePresence, motion } from "framer-motion";
import {
  Activity,
  ChevronRight,
  Clock3,
  HelpCircle,
  History,
  PanelRightOpen,
  Search,
  Sparkles,
  Star,
  X,
  Zap,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast-context";
import { commandPaletteOpenEvent, quickActionsOpenEvent, workspaceSearchItems } from "@/data/workspace";
import { cn } from "@/lib/utils";

type PageItem = {
  href: string;
  label: string;
  category: string;
};

const recentStorageKey = "ai-bos-recent-pages";
const favoriteStorageKey = "ai-bos-favorite-pages";
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
  "/register": "Register",
  "/forgot-password": "Forgot Password",
  "/reset-password": "Reset Password",
  "/verify-email": "Email Verification",
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
  return !["/", "/login", "/register", "/forgot-password"].some((route) => pathname === route)
    && !pathname.startsWith("/reset-password")
    && !pathname.startsWith("/verify-email");
}

function Breadcrumbs({ currentPage }: { currentPage: PageItem }) {
  const location = useLocation();
  const segments = location.pathname.split("/").filter(Boolean);
  if (!isAppRoute(location.pathname)) return null;

  return (
    <nav aria-label="Breadcrumb" className="fixed left-4 top-20 z-40 hidden rounded-2xl border bg-background/82 px-3 py-2 shadow-sm backdrop-blur-2xl lg:block">
      <ol className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
        <li>
          <Link className="transition-colors hover:text-foreground" to="/dashboard">
            AI BOS
          </Link>
        </li>
        {segments.map((segment, index) => {
          const href = `/${segments.slice(0, index + 1).join("/")}`;
          const label = index === segments.length - 1 ? currentPage.label : getRouteLabel(href);
          return (
            <li className="flex items-center gap-2" key={href}>
              <ChevronRight className="h-3 w-3" />
              {index === segments.length - 1 ? (
                <span className="text-foreground">{label}</span>
              ) : (
                <Link className="transition-colors hover:text-foreground" to={href}>
                  {label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
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
        <motion.div animate={{ opacity: 1 }} className="fixed inset-0 z-[85] flex items-center justify-center bg-foreground/35 p-4 backdrop-blur-sm" exit={{ opacity: 0 }} initial={{ opacity: 0 }}>
          <motion.div
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="w-full max-w-xl overflow-hidden rounded-3xl border bg-background/95 shadow-glass backdrop-blur-2xl"
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
              <p className="mt-8 text-sm font-semibold text-primary">Welcome to AI BOS</p>
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
        <motion.div animate={{ opacity: 1 }} className="fixed inset-0 z-[84] flex items-center justify-center bg-foreground/25 p-4 backdrop-blur-sm" exit={{ opacity: 0 }} initial={{ opacity: 0 }}>
          <motion.div animate={{ opacity: 1, y: 0 }} className="w-full max-w-lg rounded-2xl border bg-background/95 p-5 shadow-glass backdrop-blur-2xl" exit={{ opacity: 0, y: 12 }} initial={{ opacity: 0, y: 12 }}>
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-primary">Keyboard Shortcuts</p>
                <h2 className="mt-1 text-xl font-bold">Move faster across AI BOS</h2>
              </div>
              <Button aria-label="Close shortcuts" onClick={onClose} size="icon" type="button" variant="ghost">
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="mt-5 grid gap-2">
              {shortcuts.map(([keys, label]) => (
                <div className="flex items-center justify-between gap-4 rounded-2xl border bg-card/65 p-3" key={keys}>
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

function QuickAccessPanel({
  currentPage,
  favorites,
  recentPages,
  onToggleFavorite,
}: {
  currentPage: PageItem;
  favorites: PageItem[];
  recentPages: PageItem[];
  onToggleFavorite: () => void;
}) {
  const [open, setOpen] = useState(false);
  const isFavorite = favorites.some((item) => item.href === currentPage.href);
  const activity = [
    "Project Created",
    "Task Completed",
    "Employee Added",
    "Invoice Generated",
  ];

  if (!isAppRoute(currentPage.href)) return null;

  return (
    <div className="fixed bottom-5 left-5 z-50 hidden lg:block">
      <AnimatePresence>
        {open && (
          <motion.div animate={{ opacity: 1, y: 0 }} className="mb-3 w-[360px] rounded-2xl border bg-background/94 p-3 shadow-glass backdrop-blur-2xl" exit={{ opacity: 0, y: 12 }} initial={{ opacity: 0, y: 12 }}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">Quick Access</p>
                <p className="text-xs text-muted-foreground">Favorites, recents, and live activity.</p>
              </div>
              <Button aria-label="Favorite current page" onClick={onToggleFavorite} size="icon" type="button" variant={isFavorite ? "default" : "outline"}>
                <Star className={cn("h-4 w-4", isFavorite && "fill-current")} />
              </Button>
            </div>

            <div className="mt-4 grid gap-3">
              <Card className="rounded-2xl bg-card/65">
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <Star className="h-4 w-4 text-primary" />
                    Favorite Pages
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-1 p-4 pt-0">
                  {(favorites.length ? favorites : [{ ...currentPage, label: "Favorite this page" }]).slice(0, 4).map((item) => (
                    <Link className="flex items-center justify-between rounded-xl px-3 py-2 text-sm font-semibold hover:bg-muted" key={`${item.href}-${item.label}`} to={item.href}>
                      {item.label}
                      <ChevronRight className="h-3 w-3 text-muted-foreground" />
                    </Link>
                  ))}
                </CardContent>
              </Card>

              <Card className="rounded-2xl bg-card/65">
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <History className="h-4 w-4 text-primary" />
                    Recently Opened
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-1 p-4 pt-0">
                  {recentPages.slice(0, 4).map((item) => (
                    <Link className="flex items-center justify-between rounded-xl px-3 py-2 text-sm font-semibold hover:bg-muted" key={item.href} to={item.href}>
                      {item.label}
                      <span className="text-xs text-muted-foreground">{item.category}</span>
                    </Link>
                  ))}
                </CardContent>
              </Card>

              <Card className="rounded-2xl bg-card/65">
                <CardContent className="grid grid-cols-3 gap-2 p-3">
                  <button className="rounded-xl border bg-background/70 p-3 text-left transition-all hover:-translate-y-0.5 hover:border-primary/40" onClick={() => window.dispatchEvent(new Event(commandPaletteOpenEvent))} type="button">
                    <Search className="mb-3 h-4 w-4 text-primary" />
                    <span className="text-xs font-semibold">Search</span>
                  </button>
                  <button className="rounded-xl border bg-background/70 p-3 text-left transition-all hover:-translate-y-0.5 hover:border-primary/40" onClick={() => window.dispatchEvent(new Event(quickActionsOpenEvent))} type="button">
                    <Zap className="mb-3 h-4 w-4 text-primary" />
                    <span className="text-xs font-semibold">Create</span>
                  </button>
                  <button className="rounded-xl border bg-background/70 p-3 text-left transition-all hover:-translate-y-0.5 hover:border-primary/40" onClick={() => setOpen(false)} type="button">
                    <Activity className="mb-3 h-4 w-4 text-primary" />
                    <span className="text-xs font-semibold">Focus</span>
                  </button>
                </CardContent>
              </Card>

              <Card className="rounded-2xl bg-foreground text-background dark:bg-white dark:text-slate-950">
                <CardContent className="p-4">
                  <p className="flex items-center gap-2 text-sm font-semibold">
                    <Clock3 className="h-4 w-4" />
                    Recent Activity
                  </p>
                  <div className="mt-3 space-y-2">
                    {activity.map((item) => (
                      <p className="rounded-xl bg-white/10 px-3 py-2 text-xs opacity-80" key={item}>
                        {item}
                      </p>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <Button className="h-12 rounded-2xl shadow-glow" onClick={() => setOpen((value) => !value)} type="button">
        <PanelRightOpen className="h-4 w-4" />
        Quick Access
      </Button>
    </div>
  );
}

export function AppExperience() {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [favorites, setFavorites] = useState<PageItem[]>(() => readStoredPages(favoriteStorageKey));
  const [recentPages, setRecentPages] = useState<PageItem[]>(() => readStoredPages(recentStorageKey));
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [onboardingOpen, setOnboardingOpen] = useState(false);

  const currentPage = useMemo<PageItem>(() => {
    const searchItem = workspaceSearchItems.find((item) => item.href === location.pathname);
    return {
      href: location.pathname,
      label: searchItem?.title ?? getRouteLabel(location.pathname),
      category: searchItem?.category ?? "Navigation",
    };
  }, [location.pathname]);

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

  const toggleFavorite = () => {
    setFavorites((current) => {
      const exists = current.some((item) => item.href === currentPage.href);
      const next = exists ? current.filter((item) => item.href !== currentPage.href) : [currentPage, ...current].slice(0, 8);
      window.localStorage.setItem(favoriteStorageKey, JSON.stringify(next));
      toast({
        title: exists ? "Removed from favorites" : "Added to favorites",
        description: currentPage.label,
        type: "success",
      });
      return next;
    });
  };

  return (
    <>
      <Breadcrumbs currentPage={currentPage} />
      <QuickAccessPanel currentPage={currentPage} favorites={favorites} onToggleFavorite={toggleFavorite} recentPages={recentPages} />
      <OnboardingTour onClose={() => setOnboardingOpen(false)} open={onboardingOpen} />
      <ShortcutHelp onClose={() => setShortcutsOpen(false)} open={shortcutsOpen} />
      <button
        aria-label="Keyboard shortcuts"
        className="fixed bottom-5 left-5 z-40 flex h-11 w-11 items-center justify-center rounded-2xl border bg-background/82 text-muted-foreground shadow-sm backdrop-blur-xl transition-all hover:-translate-y-0.5 hover:text-foreground lg:hidden"
        onClick={() => setShortcutsOpen(true)}
        type="button"
      >
        <HelpCircle className="h-4 w-4" />
      </button>
    </>
  );
}
