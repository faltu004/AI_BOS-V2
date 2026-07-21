import { FileText, TrendingUp, Lightbulb, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ReportResponse } from "../report-ai.types";

type ReportPreviewProps = {
  report: ReportResponse;
  onExport: (reportId: string, format: string) => void;
  className?: string;
};

export function ReportPreview({ report, onExport, className }: ReportPreviewProps) {
  return (
    <div className={`space-y-4 ${className ?? ""}`}>
      <Card className="glass">
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              {report.reportType.charAt(0).toUpperCase() + report.reportType.slice(1)} Report
            </CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">Generated on {new Date(report.generatedAt).toLocaleString()}</p>
          </div>
          <div className="flex gap-1">
            <Button aria-label="Export PDF" onClick={() => onExport(report.id, "pdf")} size="icon" type="button" variant="ghost">
              <FileText className="h-4 w-4" />
            </Button>
            <Button aria-label="Print" onClick={() => window.print()} size="icon" type="button" variant="ghost">
              <FileText className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="rounded-lg border bg-primary/5 p-4">
            <div className="flex items-start gap-2">
              <Lightbulb className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <h3 className="font-semibold mb-1">AI Summary</h3>
                <p className="text-sm text-muted-foreground">{report.aiSummary}</p>
              </div>
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-3">Recommendations</h3>
            <ul className="space-y-2">
              {report.recommendations.map((rec, index) => (
                <li className="flex items-start gap-2 text-sm" key={index}>
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
                  {rec}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-3">Key Insights</h3>
            <ul className="space-y-2">
              {report.insights.map((insight, index) => (
                <li className="flex items-start gap-2 text-sm text-muted-foreground" key={index}>
                  <TrendingUp className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  {insight}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-3">Sections</h3>
            <div className="space-y-3">
              {report.sections.map((section, index) => (
                <Card key={index} className="bg-background/65">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">{section.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {section.type === "chart" && (
                      <div className="rounded-lg border bg-background p-4">
                        <p className="text-xs text-muted-foreground mb-2">Chart: {String(section.data.type || "chart")}</p>
                        <pre className="text-xs overflow-auto">{JSON.stringify(section.data, null, 2)}</pre>
                        {section.aiInsights && <p className="text-xs text-muted-foreground mt-2 italic">{section.aiInsights}</p>}
                      </div>
                    )}
                    {section.type === "table" && (
                      <div className="rounded-lg border bg-background p-4">
                        <p className="text-xs text-muted-foreground mb-2">Table</p>
                        <pre className="text-xs overflow-auto">{JSON.stringify(section.data, null, 2)}</pre>
                        {section.aiInsights && <p className="text-xs text-muted-foreground mt-2 italic">{section.aiInsights}</p>}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}