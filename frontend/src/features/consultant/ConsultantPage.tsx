import { motion } from "framer-motion";
import {
  ArrowLeft,
  BarChart3,
  BrainCircuit,
  Download,
  Eye,
  FileBarChart,
  FileText,
  FolderKanban,
  HeartPulse,
  Plus,
  RefreshCcw,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  Trash2,
  TrendingUp,
  UsersRound,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { useConfirm } from "@/components/ui/confirm-dialog-context";
import { useToast } from "@/components/ui/toast-context";
import { getStoredAuthSession } from "@/features/auth/auth-service";
import { cn } from "@/lib/utils";
import type {
  ConsultantMetric,
  ConsultantRecommendation,
  ConsultantReport,
  ConsultantSection,
  ConsultantSummaryPeriod,
  ConsultantView,
} from "./consultant.types";

const viteEnv = (import.meta as unknown as { env?: Record<string, string | undefined> }).env;
const apiBase = viteEnv?.VITE_API_BASE_URL ?? "http://127.0.0.1:5000/api/v1";

const analysisTypes = [
  { value: "business_health", label: "Business Health", icon: HeartPulse, description: "Overall business health analysis" },
  { value: "swot", label: "SWOT Analysis", icon: Target, description: "Strengths, Weaknesses, Opportunities, Threats" },
  { value: "revenue", label: "Revenue Analysis", icon: TrendingUp, description: "Revenue trends and projections" },
  { value: "expense", label: "Expense Analysis", icon: FileText, description: "Expense breakdown and optimization" },
  { value: "sales", label: "Sales Analysis", icon: BarChart3, description: "Sales trends and customer insights" },
  { value: "project", label: "Project Analysis", icon: FolderKanban, description: "Project performance and risks" },
  { value: "employee", label: "Employee Analysis", icon: UsersRound, description: "Performance and productivity" },
  { value: "risk", label: "Risk Detection", icon: ShieldCheck, description: "Business and project risks" },
  { value: "suggestion", label: "Business Suggestions", icon: Sparkles, description: "AI-powered recommendations" },
  { value: "summary", label: "Executive Summary", icon: FileBarChart, description: "Comprehensive business summary" },
] as const;

const periods = ["daily", "weekly", "monthly", "quarterly", "annual"] as const;

type AnalysisType = typeof analysisTypes[number]["value"];

function getConfidenceColor(confidence: number) {
  if (confidence >= 80) return "text-emerald-600 dark:text-emerald-300";
  if (confidence >= 50) return "text-amber-600 dark:text-amber-300";
  return "text-red-600 dark:text-red-300";
}

function getConfidenceLabel(confidence: number) {
  if (confidence >= 80) return "High";
  if (confidence >= 50) return "Medium";
  return "Low";
}

function getPriorityColor(priority: string) {
  switch (priority) {
    case "high": return "border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-300";
    case "medium": return "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-300";
    case "low": return "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300";
    default: return "border-primary/30 bg-primary/10 text-primary";
  }
}

function MetricCard({ metric, index }: { metric: ConsultantMetric; index: number }) {
  return (
    <motion.div animate={{ opacity: 1, y: 0 }} initial={{ opacity: 0, y: 16 }} transition={{ delay: index * 0.04 }}>
      <Card className="glass h-full">
        <CardContent className="p-5">
          <p className="text-sm text-muted-foreground">{metric.label}</p>
          <p className="mt-2 text-3xl font-bold">{metric.value}</p>
          {metric.change && (
            <p className="mt-3 text-sm font-semibold text-emerald-600 dark:text-emerald-300">{metric.change}</p>
          )}
          <div className="mt-3 flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Source: {metric.source}</span>
            <span className={cn("font-semibold", getConfidenceColor(metric.confidence))}>
              {metric.confidence}% confidence
            </span>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function SectionCard({ section, index }: { section: ConsultantSection; index: number }) {
  return (
    <motion.div animate={{ opacity: 1, y: 0 }} initial={{ opacity: 0, y: 16 }} transition={{ delay: index * 0.04 }}>
      <Card className="glass h-full">
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="text-base">{section.title}</CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">
                Sources: {section.sourceModules.join(", ") || "None"}
              </p>
            </div>
            <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", getConfidenceColor(section.confidence))}>
              {getConfidenceLabel(section.confidence)} ({section.confidence}%)
            </span>
          </div>
        </CardHeader>
        <CardContent>
          <p className="whitespace-pre-wrap text-sm leading-7 text-muted-foreground">{section.content}</p>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function RecommendationCard({ recommendation, index }: { recommendation: ConsultantRecommendation; index: number }) {
  return (
    <motion.div animate={{ opacity: 1, y: 0 }} initial={{ opacity: 0, y: 16 }} transition={{ delay: index * 0.04 }}>
      <Card className="glass h-full">
        <CardContent className="p-5">
          <div className="flex items-start gap-3">
            <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize", getPriorityColor(recommendation.priority))}>
              {recommendation.priority}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-primary capitalize">{recommendation.category.replace(/_/g, " ")}</p>
              <p className="mt-2 text-sm leading-6">{recommendation.action}</p>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                <div>
                  <p className="font-semibold">Impact</p>
                  <p>{recommendation.impact}</p>
                </div>
                <div>
                  <p className="font-semibold">Effort</p>
                  <p>{recommendation.effort}</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function GenerateModal({ onClose, onGenerated }: { onClose: () => void; onGenerated: (report: ConsultantReport) => void }) {
  const [type, setType] = useState<AnalysisType>("business_health");
  const [period, setPeriod] = useState<ConsultantSummaryPeriod>("monthly");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const selectedType = analysisTypes.find((t) => t.value === type);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${apiBase}/consultant/analyze`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getStoredAuthSession()?.accessToken}`,
        },
        body: JSON.stringify({ type, period, includeModules: ["users", "projects", "workflows", "ai-config"] }),
      });
      if (!response.ok) throw new Error("Failed to generate analysis");
      const json = await response.json();
      const report = json.data as ConsultantReport;
      onGenerated(report);
      toast({ title: "Analysis generated", description: `${report.title} is ready.`, type: "success" });
      onClose();
    } catch (error) {
      toast({ title: "Generation failed", description: error instanceof Error ? error.message : "Unknown error", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/35 p-4 backdrop-blur-sm">
      <motion.div animate={{ opacity: 1, scale: 1 }} className="w-full max-w-2xl rounded-lg border bg-background p-6 shadow-glass" initial={{ opacity: 0, scale: 0.96 }}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">Generate Business Analysis</h2>
            <p className="mt-1 text-sm text-muted-foreground">Select analysis type and period to generate AI-powered insights.</p>
          </div>
          <Button onClick={onClose} type="button" variant="outline"><X className="h-4 w-4" /></Button>
        </div>

        <div className="mt-6 space-y-6">
          <div className="space-y-3">
            <Label>Analysis Type</Label>
            <div className="grid gap-3 sm:grid-cols-2">
              {analysisTypes.map((t) => {
                const Icon = t.icon;
                const isSelected = type === t.value;
                return (
                  <button
                    className={cn("flex items-start gap-3 rounded-xl border p-4 text-left transition-all", isSelected ? "border-primary/60 bg-primary/5 shadow-lg shadow-primary/10" : "bg-background/65 hover:border-primary/40")}
                    key={t.value}
                    onClick={() => setType(t.value)}
                    type="button"
                  >
                    <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg", isSelected ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground")}>
                      <Icon className="h-5 w-5" />
                    </span>
                    <span>
                      <span className="block text-sm font-semibold">{t.label}</span>
                      <span className="block truncate text-xs text-muted-foreground">{t.description}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Period</Label>
            <div className="flex flex-wrap gap-2">
              {periods.map((p) => (
                <Button key={p} onClick={() => setPeriod(p)} type="button" variant={period === p ? "default" : "outline"} className="capitalize">
                  {p}
                </Button>
              ))}
            </div>
          </div>

          <div className="rounded-xl border bg-background/65 p-4">
            <p className="text-xs font-semibold text-muted-foreground">DATA SOURCES</p>
            <p className="mt-2 text-sm">This analysis uses real data from Users, Projects, Workflows, and AI Configuration modules. Modules without backend models will be marked as unavailable.</p>
          </div>

          <div className="flex justify-end gap-3">
            <Button onClick={onClose} type="button" variant="outline">Cancel</Button>
            <Button disabled={loading} onClick={handleGenerate} type="submit">
              {loading ? <RefreshCcw className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Generate Analysis
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function ReportDetailModal({ report, onClose }: { report: ConsultantReport; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/35 p-4 backdrop-blur-sm">
      <motion.div animate={{ opacity: 1, scale: 1 }} className="flex h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-lg border bg-background shadow-glass" initial={{ opacity: 0, scale: 0.96 }}>
        <div className="flex items-center justify-between border-b p-5">
          <div>
            <h2 className="text-2xl font-bold">{report.title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{new Date(report.createdAt).toLocaleString()}</p>
          </div>
          <Button onClick={onClose} type="button" variant="outline"><X className="h-4 w-4" />Close</Button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          <div className="grid gap-6 xl:grid-cols-3">
            <div className="xl:col-span-2 space-y-6">
              <Card className="glass">
                <CardHeader>
                  <CardTitle className="text-base">Executive Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="whitespace-pre-wrap text-sm leading-7">{report.summary}</p>
                </CardContent>
              </Card>

              <div>
                <h3 className="mb-4 text-lg font-semibold">Key Metrics</h3>
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {report.metrics.map((metric, i) => (
                    <MetricCard key={metric.label} metric={metric} index={i} />
                  ))}
                </div>
              </div>

              <div>
                <h3 className="mb-4 text-lg font-semibold">Analysis Sections</h3>
                <div className="grid gap-4 xl:grid-cols-2">
                  {report.sections.map((section, i) => (
                    <SectionCard key={section.title} section={section} index={i} />
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <Card className="glass">
                <CardHeader>
                  <CardTitle className="text-base">Data Sources</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {report.dataSources.map((source) => (
                    <div className="flex items-center justify-between rounded-xl border bg-background/65 p-3" key={source.module}>
                      <div>
                        <p className="text-sm font-semibold capitalize">{source.module}</p>
                        <p className="text-xs text-muted-foreground">{source.recordCount} records</p>
                      </div>
                      <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", source.available ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300" : "bg-red-500/10 text-red-600 dark:text-red-300")}>
                        {source.available ? "Available" : "Unavailable"}
                      </span>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="glass">
                <CardHeader>
                  <CardTitle className="text-base">Recommendations</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {report.recommendations.map((rec, i) => (
                    <RecommendationCard key={rec.action} recommendation={rec} index={i} />
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export function ConsultantPage() {
  const { confirm } = useConfirm();
  const { toast } = useToast();
  const session = useMemo(() => getStoredAuthSession(), []);
  const [view, setView] = useState<ConsultantView>("dashboard");
  const [reports, setReports] = useState<ConsultantReport[]>([]);
  const [recentReports, setRecentReports] = useState<ConsultantReport[]>([]);
  const [selectedReport, setSelectedReport] = useState<ConsultantReport | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  const loadReports = useCallback(async () => {
    setLoading(true);
    try {
      const [listRes, recentRes] = await Promise.all([
        fetch(`${apiBase}/consultant/?limit=50`),
        fetch(`${apiBase}/consultant/recent`),
      ]);
      if (listRes.ok) {
        const json = await listRes.json();
        setReports(json.data.items || []);
      }
      if (recentRes.ok) {
        const json = await recentRes.json();
        setRecentReports(json.data || []);
      }
    } catch {
      toast({ title: "Failed to load reports", type: "error" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (session?.accessToken) {
      void loadReports();
    }
  }, [loadReports, session]);

  const filteredReports = useMemo(() => {
    return reports
      .filter((report) => {
        const searchText = `${report.title} ${report.summary} ${report.type}`.toLowerCase();
        return searchText.includes(search.toLowerCase());
      })
      .filter((report) => typeFilter === "all" || report.type === typeFilter);
  }, [reports, search, typeFilter]);

  const handleGenerated = (report: ConsultantReport) => {
    setReports((current) => [report, ...current]);
    setRecentReports((current) => [report, ...current].slice(0, 5));
    setView("reports");
  };

  const handleDelete = async (id: string) => {
    const accepted = await confirm({ title: "Delete report?", description: "This report will be permanently removed.", confirmLabel: "Delete", tone: "danger" });
    if (!accepted) return;
    try {
      await fetch(`${apiBase}/consultant/${id}`, { method: "DELETE" });
      setReports((current) => current.filter((r) => r.id !== id));
      setRecentReports((current) => current.filter((r) => r.id !== id));
      toast({ title: "Report deleted", type: "warning" });
    } catch {
      toast({ title: "Delete failed", type: "error" });
    }
  };

  const handleExport = async (reportId: string, format: string) => {
    try {
      const response = await fetch(`${apiBase}/consultant/export`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportId, format }),
      });
      if (!response.ok) throw new Error("Export failed");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `consultant-report.${format}`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: "Export ready", description: `Report exported as ${format.toUpperCase()}`, type: "success" });
    } catch {
      toast({ title: "Export failed", type: "error" });
    }
  };

  if (!session?.accessToken) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-enterprise p-4">
        <EmptyState action={{ label: "Login", onClick: () => window.location.assign("/login") }} description="AI Business Consultant requires authentication." icon={BrainCircuit} title="Authentication required" />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-enterprise">
      <header className="sticky top-0 z-40 border-b bg-background/78 backdrop-blur-xl">
        <div className="container flex min-h-16 flex-wrap items-center justify-between gap-3 py-3">
          <div className="flex items-center gap-3">
            <Button asChild size="icon" type="button" variant="outline">
              <Link aria-label="Back to dashboard" to="/dashboard"><ArrowLeft className="h-4 w-4" /></Link>
            </Button>
            <div>
              <p className="text-sm font-semibold text-primary">AI / Business Consultant</p>
              <h1 className="text-2xl font-bold">AI Business Consultant</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={() => setIsGenerating(true)} type="button"><Plus className="h-4 w-4" />New Analysis</Button>
            <Button onClick={loadReports} type="button" variant="outline"><RefreshCcw className="h-4 w-4" />Refresh</Button>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <div className="container space-y-6 py-6">
        {view === "dashboard" && (
          <>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {recentReports.slice(0, 4).map((report, index) => {
                const Icon = report.type === "business_health" ? HeartPulse : report.type === "revenue" ? TrendingUp : report.type === "risk" ? ShieldCheck : BarChart3;
                return (
                  <motion.div animate={{ opacity: 1, y: 0 }} initial={{ opacity: 0, y: 16 }} key={report.id} transition={{ delay: index * 0.04 }}>
                    <Card className="glass cursor-pointer" onClick={() => setSelectedReport(report)}>
                      <CardContent className="p-5">
                        <Icon className="mb-4 h-5 w-5 text-primary" />
                        <p className="text-sm text-muted-foreground">{report.title}</p>
                        <p className="mt-2 text-2xl font-bold">{report.metrics.length} metrics</p>
                        <p className="mt-1 text-xs text-muted-foreground">{new Date(report.createdAt).toLocaleDateString()}</p>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>

            <Card className="glass">
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  {analysisTypes.slice(0, 8).map((t) => {
                    const Icon = t.icon;
                    return (
                      <Button key={t.value} onClick={() => { setTypeFilter(t.value); setView("reports"); }} type="button" variant="outline" className="justify-start">
                        <Icon className="h-4 w-4" />
                        {t.label}
                      </Button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {view === "reports" && (
          <>
            <Card className="glass">
              <CardContent className="space-y-4 p-4">
                <div className="grid gap-3 lg:grid-cols-[1fr_160px_auto]">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input className="pl-9" placeholder="Search reports..." value={search} onChange={(e) => setSearch(e.target.value)} />
                  </div>
                  <select className="h-11 rounded-md border bg-background/75 px-3 text-sm" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
                    <option value="all">All Types</option>
                    {analysisTypes.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                  <Button onClick={() => setIsGenerating(true)} type="button"><Plus className="h-4 w-4" />New Analysis</Button>
                </div>
              </CardContent>
            </Card>

            {loading ? (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => <PageSkeleton key={i} />)}
              </div>
            ) : filteredReports.length === 0 ? (
              <EmptyState action={{ label: "Generate Analysis", onClick: () => setIsGenerating(true) }} description="No reports match your filters." icon={FileText} title="No reports found" />
            ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {filteredReports.map((report) => (
                  <Card key={report.id} className="glass cursor-pointer rounded-2xl bg-card/70 hover:-translate-y-1 hover:border-primary/35 hover:shadow-glass" onClick={() => setSelectedReport(report)}>
                    <CardHeader>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <CardTitle className="truncate">{report.title}</CardTitle>
                          <p className="mt-2 text-xs text-muted-foreground capitalize">{report.type.replace(/_/g, " ")}</p>
                        </div>
                        <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize", report.status === "final" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300" : "bg-amber-500/10 text-amber-600 dark:text-amber-300")}>
                          {report.status}
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="line-clamp-2 text-sm leading-6 text-muted-foreground">{report.summary}</p>
                      <div className="flex flex-wrap gap-2 text-xs">
                        <span className="rounded-full bg-primary/10 px-2.5 py-1 font-semibold text-primary">{report.metrics.length} metrics</span>
                        <span className="rounded-full bg-accent/15 px-2.5 py-1 font-semibold text-accent">{report.recommendations.length} recommendations</span>
                        <span className="rounded-full bg-muted px-2.5 py-1 font-semibold text-muted-foreground">{report.dataSources.filter((s) => s.available).length} sources</span>
                      </div>
                      <div className="flex flex-wrap gap-2 opacity-90 transition-opacity hover:opacity-100">
                        <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); setSelectedReport(report); }}><Eye className="h-4 w-4" />View</Button>
                        <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); handleExport(report.id, "pdf"); }}><Download className="h-4 w-4" />PDF</Button>
                        <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); handleExport(report.id, "excel"); }}><FileBarChart className="h-4 w-4" />Excel</Button>
                        <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); handleDelete(report.id); }}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {isGenerating && (
        <GenerateModal
          onClose={() => setIsGenerating(false)}
          onGenerated={handleGenerated}
        />
      )}

      {selectedReport && (
        <ReportDetailModal report={selectedReport} onClose={() => setSelectedReport(null)} />
      )}
    </main>
  );
}
