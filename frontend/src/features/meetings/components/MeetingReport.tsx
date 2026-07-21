import { Download, FileText, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { MeetingReport } from "../meeting-ai.types";

type MeetingReportProps = {
  report: MeetingReport;
  className?: string;
};

export function MeetingReport({ report, className }: MeetingReportProps) {
  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    const blob = new Blob([JSON.stringify(report.content, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `meeting-report-${report.meeting_id}-${report.report_type}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card className={`glass ${className ?? ""}`}>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>Meeting Report</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            {report.report_type.charAt(0).toUpperCase() + report.report_type.slice(1)} report generated on {report.generated_at}
          </p>
        </div>
        <div className="flex gap-1">
          <Button aria-label="Download report" onClick={handleDownload} size="icon" type="button" variant="ghost">
            <Download className="h-4 w-4" />
          </Button>
          <Button aria-label="Print report" onClick={handlePrint} size="icon" type="button" variant="ghost">
            <Printer className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <h3 className="text-xl font-bold mb-1">{report.content.title}</h3>
          <p className="text-sm text-muted-foreground">Date: {report.content.date}</p>
        </div>

        <div>
          <h4 className="text-sm font-semibold mb-2">Attendees</h4>
          <div className="flex flex-wrap gap-2">
            {report.content.attendees.map((attendee) => (
              <span key={attendee} className="rounded-full border bg-background/65 px-3 py-1 text-xs font-semibold">
                {attendee}
              </span>
            ))}
          </div>
        </div>

        <div>
          <h4 className="text-sm font-semibold mb-2">Summary</h4>
          <p className="text-sm leading-relaxed text-muted-foreground">{report.content.summary}</p>
        </div>

        <div>
          <h4 className="text-sm font-semibold mb-2">Key Points</h4>
          <ul className="space-y-1">
            {report.content.key_points.map((point, index) => (
              <li className="flex items-start gap-2 text-sm text-muted-foreground" key={index}>
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                {point}
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-semibold mb-2">Decisions</h4>
          <div className="space-y-2">
            {report.content.decisions.map((decision, index) => (
              <div key={index} className="rounded-lg border bg-background/65 p-3">
                <p className="text-sm font-semibold mb-1">{decision.decision}</p>
                <p className="text-xs text-muted-foreground mb-1">{decision.rationale}</p>
                <span className="text-xs font-semibold capitalize text-amber-600 dark:text-amber-400">{decision.impact} impact</span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h4 className="text-sm font-semibold mb-2">Action Items</h4>
          <div className="space-y-2">
            {report.content.action_items.map((item, index) => (
              <div key={index} className="rounded-lg border bg-background/65 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <p className="text-sm font-semibold">{item.title}</p>
                    <p className="text-xs text-muted-foreground">Owner: {item.owner}</p>
                    <p className="text-xs text-muted-foreground">Due: {item.due_date}</p>
                  </div>
                  <span className="text-xs font-semibold capitalize text-rose-600 dark:text-rose-400">{item.priority}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h4 className="text-sm font-semibold mb-2">Next Steps</h4>
          <ul className="space-y-1">
            {report.content.next_steps.map((step, index) => (
              <li className="flex items-start gap-2 text-sm text-muted-foreground" key={index}>
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                {step}
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}