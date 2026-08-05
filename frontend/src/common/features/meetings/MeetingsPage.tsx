import { motion } from "framer-motion";
import {
 CalendarDays,
 CheckCircle2,
 ClipboardList,
 Clock3,
 ExternalLink,
 FileText,
 Link2,
 ListChecks,
 Plus,
 Search,
 UsersRound,
 Video,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ThemeToggle } from "@shared/ui/ThemeToggle";
import { Button } from "@shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@shared/ui/card";
import { Dialog } from "@shared/ui/dialog";
import { Input } from "@shared/ui/input";
import { Label } from "@shared/ui/label";
import { cn } from "@shared/lib/utils";
import { formatClockTimeString } from "@shared/lib/utils-helpers";
import { meetingParticipants, meetingTypes, seedMeetings } from "./meetings.data";
import type { Meeting, MeetingFormInput, MeetingStatus, MeetingType } from "./meetings.types";
import { createMeetingFromInput, formatMeetingTime, getMeetingStats, statusClass } from "./meetings.utils";

const emptyMeetingForm: MeetingFormInput = {
 title: "",
 type: "Internal",
 date: new Date().toISOString().slice(0, 10),
 startTime: "10:00",
 endTime: "10:30",
 organizer: meetingParticipants[0],
 participants: [],
 agenda: [],
 notes: "",
 actionItems: [],
 attachments: [],
 zoomLink: "",
 googleMeetLink: "",
};

function parseList(value: string) {
 return value
 .split(",")
 .map((item) => item.trim())
 .filter(Boolean);
}

function MeetingFormModal({
 onClose,
 onSubmit,
}: {
 onClose: () => void;
 onSubmit: (input: MeetingFormInput) => void;
}) {
 const [form, setForm] = useState(emptyMeetingForm);

 const updateField = <K extends keyof MeetingFormInput>(field: K, value: MeetingFormInput[K]) => {
 setForm((current) => ({ ...current, [field]: value }));
 };

 return (
 <Dialog
 as="form"
 className="max-w-5xl"
 onClose={onClose}
 onSubmit={(event) => {
 event.preventDefault();
 onSubmit(form);
 }}
 >
 <div className="mb-6 flex items-start justify-between gap-4">
 <div>
 <h2 className="text-2xl font-bold">Create Meeting</h2>
 <p className="mt-1 text-sm text-muted-foreground">Plan agenda, participants, links, notes, and action items.</p>
 </div>
 <Button onClick={onClose} type="button" variant="outline">
 Close
 </Button>
 </div>

 <div className="grid gap-4 md:grid-cols-2">
 <div className="space-y-2">
 <Label htmlFor="title">Meeting Title</Label>
 <Input id="title" required value={form.title} onChange={(event) => updateField("title", event.target.value)} />
 </div>
 <div className="space-y-2">
 <Label>Type</Label>
 <select className="h-11 w-full rounded-md border bg-background px-3 text-sm" value={form.type} onChange={(event) => updateField("type", event.target.value as MeetingType)}>
 {meetingTypes.map((type) => (
 <option key={type}>{type}</option>
 ))}
 </select>
 </div>
 <div className="space-y-2">
 <Label htmlFor="date">Date</Label>
 <Input id="date" type="date" value={form.date} onChange={(event) => updateField("date", event.target.value)} />
 </div>
 <div className="grid gap-3 sm:grid-cols-2">
 <div className="space-y-2">
 <Label htmlFor="startTime">Start</Label>
 <Input id="startTime" type="time" value={form.startTime} onChange={(event) => updateField("startTime", event.target.value)} />
 </div>
 <div className="space-y-2">
 <Label htmlFor="endTime">End</Label>
 <Input id="endTime" type="time" value={form.endTime} onChange={(event) => updateField("endTime", event.target.value)} />
 </div>
 </div>
 <div className="space-y-2">
 <Label>Organizer</Label>
 <select className="h-11 w-full rounded-md border bg-background px-3 text-sm" value={form.organizer} onChange={(event) => updateField("organizer", event.target.value)}>
 {meetingParticipants.map((participant) => (
 <option key={participant}>{participant}</option>
 ))}
 </select>
 </div>
 <div className="space-y-2">
 <Label htmlFor="participants">Participants</Label>
 <Input
 id="participants"
 placeholder="Priya Sharma, Sneha Joshi"
 value={form.participants.join(", ")}
 onChange={(event) => updateField("participants", parseList(event.target.value))}
 />
 </div>
 <div className="space-y-2 md:col-span-2">
 <Label htmlFor="agenda">Agenda</Label>
 <Input id="agenda" placeholder="Review KPIs, assign owners" value={form.agenda.join(", ")} onChange={(event) => updateField("agenda", parseList(event.target.value))} />
 </div>
 <div className="space-y-2 md:col-span-2">
 <Label htmlFor="notes">Meeting Notes</Label>
 <textarea
 className="min-h-24 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
 id="notes"
 value={form.notes}
 onChange={(event) => updateField("notes", event.target.value)}
 />
 </div>
 <div className="space-y-2">
 <Label htmlFor="actionItems">Action Items</Label>
 <Input id="actionItems" placeholder="Send summary, update roadmap" value={form.actionItems.join(", ")} onChange={(event) => updateField("actionItems", parseList(event.target.value))} />
 </div>
 <div className="space-y-2">
 <Label htmlFor="attachments">Attachments</Label>
 <Input id="attachments" placeholder="agenda.pdf, deck.pptx" value={form.attachments.join(", ")} onChange={(event) => updateField("attachments", parseList(event.target.value))} />
 </div>
 <div className="space-y-2">
 <Label htmlFor="zoomLink">Zoom Link</Label>
 <Input id="zoomLink" placeholder="https://zoom.us/j/..." value={form.zoomLink} onChange={(event) => updateField("zoomLink", event.target.value)} />
 </div>
 <div className="space-y-2">
 <Label htmlFor="googleMeetLink">Google Meet Link</Label>
 <Input id="googleMeetLink" placeholder="https://meet.google.com/..." value={form.googleMeetLink} onChange={(event) => updateField("googleMeetLink", event.target.value)} />
 </div>
 </div>

 <div className="mt-6 flex justify-end gap-3">
 <Button onClick={onClose} type="button" variant="outline">
 Cancel
 </Button>
 <Button type="submit">Create Meeting</Button>
 </div>
 </Dialog>
 );
}

