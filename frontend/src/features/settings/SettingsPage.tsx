import { motion } from "framer-motion";
import { ArrowLeft, Copy, KeyRound, RotateCw, Save, Sparkles, UploadCloud } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  aiIntegrations,
  apiKeys,
  backupOptions,
  brandColors,
  companyInfoCards,
  companySettings,
  integrationLogs,
  notificationOptions,
  securityOptions,
  settingsSections,
} from "./settings.data";
import { IntegrationCard } from "./components/IntegrationCard";
import type { Integration } from "./settings.types";

function SettingsCard({
  children,
  subtitle,
  title,
}: {
  children: ReactNode;
  subtitle?: string;
  title: string;
}) {
  return (
    <Card className="glass">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {subtitle && <p className="text-sm leading-6 text-muted-foreground">{subtitle}</p>}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function ToggleRow({ label, defaultChecked = true }: { label: string; defaultChecked?: boolean }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 rounded-lg border bg-background/60 p-4">
      <span className="text-sm font-semibold">{label}</span>
      <input className="h-4 w-4 accent-primary" defaultChecked={defaultChecked} type="checkbox" />
    </label>
  );
}

export function SettingsPage() {
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
            <Button>
              <Save className="h-4 w-4" />
              Save Settings
            </Button>
          </div>
        </div>
      </header>

      <div className="container space-y-6 py-6">
        <motion.section
          animate={{ opacity: 1, y: 0 }}
          className="glass overflow-hidden rounded-lg p-6 sm:p-8"
          initial={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
        >
          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold text-primary">Settings Module</p>
              <h1 className="mt-3 text-balance text-3xl font-bold sm:text-4xl">Company Settings</h1>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                Manage company identity, branding, notification rules, security controls, API keys, backups, and appearance.
              </p>
            </div>
            <div className="glass-soft flex items-center gap-3 rounded-lg px-4 py-3">
              <Sparkles className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-semibold">Workspace Health</p>
                <p className="text-xs text-muted-foreground">All settings synced</p>
              </div>
            </div>
          </div>
        </motion.section>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {settingsSections.map((section, index) => {
            const Icon = section.icon;
            return (
              <motion.div
                animate={{ opacity: 1, y: 0 }}
                initial={{ opacity: 0, y: 18 }}
                key={section.title}
                transition={{ duration: 0.35, delay: index * 0.04 }}
              >
                <Card className="h-full bg-card/70 hover:-translate-y-1 hover:border-primary/35 hover:shadow-glass">
                  <CardContent className="p-5">
                    <Icon className="mb-5 h-5 w-5 text-primary" />
                    <p className="font-semibold">{section.title}</p>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{section.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            <SettingsCard subtitle="Logo, company name, email, phone, timezone, and language." title="Company">
              <div className="grid gap-5 lg:grid-cols-[220px_1fr]">
                <div className="rounded-lg border bg-background/60 p-4">
                  <div className="flex aspect-square items-center justify-center rounded-lg bg-primary text-4xl font-bold text-primary-foreground">
                    AI
                  </div>
                  <Button className="mt-4 w-full" variant="outline">
                    <UploadCloud className="h-4 w-4" />
                    Logo
                  </Button>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="companyName">Company Name</Label>
                    <Input defaultValue={companySettings.name} id="companyName" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input defaultValue={companySettings.email} id="email" type="email" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input defaultValue={companySettings.phone} id="phone" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="timezone">Timezone</Label>
                    <select className="h-11 w-full rounded-md border bg-background/75 px-3 text-sm outline-none focus:border-primary" id="timezone">
                      <option>Asia/Kolkata</option>
                      <option>UTC</option>
                      <option>America/New_York</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="language">Language</Label>
                    <select className="h-11 w-full rounded-md border bg-background/75 px-3 text-sm outline-none focus:border-primary" id="language">
                      <option>English</option>
                      <option>Hindi</option>
                    </select>
                  </div>
                </div>
              </div>
            </SettingsCard>

            <SettingsCard subtitle="Theme, brand color, and visual appearance controls." title="Appearance">
              <div className="space-y-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-lg border bg-background/60 p-4">
                    <p className="text-sm font-semibold">Theme</p>
                    <p className="mt-1 text-xs text-muted-foreground">Use the top-right switch for dark and light mode.</p>
                  </div>
                  <div className="rounded-lg border bg-background/60 p-4">
                    <p className="text-sm font-semibold">Interface Density</p>
                    <select className="mt-3 h-10 w-full rounded-md border bg-background/75 px-3 text-sm outline-none focus:border-primary">
                      <option>Comfortable</option>
                      <option>Compact</option>
                    </select>
                  </div>
                </div>
                <div>
                  <p className="mb-3 text-sm font-semibold">Brand Color</p>
                  <div className="grid grid-cols-5 gap-3">
                    {brandColors.map((color) => (
                      <button
                        aria-label={color.name}
                        className="h-12 rounded-md border shadow-sm transition-transform hover:-translate-y-1"
                        key={color.name}
                        style={{ backgroundColor: color.value }}
                        type="button"
                      />
                    ))}
                  </div>
                </div>
              </div>
            </SettingsCard>

            <SettingsCard title="Notification">
              <div className="grid gap-3 sm:grid-cols-2">
                {notificationOptions.map((item, index) => (
                  <ToggleRow defaultChecked={index !== 2} key={item} label={item} />
                ))}
              </div>
            </SettingsCard>

            <SettingsCard title="AI Integrations">
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">Connect external services for enhanced functionality.</p>
                <div className="grid gap-4 md:grid-cols-2">
                  {aiIntegrations.map((integration) => (
                    <IntegrationCard
                      key={integration.id}
                      integration={integration as Integration}
                      onConnect={() => {}}
                      onDisconnect={() => {}}
                      onSync={() => {}}
                      onHealthCheck={() => {}}
                      logs={integrationLogs[integration.id]}
                    />
                  ))}
                </div>
              </div>
            </SettingsCard>
          </div>

          <div className="space-y-6">
            <SettingsCard title="Security">
              <div className="space-y-3">
                {securityOptions.map((item) => {
                  const Icon = item.icon;
                  return (
                    <label className="flex cursor-pointer items-center justify-between gap-4 rounded-lg border bg-background/60 p-4" key={item.label}>
                      <span className="flex items-center gap-3 text-sm font-semibold">
                        <Icon className="h-4 w-4 text-primary" />
                        {item.label}
                      </span>
                      <input className="h-4 w-4 accent-primary" defaultChecked={item.enabled} type="checkbox" />
                    </label>
                  );
                })}
              </div>
            </SettingsCard>

            <SettingsCard subtitle="Prepared for backend integration keys later." title="API Keys">
              <div className="space-y-3">
                {apiKeys.map((key) => (
                  <div className="rounded-lg border bg-background/60 p-4" key={key.name}>
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold">{key.name}</p>
                        <p className="mt-1 text-xs text-muted-foreground">Created {key.created}</p>
                      </div>
                      <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-300">
                        {key.status}
                      </span>
                    </div>
                    <div className="mt-4 flex gap-2">
                      <Button size="sm" variant="outline">
                        <Copy className="h-4 w-4" />
                        Copy
                      </Button>
                      <Button size="sm" variant="outline">
                        <RotateCw className="h-4 w-4" />
                        Rotate
                      </Button>
                    </div>
                  </div>
                ))}
                <Button className="w-full">
                  <KeyRound className="h-4 w-4" />
                  Create API Key
                </Button>
              </div>
            </SettingsCard>

            <SettingsCard title="Backup">
              <div className="space-y-3">
                {backupOptions.map((item) => (
                  <div className="flex items-center justify-between gap-4 rounded-lg border bg-background/60 p-4" key={item.label}>
                    <span className="text-sm font-semibold">{item.label}</span>
                    <span className="text-sm text-muted-foreground">{item.value}</span>
                  </div>
                ))}
                <Button className="w-full" variant="outline">
                  <RotateCw className="h-4 w-4" />
                  Run Backup Now
                </Button>
              </div>
            </SettingsCard>

            <Card className="bg-foreground text-background dark:bg-white dark:text-slate-950">
              <CardContent className="p-5">
                <p className="text-sm font-semibold">Company Contact Snapshot</p>
                <div className="mt-4 space-y-3">
                  {companyInfoCards.map((item) => {
                    const Icon = item.icon;
                    return (
                      <div className="flex items-center gap-3 text-sm" key={item.label}>
                        <Icon className="h-4 w-4" />
                        <span className="opacity-75">{item.value}</span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </main>
  );
}
