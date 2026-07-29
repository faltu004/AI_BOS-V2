import {
  ArrowLeft,
  CalendarDays,
  CheckSquare,
  FileText,
  History,
  Settings,
  UsersRound,
  WalletCards,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ThemeToggle } from "@shared/ui/ThemeToggle";
import { Button } from "@shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@shared/ui/card";
import { seedProjects } from "./projects.data";
import type { ProjectDetailTab } from "./projects.types";

const tabs: Array<{ id: ProjectDetailTab; label: string; icon: typeof FileText }> = [
  { id: "overview", label: "Overview", icon: FileText },
  { id: "timeline", label: "Timeline", icon: CalendarDays },
  { id: "tasks", label: "Tasks", icon: CheckSquare },
  { id: "team", label: "Team", icon: UsersRound },
  { id: "documents", label: "Documents", icon: FileText },
  { id: "activity", label: "Activity", icon: History },
  { id: "budget", label: "Budget", icon: WalletCards },
  { id: "settings", label: "Settings", icon: Settings },
];

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    currency: "USD",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(value);
}

export function ProjectDetailsPage() {
  const { id } = useParams();
  const [tab, setTab] = useState<ProjectDetailTab>("overview");
  const project = useMemo(() => seedProjects.find((item) => item.id === id) ?? seedProjects[0], [id]);

  return (
    <main className="min-h-screen bg-enterprise">
      <header className="sticky top-0 z-40 border-b bg-background/78 backdrop-blur-xl">
        <div className="container flex min-h-16 flex-wrap items-center justify-between gap-3 py-3">
          <Button asChild variant="ghost">
            <Link to="/projects"><ArrowLeft className="h-4 w-4" />Projects</Link>
          </Button>
          <ThemeToggle />
        </div>
      </header>

      <div className="container space-y-6 py-6">
        <Card className="glass">
          <CardContent className="p-6">
            <p className="text-sm font-semibold text-primary">{project.projectCode}</p>
            <div className="mt-3 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
              <div>
                <h1 className="text-3xl font-bold">{project.projectName}</h1>
                <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">{project.description}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">{project.status}</span>
                <span className="rounded-full bg-accent/15 px-3 py-1 text-xs font-semibold text-accent">{project.priority}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-2 overflow-x-auto pb-2">
          {tabs.map((item) => {
            const Icon = item.icon;
            return (
              <Button key={item.id} variant={tab === item.id ? "default" : "outline"} onClick={() => setTab(item.id)}>
                <Icon className="h-4 w-4" />
                {item.label}
              </Button>
            );
          })}
        </div>

        {tab === "overview" && (
          <div className="grid gap-4 lg:grid-cols-3">
            {[
              ["Category", project.category],
              ["Client", project.client],
              ["Project Manager", project.projectManager],
              ["Progress", `${project.progress}%`],
              ["Estimated Hours", `${project.estimatedHours} hrs`],
              ["Budget", formatCurrency(project.budget)],
            ].map(([label, value]) => (
              <Card className="glass" key={label}>
                <CardContent className="p-5">
                  <p className="text-sm text-muted-foreground">{label}</p>
                  <p className="mt-2 text-xl font-bold">{value}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {tab === "timeline" && (
          <Card className="glass">
            <CardHeader><CardTitle>Timeline</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {[
                ["Start Date", project.startDate],
                ["Midpoint Review", "2026-08-01"],
                ["End Date", project.endDate],
              ].map(([label, value]) => (
                <div className="flex items-center gap-4 rounded-lg border bg-background/60 p-4" key={label}>
                  <span className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary"><CalendarDays className="h-4 w-4" /></span>
                  <div><p className="font-semibold">{label}</p><p className="text-sm text-muted-foreground">{value}</p></div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {tab === "tasks" && (
          <Card className="glass">
            <CardHeader><CardTitle>Tasks</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {["Finalize requirements", "Review budget", "Prepare weekly update", "Upload documents"].map((task, index) => (
                <label className="flex items-center gap-3 rounded-lg border bg-background/60 p-4" key={task}>
                  <input className="accent-primary" defaultChecked={index < 2} type="checkbox" />
                  <span className="font-semibold">{task}</span>
                </label>
              ))}
            </CardContent>
          </Card>
        )}

        {tab === "team" && (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {project.teamMembers.map((member) => (
              <Card className="glass" key={member}>
                <CardContent className="flex items-center gap-3 p-5">
                  <span className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-sm font-bold text-primary">{member[0]}</span>
                  <div><p className="font-semibold">{member}</p><p className="text-sm text-muted-foreground">Team Member</p></div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {tab === "documents" && (
          <Card className="glass">
            <CardHeader><CardTitle>Documents</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {(project.attachments.length ? project.attachments : [{ name: "No documents uploaded yet", type: "Empty", size: "-" }]).map((document) => (
                <div className="flex items-center justify-between rounded-lg border bg-background/60 p-4" key={document.name}>
                  <div><p className="font-semibold">{document.name}</p><p className="text-sm text-muted-foreground">{document.type} - {document.size}</p></div>
                  <FileText className="h-4 w-4 text-primary" />
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {tab === "activity" && (
          <Card className="glass">
            <CardHeader><CardTitle>Activity</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {["Project created", "Budget reviewed", "Status updated", "Team assigned"].map((item) => (
                <div className="rounded-lg border bg-background/60 p-4" key={item}>
                  <p className="font-semibold">{item}</p>
                  <p className="mt-1 text-sm text-muted-foreground">Today</p>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {tab === "budget" && (
          <Card className="glass">
            <CardHeader><CardTitle>Budget</CardTitle></CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-lg border bg-background/60 p-4"><p className="text-sm text-muted-foreground">Budget</p><p className="text-2xl font-bold">{formatCurrency(project.budget)}</p></div>
                <div className="rounded-lg border bg-background/60 p-4"><p className="text-sm text-muted-foreground">Used</p><p className="text-2xl font-bold">{formatCurrency(project.budget * project.progress / 100)}</p></div>
                <div className="rounded-lg border bg-background/60 p-4"><p className="text-sm text-muted-foreground">Remaining</p><p className="text-2xl font-bold">{formatCurrency(project.budget * (100 - project.progress) / 100)}</p></div>
              </div>
            </CardContent>
          </Card>
        )}

        {tab === "settings" && (
          <Card className="glass">
            <CardHeader><CardTitle>Settings</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {["Allow team comments", "Notify manager on changes", "Include in executive reports"].map((setting) => (
                <label className="flex items-center justify-between rounded-lg border bg-background/60 p-4" key={setting}>
                  <span className="font-semibold">{setting}</span>
                  <input className="accent-primary" defaultChecked type="checkbox" />
                </label>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  );
}
