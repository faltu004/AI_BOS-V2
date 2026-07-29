import { motion } from "framer-motion";
import { Activity } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@shared/ui/card";
import type { BusinessHealthScore } from "../ai-analytics.types";

const categoryColors = {
  critical: "text-rose-600 dark:text-rose-400",
  warning: "text-amber-600 dark:text-amber-400",
  good: "text-emerald-600 dark:text-emerald-400",
  excellent: "text-primary",
};

const scoreColors = {
  danger: "rgb(244 63 94)",
  warning: "rgb(245 158 11)",
  success: "rgb(16 185 129)",
};

type HealthScoreGaugeProps = {
  data: BusinessHealthScore;
  className?: string;
};

export function HealthScoreGauge({ data, className }: HealthScoreGaugeProps) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (data.overall / 100) * circumference;
  const color = data.overall >= 85 ? scoreColors.success : data.overall >= 70 ? scoreColors.warning : scoreColors.danger;

  return (
    <Card className={`glass ${className ?? ""}`}>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>Business Health Score</CardTitle>
          <p className={`mt-1 text-sm font-semibold ${categoryColors[data.category]}`}>{data.summary}</p>
        </div>
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Activity className="h-5 w-5" />
        </span>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center gap-6">
          <div className="relative h-40 w-40">
            <svg className="h-full w-full -rotate-90" viewBox="0 0 120 120">
              <circle cx="60" cy="60" fill="none" stroke="hsl(var(--muted-foreground) / 0.15)" strokeWidth="10" r={radius} />
              <motion.circle
                animate={{ strokeDashoffset: offset }}
                cx="60"
                cy="60"
                fill="none"
                initial={{ strokeDashoffset: circumference }}
                stroke={color}
                strokeLinecap="round"
                strokeWidth="10"
                transition={{ duration: 1.2, ease: "easeOut" }}
                r={radius}
                strokeDasharray={circumference}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <motion.span
                animate={{ opacity: 1, scale: 1 }}
                className="text-4xl font-bold"
                initial={{ opacity: 0, scale: 0.8 }}
                transition={{ delay: 0.3 }}
              >
                {data.overall}
              </motion.span>
              <span className="text-xs text-muted-foreground">out of 100</span>
            </div>
          </div>

          <div className="grid w-full grid-cols-2 gap-3 sm:grid-cols-4">
            {data.subScores.map((sub) => (
              <div key={sub.label} className="rounded-xl border bg-card/65 p-3 text-center">
                <p className="text-xs text-muted-foreground">{sub.label}</p>
                <p className={`mt-1 text-lg font-bold ${sub.severity === "success" ? "text-emerald-600 dark:text-emerald-400" : sub.severity === "warning" ? "text-amber-600 dark:text-amber-400" : "text-rose-600 dark:text-rose-400"}`}>
                  {sub.score}
                </p>
                <p className="text-xs text-muted-foreground">/ {sub.maxScore}</p>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}