function MeetingCard({
 meeting,
 onStatusChange,
 onToggleAction,
}: {
 meeting: Meeting;
 onStatusChange: (status: MeetingStatus) => void;
 onToggleAction: (id: string) => void;
}) {
 return (
 <Card className="h-full bg-card hover:-translate-y-1 hover:border-primary/35 hover:shadow-glass">
 <CardContent className="space-y-4 p-5">
 <div className="flex items-start justify-between gap-3">
 <div className="min-w-0">
 <p className="text-xs font-semibold text-primary">{meeting.type}</p>
 <h3 className="mt-1 line-clamp-2 font-semibold leading-6">{meeting.title}</h3>
 <p className="mt-1 text-sm text-muted-foreground">
 {meeting.date} - {formatMeetingTime(meeting.startTime, meeting.endTime)}
 </p>
 </div>
 <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", statusClass(meeting.status))}>{meeting.status}</span>
 </div>

 <div className="grid gap-3 text-sm sm:grid-cols-3">
 <Metric label="Organizer" value={meeting.organizer} />
 <Metric label="Participants" value={String(meeting.participants.length)} />
 <Metric label="Actions" value={String(meeting.actionItems.length)} />
 </div>

 <div className="rounded-lg border bg-background p-3">
 <p className="mb-2 flex items-center gap-2 text-xs font-semibold text-muted-foreground">
 <ClipboardList className="h-3.5 w-3.5" />
 Agenda
 </p>
 <div className="space-y-1">
 {meeting.agenda.map((item) => (
 <p className="text-sm text-muted-foreground" key={item}>
 {item}
 </p>
 ))}
 </div>
 </div>

 <div className="rounded-lg border bg-background p-3">
 <p className="mb-2 flex items-center gap-2 text-xs font-semibold text-muted-foreground">
 <ListChecks className="h-3.5 w-3.5" />
 Action Items
 </p>
 <div className="space-y-2">
 {meeting.actionItems.length === 0 && <p className="text-sm text-muted-foreground">No action items</p>}
 {meeting.actionItems.map((item) => (
 <label className="flex cursor-pointer items-start gap-2 text-sm text-muted-foreground" key={item.id}>
 <input checked={item.done} className="mt-1 h-4 w-4 accent-primary" onChange={() => onToggleAction(item.id)} type="checkbox" />
 <span className={cn(item.done && "line-through")}>
 {item.title} - {item.owner}
 </span>
 </label>
 ))}
 </div>
 </div>

 <p className="line-clamp-3 text-sm leading-6 text-muted-foreground">{meeting.notes}</p>

 <div className="flex flex-wrap gap-2">
 {meeting.attachments.map((attachment) => (
 <span className="inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-xs font-semibold text-muted-foreground" key={attachment.name}>
 <FileText className="h-3.5 w-3.5" />
 {attachment.name}
 </span>
 ))}
 </div>

 <div className="grid gap-2 sm:grid-cols-2">
 <Button asChild size="sm" type="button" variant="outline">
 <a href={meeting.zoomLink || "#"} rel="noreferrer" target="_blank">
 <Video className="h-4 w-4" />
 Zoom
 </a>
 </Button>
 <Button asChild size="sm" type="button" variant="outline">
 <a href={meeting.googleMeetLink || "#"} rel="noreferrer" target="_blank">
 <Link2 className="h-4 w-4" />
 Google Meet
 </a>
 </Button>
 </div>

 <select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={meeting.status} onChange={(event) => onStatusChange(event.target.value as MeetingStatus)}>
 {["Scheduled", "In Progress", "Completed", "Cancelled"].map((status) => (
 <option key={status}>{status}</option>
 ))}
 </select>
 </CardContent>
 </Card>
 );
}

