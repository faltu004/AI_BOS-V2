import { CheckCircle, AlertCircle, Clock, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { IntegrationHealth } from "../settings.types";

type IntegrationHealthProps = {
  health: IntegrationHealth;
  onCheck: (integrationId: string) => void;
  className?: string;
};

const statusColors = {
  healthy: "text-emerald-600 dark:text-emerald-400",
  unhealthy: "text-rose-600 dark:text-rose-400",
  unknown: "text-muted-foreground",
};

export function IntegrationHealth({ health, onCheck, className }: IntegrationHealthProps) {
  const Icon = health.status === "healthy" ? CheckCircle : health.status === "unhealthy" ? AlertCircle : Clock;

  return (
    <Card className={`glass ${className ?? ""}`}>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          <CardTitle className="text-base">Health Status</CardTitle>
        </div>
        <span className={`text-xs font-semibold capitalize ${statusColors[health.status as keyof typeof statusColors]}`}>
          {health.status}
        </span>
      </CardHeader>
      <CardContent className="space-y-3">
        {health.latency && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Latency</span>
            <span className="font-semibold">{health.latency}ms</span>
          </div>
        )}
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Last Checked</span>
          <span className="font-semibold">{new Date(health.lastChecked).toLocaleString()}</span>
        </div>
        {health.error && (
          <div className="rounded-lg border border-rose-500 bg-rose-500/10 p-3">
            <p className="text-xs text-rose-600 dark:text-rose-400">{health.error}</p>
          </div>
        )}
        <Button onClick={() => onCheck(health.integrationId)} size="sm" type="button" variant="outline">
          Check Health
        </Button>
      </CardContent>
    </Card>
  );
}