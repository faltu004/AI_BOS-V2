import { cn } from "@/lib/utils";
import type { VoiceStatus } from "./types";

type VoiceStatusIndicatorProps = {
  status: VoiceStatus;
  className?: string;
};

const statusConfig: Record<VoiceStatus, { label: string; color: string; animate: boolean }> = {
  idle: { label: "Voice off", color: "bg-muted-foreground/40", animate: false },
  listening: { label: "Listening...", color: "bg-primary", animate: true },
  processing: { label: "Processing...", color: "bg-amber-500", animate: true },
  speaking: { label: "Speaking...", color: "bg-emerald-500", animate: true },
  error: { label: "Error", color: "bg-destructive", animate: false },
};

export function VoiceStatusIndicator({ status, className }: VoiceStatusIndicatorProps) {
  const config = statusConfig[status];

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span
        className={cn(
          "relative flex h-2.5 w-2.5",
          config.animate && "animate-pulse",
        )}
      >
        <span
          className={cn(
            "absolute inline-flex h-full w-full rounded-full opacity-75",
            config.color,
            config.animate && "animate-ping",
          )}
        />
        <span className={cn("relative inline-flex h-2.5 w-2.5 rounded-full", config.color)} />
      </span>
      <span className="text-xs font-medium text-muted-foreground">{config.label}</span>
    </div>
  );
}