import { motion } from "framer-motion";
import {
  Archive,
  CalendarDays,
  Check,
  Clock,
  Copy,
  Download,
  Edit3,
  Eye,
  FileText,
  Filter,
  FolderKanban,
  Grid3X3,
  LayoutList,
  Plus,
  Search,
  Share2,
  Trash2,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ThemeToggle } from "@shared/ui/ThemeToggle";
import { Button } from "@shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@shared/ui/card";
import { useConfirm } from "@shared/ui/confirm-dialog-context";
import { EmptyState } from "@shared/ui/empty-state";
import { Input } from "@shared/ui/input";
import { Label } from "@shared/ui/label";
import { useToast } from "@shared/ui/toast-context";
import { projectCategories, projectPriorities, projectStatuses, seedProjects } from "./projects.data";
import type { Project, ProjectFormInput, ProjectView } from "./projects.types";
import { createProjectFromInput, downloadFile, exportProjectsCsv, generateProjectCode } from "./projects.utils";

const pageSize = 6;

const emptyForm: ProjectFormInput = {
  projectName: "",
  description: "",
  category: "Internal",
  priority: "Medium",
  status: "Planning",
  progress: 0,
  startDate: new Date().toISOString().slice(0, 10),
  endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
  budget: 0,
  estimatedHours: 0,
  client: "",
  teamMembers: [],
  projectManager: "",
  attachments: [],
  notes: "",
  tags: [],
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    currency: "USD",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(value);
}

function getProjectStats(projects: Project[]) {
  const now = new Date();
  return {
    total: projects.filter((project) => !project.isArchived).length,
    active: projects.filter((project) => project.status === "Active").length,
    completed: projects.filter((project) => project.status === "Completed").length,
    delayed: projects.filter((project) => project.status === "Delayed" || new Date(project.endDate) < now && project.status !== "Completed").length,
    upcoming: projects.filter((project) => {
      const endDate = new Date(project.endDate);
      return endDate >= now && endDate <= new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
    }).length,
  };
}

