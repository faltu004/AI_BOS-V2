import { FileText, AlertCircle, CheckCircle, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { IntegrationLog } from "../settings.types";

type IntegrationLogsProps = {
  logs: IntegrationLog[];
  className?: string;
};

const statusIcons = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
};

const statusColors = {
  success: "text-emerald-600 dark:text-emerald-400",
  error: "text-rose-600 dark:text-rose-400",
  warning: "text-amber-600 dark:text-amber-400",
};

export function IntegrationLogs({ logs, className }: IntegrationLogsProps) {
  return (
    <Card className={`glass ${className ?? ""}`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          Integration Logs
        </CardTitle>
      </CardHeader>
      <CardContent>
        {logs.length === 0 ? (
          <p className="text-sm text-muted-foreground">No logs available</p>
        ) : (
          <div className="max-h-64 space-y-2 overflow-y-auto">
            {logs.map((log) => {
              const Icon = statusIcons[log.status as keyof typeof statusIcons] || FileText;
              return (
                <div key={log.id} className="flex items-start gap-2 rounded-lg border bg-background/65 p-3">
                  <Icon className={`h-4 w-4 ${statusColors[log.status as keyof typeof statusColors]} mt-0.5`} />
                  <div className="flex-1">
                    <p className="text-sm font-semibold">{log.action}</p>
                    <p className="text-xs text-muted-foreground">{log.message}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {new Date(log.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}