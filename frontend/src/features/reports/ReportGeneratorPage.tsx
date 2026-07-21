import { motion } from "framer-motion";
import { FileText, Calendar, BarChart3 } from "lucide-react";
import { useState } from "react";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { useReportAI } from "./hooks/useReportAI";
import { ReportGenerator } from "./components/ReportGenerator";
import { ReportPreview } from "./components/ReportPreview";
import { ReportScheduler } from "./components/ReportScheduler";
import type { ReportRequest, ReportResponse, ReportFormat, ScheduledReport } from "./report-ai.types";

export function ReportGeneratorPage() {
  const [activeTab, setActiveTab] = useState<"generate" | "scheduled">("generate");
  const [generatedReport, setGeneratedReport] = useState<ReportResponse | null>(null);
  const [scheduledReports, setScheduledReports] = useState<ScheduledReport[]>([]);
  const { generateReport, exportReport, scheduleReport, loadScheduledReports, deleteScheduledReport, isLoading, error } = useReportAI({
    onSuccess: (data) => setGeneratedReport(data),
  });

  const handleGenerate = async (request: ReportRequest) => {
    const result = await generateReport(request);
    if (result) {
      setGeneratedReport(result);
    }
  };

  const handleExport = async (reportId: string, format: string) => {
    const blob = await exportReport(reportId, format as ReportFormat);
    if (blob) {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `report-${reportId}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const handleSchedule = async (request: ReportRequest) => {
    const result = await scheduleReport(request);
    if (result) {
      setScheduledReports((prev) => [...prev, result]);
    }
  };

  const handleToggleScheduled = (id: string) => {
    setScheduledReports((prev) =>
      prev.map((report) => (report.id === id ? { ...report, isActive: !report.isActive } : report)),
    );
  };

  const handleDeleteScheduled = async (id: string) => {
    const success = await deleteScheduledReport(id);
    if (success) {
      setScheduledReports((prev) => prev.filter((report) => report.id !== id));
    }
  };

  return (
    <main className="min-h-screen bg-enterprise">
      <header className="sticky top-0 z-40 border-b bg-background/78 backdrop-blur-xl">
        <div className="container flex min-h-16 flex-wrap items-center justify-between gap-3 py-3">
          <div>
            <p className="text-sm font-semibold text-primary">Reports</p>
            <h1 className="text-2xl font-bold">AI Report Generator</h1>
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
        <div className="grid gap-4 md:grid-cols-3">
          <motion.div animate={{ opacity: 1, y: 0 }} initial={{ opacity: 0, y: 16 }} transition={{ delay: 0 }}>
            <Card className="glass">
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">Report Types</p>
                    <p className="text-2xl font-bold">7</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div animate={{ opacity: 1, y: 0 }} initial={{ opacity: 0, y: 16 }} transition={{ delay: 0.04 }}>
            <Card className="glass">
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">Export Formats</p>
                    <p className="text-2xl font-bold">4</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div animate={{ opacity: 1, y: 0 }} initial={{ opacity: 0, y: 16 }} transition={{ delay: 0.08 }}>
            <Card className="glass">
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">Scheduled Reports</p>
                    <p className="text-2xl font-bold">{scheduledReports.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        <div className="flex gap-2 border-b border-border pb-4">
          <Button
            aria-pressed={activeTab === "generate"}
            onClick={() => setActiveTab("generate")}
            type="button"
            variant={activeTab === "generate" ? "default" : "ghost"}
          >
            Generate Report
          </Button>
          <Button
            aria-pressed={activeTab === "scheduled"}
            onClick={() => setActiveTab("scheduled")}
            type="button"
            variant={activeTab === "scheduled" ? "default" : "ghost"}
          >
            Scheduled Reports
          </Button>
        </div>

        {error && (
          <div className="rounded-lg border border-rose-500 bg-rose-500/10 p-4 text-sm text-rose-600 dark:text-rose-400">
            {error}
          </div>
        )}

        {activeTab === "generate" && (
          <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
            <ReportGenerator onGenerate={handleGenerate} onExport={handleExport} onSchedule={handleSchedule} isLoading={isLoading} />
            {generatedReport && <ReportPreview report={generatedReport} onExport={handleExport} />}
          </div>
        )}

        {activeTab === "scheduled" && (
          <ReportScheduler
            reports={scheduledReports}
            onToggle={handleToggleScheduled}
            onDelete={handleDeleteScheduled}
          />
        )}
      </div>
    </main>
  );
}