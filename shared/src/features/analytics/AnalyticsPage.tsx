import { useEffect, useState } from "react";
import {
 BarChart3,
 CheckCircle2,
 ContactRound,
 FolderKanban,
 TrendingUp,
 UsersRound,
 WalletCards,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ThemeToggle } from "@shared/ui/ThemeToggle";
import { Button } from "@shared/ui/button";
import { Card, CardContent } from "@shared/ui/card";
import { fetchOverviewAnalytics, fetchSalesAnalytics, type OverviewAnalytics, type SalesAnalytics } from "./analytics.api";
import { AnalyticsCard } from "./components/AnalyticsCard";

const chartColors = {
 primary: "hsl(var(--primary))",
 success: "rgb(16 185 129)",
 muted: "hsl(var(--muted-foreground))",
};

export function AnalyticsPage() {
 const [overview, setOverview] = useState<OverviewAnalytics | null>(null);
 const [sales, setSales] = useState<SalesAnalytics | null>(null);
 const [salesAccess, setSalesAccess] = useState<"ok" | "forbidden" | "error">("ok");

 useEffect(() => {
 let cancelled = false;

 async function load() {
 const [overviewResult, salesResult] = await Promise.all([fetchOverviewAnalytics(), fetchSalesAnalytics()]);
 if (cancelled) return;

 if (overviewResult.status === "ok") {
 setOverview(overviewResult.data);
 }
 setSalesAccess(salesResult.status);
 if (salesResult.status === "ok") {
 setSales(salesResult.data);
 }
 }

 void load();
 return () => {
 cancelled = true;
 };
 }, []);

 const kpis = [
 { label: "Active Projects", value: overview ? String(overview.projects.active) : "—", change: overview ? `${overview.projects.delayed} delayed` : "Loading…", icon: FolderKanban },
 { label: "Task Completion", value: overview ? `${overview.tasks.completionRate}%` : "—", change: overview ? `${overview.tasks.overdue} overdue` : "Loading…", icon: CheckCircle2 },
 { label: "Employees", value: overview ? String(overview.employees.active) : "—", change: overview ? "Active" : "Loading…", icon: UsersRound },
 { label: "Pipeline Value", value: sales ? `$${Math.round(sales.pipelineValue / 1000)}K` : "—", change: sales ? `${sales.winRate}% win rate` : salesAccess === "forbidden" ? "No access" : "Loading…", icon: WalletCards },
 ];

 return (
 <main className="min-h-screen bg-enterprise">
 <header className="sticky top-0 z-40 border-b bg-background ">
 <div className="container flex min-h-16 flex-wrap items-center justify-between gap-3 py-3">
 <div>
 <p className="text-sm font-semibold text-primary">Analytics</p>
 <h1 className="text-2xl font-bold">Business Analytics Dashboard</h1>
 </div>
 <div className="flex items-center gap-2">
 <Button asChild type="button" variant="outline">
 <Link to="/dashboard">Dashboard</Link>
 </Button>
 <ThemeToggle />
 </div>
 </div>
 </header>

 <div className="container space-y-6 py-6">
 <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
 {kpis.map((kpi, index) => {
 const Icon = kpi.icon;
 return (
 <Card className="glass h-full" key={kpi.label}>
 <CardContent className="p-5">
 <Icon className="mb-4 h-5 w-5 text-primary" />
 <p className="text-sm text-muted-foreground">{kpi.label}</p>
 <p className="mt-2 text-3xl font-bold">{kpi.value}</p>
 <p className="mt-3 text-sm font-semibold text-emerald-600 dark:text-emerald-300">{kpi.change}</p>
 </CardContent>
 </Card>
 );
 })}
 </div>

 <div className="grid gap-4 xl:grid-cols-2">
 <AnalyticsCard icon={BarChart3} subtitle="Task volume by status, from live project data." title="Tasks by Status">
 {overview && overview.tasks.byStatus.length > 0 ? (
 <ResponsiveContainer height="100%" width="100%">
 <BarChart data={overview.tasks.byStatus}>
 <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
 <XAxis dataKey="status" stroke={chartColors.muted} tickLine={false} />
 <YAxis stroke={chartColors.muted} tickLine={false} />
 <Tooltip />
 <Bar dataKey="count" fill={chartColors.primary} name="Tasks" radius={[6, 6, 0, 0]} />
 </BarChart>
 </ResponsiveContainer>
 ) : (
 <p className="flex h-full items-center justify-center text-sm text-muted-foreground">No task data yet.</p>
 )}
 </AnalyticsCard>

 <AnalyticsCard icon={ContactRound} subtitle="Lead pipeline by stage, from live CRM data." title="Leads by Status">
 {salesAccess === "forbidden" ? (
 <p className="flex h-full items-center justify-center text-sm text-muted-foreground">Your role does not have access to sales data.</p>
 ) : sales && sales.byStatus.length > 0 ? (
 <ResponsiveContainer height="100%" width="100%">
 <BarChart data={sales.byStatus}>
 <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
 <XAxis dataKey="status" stroke={chartColors.muted} tickLine={false} />
 <YAxis stroke={chartColors.muted} tickLine={false} />
 <Tooltip />
 <Bar dataKey="count" fill={chartColors.success} name="Leads" radius={[6, 6, 0, 0]} />
 </BarChart>
 </ResponsiveContainer>
 ) : (
 <p className="flex h-full items-center justify-center text-sm text-muted-foreground">No lead data yet.</p>
 )}
 </AnalyticsCard>
 </div>

 <div className="grid gap-4 sm:grid-cols-3">
 <Card className="glass">
 <CardContent className="flex items-center justify-between gap-4 p-5">
 <div>
 <p className="text-sm text-muted-foreground">Total Projects</p>
 <p className="mt-2 text-3xl font-bold">{overview ? overview.projects.total : "—"}</p>
 </div>
 <FolderKanban className="h-8 w-8 text-primary" />
 </CardContent>
 </Card>
 <Card className="glass">
 <CardContent className="flex items-center justify-between gap-4 p-5">
 <div>
 <p className="text-sm text-muted-foreground">Total Tasks</p>
 <p className="mt-2 text-3xl font-bold">{overview ? overview.tasks.total : "—"}</p>
 </div>
 <CheckCircle2 className="h-8 w-8 text-primary" />
 </CardContent>
 </Card>
 <Card className="glass">
 <CardContent className="flex items-center justify-between gap-4 p-5">
 <div>
 <p className="text-sm text-muted-foreground">Total Employees</p>
 <p className="mt-2 text-3xl font-bold">{overview ? overview.employees.total : "—"}</p>
 </div>
 <UsersRound className="h-8 w-8 text-primary" />
 </CardContent>
 </Card>
 </div>

 {sales && (
 <Card className="glass">
 <CardContent className="flex flex-wrap items-center justify-between gap-4 p-5">
 <div>
 <p className="text-sm text-muted-foreground">Win Rate</p>
 <p className="mt-2 text-3xl font-bold">{sales.winRate}%</p>
 </div>
 <div>
 <p className="text-sm text-muted-foreground">Won Value</p>
 <p className="mt-2 text-3xl font-bold">${Math.round(sales.wonValue / 1000)}K</p>
 </div>
 <TrendingUp className="h-8 w-8 text-primary" />
 </CardContent>
 </Card>
 )}
 </div>
 </main>
 );
}
