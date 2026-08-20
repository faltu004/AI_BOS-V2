import { motion } from "framer-motion";
import {
  ArrowLeft,
  Bell,
  Building2,
  DatabaseBackup,
  KeyRound,
  Monitor,
  Plug,
  ShieldAlert,
  UserCog,
} from "lucide-react";
import { Link } from "react-router-dom";
import { ThemeToggle } from "@shared/ui/ThemeToggle";
import { Button } from "@shared/ui/button";
import { Card, CardContent } from "@shared/ui/card";
import { getStoredAuthSession } from "@shared/auth/auth-service";
import { useAdministratorMonitoringAccess } from "@/admin/features/administrator-access/AdministratorMonitoringAccessContext";

const settingsLinks = [
  {
    title: "Administrator Access",
    description: "Owner-controlled Monitoring and Device Management permissions for each Administrator.",
    href: "/settings/administrator-access",
    icon: UserCog,
    ownerOnly: true,
  },
  {
    title: "Company Profile",
    description: "Edit organization name, logo, address, contact details, business hours, and office attendance location.",
    href: "/admin/organization",
    icon: Building2,
  },
  {
    title: "Account Security",
    description: "Owner-only Administrator credential management and protected account controls.",
    href: "/account-security",
    icon: KeyRound,
  },
  {
    title: "RBAC",
    description: "Manage roles, permission groups, templates, and permission audit history.",
    href: "/admin/rbac",
    icon: ShieldAlert,
  },
  {
    title: "Integrations",
    description: "Enable and manage supported external integration provider configuration.",
    href: "/integrations",
    icon: Plug,
  },
  {
    title: "Notifications",
    description: "Review notification center and scheduling preferences backed by the API.",
    href: "/notifications",
    icon: Bell,
  },
  {
    title: "Audit & Backup",
    description: "Review audit logs and backup controls that already exist in the platform.",
    href: "/audit-backup",
    icon: DatabaseBackup,
  },
  {
    title: "Device Monitoring",
    description: "Manage endpoint monitoring, policies, commands, and device security surfaces.",
    href: "/monitoring",
    icon: Monitor,
  },
];

export function SettingsPage() {
  const isOwner = getStoredAuthSession()?.user.role === "Owner";
  const { hasPermission } = useAdministratorMonitoringAccess();
  const visibleSettingsLinks = settingsLinks.filter(
    (item) =>
      (!("ownerOnly" in item) || !item.ownerOnly || isOwner) &&
      (item.href !== "/monitoring" || hasPermission("device.monitoring.view")),
  );

  return (
    <main className="min-h-screen bg-enterprise">
      <header className="sticky top-0 z-40 border-b bg-background">
        <div className="container flex h-16 items-center justify-between gap-4">
          <Button asChild variant="ghost">
            <Link to="/dashboard">
              <ArrowLeft className="h-4 w-4" />
              Dashboard
            </Link>
          </Button>
          <ThemeToggle />
        </div>
      </header>

      <div className="container space-y-6 py-6">
        <motion.section
          animate={{ opacity: 1, y: 0 }}
          className="rounded-lg border bg-card p-6"
          initial={{ opacity: 0, y: 16 }}
          transition={{ duration: 0.3 }}
        >
          <p className="text-sm font-semibold text-primary">Admin Settings</p>
          <h1 className="mt-2 text-3xl font-bold">Production Settings</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
            Settings here route to live AI BOS modules. Unfinished local-only controls were removed from this release surface.
          </p>
        </motion.section>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visibleSettingsLinks.map((item, index) => {
            const Icon = item.icon;
            return (
              <motion.div
                animate={{ opacity: 1, y: 0 }}
                initial={{ opacity: 0, y: 16 }}
                key={item.href}
                transition={{ duration: 0.3, delay: index * 0.03 }}
              >
                <Link to={item.href}>
                  <Card className="h-full rounded-lg bg-card transition hover:border-primary/35 hover:bg-muted/50">
                    <CardContent className="p-5">
                      <Icon className="h-5 w-5 text-primary" />
                      <p className="mt-4 font-semibold">{item.title}</p>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.description}</p>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