function Metric({ label, value }: { label: string; value: string }) {
 return (
 <div className="rounded-lg border bg-background p-3">
 <p className="text-xs text-muted-foreground">{label}</p>
 <p className="mt-1 truncate text-sm font-semibold">{value}</p>
 </div>
 );
}

export function MeetingsPage() {
 const [meetings, setMeetings] = useState(seedMeetings);
 const [search, setSearch] = useState("");
 const [typeFilter, setTypeFilter] = useState("All");
 const [dateFilter, setDateFilter] = useState("All");
 const [isCreating, setIsCreating] = useState(false);
 const stats = getMeetingStats(meetings);

 const filteredMeetings = useMemo(() => {
 const today = "2026-07-18";
 return meetings
 .filter((meeting) => {
 const searchText = `${meeting.title} ${meeting.type} ${meeting.organizer} ${meeting.participants.join(" ")} ${meeting.agenda.join(" ")}`.toLowerCase();
 return searchText.includes(search.toLowerCase());
 })
 .filter((meeting) => typeFilter === "All" || meeting.type === typeFilter)
 .filter((meeting) => {
 if (dateFilter === "Today") return meeting.date === today;
 if (dateFilter === "Upcoming") return meeting.date > today;
 if (dateFilter === "Completed") return meeting.status === "Completed";
 return true;
 })
 .sort((a, b) => `${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`));
 }, [dateFilter, meetings, search, typeFilter]);

 const createMeeting = (input: MeetingFormInput) => {
 setMeetings((current) => [createMeetingFromInput(input), ...current]);
 setIsCreating(false);
 };

 const updateStatus = (id: string, status: MeetingStatus) => {
 setMeetings((current) => current.map((meeting) => (meeting.id === id ? { ...meeting, status } : meeting)));
 };

 const toggleAction = (meetingId: string, actionId: string) => {
 setMeetings((current) =>
 current.map((meeting) =>
 meeting.id === meetingId
 ? {
 ...meeting,
 actionItems: meeting.actionItems.map((item) => (item.id === actionId ? { ...item, done: !item.done } : item)),
 }
 : meeting,
 ),
 );
 };

 const statCards = [
 { label: "Today's Meetings", value: stats.today, icon: CalendarDays },
 { label: "Upcoming Meetings", value: stats.upcoming, icon: Clock3 },
 { label: "Completed Meetings", value: stats.completed, icon: CheckCircle2 },
 ];

 return (
 <main className="min-h-screen bg-enterprise">
 <header className="sticky top-0 z-40 border-b bg-background ">
 <div className="container flex min-h-16 flex-wrap items-center justify-between gap-3 py-3">
 <div>
 <p className="text-sm font-semibold text-primary">Meetings</p>
 <h1 className="text-2xl font-bold">Meeting Management</h1>
 </div>
 <div className="flex items-center gap-2">
 <Button asChild type="button" variant="outline">
 <Link to="/dashboard">Dashboard</Link>
 </Button>
 <ThemeToggle />
 <Button onClick={() => setIsCreating(true)} type="button">
 <Plus className="h-4 w-4" />
 Create Meeting
 </Button>
 </div>
 </div>
 </header>

 <div className="container space-y-6 py-6">
 <div className="grid gap-4 md:grid-cols-3">
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
 <div className="grid gap-3 lg:grid-cols-[1fr_170px_170px]">
 <div className="relative">
 <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
 <Input className="pl-9" placeholder="Search meetings, agenda, participants..." value={search} onChange={(event) => setSearch(event.target.value)} />
 </div>
 <select className="h-11 rounded-md border bg-background px-3 text-sm" value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
 <option>All</option>
 {meetingTypes.map((type) => (
 <option key={type}>{type}</option>
 ))}
 </select>
 <select className="h-11 rounded-md border bg-background px-3 text-sm" value={dateFilter} onChange={(event) => setDateFilter(event.target.value)}>
 <option>All</option>
 <option>Today</option>
 <option>Upcoming</option>
 <option>Completed</option>
 </select>
 </div>
 </CardContent>
 </Card>

 <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
 <section className="grid gap-4 lg:grid-cols-2">
 {filteredMeetings.map((meeting) => (
 <MeetingCard
 key={meeting.id}
 meeting={meeting}
 onStatusChange={(status) => updateStatus(meeting.id, status)}
 onToggleAction={(actionId) => toggleAction(meeting.id, actionId)}
 />
 ))}
 </section>

 <aside className="space-y-4">
 <Card className="glass">
 <CardHeader>
 <CardTitle>Calendar</CardTitle>
 </CardHeader>
 <CardContent className="space-y-3">
 {filteredMeetings.map((meeting) => (
 <div className="rounded-lg border bg-background p-3" key={`${meeting.id}-calendar`}>
 <div className="flex items-start justify-between gap-3">
 <div className="min-w-0">
 <p className="truncate text-sm font-semibold">{meeting.title}</p>
 <p className="mt-1 text-xs text-muted-foreground">
 {meeting.date} - {formatClockTimeString(meeting.startTime)}
 </p>
 </div>
 <ExternalLink className="h-4 w-4 shrink-0 text-primary" />
 </div>
 </div>
 ))}
 </CardContent>
 </Card>
 <Card className="glass">
 <CardHeader>
 <CardTitle>Participants</CardTitle>
 </CardHeader>
 <CardContent className="space-y-2">
 {meetingParticipants.map((participant) => (
 <div className="flex items-center gap-3 rounded-lg border bg-background p-3" key={participant}>
 <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-xs font-bold text-primary">
 {participant
 .split(" ")
 .map((part) => part[0])
 .slice(0, 2)
 .join("")}
 </span>
 <span className="text-sm font-semibold">{participant}</span>
 <UsersRound className="ml-auto h-4 w-4 text-muted-foreground" />
 </div>
 ))}
 </CardContent>
 </Card>
 </aside>
 </div>
 </div>

 {isCreating && <MeetingFormModal onClose={() => setIsCreating(false)} onSubmit={createMeeting} />}
 </main>
 );
}
