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
import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ThemeToggle } from "@shared/ui/ThemeToggle";
import { Button } from "@shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@shared/ui/card";
import { fetchProjectById, type ProjectSummary } from "@shared/projects/projects.api";
import { fetchTasksByProject } from "@shared/tasks/tasks.api";
import { liveSyncIntervalMs, sharedDataChangedEvent } from "@shared/realtime/data-sync";
import type { ProjectDetailTab } from "./projects.types";

type ProjectTask = {
 id: string;
 taskCode: string;
 title: string;
 status: string;
 priority: string;
 assignee: string;
 dueDate: string;
};

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

function NotConnectedPanel({ title, description }: { title: string; description: string }) {
 return (
 <Card className="glass">
 <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
 <CardContent className="text-sm text-muted-foreground">{description}</CardContent>
 </Card>
 );
}

export function ProjectDetailsPage() {
 const { id } = useParams();
 const [tab, setTab] = useState<ProjectDetailTab>("overview");
 const [project, setProject] = useState<ProjectSummary | null>(null);
 const [loading, setLoading] = useState(false);
 const [error, setError] = useState<string | null>(null);
 const [tasks, setTasks] = useState<ProjectTask[]>([]);
 const [tasksState, setTasksState] = useState<"ok" | "forbidden" | "error">("ok");

 const loadProject = useCallback(async () => {
 if (!id) {
 setError("Project ID is missing.");
 return;
 }

 setLoading(true);
 setError(null);

 try {
 const [projectResult, taskResult] = await Promise.all([
 fetchProjectById(id),
 fetchTasksByProject(id),
 ]);
 if (projectResult.status === "ok") {
 setProject(projectResult.data);
 } else if (projectResult.status === "forbidden") {
 setError("You do not have permission to view this project.");
 } else {
 setError(projectResult.message ?? "Project not found.");
 }

 if (taskResult.status === "ok") {
 setTasks(taskResult.data as ProjectTask[]);
 setTasksState("ok");
 } else {
 setTasks([]);
 setTasksState(taskResult.status);
 }
 } finally {
 setLoading(false);
 }
 }, [id]);

 useEffect(() => {
 const refresh = () => void loadProject();
 void loadProject();
 const intervalId = window.setInterval(refresh, liveSyncIntervalMs);
 window.addEventListener("focus", refresh);
 window.addEventListener(sharedDataChangedEvent, refresh);
 document.addEventListener("visibilitychange", refresh);
 return () => {
 window.clearInterval(intervalId);
 window.removeEventListener("focus", refresh);
 window.removeEventListener(sharedDataChangedEvent, refresh);
 document.removeEventListener("visibilitychange", refresh);
 };
 }, [loadProject]);

 return (
 <main className="min-h-screen bg-enterprise">
 <header className="sticky top-0 z-40 border-b bg-background ">
 <div className="container flex min-h-16 flex-wrap items-center justify-between gap-3 py-3">
 <Button asChild variant="ghost">
 <Link to="/projects"><ArrowLeft className="h-4 w-4" />Projects</Link>
 </Button>
 <ThemeToggle />
 </div>
 </header>

 <div className="container space-y-6 py-6">
 {loading && !project && (
 <Card className="glass">
 <CardContent className="py-10 text-center text-sm text-muted-foreground">Loading project...</CardContent>
 </Card>
 )}

 {error && (
 <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-600 dark:text-rose-400">{error}</div>
 )}

 {project && (
 <>
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
 ["Client", project.client || "—"],
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
 ["End Date", project.endDate],
 ].map(([label, value]) => (
 <div className="flex items-center gap-4 rounded-lg border bg-background p-4" key={label}>
 <span className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary"><CalendarDays className="h-4 w-4" /></span>
 <div><p className="font-semibold">{label}</p><p className="text-sm text-muted-foreground">{value}</p></div>
 </div>
 ))}
 {project.sprints.length > 0 && project.sprints.map((sprint) => (
 <div className="flex items-center gap-4 rounded-lg border bg-background p-4" key={sprint.id}>
 <span className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary"><CalendarDays className="h-4 w-4" /></span>
 <div><p className="font-semibold">{sprint.name} ({sprint.status})</p><p className="text-sm text-muted-foreground">{sprint.startDate} to {sprint.endDate}</p></div>
 </div>
 ))}
 </CardContent>
 </Card>
 )}

 {tab === "tasks" && (
 tasksState !== "ok" ? (
 <NotConnectedPanel
 description={tasksState === "forbidden" ? "Your account is not authorized to view tasks for this project." : "Project tasks could not be loaded from the backend."}
 title="Tasks unavailable"
 />
 ) : tasks.length === 0 ? (
 <NotConnectedPanel description="No backend tasks are linked to this project yet." title="Tasks" />
 ) : (
 <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
 {tasks.map((task) => (
 <Card className="glass" key={task.id}>
 <CardContent className="p-5">
 <p className="text-xs font-semibold text-primary">{task.taskCode}</p>
 <h3 className="mt-2 font-semibold">{task.title}</h3>
 <div className="mt-4 flex flex-wrap gap-2 text-xs text-muted-foreground">
 <span>{task.status}</span>
 <span>{task.priority}</span>
 <span>{task.assignee}</span>
 {task.dueDate && <span>Due {task.dueDate}</span>}
 </div>
 </CardContent>
 </Card>
 ))}
 </div>
 )
 )}

 {tab === "team" && (
 project.teamMembers.length === 0 ? (
 <NotConnectedPanel description="No team members are assigned to this project yet." title="Team" />
 ) : (
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
 )
 )}

 {tab === "documents" && (
 <Card className="glass">
 <CardHeader><CardTitle>Documents</CardTitle></CardHeader>
 <CardContent className="space-y-3">
 {project.attachments.length === 0 ? (
 <p className="text-sm text-muted-foreground">No documents uploaded yet.</p>
 ) : (
 project.attachments.map((document) => (
 <div className="flex items-center justify-between rounded-lg border bg-background p-4" key={document.name}>
 <div><p className="font-semibold">{document.name}</p><p className="text-sm text-muted-foreground">{document.mimeType ?? "File"}</p></div>
 <FileText className="h-4 w-4 text-primary" />
 </div>
 ))
 )}
 </CardContent>
 </Card>
 )}

 {tab === "activity" && (
 <NotConnectedPanel
 description="Per-project activity history is not yet connected to a backend for this view."
 title="Activity"
 />
 )}

 {tab === "budget" && (
 <Card className="glass">
 <CardHeader><CardTitle>Budget</CardTitle></CardHeader>
 <CardContent>
 <div className="grid gap-4 md:grid-cols-3">
 <div className="rounded-lg border bg-background p-4"><p className="text-sm text-muted-foreground">Budget</p><p className="text-2xl font-bold">{formatCurrency(project.budget)}</p></div>
 <div className="rounded-lg border bg-background p-4"><p className="text-sm text-muted-foreground">Used (est. by progress)</p><p className="text-2xl font-bold">{formatCurrency(project.budget * project.progress / 100)}</p></div>
 <div className="rounded-lg border bg-background p-4"><p className="text-sm text-muted-foreground">Remaining (est.)</p><p className="text-2xl font-bold">{formatCurrency(project.budget * (100 - project.progress) / 100)}</p></div>
 </div>
 </CardContent>
 </Card>
 )}

 {tab === "settings" && (
 <NotConnectedPanel
 description="Per-project notification and reporting preferences are not yet connected to a backend."
 title="Settings"
 />
 )}
 </>
 )}
 </div>
 </main>
 );
}
