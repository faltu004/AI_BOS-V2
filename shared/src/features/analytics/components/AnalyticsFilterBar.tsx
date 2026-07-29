import { motion } from "framer-motion";
import { Filter, RefreshCw } from "lucide-react";
import { Button } from "@shared/ui/button";
import { cn } from "@shared/lib/utils";
import { departmentOptions, metricOptions } from "../ai-analytics.data";
import type { AnalyticsFilterState } from "../ai-analytics.types";

type AnalyticsFilterBarProps = {
  filters: AnalyticsFilterState;
  onChange: (filters: AnalyticsFilterState) => void;
  onRefresh?: () => void;
  className?: string;
};

const dateRangeOptions = [
  { value: "3m", label: "3 Months" },
  { value: "6m", label: "6 Months" },
  { value: "12m", label: "12 Months" },
  { value: "all", label: "All Time" },
] as const;

export function AnalyticsFilterBar({ filters, onChange, onRefresh, className }: AnalyticsFilterBarProps) {
  return (
    <motion.div
      animate={{ opacity: 1, y: 0 }}
      className={cn("flex flex-wrap items-center gap-3 rounded-2xl border bg-card/65 p-4 backdrop-blur-sm", className)}
      initial={{ opacity: 0, y: -8 }}
    >
      <span className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
        <Filter className="h-4 w-4" />
        Filters
      </span>

      <div className="flex flex-wrap items-center gap-2">
        {dateRangeOptions.map((opt) => (
          <button
            key={opt.value}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-semibold transition-all",
              filters.dateRange === opt.value
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80",
            )}
            onClick={() => onChange({ ...filters, dateRange: opt.value })}
            type="button"
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div className="h-5 w-px bg-border" />

      <select
        className="rounded-lg border bg-background px-3 py-1.5 text-xs font-semibold text-muted-foreground"
        onChange={(e) => onChange({ ...filters, metric: e.target.value === "all" ? null : e.target.value })}
        value={filters.metric ?? "all"}
      >
        {metricOptions.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      <select
        className="rounded-lg border bg-background px-3 py-1.5 text-xs font-semibold text-muted-foreground"
        onChange={(e) => onChange({ ...filters, department: e.target.value === "all" ? null : e.target.value })}
        value={filters.department ?? "all"}
      >
        {departmentOptions.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      {onRefresh && (
        <Button className="ml-auto" onClick={onRefresh} size="sm" type="button" variant="outline">
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </Button>
      )}
    </motion.div>
  );
}