import { motion } from "framer-motion";
import { AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ProjectRisk } from "../ai-analytics.types";

const statusColors = {
  low: "bg-emerald-500",
  medium: "bg-amber-500",
  high: "bg-orange-500",
  critical: "bg-rose-500",
};

const categoryLabels = {
  schedule: "Schedule",
  budget: "Budget",
  resource: "Resource",
  technical: "Technical",
  external: "External",
};

type RiskMatrixProps = {
  data: ProjectRisk[];
  className?: string;
};

export function RiskMatrix({ data, className }: RiskMatrixProps) {
  const maxImpact = 5;
  const maxLikelihood = 5;

  return (
    <Card className={`glass ${className ?? ""}`}>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>Project Risk Matrix</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">Impact vs likelihood assessment for active projects</p>
        </div>
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
          <AlertTriangle className="h-5 w-5" />
        </span>
      </CardHeader>
      <CardContent>
        <div className="relative h-80 w-full">
          <div className="absolute inset-0 grid grid-cols-5 grid-rows-5 gap-1">
            {Array.from({ length: 25 }).map((_, i) => {
              const row = Math.floor(i / 5);
              const col = i % 5;
              const intensity = ((row + col) / 8).toFixed(2);
              return (
                <div
                  key={i}
                  className="rounded-md border border-border/50"
                  style={{ backgroundColor: `rgba(var(--primary) / ${intensity})` }}
                />
              );
            })}
          </div>

          <div className="relative h-full w-full">
            {data.map((risk) => {
              const x = (risk.impact / maxImpact) * 100;
              const y = 100 - (risk.likelihood / maxLikelihood) * 100;
              return (
                <motion.div
                  animate={{ opacity: 1, scale: 1 }}
                  className="absolute"
                  initial={{ opacity: 0, scale: 0 }}
                  key={risk.projectId}
                  style={{ left: `${x}%`, top: `${y}%`, transform: "translate(-50%, -50%)" }}
                  title={`${risk.projectName}: ${risk.description}`}
                >
                  <div className="group relative">
                    <div className={`h-3 w-3 rounded-full ${statusColors[risk.status]} shadow-lg`} />
                    <div className="absolute bottom-full left-1/2 mb-2 hidden -translate-x-1/2 whitespace-nowrap rounded-lg border bg-background/95 px-3 py-2 text-xs shadow-glass backdrop-blur-xl group-hover:block">
                      <p className="font-semibold">{risk.projectName}</p>
                      <p className="text-muted-foreground">Risk Score: {risk.riskScore}/100</p>
                      <p className="text-muted-foreground">Category: {categoryLabels[risk.category]}</p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Low</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-500" /> Medium</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-orange-500" /> High</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-rose-500" /> Critical</span>
        </div>
      </CardContent>
    </Card>
  );
}