import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import {
 Banknote,
 BriefcaseBusiness,
 Building2,
 CalendarDays,
 CheckCircle2,
 ContactRound,
 FileText,
 Handshake,
 Mail,
 Phone,
 Plus,
 Search,
 Target,
 TrendingUp,
 UserCheck,
 UsersRound,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "react-router-dom";
import { ThemeToggle } from "@shared/ui/ThemeToggle";
import { liveSyncIntervalMs, sharedDataChangedEvent } from "@shared/realtime/data-sync";
import { Button } from "@shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@shared/ui/card";
import { Dialog } from "@shared/ui/dialog";
import { Input } from "@shared/ui/input";
import { Label } from "@shared/ui/label";
import { cn } from "@shared/lib/utils";
import {
 companies,
 contacts,
 deals,
 followUps,
 leadSources,
 leadStages,
 meetings,
 opportunities,
 quotes,
 salespeople,
} from "./crm.data";
import { createCrmLead, fetchCrmLeads, updateCrmLead } from "./crm.api";
import { leadFormSchema, type LeadFormValues } from "./crm.schema";
import type { CrmModule, Customer, Lead, LeadFormInput, LeadStage } from "./crm.types";
import { convertLeadToCustomer, formatMoney, getCrmStats, stageClass } from "./crm.utils";

const modules: { id: CrmModule; label: string; icon: LucideIcon }[] = [
 { id: "leads", label: "Leads", icon: Target },
 { id: "customers", label: "Customers", icon: UsersRound },
 { id: "companies", label: "Companies", icon: Building2 },
 { id: "contacts", label: "Contacts", icon: ContactRound },
 { id: "deals", label: "Deals", icon: Handshake },
 { id: "opportunities", label: "Opportunities", icon: TrendingUp },
 { id: "quotes", label: "Quotes", icon: FileText },
 { id: "followUps", label: "Follow Ups", icon: CalendarDays },
 { id: "meetings", label: "Meetings", icon: BriefcaseBusiness },
];

const emptyLeadForm: LeadFormInput = {
 name: "",
 company: "",
 email: "",
 phone: "",
 source: "Website",
 stage: "New",
 value: 0,
 salesperson: salespeople[0],
 nextFollowUp: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
 notes: [],
 attachments: [],
};

function parseList(value: string) {
 return value
 .split(",")
 .map((item) => item.trim())
 .filter(Boolean);
}

function leadsToCustomers(records: Lead[]) {
 return records.filter((lead) => lead.stage === "Won").map(convertLeadToCustomer);
}

function LeadFormModal({
 onClose,
 onSubmit,
}: {
 onClose: () => void;
 onSubmit: (input: LeadFormInput) => void;
}) {
 const {
 control,
 formState: { errors },
 handleSubmit,
 register,
 } = useForm<LeadFormValues>({
 resolver: zodResolver(leadFormSchema),
 defaultValues: emptyLeadForm,
 });

 return (
 <Dialog as="form" className="max-w-4xl" onClose={onClose} onSubmit={handleSubmit(onSubmit)}>
 <div className="mb-6 flex items-start justify-between gap-4">
 <div>
 <h2 className="text-2xl font-bold">Create Lead</h2>
 <p className="mt-1 text-sm text-muted-foreground">Capture the opportunity, owner, notes, and next follow up.</p>
 </div>
 <Button onClick={onClose} type="button" variant="outline">
 Close
 </Button>
 </div>

 <div className="grid gap-4 md:grid-cols-2">
 <div className="space-y-2">
 <Label htmlFor="leadName">Lead Name</Label>
 <Input id="leadName" className={cn(errors.name && "border-destructive focus-visible:ring-destructive/20")} {...register("name")} />
 {errors.name && <p className="text-xs font-medium text-destructive">{errors.name.message}</p>}
 </div>
 <div className="space-y-2">
 <Label htmlFor="company">Company</Label>
 <Input id="company" className={cn(errors.company && "border-destructive focus-visible:ring-destructive/20")} {...register("company")} />
 {errors.company && <p className="text-xs font-medium text-destructive">{errors.company.message}</p>}
 </div>
 <div className="space-y-2">
 <Label htmlFor="email">Email</Label>
 <Input id="email" type="email" className={cn(errors.email && "border-destructive focus-visible:ring-destructive/20")} {...register("email")} />
 {errors.email && <p className="text-xs font-medium text-destructive">{errors.email.message}</p>}
 </div>
 <div className="space-y-2">
 <Label htmlFor="phone">Phone</Label>
 <Input id="phone" {...register("phone")} />
 </div>
 <div className="space-y-2">
 <Label>Source</Label>
 <select className="h-11 w-full rounded-md border bg-background px-3 text-sm" {...register("source")}>
 {leadSources.map((source) => (
 <option key={source}>{source}</option>
 ))}
 </select>
 </div>
 <div className="space-y-2">
 <Label>Stage</Label>
 <select className="h-11 w-full rounded-md border bg-background px-3 text-sm" {...register("stage")}>
 {leadStages.map((stage) => (
 <option key={stage}>{stage}</option>
 ))}
 </select>
 </div>
 <div className="space-y-2">
 <Label>Salesperson</Label>
 <select className="h-11 w-full rounded-md border bg-background px-3 text-sm" {...register("salesperson")}>
 {salespeople.map((person) => (
 <option key={person}>{person}</option>
 ))}
 </select>
 </div>
 <div className="space-y-2">
 <Label htmlFor="value">Deal Value</Label>
 <Input
 id="value"
 min={0}
 type="number"
 className={cn(errors.value && "border-destructive focus-visible:ring-destructive/20")}
 {...register("value", { valueAsNumber: true })}
 />
 {errors.value && <p className="text-xs font-medium text-destructive">{errors.value.message}</p>}
 </div>
 <div className="space-y-2">
 <Label htmlFor="nextFollowUp">Next Follow Up</Label>
 <Input id="nextFollowUp" type="date" {...register("nextFollowUp")} />
 </div>
 <div className="space-y-2">
 <Label htmlFor="attachments">Attachments</Label>
 <Controller
 control={control}
 name="attachments"
 render={({ field }) => (
 <Input
 id="attachments"
 placeholder="proposal.pdf, notes.docx"
 value={field.value.map((item) => item.name).join(", ")}
 onChange={(event) =>
 field.onChange(parseList(event.target.value).map((name) => ({ name, type: "File", size: "Pending" })))
 }
 />
 )}
 />
 </div>
 <div className="space-y-2 md:col-span-2">
 <Label htmlFor="notes">Notes</Label>
 <Controller
 control={control}
 name="notes"
 render={({ field }) => (
 <Input
 id="notes"
 placeholder="Budget confirmed, wants demo"
 value={field.value.join(", ")}
 onChange={(event) => field.onChange(parseList(event.target.value))}
 />
 )}
 />
 </div>
 </div>

 <div className="mt-6 flex justify-end gap-3">
 <Button onClick={onClose} type="button" variant="outline">
 Cancel
 </Button>
 <Button type="submit">Create Lead</Button>
 </div>
 </Dialog>
 );
}

function LeadCard({
 lead,
 onAssign,
 onConvert,
 onStageChange,
}: {
 lead: Lead;
 onAssign: (salesperson: string) => void;
 onConvert: () => void;
 onStageChange: (stage: LeadStage) => void;
}) {
 return (
 <Card className="bg-background hover:-translate-y-1 hover:border-primary/35 hover:shadow-glass">
 <CardContent className="space-y-4 p-4">
 <div className="flex items-start justify-between gap-3">
 <div className="min-w-0">
 <p className="text-xs font-semibold text-primary">{lead.leadCode}</p>
 <h3 className="mt-1 truncate font-semibold">{lead.name}</h3>
 <p className="mt-1 text-sm text-muted-foreground">{lead.company}</p>
 </div>
 <span className={cn("shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold", stageClass(lead.stage))}>{lead.stage}</span>
 </div>
 <div className="grid gap-2 text-sm sm:grid-cols-2">
 <p className="flex min-w-0 items-center gap-2 text-muted-foreground">
 <Mail className="h-4 w-4 shrink-0" />
 <span className="truncate">{lead.email}</span>
 </p>
 <p className="flex min-w-0 items-center gap-2 text-muted-foreground">
 <Phone className="h-4 w-4 shrink-0" />
 <span className="truncate">{lead.phone}</span>
 </p>
 </div>
 <div className="grid gap-3 text-sm sm:grid-cols-3">
 <Metric label="Value" value={formatMoney(lead.value)} />
 <Metric label="Owner" value={lead.salesperson} />
 <Metric label="Follow Up" value={lead.nextFollowUp} />
 </div>
 <div className="rounded-lg border bg-card p-3">
 <p className="text-xs font-semibold text-muted-foreground">Notes</p>
 <div className="mt-2 flex flex-wrap gap-2">
 {lead.notes.map((note) => (
 <span className="rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground" key={note}>
 {note}
 </span>
 ))}
 </div>
 </div>
 <div className="grid gap-2 sm:grid-cols-2">
 <select className="h-10 rounded-md border bg-background px-3 text-sm" value={lead.stage} onChange={(event) => onStageChange(event.target.value as LeadStage)}>
 {leadStages.map((stage) => (
 <option key={stage}>{stage}</option>
 ))}
 </select>
 <select className="h-10 rounded-md border bg-background px-3 text-sm" value={lead.salesperson} onChange={(event) => onAssign(event.target.value)}>
 {salespeople.map((person) => (
 <option key={person}>{person}</option>
 ))}
 </select>
 </div>
 <div className="flex flex-wrap gap-2">
 <Button onClick={onConvert} size="sm" type="button">
 <UserCheck className="h-4 w-4" />
 Convert
 </Button>
 <Button size="sm" type="button" variant="outline">
 <FileText className="h-4 w-4" />
 {lead.attachments.length} Files
 </Button>
 </div>
 </CardContent>
 </Card>
 );
}

function Metric({ label, value }: { label: string; value: string }) {
 return (
 <div className="rounded-lg border bg-card p-3">
 <p className="text-xs text-muted-foreground">{label}</p>
 <p className="mt-1 truncate text-sm font-semibold">{value}</p>
 </div>
 );
}

function ActivityTimeline({ lead }: { lead: Lead }) {
 return (
 <Card className="glass">
 <CardHeader>
 <CardTitle>Activity Timeline</CardTitle>
 </CardHeader>
 <CardContent className="space-y-3">
 {lead.activityTimeline.map((activity) => (
 <div className="rounded-lg border bg-background p-4" key={activity.id}>
 <div className="flex items-start gap-3">
 <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
 <div>
 <p className="text-sm font-semibold">{activity.title}</p>
 <p className="mt-1 text-sm text-muted-foreground">{activity.detail}</p>
 <p className="mt-2 text-xs text-muted-foreground">{activity.time}</p>
 </div>
 </div>
 </div>
 ))}
 </CardContent>
 </Card>
 );
}

function EmptyState({ message }: { message: string }) {
 return (
 <Card className="glass">
 <CardContent className="p-8 text-center text-sm text-muted-foreground">{message}</CardContent>
 </Card>
 );
}

function DataGrid({ emptyMessage = "No live records found.", rows, title }: { emptyMessage?: string; rows: string[][]; title: string }) {
 return (
 <Card className="glass overflow-hidden">
 <CardHeader>
 <CardTitle>{title}</CardTitle>
 </CardHeader>
 <CardContent className="space-y-3">
 {rows.length === 0 && <p className="rounded-lg border bg-background p-4 text-sm text-muted-foreground">{emptyMessage}</p>}
 {rows.map((row) => (
 <div className="grid gap-2 rounded-lg border bg-background p-4 text-sm md:grid-cols-4" key={row.join("-")}>
 {row.map((item, index) => (
 <span className={cn(index === 0 ? "font-semibold" : "text-muted-foreground")} key={`${item}-${index}`}>
 {item}
 </span>
 ))}
 </div>
 ))}
 </CardContent>
 </Card>
 );
}

export function CrmPage() {
 const [leads, setLeads] = useState<Lead[]>([]);
 const [customers, setCustomers] = useState<Customer[]>([]);
 const [activeModule, setActiveModule] = useState<CrmModule>("leads");
 const [search, setSearch] = useState("");
 const [isCreatingLead, setIsCreatingLead] = useState(false);
 const [selectedLeadId, setSelectedLeadId] = useState("");
 const [loadingLeads, setLoadingLeads] = useState(true);
 const [leadAccess, setLeadAccess] = useState<"ok" | "forbidden" | "error">("ok");
 const loadSequenceRef = useRef(0);

 const loadLeads = useCallback(async ({ silent = false }: { silent?: boolean } = {}) => {
 const requestId = loadSequenceRef.current + 1;
 loadSequenceRef.current = requestId;
 if (!silent) setLoadingLeads(true);
 const result = await fetchCrmLeads();
 if (requestId !== loadSequenceRef.current) return;

 if (result.status === "ok") {
 setLeads(result.data);
 setCustomers(leadsToCustomers(result.data));
 setSelectedLeadId((current) => current || result.data[0]?.id || "");
 setLeadAccess("ok");
 } else {
 setLeads([]);
 setCustomers([]);
 setLeadAccess(result.status);
 }
 setLoadingLeads(false);
 }, []);

 useEffect(() => {
 let active = true;
 const refreshIfActive = () => {
 if (!active) return;
 void loadLeads({ silent: true });
 };

 void loadLeads();
 const intervalId = window.setInterval(refreshIfActive, liveSyncIntervalMs);
 window.addEventListener("focus", refreshIfActive);
 window.addEventListener(sharedDataChangedEvent, refreshIfActive);
 document.addEventListener("visibilitychange", refreshIfActive);
 return () => {
 active = false;
 loadSequenceRef.current += 1;
 window.clearInterval(intervalId);
 window.removeEventListener("focus", refreshIfActive);
 window.removeEventListener(sharedDataChangedEvent, refreshIfActive);
 document.removeEventListener("visibilitychange", refreshIfActive);
 };
 }, [loadLeads]);

 const selectedLead = leads.find((lead) => lead.id === selectedLeadId) ?? leads[0];
 const filteredLeads = useMemo(
 () =>
 leads.filter((lead) =>
 `${lead.name} ${lead.company} ${lead.email} ${lead.source} ${lead.stage} ${lead.salesperson}`.toLowerCase().includes(search.toLowerCase()),
 ),
 [leads, search],
 );
 const stats = getCrmStats(leads, customers);

 const createLead = async (input: LeadFormInput) => {
 const result = await createCrmLead(input);
 if (result.status !== "ok") {
 setLeadAccess(result.status);
 return;
 }
 const nextLeads = [result.data, ...leads.filter((lead) => lead.id !== result.data.id)];
 setLeads(nextLeads);
 setCustomers(leadsToCustomers(nextLeads));
 setSelectedLeadId(result.data.id);
 setLeadAccess("ok");
 setIsCreatingLead(false);
 };

 const updateLead = async (id: string, update: Partial<Lead>) => {
 const currentLead = leads.find((lead) => lead.id === id);
 if (!currentLead) return;
 const result = await updateCrmLead(id, { ...currentLead, ...update });
 if (result.status !== "ok") {
 setLeadAccess(result.status);
 return;
 }
 const nextLeads = leads.map((lead) => (lead.id === id ? result.data : lead));
 setLeads(nextLeads);
 setCustomers(leadsToCustomers(nextLeads));
 setLeadAccess("ok");
 };

 const convertLead = (lead: Lead) => {
 void updateLead(lead.id, { stage: "Won" });
 };

 const statCards = [
 { label: "Total Customers", value: stats.customers, icon: UsersRound },
 { label: "Leads", value: stats.leads, icon: Target },
 { label: "Revenue", value: formatMoney(stats.revenue), icon: Banknote },
 { label: "Conversion Rate", value: `${stats.conversionRate}%`, icon: TrendingUp },
 ];

 return (
 <main className="min-h-screen bg-enterprise">
 <header className="sticky top-0 z-40 border-b bg-background ">
 <div className="container flex min-h-16 flex-wrap items-center justify-between gap-3 py-3">
 <div>
 <p className="text-sm font-semibold text-primary">CRM</p>
 <h1 className="text-2xl font-bold">Customer Relationship Management</h1>
 </div>
 <div className="flex items-center gap-2">
 <Button asChild type="button" variant="outline">
 <Link to="/dashboard">Dashboard</Link>
 </Button>
 <ThemeToggle />
 <Button onClick={() => setIsCreatingLead(true)} type="button">
 <Plus className="h-4 w-4" />
 Create Lead
 </Button>
 </div>
 </div>
 </header>

 <div className="container space-y-6 py-6">
 <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
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
 <div className="relative">
 <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
 <Input className="pl-9" placeholder="Search leads, customers, companies, owners..." value={search} onChange={(event) => setSearch(event.target.value)} />
 </div>
 <div className="flex gap-2 overflow-x-auto pb-1">
 {modules.map((module) => {
 const Icon = module.icon;
 return (
 <Button
 className="shrink-0"
 key={module.id}
 onClick={() => setActiveModule(module.id)}
 type="button"
 variant={activeModule === module.id ? "default" : "outline"}
 >
 <Icon className="h-4 w-4" />
 {module.label}
 </Button>
 );
 })}
 </div>
 </CardContent>
 </Card>

 <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
 <section className="min-w-0">
 {activeModule === "leads" && (
 <div className="grid gap-4 lg:grid-cols-2">
 {loadingLeads && <EmptyState message="Loading live leads from the backend..." />}
 {!loadingLeads && leadAccess === "forbidden" && <EmptyState message="Your role does not have access to live CRM leads yet." />}
 {!loadingLeads && leadAccess === "error" && <EmptyState message="Could not load live CRM leads from the backend. Please try again." />}
 {!loadingLeads && leadAccess === "ok" && filteredLeads.length === 0 && <EmptyState message="No live leads found." />}
 {!loadingLeads && leadAccess === "ok" && filteredLeads.map((lead) => (
 <div className="cursor-pointer" key={lead.id} onClick={() => setSelectedLeadId(lead.id)}>
 <LeadCard
 lead={lead}
 onAssign={(salesperson) => void updateLead(lead.id, { salesperson })}
 onConvert={() => convertLead(lead)}
 onStageChange={(stage) => void updateLead(lead.id, { stage })}
 />
 </div>
 ))}
 </div>
 )}
 {activeModule === "customers" && (
 <DataGrid
 emptyMessage="No won live leads have been converted into customers yet."
 title="Customers"
 rows={customers.map((customer) => [customer.name, customer.company, customer.owner, `${formatMoney(customer.revenue)} - ${customer.health}`])}
 />
 )}
 {activeModule === "companies" && (
 <DataGrid title="Companies" rows={companies.map((company) => [company.name, company.industry, `${company.employees} employees`, formatMoney(company.revenue)])} />
 )}
 {activeModule === "contacts" && (
 <DataGrid title="Contacts" rows={contacts.map((contact) => [contact.name, contact.role, contact.company, contact.email])} />
 )}
 {activeModule === "deals" && (
 <DataGrid title="Deals" rows={deals.map((deal) => [deal.name, deal.company, deal.stage, `${formatMoney(deal.value)} closes ${deal.closeDate}`])} />
 )}
 {activeModule === "opportunities" && (
 <DataGrid title="Opportunities" rows={opportunities.map((opportunity) => [opportunity.name, opportunity.company, opportunity.owner, formatMoney(opportunity.value)])} />
 )}
 {activeModule === "quotes" && (
 <DataGrid title="Quotes" rows={quotes.map((quote) => [quote.quoteNo, quote.customer, quote.status, `${formatMoney(quote.amount)} until ${quote.validUntil}`])} />
 )}
 {activeModule === "followUps" && (
 <DataGrid title="Follow Ups" rows={followUps.map((followUp) => [followUp.leadName, followUp.owner, followUp.channel, `${followUp.date} - ${followUp.status}`])} />
 )}
 {activeModule === "meetings" && (
 <DataGrid title="Meetings" rows={meetings.map((meeting) => [meeting.title, meeting.account, meeting.owner, `${meeting.date} at ${meeting.time}`])} />
 )}
 </section>

 <aside className="space-y-4">
 {selectedLead && (
 <>
 <Card className="glass">
 <CardHeader>
 <CardTitle>Lead Snapshot</CardTitle>
 </CardHeader>
 <CardContent className="space-y-3">
 <Metric label="Lead" value={selectedLead.name} />
 <Metric label="Company" value={selectedLead.company} />
 <Metric label="Stage" value={selectedLead.stage} />
 <Metric label="Salesperson" value={selectedLead.salesperson} />
 <Metric label="Value" value={formatMoney(selectedLead.value)} />
 </CardContent>
 </Card>
 <ActivityTimeline lead={selectedLead} />
 </>
 )}
 </aside>
 </div>
 </div>

 {isCreatingLead && <LeadFormModal onClose={() => setIsCreatingLead(false)} onSubmit={createLead} />}
 </main>
 );
}
