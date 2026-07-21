import { useState } from "react";
import { FileText, Download, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ReportType, ReportFormat, ReportRequest, ReportResponse } from "../report-ai.types";

type ReportGeneratorProps = {
  onGenerate: (request: ReportRequest) => void;
  onExport: (reportId: string, format: ReportFormat) => void;
  onSchedule: (request: ReportRequest) => void;
  isLoading?: boolean;
  className?: string;
};

const reportTypes: { value: ReportType; label: string }[] = [
  { value: "finance", label: "Finance" },
  { value: "projects", label: "Projects" },
  { value: "crm", label: "CRM" },
  { value: "employees", label: "Employees" },
  { value: "meetings", label: "Meetings" },
  { value: "customers", label: "Customers" },
  { value: "business_performance", label: "Business Performance" },
];

const reportFormats: { value: ReportFormat; label: string }[] = [
  { value: "pdf", label: "PDF" },
  { value: "excel", label: "Excel" },
  { value: "word", label: "Word" },
  { value: "email", label: "Email" },
];

const availableSections: { value: string; label: string }[] = [
  { value: "revenue", label: "Revenue & Expenses" },
  { value: "invoices", label: "Invoices" },
  { value: "budget", label: "Budget" },
  { value: "overview", label: "Overview" },
  { value: "pipeline", label: "Sales Pipeline" },
  { value: "deals", label: "Top Deals" },
  { value: "headcount", label: "Headcount" },
  { value: "attendance", label: "Attendance" },
  { value: "frequency", label: "Meeting Frequency" },
  { value: "action_items", label: "Action Items" },
  { value: "growth", label: "Growth" },
  { value: "health", label: "Health Score" },
];

export function ReportGenerator({ onGenerate, onExport, onSchedule, isLoading, className }: ReportGeneratorProps) {
  const [reportType, setReportType] = useState<ReportType>("finance");
  const [format, setFormat] = useState<ReportFormat>("pdf");
  const [dateRange, setDateRange] = useState("30d");
  const [selectedSections, setSelectedSections] = useState<string[]>([]);
  const [recipients, setRecipients] = useState("");
  const [schedule, setSchedule] = useState("");
  const [generatedReport, setGeneratedReport] = useState<ReportResponse | null>(null);

  const handleGenerate = () => {
    const request: ReportRequest = {
      reportType,
      format,
      dateRange,
      sections: selectedSections,
      recipients: recipients ? recipients.split(",").map((r) => r.trim()) : undefined,
      schedule: schedule || undefined,
    };
    onGenerate(request);
  };

  const handleSectionToggle = (section: string) => {
    setSelectedSections((prev) => (prev.includes(section) ? prev.filter((s) => s !== section) : [...prev, section]));
  };

  return (
    <Card className={`glass ${className ?? ""}`}>
      <CardHeader>
        <CardTitle>Generate Report</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="reportType">Report Type</Label>
            <select
              className="h-10 w-full rounded-md border bg-background px-3 text-sm"
              id="reportType"
              value={reportType}
              onChange={(e) => setReportType(e.target.value as ReportType)}
            >
              {reportTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="format">Format</Label>
            <select
              className="h-10 w-full rounded-md border bg-background px-3 text-sm"
              id="format"
              value={format}
              onChange={(e) => setFormat(e.target.value as ReportFormat)}
            >
              {reportFormats.map((fmt) => (
                <option key={fmt.value} value={fmt.value}>
                  {fmt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="dateRange">Date Range</Label>
            <Input id="dateRange" value={dateRange} onChange={(e) => setDateRange(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="schedule">Schedule (Optional)</Label>
            <Input id="schedule" placeholder="e.g., weekly, monthly" value={schedule} onChange={(e) => setSchedule(e.target.value)} />
          </div>
        </div>

          <div className="space-y-2">
            <Label>Sections</Label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {availableSections.map((section) => (
                <label key={section.value} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedSections.includes(section.value)}
                    onChange={() => handleSectionToggle(section.value)}
                    className="h-4 w-4 accent-primary"
                  />
                  {section.label}
                </label>
              ))}
            </div>
          </div>

        {format === "email" && (
          <div className="space-y-2">
            <Label htmlFor="recipients">Recipients (comma-separated)</Label>
            <Input id="recipients" placeholder="email@example.com, team@example.com" value={recipients} onChange={(e) => setRecipients(e.target.value)} />
          </div>
        )}

        <div className="flex gap-2">
          <Button onClick={handleGenerate} disabled={isLoading} type="button">
            <FileText className="h-4 w-4" />
            Generate Report
          </Button>
          {generatedReport && (
            <>
              <Button onClick={() => onExport(generatedReport.id, format)} type="button" variant="outline">
                <Download className="h-4 w-4" />
                Export
              </Button>
              {format === "email" && (
                <Button onClick={() => onSchedule({ reportType, format, dateRange, sections: selectedSections, recipients: recipients ? recipients.split(",").map((r) => r.trim()) : undefined, schedule })} type="button" variant="outline">
                  <Send className="h-4 w-4" />
                  Send Email
                </Button>
              )}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}