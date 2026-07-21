import { motion } from "framer-motion";
import {
  ArrowLeft,
  Camera,
  Check,
  KeyRound,
  LockKeyhole,
  Save,
} from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  activity,
  achievements,
  companyInfo,
  devices,
  experience,
  notificationSettings,
  personalInfo,
  preferenceCards,
  profileStats,
  profileSummary,
  recentDocuments,
  recentProjects,
  securityItems,
  sessions,
  skills,
} from "./profile.data";

function SectionCard({
  children,
  subtitle,
  title,
}: {
  children: ReactNode;
  subtitle?: string;
  title: string;
}) {
  return (
    <Card className="glass rounded-2xl">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {subtitle && <p className="text-sm leading-6 text-muted-foreground">{subtitle}</p>}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function InfoGrid({ items }: { items: Array<{ label: string; value: string }> }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {items.map((item) => (
        <div className="rounded-2xl border bg-background/60 p-4" key={item.label}>
          <p className="text-xs font-semibold uppercase text-muted-foreground">{item.label}</p>
          <p className="mt-2 text-sm font-semibold">{item.value}</p>
        </div>
      ))}
    </div>
  );
}

function ToggleRow({ label, defaultChecked = true }: { label: string; defaultChecked?: boolean }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 rounded-2xl border bg-background/60 p-4">
      <span className="text-sm font-semibold">{label}</span>
      <input className="h-4 w-4 accent-primary" defaultChecked={defaultChecked} type="checkbox" />
    </label>
  );
}