function ProjectFormModal({
  initialProject,
  onClose,
  onSubmit,
  projectCode,
}: {
  initialProject?: Project | null;
  onClose: () => void;
  onSubmit: (input: ProjectFormInput) => void;
  projectCode: string;
}) {
  const [form, setForm] = useState<ProjectFormInput>(() =>
    initialProject
      ? {
          projectName: initialProject.projectName,
          projectCode: initialProject.projectCode,
          description: initialProject.description,
          category: initialProject.category,
          priority: initialProject.priority,
          status: initialProject.status,
          progress: initialProject.progress,
          startDate: initialProject.startDate,
          endDate: initialProject.endDate,
          budget: initialProject.budget,
          estimatedHours: initialProject.estimatedHours,
          client: initialProject.client,
          teamMembers: initialProject.teamMembers,
          projectManager: initialProject.projectManager,
          attachments: initialProject.attachments,
          notes: initialProject.notes,
          tags: initialProject.tags,
        }
      : { ...emptyForm, projectCode },
  );

  const updateField = <K extends keyof ProjectFormInput>(field: K, value: ProjectFormInput[K]) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/35 p-4 backdrop-blur-sm">
      <motion.form
        animate={{ opacity: 1, scale: 1 }}
        className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-lg border bg-background p-5 shadow-glass"
        initial={{ opacity: 0, scale: 0.96 }}
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit(form);
        }}
      >
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold">{initialProject ? "Edit Project" : "Create Project"}</h2>
            <p className="mt-1 text-sm text-muted-foreground">Project Code: {form.projectCode}</p>
          </div>
          <Button onClick={onClose} type="button" variant="outline">Close</Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="projectName">Project Name</Label>
            <Input id="projectName" required value={form.projectName} onChange={(event) => updateField("projectName", event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="projectManager">Project Manager</Label>
            <Input id="projectManager" required value={form.projectManager} onChange={(event) => updateField("projectManager", event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Category</Label>
            <select className="h-11 w-full rounded-md border bg-background px-3 text-sm" value={form.category} onChange={(event) => updateField("category", event.target.value)}>
              {projectCategories.map((category) => <option key={category}>{category}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <Label>Priority</Label>
            <select className="h-11 w-full rounded-md border bg-background px-3 text-sm" value={form.priority} onChange={(event) => updateField("priority", event.target.value as ProjectFormInput["priority"])}>
              {projectPriorities.map((priority) => <option key={priority}>{priority}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <select className="h-11 w-full rounded-md border bg-background px-3 text-sm" value={form.status} onChange={(event) => updateField("status", event.target.value as ProjectFormInput["status"])}>
              {projectStatuses.map((status) => <option key={status}>{status}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="progress">Progress</Label>
            <Input id="progress" max={100} min={0} type="number" value={form.progress} onChange={(event) => updateField("progress", Number(event.target.value))} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="startDate">Start Date</Label>
            <Input id="startDate" type="date" value={form.startDate} onChange={(event) => updateField("startDate", event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="endDate">End Date</Label>
            <Input id="endDate" type="date" value={form.endDate} onChange={(event) => updateField("endDate", event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="budget">Budget</Label>
            <Input id="budget" min={0} type="number" value={form.budget} onChange={(event) => updateField("budget", Number(event.target.value))} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="estimatedHours">Estimated Hours</Label>
            <Input id="estimatedHours" min={0} type="number" value={form.estimatedHours} onChange={(event) => updateField("estimatedHours", Number(event.target.value))} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="client">Client</Label>
            <Input id="client" value={form.client} onChange={(event) => updateField("client", event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="teamMembers">Team Members</Label>
            <Input id="teamMembers" placeholder="Comma separated" value={form.teamMembers.join(", ")} onChange={(event) => updateField("teamMembers", event.target.value.split(",").map((value) => value.trim()).filter(Boolean))} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="description">Description</Label>
            <textarea className="min-h-24 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:border-primary" id="description" value={form.description} onChange={(event) => updateField("description", event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tags">Tags</Label>
            <Input id="tags" placeholder="ai, crm, automation" value={form.tags.join(", ")} onChange={(event) => updateField("tags", event.target.value.split(",").map((value) => value.trim()).filter(Boolean))} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="attachments">Attachments</Label>
            <Input id="attachments" placeholder="File names, comma separated" value={form.attachments.map((item) => item.name).join(", ")} onChange={(event) => updateField("attachments", event.target.value.split(",").map((name) => name.trim()).filter(Boolean).map((name) => ({ name, type: "File", size: "Pending" })))} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="notes">Notes</Label>
            <textarea className="min-h-20 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:border-primary" id="notes" value={form.notes} onChange={(event) => updateField("notes", event.target.value)} />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Button onClick={onClose} type="button" variant="outline">Cancel</Button>
          <Button type="submit">{initialProject ? "Save Project" : "Create Project"}</Button>
        </div>
      </motion.form>
    </div>
  );
}

function ProjectCard({
  checked,
  onArchive,
  onDelete,
  onDuplicate,
  onEdit,
  onSelect,
  project,
}: {
  checked: boolean;
  onArchive: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onEdit: () => void;
  onSelect: (checked: boolean) => void;
  project: Project;
}) {
  return (
    <Card className="group h-full rounded-2xl bg-card/70 hover:-translate-y-1 hover:border-primary/35 hover:shadow-glass">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="truncate">{project.projectName}</CardTitle>
            <p className="mt-2 text-xs font-semibold text-primary">{project.projectCode}</p>
          </div>
          <input className="h-4 w-4 accent-primary" checked={checked} type="checkbox" onChange={(event) => onSelect(event.target.checked)} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="line-clamp-2 text-sm leading-6 text-muted-foreground">{project.description}</p>
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="rounded-full bg-primary/10 px-2.5 py-1 font-semibold text-primary">{project.status}</span>
          <span className="rounded-full bg-accent/15 px-2.5 py-1 font-semibold text-accent">{project.priority}</span>
          <span className="rounded-full bg-muted px-2.5 py-1 font-semibold text-muted-foreground">{project.category}</span>
        </div>
        <div>
          <div className="mb-2 flex justify-between text-xs">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-semibold">{project.progress}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary" style={{ width: `${project.progress}%` }} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">Budget</p>
            <p className="font-semibold">{formatCurrency(project.budget)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Deadline</p>
            <p className="font-semibold">{project.endDate}</p>
          </div>
        </div>
        <div className="flex items-center justify-between gap-3 rounded-lg border bg-background/55 p-3">
          <div className="flex -space-x-2">
            {project.teamMembers.slice(0, 4).map((member) => (
              <span className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-background bg-primary/10 text-[10px] font-bold text-primary" key={member}>
                {member
                  .split(" ")
                  .map((part) => part[0])
                  .slice(0, 2)
                  .join("")}
              </span>
            ))}
          </div>
          <span className="text-xs font-semibold text-muted-foreground">{project.teamMembers.length} members</span>
        </div>
        <div className="flex flex-wrap gap-2 opacity-90 transition-opacity group-hover:opacity-100">
          <Button asChild size="sm" variant="outline"><Link to={`/projects/${project.id}`}><Eye className="h-4 w-4" />Open</Link></Button>
          <Button size="sm" variant="outline" onClick={onEdit}><Edit3 className="h-4 w-4" />Edit</Button>
          <Button size="sm" variant="outline"><Share2 className="h-4 w-4" />Share</Button>
          <Button size="sm" variant="outline" onClick={onDuplicate}><Copy className="h-4 w-4" /></Button>
          <Button size="sm" variant="outline" onClick={onArchive}><Archive className="h-4 w-4" /></Button>
          <Button size="sm" variant="outline" onClick={onDelete}><Trash2 className="h-4 w-4" /></Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function ProjectsPage() {
  const { confirm } = useConfirm();
  const { toast } = useToast();
  const [projects, setProjects] = useState(seedProjects);
  const [view, setView] = useState<ProjectView>("grid");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("All");
  const [priority, setPriority] = useState("All");
  const [sortBy, setSortBy] = useState<keyof Project>("updatedAt");
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const filteredProjects = useMemo(() => {
    return projects
      .filter((project) => {
        const searchText = `${project.projectName} ${project.projectCode} ${project.description} ${project.client} ${project.tags.join(" ")}`.toLowerCase();
        return searchText.includes(search.toLowerCase());
      })
      .filter((project) => status === "All" || project.status === status)
      .filter((project) => priority === "All" || project.priority === priority)
      .sort((a, b) => String(b[sortBy]).localeCompare(String(a[sortBy])));
  }, [priority, projects, search, sortBy, status]);

  const paginatedProjects = filteredProjects.slice((page - 1) * pageSize, page * pageSize);
  const totalPages = Math.max(1, Math.ceil(filteredProjects.length / pageSize));
  const stats = getProjectStats(projects);

  const upsertProject = (input: ProjectFormInput) => {
    if (editingProject) {
      setProjects((current) =>
        current.map((project) =>
          project.id === editingProject.id
            ? { ...project, ...input, isArchived: input.status === "Archived", updatedAt: new Date().toISOString().slice(0, 10) }
            : project,
        ),
      );
    } else {
      setProjects((current) => [createProjectFromInput(input, current), ...current]);
    }
    setEditingProject(null);
    setIsCreating(false);
  };

  const deleteProject = async (id: string) => {
    const accepted = await confirm({
      title: "Delete project?",
      description: "This project will be removed from the current workspace view.",
      confirmLabel: "Delete Project",
      tone: "danger",
    });
    if (accepted) {
      setProjects((current) => current.filter((project) => project.id !== id));
      toast({ title: "Project deleted", description: "The project was removed from the workspace view.", type: "warning" });
    }
  };
  const archiveProject = (id: string) => setProjects((current) => current.map((project) => project.id === id ? { ...project, status: "Archived", isArchived: true } : project));
  const duplicateProject = (project: Project) => setProjects((current) => [createProjectFromInput({ ...project, projectName: `${project.projectName} Copy`, status: "Planning", progress: 0 }, current), ...current]);
  const bulkDelete = async () => {
    const accepted = await confirm({
      title: `Delete ${selectedIds.length} projects?`,
      description: "Selected projects will be removed from the current workspace view.",
      confirmLabel: "Bulk Delete",
      tone: "danger",
    });
    if (accepted) {
      setProjects((current) => current.filter((project) => !selectedIds.includes(project.id)));
      setSelectedIds([]);
      toast({ title: "Projects deleted", description: "Selected projects were removed from the workspace view.", type: "warning" });
    }
  };
  const bulkUpdate = () => {
    setProjects((current) => current.map((project) => selectedIds.includes(project.id) ? { ...project, status: "Active" } : project));
  };

  const statCards = [
    { label: "Total Projects", value: stats.total, icon: FolderKanban },
    { label: "Active Projects", value: stats.active, icon: Clock },
    { label: "Completed", value: stats.completed, icon: Check },
    { label: "Delayed", value: stats.delayed, icon: Filter },
    { label: "Upcoming Deadlines", value: stats.upcoming, icon: CalendarDays },
  ];

  return (
    <main className="min-h-screen bg-enterprise">
      <header className="sticky top-0 z-40 border-b bg-background/78 backdrop-blur-xl">
        <div className="container flex min-h-16 flex-wrap items-center justify-between gap-3 py-3">
          <div>
            <p className="text-sm font-semibold text-primary">Projects</p>
            <h1 className="text-2xl font-bold">Project Management</h1>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button onClick={() => setIsCreating(true)}><Plus className="h-4 w-4" />Create Project</Button>
          </div>
        </div>
      </header>

      <div className="container space-y-6 py-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {statCards.map((card, index) => {
            const Icon = card.icon;
            return (
              <motion.div animate={{ opacity: 1, y: 0 }} initial={{ opacity: 0, y: 16 }} key={card.label} transition={{ delay: index * 0.04 }}>
                <Card className="glass">
                  <CardContent className="p-5">
                    <Icon className="mb-4 h-5 w-5 text-primary" />
                    <p className="text-sm text-muted-foreground">{card.label}</p>
                    <p className="mt-2 text-3xl font-bold">{card.value}</p>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        <Card className="glass">
          <CardContent className="space-y-4 p-4">
            <div className="grid gap-3 lg:grid-cols-[1fr_160px_160px_160px_auto]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input className="pl-9" placeholder="Search projects, clients, tags..." value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} />
              </div>
              <select className="h-11 rounded-md border bg-background/75 px-3 text-sm" value={status} onChange={(event) => setStatus(event.target.value)}>
                <option>All</option>
                {projectStatuses.map((item) => <option key={item}>{item}</option>)}
              </select>
              <select className="h-11 rounded-md border bg-background/75 px-3 text-sm" value={priority} onChange={(event) => setPriority(event.target.value)}>
                <option>All</option>
                {projectPriorities.map((item) => <option key={item}>{item}</option>)}
              </select>
              <select className="h-11 rounded-md border bg-background/75 px-3 text-sm" value={sortBy} onChange={(event) => setSortBy(event.target.value as keyof Project)}>
                <option value="updatedAt">Sort: Updated</option>
                <option value="projectName">Sort: Name</option>
                <option value="endDate">Sort: Deadline</option>
                <option value="budget">Sort: Budget</option>
                <option value="progress">Sort: Progress</option>
              </select>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => downloadFile(exportProjectsCsv(filteredProjects), "projects.csv", "text/csv")}><Download className="h-4 w-4" />CSV</Button>
                <Button variant="outline" onClick={() => downloadFile(`AI BOS Project Export\n\n${filteredProjects.map((project) => `${project.projectCode} - ${project.projectName}`).join("\n")}`, "projects.pdf", "application/pdf")}><FileText className="h-4 w-4" />PDF</Button>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex gap-2">
                {(["grid", "list", "kanban", "calendar"] as ProjectView[]).map((item) => (
                  <Button key={item} variant={view === item ? "default" : "outline"} onClick={() => setView(item)}>
                    {item === "grid" && <Grid3X3 className="h-4 w-4" />}
                    {item === "list" && <LayoutList className="h-4 w-4" />}
                    {item === "kanban" && <FolderKanban className="h-4 w-4" />}
                    {item === "calendar" && <CalendarDays className="h-4 w-4" />}
                    {item}
                  </Button>
                ))}
              </div>
              {selectedIds.length > 0 && (
                <div className="flex gap-2">
                  <Button variant="outline" onClick={bulkUpdate}>Bulk Update</Button>
                  <Button variant="outline" onClick={bulkDelete}>Bulk Delete</Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {view === "grid" && (
          paginatedProjects.length === 0 ? (
            <EmptyState
              action={{ label: "Create Project", onClick: () => setIsCreating(true) }}
              description="No projects match the current search and filters. Adjust filters or create a new project."
              icon={FolderKanban}
              title="No projects found"
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
              {paginatedProjects.map((project) => (
                <ProjectCard
                  checked={selectedIds.includes(project.id)}
                  key={project.id}
                  onArchive={() => archiveProject(project.id)}
                  onDelete={() => deleteProject(project.id)}
                  onDuplicate={() => duplicateProject(project)}
                  onEdit={() => setEditingProject(project)}
                  onSelect={(checked) => setSelectedIds((current) => checked ? [...current, project.id] : current.filter((id) => id !== project.id))}
                  project={project}
                />
              ))}
            </div>
          )
        )}

        {view === "list" && (
          <Card className="glass overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-sm">
                <thead className="border-b bg-muted/40 text-left">
                  <tr>
                    <th className="p-4">Select</th>
                    <th className="p-4">Project</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Priority</th>
                    <th className="p-4">Progress</th>
                    <th className="p-4">Budget</th>
                    <th className="p-4">Manager</th>
                    <th className="p-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedProjects.map((project) => (
                    <tr className="border-b" key={project.id}>
                      <td className="p-4"><input className="accent-primary" checked={selectedIds.includes(project.id)} type="checkbox" onChange={(event) => setSelectedIds((current) => event.target.checked ? [...current, project.id] : current.filter((id) => id !== project.id))} /></td>
                      <td className="p-4"><p className="font-semibold">{project.projectName}</p><p className="text-xs text-primary">{project.projectCode}</p></td>
                      <td className="p-4">{project.status}</td>
                      <td className="p-4">{project.priority}</td>
                      <td className="p-4">{project.progress}%</td>
                      <td className="p-4">{formatCurrency(project.budget)}</td>
                      <td className="p-4">{project.projectManager}</td>
                      <td className="p-4"><Button asChild size="sm" variant="outline"><Link to={`/projects/${project.id}`}>Open</Link></Button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {view === "kanban" && (
          <div className="grid gap-4 xl:grid-cols-3 2xl:grid-cols-6">
            {projectStatuses.map((column) => (
              <Card className="glass" key={column}>
                <CardHeader><CardTitle className="text-base">{column}</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {filteredProjects.filter((project) => project.status === column).map((project) => (
                    <Link className="block rounded-lg border bg-background/60 p-3 transition-all hover:-translate-y-1 hover:border-primary/40" key={project.id} to={`/projects/${project.id}`}>
                      <p className="text-sm font-semibold">{project.projectName}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{project.progress}% - {project.priority}</p>
                    </Link>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {view === "calendar" && (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredProjects.map((project) => (
              <Card className="glass" key={project.id}>
                <CardContent className="p-5">
                  <CalendarDays className="mb-4 h-5 w-5 text-primary" />
                  <p className="font-semibold">{project.projectName}</p>
                  <p className="mt-2 text-sm text-muted-foreground">{project.startDate} to {project.endDate}</p>
                  <p className="mt-3 text-xs font-semibold text-primary">{project.status}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Page {page} of {totalPages}</p>
          <div className="flex gap-2">
            <Button disabled={page === 1} variant="outline" onClick={() => setPage((current) => Math.max(1, current - 1))}>Previous</Button>
            <Button disabled={page === totalPages} variant="outline" onClick={() => setPage((current) => Math.min(totalPages, current + 1))}>Next</Button>
          </div>
        </div>
      </div>

      {(isCreating || editingProject) && (
        <ProjectFormModal
          initialProject={editingProject}
          onClose={() => { setIsCreating(false); setEditingProject(null); }}
          onSubmit={upsertProject}
          projectCode={generateProjectCode(projects)}
        />
      )}
    </main>
  );
}
