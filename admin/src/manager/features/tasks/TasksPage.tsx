import { motion } from "framer-motion";
import {
 AlarmClock,
 Bell,
 CalendarDays,
 CheckCircle2,
 ClipboardCheck,
 Clock3,
 Edit3,
 Flag,
 GripVertical,
 GitBranch,
 Layers3,
 LayoutList,
 ListChecks,
 PanelRightOpen,
 PlayCircle,
 Plus,
 Repeat2,
 Rocket,
 Search,
 Timer,
 Trash2,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "react-router-dom";
import { ThemeToggle } from "@shared/ui/ThemeToggle";
import { Button } from "@shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@shared/ui/card";
import { useConfirm } from "@shared/ui/confirm-dialog-context";
import { Dialog } from "@shared/ui/dialog";
import { EmptyState } from "@shared/ui/empty-state";
import { Input } from "@shared/ui/input";
import { Label } from "@shared/ui/label";
import { useToast } from "@shared/ui/toast-context";
import { cn } from "@shared/lib/utils";
import { formatDateTime } from "@shared/lib/utils-helpers";
import { fetchEmployeeUsers } from "@shared/employees/employees.api";
import { fetchProjects, updateProject, type ProjectSprint, type ProjectSummary } from "@shared/projects/projects.api";
import { liveSyncIntervalMs, sharedDataChangedEvent } from "@shared/realtime/data-sync";
import { fetchTaskComments, postTaskComment, type Comment } from "@shared/tasks/task-comments.api";
import {
 createTask as apiCreateTask,
 deleteTask as apiDeleteTask,
 fetchTasks as apiFetchTasks,
 logTaskTime as apiLogTaskTime,
 toggleChecklistItem as apiToggleChecklistItem,
 updateTask as apiUpdateTask,
} from "@shared/tasks/tasks.api";
import { taskIssueTypes, taskLabels, taskPriorities, taskStatuses } from "./tasks.data";
import { taskFormSchema, type TaskFormValues } from "./tasks.schema";
import type { Task, TaskFormInput, TaskStatus, TaskView } from "./tasks.types";
import { formatHours, generateTaskCode, getTaskCompletion, getTaskStats, priorityClass, statusClass } from "./tasks.utils";

const emptyForm: TaskFormInput = {
 title: "",
 description: "",
 issueType: "Task",
 status: "Todo",
 priority: "Medium",
 labels: [],
 assignee: "Priya Sharma",
 reporter: "Priya Sharma",
 dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
 startDate: new Date().toISOString().slice(0, 10),
 estimatedHours: 0,
 actualHours: 0,
 attachments: [],
 comments: [],
 checklist: [],
 recurring: false,
 recurrence: "None",
 notifications: [],
};

function parseList(value: string) {
 return value
 .split(",")
 .map((item) => item.trim())
 .filter(Boolean);
}

function toDateInput(date: Date) {
 return date.toISOString().slice(0, 10);
}

function sprintStatusClass(status: ProjectSprint["status"]) {
 const classes: Record<ProjectSprint["status"], string> = {
 Planned: "bg-sky-500/10 text-sky-600 dark:text-sky-300",
 Active: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300",
 Closed: "bg-muted text-muted-foreground",
 };

 return classes[status];
}

function getProjectName(projects: ProjectSummary[], projectId?: string) {
 return projects.find((project) => project.id === projectId)?.projectName ?? "No project";
}

function getSprintName(projects: ProjectSummary[], sprintId?: string) {
 return projects.flatMap((project) => project.sprints).find((sprint) => sprint.id === sprintId)?.name ?? "Backlog";
}

function getEpicTitle(projects: ProjectSummary[], epicId?: string) {
 return projects.flatMap((project) => project.epics).find((epic) => epic.id === epicId)?.title ?? "No epic";
}

function TaskCommentsPanel({ taskId }: { taskId: string }) {
 const [comments, setComments] = useState<Comment[]>([]);
 const [body, setBody] = useState("");
 const [loading, setLoading] = useState(true);
 const [posting, setPosting] = useState(false);

 useEffect(() => {
 fetchTaskComments(taskId).then((result) => {
 if (result.status === "ok") setComments(result.data);
 setLoading(false);
 });
 }, [taskId]);

 const handlePost = async () => {
 const trimmed = body.trim();
 if (!trimmed || posting) return;
 setPosting(true);
 try {
 const comment = await postTaskComment(taskId, trimmed);
 setComments((current) => [...current, comment]);
 setBody("");
 } catch {
 // Silently ignore — the input stays filled so the user can retry.
 } finally {
 setPosting(false);
 }
 };

 return (
 <div className="space-y-2 md:col-span-2">
 <Label>Comments</Label>
 <div className="max-h-48 space-y-2 overflow-y-auto rounded-md border bg-background p-3">
 {loading ? (
 <p className="text-xs text-muted-foreground">Loading comments...</p>
 ) : comments.length === 0 ? (
 <p className="text-xs text-muted-foreground">No comments yet.</p>
 ) : (
 comments.map((comment) => (
 <div className="rounded-md border bg-card p-2 text-sm" key={comment.id}>
 <div className="flex items-center justify-between gap-2">
 <span className="font-semibold">{comment.author}</span>
 <span className="text-xs text-muted-foreground">{formatDateTime(comment.createdAt)}</span>
 </div>
 <p className="mt-1 text-muted-foreground">{comment.body}</p>
 </div>
 ))
 )}
 </div>
 <div className="flex gap-2">
 <Input
 onChange={(event) => setBody(event.target.value)}
 onKeyDown={(event) => {
 if (event.key === "Enter" && !event.shiftKey) {
 event.preventDefault();
 void handlePost();
 }
 }}
 placeholder="Write a comment..."
 value={body}
 />
 <Button disabled={posting || !body.trim()} onClick={handlePost} type="button">
 Post
 </Button>
 </div>
 </div>
 );
}

function TaskFormModal({
 initialTask,
 onClose,
 onSubmit,
 projects,
 taskCode,
 tasks,
 teamMembers,
}: {
 initialTask?: Task | null;
 onClose: () => void;
 onSubmit: (input: TaskFormInput) => void;
 projects: ProjectSummary[];
 taskCode: string;
 tasks: Task[];
 teamMembers: string[];
}) {
 const defaultValues: TaskFormValues = initialTask
 ? {
 taskCode: initialTask.taskCode,
 title: initialTask.title,
 description: initialTask.description,
 issueType: initialTask.issueType ?? "Task",
 status: initialTask.status,
 priority: initialTask.priority,
 projectId: initialTask.projectId,
 epicId: initialTask.epicId,
 sprintId: initialTask.sprintId,
 parentTaskId: initialTask.parentTaskId,
 backlogRank: initialTask.backlogRank,
 labels: initialTask.labels,
 assignee: initialTask.assignee,
 reporter: initialTask.reporter,
 dueDate: initialTask.dueDate,
 startDate: initialTask.startDate,
 estimatedHours: initialTask.estimatedHours,
 actualHours: initialTask.actualHours,
 attachments: initialTask.attachments,
 comments: initialTask.comments,
 checklist: initialTask.checklist,
 recurring: initialTask.recurring,
 recurrence: initialTask.recurrence,
 notifications: initialTask.notifications,
 }
 : { ...emptyForm, taskCode };

 const {
 control,
 formState: { errors },
 handleSubmit,
 register,
 watch,
 } = useForm<TaskFormValues>({
 resolver: zodResolver(taskFormSchema),
 defaultValues,
 });

 const selectedProjectId = watch("projectId");
 const selectedProject = projects.find((project) => project.id === selectedProjectId);
 const parentOptions = tasks.filter((task) => task.id !== initialTask?.id && (task.issueType ?? "Task") !== "Subtask");

 return (
 <Dialog as="form" className="max-w-5xl" onClose={onClose} onSubmit={handleSubmit(onSubmit)}>
 <div className="mb-6 flex items-start justify-between gap-4">
 <div>
 <h2 className="text-2xl font-bold">{initialTask ? "Edit Task" : "Create Task"}</h2>
 <p className="mt-1 text-sm text-muted-foreground">{defaultValues.taskCode}</p>
 </div>
 <Button onClick={onClose} type="button" variant="outline">
 Close
 </Button>
 </div>

 <div className="grid gap-4 md:grid-cols-2">
 <div className="space-y-2">
 <Label htmlFor="title">Title</Label>
 <Input id="title" className={cn(errors.title && "border-destructive focus-visible:ring-destructive/20")} {...register("title")} />
 {errors.title && <p className="text-xs font-medium text-destructive">{errors.title.message}</p>}
 </div>
 <div className="space-y-2">
 <Label>Status</Label>
 <select className="h-11 w-full rounded-md border bg-background px-3 text-sm" {...register("status")}>
 {taskStatuses.map((status) => (
 <option key={status}>{status}</option>
 ))}
 </select>
 </div>
 <div className="space-y-2">
 <Label>Priority</Label>
 <select className="h-11 w-full rounded-md border bg-background px-3 text-sm" {...register("priority")}>
 {taskPriorities.map((priority) => (
 <option key={priority}>{priority}</option>
 ))}
 </select>
 </div>
 <div className="space-y-2">
 <Label>Issue Type</Label>
 <select className="h-11 w-full rounded-md border bg-background px-3 text-sm" {...register("issueType")}>
 {taskIssueTypes.map((issueType) => (
 <option key={issueType}>{issueType}</option>
 ))}
 </select>
 </div>
 <div className="space-y-2">
 <Label>Project</Label>
 <select className="h-11 w-full rounded-md border bg-background px-3 text-sm" {...register("projectId")}>
 <option value="">No project</option>
 {projects.map((project) => (
 <option key={project.id} value={project.id}>
 {project.projectName}
 </option>
 ))}
 </select>
 </div>
 <div className="space-y-2">
 <Label>Epic</Label>
 <select className="h-11 w-full rounded-md border bg-background px-3 text-sm" {...register("epicId")}>
 <option value="">No epic</option>
 {(selectedProject?.epics ?? []).map((epic) => (
 <option key={epic.id} value={epic.id}>
 {epic.title}
 </option>
 ))}
 </select>
 </div>
 <div className="space-y-2">
 <Label>Sprint</Label>
 <select className="h-11 w-full rounded-md border bg-background px-3 text-sm" {...register("sprintId")}>
 <option value="">Backlog</option>
 {(selectedProject?.sprints ?? []).map((sprint) => (
 <option key={sprint.id} value={sprint.id}>
 {sprint.name} ({sprint.status})
 </option>
 ))}
 </select>
 </div>
 <div className="space-y-2">
 <Label>Parent Task</Label>
 <select className="h-11 w-full rounded-md border bg-background px-3 text-sm" {...register("parentTaskId")}>
 <option value="">No parent</option>
 {parentOptions.map((task) => (
 <option key={task.id} value={task.id}>
 {task.taskCode} - {task.title}
 </option>
 ))}
 </select>
 </div>
 <div className="space-y-2">
 <Label>Assignee</Label>
 <select className="h-11 w-full rounded-md border bg-background px-3 text-sm" {...register("assignee")}>
 {teamMembers.map((member) => (
 <option key={member}>{member}</option>
 ))}
 </select>
 </div>
 <div className="space-y-2">
 <Label>Reporter</Label>
 <select className="h-11 w-full rounded-md border bg-background px-3 text-sm" {...register("reporter")}>
 {teamMembers.map((member) => (
 <option key={member}>{member}</option>
 ))}
 </select>
 </div>
 <div className="space-y-2">
 <Label htmlFor="labels">Labels</Label>
 <Controller
 control={control}
 name="labels"
 render={({ field }) => (
 <Input
 id="labels"
 placeholder="Frontend, AI, Bug"
 value={field.value.join(", ")}
 onChange={(event) => field.onChange(parseList(event.target.value))}
 />
 )}
 />
 </div>
 <div className="space-y-2">
 <Label htmlFor="startDate">Start Date</Label>
 <Input id="startDate" type="date" {...register("startDate")} />
 </div>
 <div className="space-y-2">
 <Label htmlFor="dueDate">Due Date</Label>
 <Input id="dueDate" type="date" {...register("dueDate")} />
 </div>
 <div className="space-y-2">
 <Label htmlFor="estimatedHours">Estimated Hours</Label>
 <Input
 id="estimatedHours"
 min={0}
 type="number"
 className={cn(errors.estimatedHours && "border-destructive focus-visible:ring-destructive/20")}
 {...register("estimatedHours", { valueAsNumber: true })}
 />
 {errors.estimatedHours && <p className="text-xs font-medium text-destructive">{errors.estimatedHours.message}</p>}
 </div>
 <div className="space-y-2">
 <Label htmlFor="actualHours">Actual Hours</Label>
 <Input
 id="actualHours"
 min={0}
 type="number"
 className={cn(errors.actualHours && "border-destructive focus-visible:ring-destructive/20")}
 {...register("actualHours", { valueAsNumber: true })}
 />
 {errors.actualHours && <p className="text-xs font-medium text-destructive">{errors.actualHours.message}</p>}
 </div>
 <div className="space-y-2 md:col-span-2">
 <Label htmlFor="description">Description</Label>
 <textarea
 className="min-h-24 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
 id="description"
 {...register("description")}
 />
 </div>
 <div className="space-y-2">
 <Label htmlFor="attachments">Attachments</Label>
 <Controller
 control={control}
 name="attachments"
 render={({ field }) => (
 <Input
 id="attachments"
 placeholder="brief.pdf, screenshot.png"
 value={field.value.map((item) => item.name).join(", ")}
 onChange={(event) =>
 field.onChange(parseList(event.target.value).map((name) => ({ name, type: "File", size: "Pending" })))
 }
 />
 )}
 />
 </div>
 <div className="space-y-2">
 <Label htmlFor="notifications">Notifications</Label>
 <Controller
 control={control}
 name="notifications"
 render={({ field }) => (
 <Input
 id="notifications"
 placeholder="Due soon, Needs review"
 value={field.value.join(", ")}
 onChange={(event) => field.onChange(parseList(event.target.value))}
 />
 )}
 />
 </div>
 {initialTask ? <TaskCommentsPanel taskId={initialTask.id} /> : null}
 <div className="space-y-2">
 <Label htmlFor="checklist">Checklist</Label>
 <Controller
 control={control}
 name="checklist"
 render={({ field }) => (
 <Input
 id="checklist"
 placeholder="Design, Build, Review"
 value={field.value.map((item) => item.title).join(", ")}
 onChange={(event) =>
 field.onChange(
 parseList(event.target.value).map((title, index) => ({
 id: `checklist-${index}`,
 title,
 done: false,
 })),
 )
 }
 />
 )}
 />
 </div>
 <div className="flex items-center gap-3 rounded-lg border bg-muted p-4">
 <input className="h-4 w-4 accent-primary" id="recurring" type="checkbox" {...register("recurring")} />
 <Label htmlFor="recurring">Recurring Task</Label>
 </div>
 <div className="space-y-2">
 <Label htmlFor="recurrence">Recurrence</Label>
 <select className="h-11 w-full rounded-md border bg-background px-3 text-sm" id="recurrence" {...register("recurrence")}>
 {["None", "Daily", "Weekly", "Monthly", "Quarterly"].map((item) => (
 <option key={item}>{item}</option>
 ))}
 </select>
 </div>
 </div>

 <div className="mt-6 flex justify-end gap-3">
 <Button onClick={onClose} type="button" variant="outline">
 Cancel
 </Button>
 <Button type="submit">{initialTask ? "Save Task" : "Create Task"}</Button>
 </div>
 </Dialog>
 );
}

function TaskCard({
 projects,
 task,
 onDelete,
 onEdit,
 onLogTime,
 onOpen,
 onToggleChecklist,
 onDragStart,
}: {
 projects: ProjectSummary[];
 task: Task;
 onDelete: () => void;
 onEdit: () => void;
 onLogTime: () => void;
 onOpen: () => void;
 onToggleChecklist: (itemId: string) => void;
 onDragStart?: () => void;
}) {
 const completion = getTaskCompletion(task);
 const timePercent = task.estimatedHours > 0 ? Math.min(100, Math.round((task.actualHours / task.estimatedHours) * 100)) : 0;

 return (
 <motion.article
 animate={{ opacity: 1, y: 0 }}
 className="rounded-lg border bg-background p-4 shadow-sm transition-all hover:-translate-y-1 hover:border-primary/40 hover:shadow-glass"
 draggable={Boolean(onDragStart)}
 initial={{ opacity: 0, y: 14 }}
 onDragStart={onDragStart}
 >
 <div className="flex items-start justify-between gap-3">
 <div className="min-w-0">
 <p className="text-xs font-semibold text-primary">{task.taskCode}</p>
 <h3 className="mt-1 line-clamp-2 font-semibold leading-6">{task.title}</h3>
 </div>
 <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground" />
 </div>
 <div className="mt-3 grid gap-2 text-xs text-muted-foreground">
 <div className="flex min-w-0 items-center gap-2">
 <Layers3 className="h-3.5 w-3.5 shrink-0" />
 <span className="truncate">{getProjectName(projects, task.projectId)}</span>
 </div>
 <div className="flex min-w-0 items-center gap-2">
 <Rocket className="h-3.5 w-3.5 shrink-0" />
 <span className="truncate">{getSprintName(projects, task.sprintId)}</span>
 </div>
 </div>
 <p className="mt-3 line-clamp-2 text-sm leading-6 text-muted-foreground">{task.description}</p>
 <div className="mt-4 flex flex-wrap gap-2">
 {task.issueType && task.issueType !== "Task" && (
 <span className="rounded-full bg-violet-500/10 px-2.5 py-1 text-xs font-semibold text-violet-600 dark:text-violet-300">
 {task.issueType}
 </span>
 )}
 <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", statusClass(task.status))}>{task.status}</span>
 <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", priorityClass(task.priority))}>{task.priority}</span>
 {task.recurring && (
 <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground">
 <Repeat2 className="h-3 w-3" />
 {task.recurrence}
 </span>
 )}
 </div>
 <div className="mt-4 flex flex-wrap gap-2">
 {task.labels.map((label) => (
 <span className="rounded-full border bg-card px-2 py-1 text-xs text-muted-foreground" key={label}>
 {label}
 </span>
 ))}
 </div>
 <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
 <div>
 <p className="text-xs text-muted-foreground">Assignee</p>
 <p className="mt-1 truncate font-semibold">{task.assignee}</p>
 </div>
 <div>
 <p className="text-xs text-muted-foreground">Due Date</p>
 <p className="mt-1 font-semibold">{task.dueDate}</p>
 </div>
 </div>
 <div className="mt-4 space-y-3">
 <div>
 <div className="mb-2 flex justify-between text-xs">
 <span className="text-muted-foreground">Checklist</span>
 <span className="font-semibold">{completion}%</span>
 </div>
 <div className="h-2 overflow-hidden rounded-full bg-muted">
 <div className="h-full rounded-full bg-primary" style={{ width: `${completion}%` }} />
 </div>
 </div>
 <div>
 <div className="mb-2 flex justify-between text-xs">
 <span className="text-muted-foreground">Time Tracking</span>
 <span className="font-semibold">
 {formatHours(task.actualHours)} / {formatHours(task.estimatedHours)}
 </span>
 </div>
 <div className="h-2 overflow-hidden rounded-full bg-muted">
 <div className="h-full rounded-full bg-emerald-500" style={{ width: `${timePercent}%` }} />
 </div>
 </div>
 </div>
 {task.checklist.length > 0 && (
 <div className="mt-4 space-y-2">
 {task.checklist.slice(0, 3).map((item) => (
 <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground" key={item.id}>
 <input
 checked={item.done}
 className="h-3.5 w-3.5 accent-primary"
 onChange={() => onToggleChecklist(item.id)}
 type="checkbox"
 />
 <span className={cn(item.done && "line-through")}>{item.title}</span>
 </label>
 ))}
 </div>
 )}
 <div className="mt-4 flex flex-wrap gap-2">
 <Button onClick={onEdit} size="sm" type="button" variant="outline">
 <Edit3 className="h-4 w-4" />
 Edit
 </Button>
 <Button onClick={onOpen} size="sm" type="button" variant="outline">
 <PanelRightOpen className="h-4 w-4" />
 Open
 </Button>
 <Button onClick={onLogTime} size="sm" type="button" variant="outline">
 <Timer className="h-4 w-4" />
 Log 1h
 </Button>
 <Button onClick={onDelete} size="sm" type="button" variant="outline">
 <Trash2 className="h-4 w-4" />
 </Button>
 </div>
 </motion.article>
 );
}

function BacklogView({
 activeProject,
 backlogTasks,
 onCloseSprint,
 onCreateSprint,
 onMoveToBacklog,
 onMoveToSprint,
 onOpenTask,
 onStartSprint,
 sprintTasks,
 sprints,
 selectedSprintId,
 setSelectedSprintId,
}: {
 activeProject?: ProjectSummary;
 backlogTasks: Task[];
 onCloseSprint: (sprint: ProjectSprint) => void;
 onCreateSprint: () => void;
 onMoveToBacklog: (task: Task) => void;
 onMoveToSprint: (task: Task, sprintId: string) => void;
 onOpenTask: (task: Task) => void;
 onStartSprint: (sprint: ProjectSprint) => void;
 sprintTasks: Task[];
 sprints: ProjectSprint[];
 selectedSprintId: string;
 setSelectedSprintId: (value: string) => void;
}) {
 return (
 <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
 <Card className="glass">
 <CardHeader className="p-4">
 <div className="flex flex-wrap items-center justify-between gap-3">
 <div>
 <CardTitle className="text-base">Backlog</CardTitle>
 <p className="mt-1 text-xs text-muted-foreground">{backlogTasks.length} unplanned issues</p>
 </div>
 <Button disabled={!activeProject} onClick={onCreateSprint} size="sm" type="button">
 <Plus className="h-4 w-4" />
 Sprint
 </Button>
 </div>
 </CardHeader>
 <CardContent className="space-y-2 p-4 pt-0">
 {backlogTasks.length === 0 ? (
 <p className="rounded-md border bg-background p-3 text-sm text-muted-foreground">Backlog clear hai.</p>
 ) : (
 backlogTasks.map((task, index) => (
 <div className="grid gap-3 rounded-md border bg-background p-3 lg:grid-cols-[42px_minmax(0,1fr)_180px]" key={task.id}>
 <div className="text-xs font-semibold text-muted-foreground">#{index + 1}</div>
 <button className="min-w-0 text-left" onClick={() => onOpenTask(task)} type="button">
 <p className="truncate text-sm font-semibold">{task.title}</p>
 <p className="mt-1 text-xs text-muted-foreground">
 {task.taskCode} - {task.issueType ?? "Task"} - {getEpicTitle([activeProject].filter(Boolean) as ProjectSummary[], task.epicId)}
 </p>
 </button>
 <select
 className="h-9 rounded-md border bg-background px-2 text-xs"
 onChange={(event) => event.target.value && onMoveToSprint(task, event.target.value)}
 value=""
 >
 <option value="">Move to sprint</option>
 {sprints
 .filter((sprint) => sprint.status !== "Closed")
 .map((sprint) => (
 <option key={sprint.id} value={sprint.id}>
 {sprint.name}
 </option>
 ))}
 </select>
 </div>
 ))
 )}
 </CardContent>
 </Card>

 <Card className="glass">
 <CardHeader className="p-4">
 <CardTitle className="text-base">Sprint Plan</CardTitle>
 </CardHeader>
 <CardContent className="space-y-4 p-4 pt-0">
 <select
 className="h-10 w-full rounded-md border bg-background px-3 text-sm"
 onChange={(event) => setSelectedSprintId(event.target.value)}
 value={selectedSprintId}
 >
 <option value="">Select sprint</option>
 {sprints.map((sprint) => (
 <option key={sprint.id} value={sprint.id}>
 {sprint.name} ({sprint.status})
 </option>
 ))}
 </select>
 {sprints
 .filter((sprint) => !selectedSprintId || sprint.id === selectedSprintId)
 .map((sprint) => (
 <div className="rounded-md border bg-background p-3" key={sprint.id}>
 <div className="flex items-start justify-between gap-3">
 <div className="min-w-0">
 <p className="truncate text-sm font-semibold">{sprint.name}</p>
 <p className="mt-1 text-xs text-muted-foreground">{sprint.startDate} to {sprint.endDate}</p>
 </div>
 <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", sprintStatusClass(sprint.status))}>{sprint.status}</span>
 </div>
 {sprint.goal && <p className="mt-2 text-xs text-muted-foreground">{sprint.goal}</p>}
 <div className="mt-3 flex flex-wrap gap-2">
 <Button disabled={sprint.status !== "Planned"} onClick={() => onStartSprint(sprint)} size="sm" type="button" variant="outline">
 <PlayCircle className="h-4 w-4" />
 Start
 </Button>
 <Button disabled={sprint.status === "Closed"} onClick={() => onCloseSprint(sprint)} size="sm" type="button" variant="outline">
 Close
 </Button>
 </div>
 </div>
 ))}
 <div className="space-y-2">
 <p className="text-xs font-semibold uppercase text-muted-foreground">Selected sprint issues</p>
 {sprintTasks.length === 0 ? (
 <p className="rounded-md border bg-background p-3 text-sm text-muted-foreground">No issues in selected sprint.</p>
 ) : (
 sprintTasks.map((task) => (
 <div className="rounded-md border bg-background p-3" key={task.id}>
 <button className="w-full text-left" onClick={() => onOpenTask(task)} type="button">
 <p className="text-sm font-semibold">{task.title}</p>
 <p className="mt-1 text-xs text-muted-foreground">{task.taskCode} - {task.status}</p>
 </button>
 <Button className="mt-2" onClick={() => onMoveToBacklog(task)} size="sm" type="button" variant="outline">
 Move to backlog
 </Button>
 </div>
 ))
 )}
 </div>
 </CardContent>
 </Card>
 </div>
 );
}

function HierarchyView({ projects, tasks, onOpenTask }: { projects: ProjectSummary[]; tasks: Task[]; onOpenTask: (task: Task) => void }) {
 const epics = tasks.filter((task) => (task.issueType ?? "Task") === "Epic");
 const standaloneEpics = projects.flatMap((project) =>
 project.epics.map((epic) => ({ ...epic, projectId: project.id, projectName: project.projectName })),
 );

 return (
 <div className="space-y-4">
 {[...standaloneEpics, ...epics.map((task) => ({ id: task.id, title: task.title, status: task.status, projectId: task.projectId, projectName: getProjectName(projects, task.projectId) }))].map((epic) => {
 const children = tasks.filter((task) => task.epicId === epic.id || task.parentTaskId === epic.id);
 return (
 <Card className="glass" key={`${epic.projectId}-${epic.id}`}>
 <CardHeader className="p-4">
 <div className="flex flex-wrap items-center justify-between gap-3">
 <div className="min-w-0">
 <CardTitle className="truncate text-base">{epic.title}</CardTitle>
 <p className="mt-1 text-xs text-muted-foreground">{epic.projectName} - {children.length} linked issues</p>
 </div>
 <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground">{epic.status}</span>
 </div>
 </CardHeader>
 <CardContent className="space-y-2 p-4 pt-0">
 {children.length === 0 ? (
 <p className="rounded-md border bg-background p-3 text-sm text-muted-foreground">No linked tasks yet.</p>
 ) : (
 children.map((task) => (
 <div className="rounded-md border bg-background p-3" key={task.id}>
 <button className="w-full text-left" onClick={() => onOpenTask(task)} type="button">
 <div className="flex flex-wrap items-center gap-2">
 <span className="text-xs font-semibold text-primary">{task.taskCode}</span>
 <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", statusClass(task.status))}>{task.status}</span>
 <span className="rounded-full border px-2 py-0.5 text-xs text-muted-foreground">{task.issueType ?? "Task"}</span>
 </div>
 <p className="mt-2 text-sm font-semibold">{task.title}</p>
 </button>
 <div className="mt-2 space-y-2 border-l pl-3">
 {tasks
 .filter((child) => child.parentTaskId === task.id)
 .map((child) => (
 <button className="block w-full rounded-md bg-muted p-2 text-left text-xs" key={child.id} onClick={() => onOpenTask(child)} type="button">
 {child.taskCode} - {child.title}
 </button>
 ))}
 </div>
 </div>
 ))
 )}
 </CardContent>
 </Card>
 );
 })}
 </div>
 );
}

function TaskDetailDrawer({
 onClose,
 onEdit,
 onLogTime,
 onMoveToBacklog,
 onMoveToSprint,
 projects,
 task,
}: {
 onClose: () => void;
 onEdit: () => void;
 onLogTime: () => void;
 onMoveToBacklog: () => void;
 onMoveToSprint: (sprintId: string) => void;
 projects: ProjectSummary[];
 task: Task;
}) {
 const project = projects.find((item) => item.id === task.projectId);

 return (
 <div className="fixed inset-0 z-50 flex justify-end bg-foreground/30 p-3">
 <aside className="h-full w-full max-w-xl overflow-y-auto rounded-lg border bg-background shadow-glass">
 <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b bg-background p-5">
 <div className="min-w-0">
 <p className="text-xs font-semibold text-primary">{task.taskCode}</p>
 <h2 className="mt-1 text-xl font-bold leading-7">{task.title}</h2>
 </div>
 <Button onClick={onClose} type="button" variant="outline">Close</Button>
 </div>
 <div className="space-y-5 p-5">
 <div className="flex flex-wrap gap-2">
 <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", statusClass(task.status))}>{task.status}</span>
 <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", priorityClass(task.priority))}>{task.priority}</span>
 <span className="rounded-full border bg-background px-2.5 py-1 text-xs font-semibold text-muted-foreground">{task.issueType ?? "Task"}</span>
 </div>
 <p className="text-sm leading-6 text-muted-foreground">{task.description || "No description."}</p>
 <div className="grid gap-3 sm:grid-cols-2">
 {[
 ["Project", getProjectName(projects, task.projectId), Layers3],
 ["Epic", getEpicTitle(projects, task.epicId), GitBranch],
 ["Sprint", getSprintName(projects, task.sprintId), Rocket],
 ["Assignee", task.assignee, Flag],
 ].map(([label, value, Icon]) => {
 const DetailIcon = Icon as typeof Layers3;
 return (
 <div className="rounded-md border bg-card p-3" key={label as string}>
 <DetailIcon className="mb-2 h-4 w-4 text-primary" />
 <p className="text-xs text-muted-foreground">{label as string}</p>
 <p className="mt-1 truncate text-sm font-semibold">{value as string}</p>
 </div>
 );
 })}
 </div>
 <div className="rounded-md border bg-card p-3">
 <div className="flex items-center justify-between gap-3 text-sm">
 <span className="font-semibold">Time</span>
 <span>{formatHours(task.actualHours)} / {formatHours(task.estimatedHours)}</span>
 </div>
 <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
 <div className="h-full rounded-full bg-emerald-500" style={{ width: `${task.estimatedHours ? Math.min(100, (task.actualHours / task.estimatedHours) * 100) : 0}%` }} />
 </div>
 </div>
 <div className="rounded-md border bg-card p-3">
 <p className="text-sm font-semibold">Checklist</p>
 <div className="mt-3 space-y-2">
 {task.checklist.length === 0 ? (
 <p className="text-sm text-muted-foreground">No checklist items.</p>
 ) : (
 task.checklist.map((item) => (
 <div className="flex items-center gap-2 text-sm" key={item.id}>
 <input checked={item.done} readOnly className="h-4 w-4 accent-primary" type="checkbox" />
 <span className={cn(item.done && "line-through text-muted-foreground")}>{item.title}</span>
 </div>
 ))
 )}
 </div>
 </div>
 <TaskCommentsPanel taskId={task.id} />
 <div className="flex flex-wrap gap-2">
 <Button onClick={onEdit} type="button">
 <Edit3 className="h-4 w-4" />
 Edit
 </Button>
 <Button onClick={onLogTime} type="button" variant="outline">
 <Timer className="h-4 w-4" />
 Log 1h
 </Button>
 {task.sprintId ? (
 <Button onClick={onMoveToBacklog} type="button" variant="outline">Move to backlog</Button>
 ) : (
 <select className="h-10 rounded-md border bg-background px-3 text-sm" onChange={(event) => event.target.value && onMoveToSprint(event.target.value)} value="">
 <option value="">Move to sprint</option>
 {(project?.sprints ?? []).filter((sprint) => sprint.status !== "Closed").map((sprint) => (
 <option key={sprint.id} value={sprint.id}>{sprint.name}</option>
 ))}
 </select>
 )}
 </div>
 </div>
 </aside>
 </div>
 );
}

function CalendarView({ tasks }: { tasks: Task[] }) {
 const sortedTasks = [...tasks].sort((a, b) => a.dueDate.localeCompare(b.dueDate));

 return (
 <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
 {sortedTasks.map((task) => (
 <Card className="glass" key={task.id}>
 <CardContent className="p-5">
 <div className="mb-4 flex items-center justify-between gap-3">
 <CalendarDays className="h-5 w-5 text-primary" />
 <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", priorityClass(task.priority))}>{task.priority}</span>
 </div>
 <p className="font-semibold leading-6">{task.title}</p>
 <p className="mt-2 text-sm text-muted-foreground">
 {task.startDate} to {task.dueDate}
 </p>
 <p className="mt-3 text-xs font-semibold text-primary">{task.assignee}</p>
 </CardContent>
 </Card>
 ))}
 </div>
 );
}

function TimelineView({ tasks }: { tasks: Task[] }) {
 return (
 <Card className="glass">
 <CardContent className="space-y-4 p-5">
 {[...tasks]
 .sort((a, b) => a.startDate.localeCompare(b.startDate))
 .map((task) => {
 const completion = getTaskCompletion(task);
 return (
 <div className="grid gap-3 rounded-lg border bg-background p-4 lg:grid-cols-[220px_1fr_140px]" key={task.id}>
 <div>
 <p className="text-sm font-semibold">{task.startDate}</p>
 <p className="mt-1 text-xs text-muted-foreground">Due {task.dueDate}</p>
 </div>
 <div className="min-w-0">
 <div className="flex flex-wrap items-center gap-2">
 <p className="font-semibold">{task.title}</p>
 <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", statusClass(task.status))}>{task.status}</span>
 </div>
 <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
 <div className="h-full rounded-full bg-primary" style={{ width: `${completion}%` }} />
 </div>
 </div>
 <div className="text-sm lg:text-right">
 <p className="font-semibold">{task.assignee}</p>
 <p className="mt-1 text-xs text-muted-foreground">{formatHours(task.actualHours)} tracked</p>
 </div>
 </div>
 );
 })}
 </CardContent>
 </Card>
 );
}

export function TasksPage() {
 const { confirm } = useConfirm();
 const { toast } = useToast();
 const [tasks, setTasks] = useState<Task[]>([]);
 const [projects, setProjects] = useState<ProjectSummary[]>([]);
 const [teamMembers, setTeamMembers] = useState<string[]>([]);
 const [employeeIdByName, setEmployeeIdByName] = useState<Record<string, string>>({});
 const [view, setView] = useState<TaskView>("kanban");
 const [search, setSearch] = useState("");
 const [status, setStatus] = useState("All");
 const [priority, setPriority] = useState("All");
 const [issueType, setIssueType] = useState("All Types");
 const [projectId, setProjectId] = useState("All Projects");
 const [selectedSprintId, setSelectedSprintId] = useState("");
 const [editingTask, setEditingTask] = useState<Task | null>(null);
 const [selectedTask, setSelectedTask] = useState<Task | null>(null);
 const [isCreating, setIsCreating] = useState(false);
 const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);

 const loadTasks = useCallback(async () => {
 const result = await apiFetchTasks();
 if (result.status === "ok") setTasks(result.data as unknown as Task[]);
 }, []);

 const loadProjects = useCallback(async () => {
 const result = await fetchProjects();
 if (result.status === "ok") setProjects(result.data);
 }, []);

 useEffect(() => {
 void loadTasks();
 void loadProjects();

 fetchEmployeeUsers().then((result) => {
 if (result.status !== "ok") return;
 const names = result.data.map((employee) => employee.fullName);
 setTeamMembers(names);
 setEmployeeIdByName(
 Object.fromEntries(result.data.map((employee) => [employee.fullName, employee.id])),
 );
 });
 }, [loadProjects, loadTasks]);

 useEffect(() => {
 const reload = () => {
 void loadTasks();
 void loadProjects();
 };
 const interval = window.setInterval(reload, liveSyncIntervalMs);
 window.addEventListener(sharedDataChangedEvent, reload);
 window.addEventListener("storage", reload);
 return () => {
 window.clearInterval(interval);
 window.removeEventListener(sharedDataChangedEvent, reload);
 window.removeEventListener("storage", reload);
 };
 }, [loadProjects, loadTasks]);

 const filteredTasks = useMemo(() => {
 return tasks
 .filter((task) => {
 const searchText = `${task.title} ${task.description} ${task.assignee} ${task.reporter} ${task.labels.join(" ")}`.toLowerCase();
 return searchText.includes(search.toLowerCase());
 })
 .filter((task) => status === "All" || task.status === status)
 .filter((task) => priority === "All" || task.priority === priority)
 .filter((task) => issueType === "All Types" || (task.issueType ?? "Task") === issueType)
 .filter((task) => projectId === "All Projects" || task.projectId === projectId);
 }, [issueType, priority, projectId, search, status, tasks]);

 const activeProject = projects.find((project) => project.id === projectId);
 const visibleSprints = activeProject?.sprints ?? [];
 const backlogTasks = filteredTasks
 .filter((task) => !task.sprintId && (task.issueType ?? "Task") !== "Epic")
 .sort((a, b) => (a.backlogRank ?? Number.MAX_SAFE_INTEGER) - (b.backlogRank ?? Number.MAX_SAFE_INTEGER));
 const sprintTasks = filteredTasks.filter((task) => (selectedSprintId ? task.sprintId === selectedSprintId : Boolean(task.sprintId)));

 const stats = getTaskStats(tasks);
 const latestActivities = tasks.flatMap((task) => task.activityLogs.map((log) => ({ ...log, task: task.title }))).slice(0, 6);
 const notifications = tasks.flatMap((task) => task.notifications.map((title) => ({ id: `${task.id}-${title}`, title, task: task.title }))).slice(0, 6);

 const upsertTask = async (input: TaskFormInput) => {
 const payload = {
 title: input.title,
 description: input.description,
 issueType: input.issueType,
 status: input.status,
 priority: input.priority,
 projectId: input.projectId || undefined,
 epicId: input.epicId || undefined,
 sprintId: input.sprintId || undefined,
 parentTaskId: input.parentTaskId || undefined,
 backlogRank: input.backlogRank,
 labels: input.labels,
 assigneeId: employeeIdByName[input.assignee],
 reporterId: employeeIdByName[input.reporter],
 dueDate: input.dueDate || undefined,
 startDate: input.startDate || undefined,
 estimatedHours: input.estimatedHours,
 recurring: input.recurring,
 recurrence: input.recurrence,
 };

 try {
 if (editingTask) {
 const updated = await apiUpdateTask(editingTask.id, payload);
 setTasks((current) => current.map((task) => (task.id === editingTask.id ? (updated as unknown as Task) : task)));
 setSelectedTask((current) => (current?.id === editingTask.id ? (updated as unknown as Task) : current));
 } else {
 const created = await apiCreateTask(payload);
 setTasks((current) => [created as unknown as Task, ...current]);
 }
 setEditingTask(null);
 setIsCreating(false);
 } catch (error) {
 toast({ title: "Could not save task", description: error instanceof Error ? error.message : "Try again.", type: "error" });
 }
 };

 const deleteTask = async (id: string) => {
 const accepted = await confirm({
 title: "Delete task?",
 description: "This task will be removed from the current workspace view.",
 confirmLabel: "Delete Task",
 tone: "danger",
 });
 if (accepted) {
 try {
 await apiDeleteTask(id);
 setTasks((current) => current.filter((task) => task.id !== id));
 toast({ title: "Task deleted", description: "The task was removed from the workspace view.", type: "warning" });
 } catch (error) {
 toast({ title: "Could not delete task", description: error instanceof Error ? error.message : "Try again.", type: "error" });
 }
 }
 };

 const updateTaskStatus = (id: string, nextStatus: TaskStatus) => {
 const previous = tasks;
 setTasks((current) => current.map((task) => (task.id === id ? { ...task, status: nextStatus } : task)));

 apiUpdateTask(id, { status: nextStatus }).catch((error) => {
 setTasks(previous);
 toast({ title: "Could not move task", description: error instanceof Error ? error.message : "Try again.", type: "error" });
 });
 };

 const toggleChecklist = (taskId: string, itemId: string) => {
 const task = tasks.find((item) => item.id === taskId);
 const item = task?.checklist.find((entry) => entry.id === itemId);
 if (!item) return;

 apiToggleChecklistItem(taskId, itemId, !item.done)
 .then((updated) => {
 setTasks((current) => current.map((entry) => (entry.id === taskId ? (updated as unknown as Task) : entry)));
 })
 .catch((error) => {
 toast({ title: "Could not update checklist", description: error instanceof Error ? error.message : "Try again.", type: "error" });
 });
 };

 const logTime = (taskId: string) => {
 apiLogTaskTime(taskId, { hours: 1, note: "Manual time entry" })
 .then((updated) => {
 setTasks((current) => current.map((task) => (task.id === taskId ? (updated as unknown as Task) : task)));
 setSelectedTask((current) => (current?.id === taskId ? (updated as unknown as Task) : current));
 })
 .catch((error) => {
 toast({ title: "Could not log time", description: error instanceof Error ? error.message : "Try again.", type: "error" });
 });
 };

 const updateTaskFields = async (task: Task, input: Record<string, unknown>) => {
 const previous = tasks;
 setTasks((current) => current.map((item) => (item.id === task.id ? { ...item, ...input } as Task : item)));
 try {
 const updated = await apiUpdateTask(task.id, input);
 setTasks((current) => current.map((item) => (item.id === task.id ? (updated as unknown as Task) : item)));
 setSelectedTask((current) => (current?.id === task.id ? (updated as unknown as Task) : current));
 } catch (error) {
 setTasks(previous);
 toast({ title: "Could not update task", description: error instanceof Error ? error.message : "Try again.", type: "error" });
 }
 };

 const moveToSprint = (task: Task, sprintId: string) => {
 void updateTaskFields(task, { sprintId, projectId: task.projectId || activeProject?.id, backlogRank: null });
 };

 const moveToBacklog = (task: Task) => {
 void updateTaskFields(task, { sprintId: null, backlogRank: Date.now() });
 };

 const createSprint = async () => {
 if (!activeProject) {
 toast({ title: "Select a project first", description: "Sprint project ke andar create hota hai.", type: "warning" });
 return;
 }
 const nextNumber = activeProject.sprints.length + 1;
 const startDate = toDateInput(new Date());
 const endDate = toDateInput(new Date(Date.now() + 14 * 24 * 60 * 60 * 1000));
 try {
 const updated = await updateProject(activeProject.id, {
 sprints: [
 ...activeProject.sprints.map(({ id, ...sprint }) => ({ _id: id, ...sprint })),
 { name: `Sprint ${nextNumber}`, goal: "Planned delivery increment", status: "Planned", startDate, endDate },
 ],
 });
 setProjects((current) => current.map((project) => (project.id === updated.id ? updated : project)));
 setSelectedSprintId(updated.sprints.at(-1)?.id ?? "");
 toast({ title: "Sprint created", description: "Backlog issues can now be moved into this sprint.", type: "success" });
 } catch (error) {
 toast({ title: "Could not create sprint", description: error instanceof Error ? error.message : "Try again.", type: "error" });
 }
 };

 const updateSprintStatus = async (sprint: ProjectSprint, status: ProjectSprint["status"]) => {
 if (!activeProject) return;
 try {
 const updated = await updateProject(activeProject.id, {
 sprints: activeProject.sprints.map(({ id, ...item }) => ({
 _id: id,
 ...item,
 status: item.name === sprint.name && item.startDate === sprint.startDate ? status : item.status,
 })),
 });
 setProjects((current) => current.map((project) => (project.id === updated.id ? updated : project)));
 toast({ title: `Sprint ${status.toLowerCase()}`, description: `${sprint.name} updated.`, type: "success" });
 } catch (error) {
 toast({ title: "Could not update sprint", description: error instanceof Error ? error.message : "Try again.", type: "error" });
 }
 };

 const statCards = [
 { label: "Total Tasks", value: stats.total, icon: ListChecks },
 { label: "Active Tasks", value: stats.active, icon: ClipboardCheck },
 { label: "Due Soon", value: stats.dueSoon, icon: AlarmClock },
 { label: "Overdue", value: stats.overdue, icon: Bell },
 { label: "Tracked Hours", value: formatHours(stats.tracked), icon: Clock3 },
 ];

 return (
 <main className="min-h-screen bg-enterprise">
 <header className="sticky top-0 z-40 border-b bg-background ">
 <div className="container flex min-h-16 flex-wrap items-center justify-between gap-3 py-3">
 <div>
 <p className="text-sm font-semibold text-primary">Tasks</p>
 <h1 className="text-2xl font-bold">Task Management</h1>
 </div>
 <div className="flex items-center gap-2">
 <Button asChild type="button" variant="outline">
 <Link to="/dashboard">Dashboard</Link>
 </Button>
 <ThemeToggle />
 <Button onClick={() => setIsCreating(true)} type="button">
 <Plus className="h-4 w-4" />
 Create Task
 </Button>
 </div>
 </div>
 </header>

 <div className="container grid gap-6 py-6 xl:grid-cols-[1fr_320px]">
 <section className="min-w-0 space-y-6">
 <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
 {statCards.map((card, index) => {
 const Icon = card.icon;
 return (
 <motion.div animate={{ opacity: 1, y: 0 }} initial={{ opacity: 0, y: 16 }} key={card.label} transition={{ delay: index * 0.04 }}>
 <Card className="glass h-full">
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
 <div className="grid gap-3 lg:grid-cols-[minmax(220px,1fr)_180px_150px_150px_150px] xl:grid-cols-[minmax(260px,1fr)_190px_150px_150px_150px_auto]">
 <div className="relative">
 <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
 <Input
 className="pl-9"
 placeholder="Search tasks, labels, assignees..."
 value={search}
 onChange={(event) => setSearch(event.target.value)}
 />
 </div>
 <select className="h-11 rounded-md border bg-background px-3 text-sm" value={status} onChange={(event) => setStatus(event.target.value)}>
 <option>All</option>
 {taskStatuses.map((item) => (
 <option key={item}>{item}</option>
 ))}
 </select>
 <select className="h-11 rounded-md border bg-background px-3 text-sm" value={priority} onChange={(event) => setPriority(event.target.value)}>
 <option>All</option>
 {taskPriorities.map((item) => (
 <option key={item}>{item}</option>
 ))}
 </select>
 <select
 className="h-11 rounded-md border bg-background px-3 text-sm"
 value={projectId}
 onChange={(event) => {
 setProjectId(event.target.value);
 setSelectedSprintId("");
 }}
 >
 <option>All Projects</option>
 {projects.map((project) => (
 <option key={project.id} value={project.id}>
 {project.projectName}
 </option>
 ))}
 </select>
 <select className="h-11 rounded-md border bg-background px-3 text-sm" value={issueType} onChange={(event) => setIssueType(event.target.value)}>
 <option>All Types</option>
 {taskIssueTypes.map((item) => (
 <option key={item}>{item}</option>
 ))}
 </select>
 <div className="flex flex-wrap gap-2">
 {(["kanban", "backlog", "hierarchy", "list", "calendar", "timeline"] as TaskView[]).map((item) => (
 <Button key={item} onClick={() => setView(item)} type="button" variant={view === item ? "default" : "outline"}>
 {item === "kanban" && <ClipboardCheck className="h-4 w-4" />}
 {item === "backlog" && <Rocket className="h-4 w-4" />}
 {item === "hierarchy" && <GitBranch className="h-4 w-4" />}
 {item === "list" && <LayoutList className="h-4 w-4" />}
 {item === "calendar" && <CalendarDays className="h-4 w-4" />}
 {item === "timeline" && <Clock3 className="h-4 w-4" />}
 {item}
 </Button>
 ))}
 </div>
 </div>
 <div className="flex flex-wrap gap-2">
 {taskLabels.map((label) => (
 <button
 className="rounded-full border bg-background px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
 key={label}
 onClick={() => setSearch(label)}
 type="button"
 >
 {label}
 </button>
 ))}
 </div>
 </CardContent>
 </Card>

 {view === "kanban" && (
 filteredTasks.length === 0 ? (
 <EmptyState
 action={{ label: "Create Task", onClick: () => setIsCreating(true) }}
 description="No tasks match the current filters. Clear your search or create a task to get moving."
 icon={ListChecks}
 title="No tasks found"
 />
 ) : (
 <div className="grid gap-4 xl:grid-cols-5">
 {taskStatuses.map((column) => (
 <Card
 className="glass min-h-[360px]"
 key={column}
 onDragOver={(event) => event.preventDefault()}
 onDrop={() => {
 if (draggingTaskId) {
 updateTaskStatus(draggingTaskId, column);
 setDraggingTaskId(null);
 }
 }}
 >
 <CardHeader className="p-4">
 <div className="flex items-center justify-between gap-3">
 <CardTitle className="text-base">{column}</CardTitle>
 <span className="rounded-full bg-muted px-2 py-1 text-xs font-semibold text-muted-foreground">
 {filteredTasks.filter((task) => task.status === column).length}
 </span>
 </div>
 </CardHeader>
 <CardContent className="space-y-3 p-4 pt-0">
 {filteredTasks
 .filter((task) => task.status === column)
 .map((task) => (
 <TaskCard
 key={task.id}
 projects={projects}
 onDelete={() => deleteTask(task.id)}
 onDragStart={() => setDraggingTaskId(task.id)}
 onEdit={() => setEditingTask(task)}
 onLogTime={() => logTime(task.id)}
 onOpen={() => setSelectedTask(task)}
 onToggleChecklist={(itemId) => toggleChecklist(task.id, itemId)}
 task={task}
 />
 ))}
 </CardContent>
 </Card>
 ))}
 </div>
 )
 )}

 {view === "backlog" && (
 <BacklogView
 activeProject={activeProject}
 backlogTasks={backlogTasks}
 onCloseSprint={(sprint) => updateSprintStatus(sprint, "Closed")}
 onCreateSprint={createSprint}
 onMoveToBacklog={moveToBacklog}
 onMoveToSprint={moveToSprint}
 onOpenTask={setSelectedTask}
 onStartSprint={(sprint) => updateSprintStatus(sprint, "Active")}
 selectedSprintId={selectedSprintId}
 setSelectedSprintId={setSelectedSprintId}
 sprintTasks={sprintTasks}
 sprints={visibleSprints}
 />
 )}

 {view === "hierarchy" && <HierarchyView onOpenTask={setSelectedTask} projects={projects} tasks={filteredTasks} />}

 {view === "list" && (
 <Card className="glass overflow-hidden">
 <div className="overflow-x-auto">
 <table className="w-full min-w-[980px] text-sm">
 <thead className="border-b bg-muted text-left">
 <tr>
 <th className="p-4">Task</th>
 <th className="p-4">Status</th>
 <th className="p-4">Priority</th>
 <th className="p-4">Assignee</th>
 <th className="p-4">Reporter</th>
 <th className="p-4">Due Date</th>
 <th className="p-4">Hours</th>
 <th className="p-4">Actions</th>
 </tr>
 </thead>
 <tbody>
 {filteredTasks.map((task) => (
 <tr className="border-b" key={task.id}>
 <td className="p-4">
 <p className="font-semibold">{task.title}</p>
 <p className="mt-1 text-xs text-primary">{task.taskCode}</p>
 </td>
 <td className="p-4">
 <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", statusClass(task.status))}>{task.status}</span>
 </td>
 <td className="p-4">
 <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", priorityClass(task.priority))}>{task.priority}</span>
 </td>
 <td className="p-4">{task.assignee}</td>
 <td className="p-4">{task.reporter}</td>
 <td className="p-4">{task.dueDate}</td>
 <td className="p-4">
 {formatHours(task.actualHours)} / {formatHours(task.estimatedHours)}
 </td>
 <td className="p-4">
 <div className="flex gap-2">
 <Button onClick={() => setEditingTask(task)} size="sm" type="button" variant="outline">
 Edit
 </Button>
 <Button onClick={() => setSelectedTask(task)} size="sm" type="button" variant="outline">
 Open
 </Button>
 <Button onClick={() => deleteTask(task.id)} size="sm" type="button" variant="outline">
 Delete
 </Button>
 </div>
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 </Card>
 )}

 {view === "calendar" && <CalendarView tasks={filteredTasks} />}
 {view === "timeline" && <TimelineView tasks={filteredTasks} />}
 </section>

 <aside className="space-y-4">
 <Card className="glass">
 <CardHeader>
 <CardTitle>Notifications</CardTitle>
 </CardHeader>
 <CardContent className="space-y-3">
 {notifications.map((item) => (
 <div className="rounded-lg border bg-background p-3" key={item.id}>
 <p className="text-sm font-semibold leading-6">{item.title}</p>
 <p className="mt-1 text-xs text-muted-foreground">{item.task}</p>
 </div>
 ))}
 </CardContent>
 </Card>
 <Card className="glass">
 <CardHeader>
 <CardTitle>Activity Logs</CardTitle>
 </CardHeader>
 <CardContent className="space-y-3">
 {latestActivities.map((item) => (
 <div className="rounded-lg border bg-background p-3" key={item.id}>
 <div className="flex items-start gap-3">
 <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
 <div className="min-w-0">
 <p className="text-sm font-semibold leading-6">{item.title}</p>
 <p className="mt-1 text-xs text-muted-foreground">
 {item.task} - {item.time}
 </p>
 </div>
 </div>
 </div>
 ))}
 </CardContent>
 </Card>
 <Card className="bg-foreground text-background dark:bg-white dark:text-slate-950">
 <CardContent className="p-5">
 <Timer className="mb-4 h-5 w-5" />
 <p className="text-sm font-semibold">Time Tracking</p>
 <p className="mt-2 text-3xl font-bold">{formatHours(stats.tracked)}</p>
 <p className="mt-2 text-sm opacity-75">Logged across active work.</p>
 </CardContent>
 </Card>
 </aside>
 </div>

 {(isCreating || editingTask) && (
 <TaskFormModal
 initialTask={editingTask}
 onClose={() => {
 setIsCreating(false);
 setEditingTask(null);
 }}
 onSubmit={upsertTask}
 projects={projects}
 taskCode={generateTaskCode(tasks)}
 tasks={tasks}
 teamMembers={teamMembers}
 />
 )}
 {selectedTask && (
 <TaskDetailDrawer
 onClose={() => setSelectedTask(null)}
 onEdit={() => {
 setEditingTask(selectedTask);
 setSelectedTask(null);
 }}
 onLogTime={() => logTime(selectedTask.id)}
 onMoveToBacklog={() => moveToBacklog(selectedTask)}
 onMoveToSprint={(sprintId) => moveToSprint(selectedTask, sprintId)}
 projects={projects}
 task={selectedTask}
 />
 )}
 </main>
 );
}