export function ProfilePage() {
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
              Save Changes
            </Button>
          </div>
        </div>
      </header>

      <div className="container space-y-6 py-6">
        <motion.section
          animate={{ opacity: 1, y: 0 }}
          className="overflow-hidden rounded-2xl border bg-card/70 shadow-glass backdrop-blur-2xl"
          initial={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
        >
          <div className="relative h-48 bg-[linear-gradient(120deg,rgba(37,99,235,0.86),rgba(16,185,129,0.68),rgba(245,158,11,0.58)),url('https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1600&q=80')] bg-cover bg-center">
            <Button className="absolute right-4 top-4 bg-background/80 text-foreground hover:bg-background" size="sm">
              <Camera className="h-4 w-4" />
              Cover Image
            </Button>
          </div>
          <div className="flex flex-col gap-5 px-5 pb-6 sm:flex-row sm:items-end sm:px-7">
            <div className="-mt-14 flex h-28 w-28 items-center justify-center rounded-2xl border-4 border-background bg-primary text-3xl font-bold text-primary-foreground shadow-glass">
              AT
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
                <div>
                  <p className="text-sm font-semibold text-primary">Profile</p>
                  <h1 className="mt-2 text-3xl font-bold">{profileSummary.name}</h1>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {profileSummary.title} - {profileSummary.company}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                    {profileSummary.role}
                  </span>
                  <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-300">
                    Verified
                  </span>
                </div>
              </div>
            </div>
          </div>
        </motion.section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {profileStats.map((stat, index) => (
            <motion.div animate={{ opacity: 1, y: 0 }} initial={{ opacity: 0, y: 14 }} key={stat.label} transition={{ delay: index * 0.04 }}>
              <Card className="glass rounded-2xl">
                <CardContent className="p-5">
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="mt-3 text-3xl font-bold">{stat.value}</p>
                  <p className="mt-3 text-sm font-semibold text-emerald-600 dark:text-emerald-300">{stat.trend}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </section>

        <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-6">
            <SectionCard subtitle="Core account identity used across AI BOS." title="Personal Information">
              <InfoGrid items={personalInfo} />
            </SectionCard>

            <SectionCard subtitle="Company role and workspace membership information." title="Company Information">
              <InfoGrid items={companyInfo} />
            </SectionCard>

            <SectionCard title="Skills">
              <div className="flex flex-wrap gap-2">
                {skills.map((skill) => (
                  <span className="rounded-full border bg-background/60 px-3 py-1.5 text-sm font-semibold" key={skill}>
                    {skill}
                  </span>
                ))}
              </div>
            </SectionCard>

            <SectionCard title="Experience">
              <div className="space-y-4">
                {experience.map((item) => (
                  <div className="rounded-2xl border bg-background/60 p-4" key={item.role}>
                    <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                      <div>
                        <p className="font-semibold">{item.role}</p>
                        <p className="mt-1 text-sm text-muted-foreground">{item.company}</p>
                      </div>
                      <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">
                        {item.period}
                      </span>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-muted-foreground">{item.description}</p>
                  </div>
                ))}
              </div>
            </SectionCard>

            <SectionCard title="Activity">
              <div className="space-y-3">
                {activity.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div className="flex items-start gap-3 rounded-2xl border bg-background/60 p-4" key={item.title}>
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
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

            <SectionCard title="Recent Projects">
              <div className="grid gap-3 lg:grid-cols-3">
                {recentProjects.map((project) => {
                  const Icon = project.icon;
                  return (
                    <Link className="rounded-2xl border bg-background/60 p-4 transition-all hover:-translate-y-1 hover:border-primary/40 hover:shadow-glass" key={project.name} to={project.href}>
                      <div className="flex items-start justify-between gap-3">
                        <Icon className="h-5 w-5 text-primary" />
                        <span className="rounded-full bg-primary/10 px-2 py-1 text-[11px] font-semibold text-primary">{project.status}</span>
                      </div>
                      <p className="mt-4 text-sm font-semibold">{project.name}</p>
                      <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${project.progress}%` }} />
                      </div>
                    </Link>
                  );
                })}
              </div>
            </SectionCard>

            <SectionCard title="Documents">
              <div className="grid gap-3 lg:grid-cols-3">
                {recentDocuments.map((document) => {
                  const Icon = document.icon;
                  return (
                    <Link className="rounded-2xl border bg-background/60 p-4 transition-all hover:-translate-y-1 hover:border-primary/40 hover:shadow-glass" key={document.name} to={document.href}>
                      <Icon className="h-5 w-5 text-primary" />
                      <p className="mt-4 truncate text-sm font-semibold">{document.name}</p>
                      <p className="mt-2 text-xs text-muted-foreground">
                        {document.type} - {document.updated}
                      </p>
                    </Link>
                  );
                })}
              </div>
            </SectionCard>
          </div>

          <div className="space-y-6">
            <SectionCard title="Achievements">
              <div className="space-y-3">
                {achievements.map((achievement) => {
                  const Icon = achievement.icon;
                  return (
                    <div className="rounded-2xl border bg-background/60 p-4" key={achievement.title}>
                      <div className="flex items-start gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                          <Icon className="h-4 w-4" />
                        </span>
                        <div>
                          <p className="text-sm font-semibold">{achievement.title}</p>
                          <p className="mt-1 text-xs leading-5 text-muted-foreground">{achievement.detail}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </SectionCard>

            <SectionCard subtitle="Security posture and authentication controls." title="Security">
              <div className="space-y-3">
                {securityItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div className="flex items-center justify-between gap-4 rounded-2xl border bg-background/60 p-4" key={item.label}>
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

            <SectionCard title="Change Password">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">Current password</Label>
                  <Input id="currentPassword" placeholder="Enter current password" type="password" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newPassword">New password</Label>
                  <Input id="newPassword" placeholder="Enter new password" type="password" />
                </div>
                <Button className="w-full">
                  <KeyRound className="h-4 w-4" />
                  Update Password
                </Button>
              </div>
            </SectionCard>

            <SectionCard title="Sessions">
              <div className="space-y-3">
                {sessions.map((session) => {
                  const Icon = session.icon;
                  return (
                    <div className="rounded-2xl border bg-background/60 p-4" key={session.browser}>
                      <div className="flex items-start gap-3">
                        <Icon className="mt-0.5 h-4 w-4 text-primary" />
                        <div>
                          <p className="text-sm font-semibold">{session.browser}</p>
                          <p className="mt-1 text-xs text-muted-foreground">{session.location}</p>
                          <p className="mt-2 text-xs font-semibold text-emerald-600 dark:text-emerald-300">
                            {session.status}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </SectionCard>

            <SectionCard title="Devices">
              <div className="space-y-3">
                {devices.map((device) => {
                  const Icon = device.icon;
                  return (
                    <div className="flex items-center justify-between gap-4 rounded-2xl border bg-background/60 p-4" key={device.name}>
                      <div className="flex items-center gap-3">
                        <Icon className="h-4 w-4 text-primary" />
                        <div>
                          <p className="text-sm font-semibold">{device.name}</p>
                          <p className="mt-1 text-xs text-muted-foreground">{device.type}</p>
                        </div>
                      </div>
                      <Check className="h-4 w-4 text-emerald-500" />
                    </div>
                  );
                })}
              </div>
            </SectionCard>

            <SectionCard title="Preferences">
              <div className="grid gap-3 sm:grid-cols-2">
                {preferenceCards.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div className="rounded-2xl border bg-background/60 p-4" key={item.label}>
                      <Icon className="mb-3 h-4 w-4 text-primary" />
                      <p className="text-sm font-semibold">{item.label}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{item.value}</p>
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="language">Language</Label>
                  <select className="h-11 w-full rounded-md border bg-background/75 px-3 text-sm outline-none focus:border-primary" id="language">
                    <option>English</option>
                    <option>Hindi</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="timezone">Timezone</Label>
                  <select className="h-11 w-full rounded-md border bg-background/75 px-3 text-sm outline-none focus:border-primary" id="timezone">
                    <option>Asia/Kolkata</option>
                    <option>UTC</option>
                    <option>America/New_York</option>
                  </select>
                </div>
              </div>
            </SectionCard>

            <SectionCard title="Notification Settings">
              <div className="space-y-3">
                {notificationSettings.map((item, index) => (
                  <ToggleRow defaultChecked={index !== 2} key={item} label={item} />
                ))}
                <ToggleRow label="Dark Mode" />
              </div>
            </SectionCard>

            <Card className="rounded-2xl bg-foreground text-background dark:bg-white dark:text-slate-950">
              <CardContent className="p-5">
                <LockKeyhole className="mb-4 h-5 w-5" />
                <p className="text-sm font-semibold">Security Tip</p>
                <p className="mt-2 text-sm leading-6 opacity-75">
                  Review sessions and trusted devices weekly for safer company access.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </main>
  );
}
