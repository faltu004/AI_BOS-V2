import { useState } from "react";
import { Calendar, Clock, Trash2, ToggleLeft, ToggleRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ScheduledReport } from "../report-ai.types";

type ReportSchedulerProps = {
  reports: ScheduledReport[];
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  className?: string;
};

export function ReportScheduler({ reports, onToggle, onDelete, className }: ReportSchedulerProps) {
  const formatFrequency = (frequency: string) => {
    return frequency.charAt(0).toUpperCase() + frequency.slice(1);
  };

  return (
    <Card className={`glass ${className ?? ""}`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          Scheduled Reports
        </CardTitle>
      </CardHeader>
      <CardContent>
        {reports.length === 0 ? (
          <p className="text-sm text-muted-foreground">No scheduled reports</p>
        ) : (
          <div className="space-y-3">
            {reports.map((report) => (
              <div key={report.id} className="rounded-lg border bg-background/65 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-sm font-semibold">{report.reportType}</h4>
                      <span className="text-xs text-muted-foreground">•</span>
                      <span className="text-xs text-muted-foreground">{report.format.toUpperCase()}</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                      <Clock className="h-3 w-3" />
                      {formatFrequency(report.frequency)}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {report.recipients.map((recipient, index) => (
                        <span key={index} className="rounded-full border bg-background px-2 py-0.5 text-xs">
                          {recipient}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      aria-label={report.isActive ? "Disable" : "Enable"}
                      onClick={() => onToggle(report.id)}
                      size="icon"
                      type="button"
                      variant="ghost"
                    >
                      {report.isActive ? (
                        <ToggleRight className="h-4 w-4 text-primary" />
                      ) : (
                        <ToggleLeft className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                    <Button
                      aria-label="Delete"
                      onClick={() => onDelete(report.id)}
                      size="icon"
                      type="button"
                      variant="ghost"
                    >
                      <Trash2 className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}