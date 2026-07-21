import { CheckCircle2, Clock, Flag, GitBranch, ListChecks } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { TimelineEvent, TimelineEventType } from "../meeting-ai.types";

type MeetingTimelineProps = {
  events: TimelineEvent[];
  className?: string;
};

const eventConfig = {
  topic: { icon: ListChecks, color: "text-primary" },
  action: { icon: CheckCircle2, color: "text-amber-600 dark:text-amber-400" },
  decision: { icon: GitBranch, color: "text-emerald-600 dark:text-emerald-400" },
  milestone: { icon: Flag, color: "text-rose-600 dark:text-rose-400" },
};

export function MeetingTimeline({ events, className }: MeetingTimelineProps) {
  return (
    <Card className={`glass ${className ?? ""}`}>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>Meeting Timeline</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">Key moments and milestones</p>
        </div>
        <Clock className="h-5 w-5 text-primary" />
      </CardHeader>
      <CardContent>
        <div className="relative">
          <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />
          <div className="space-y-4">
            {events.map((event, index) => {
              const config = eventConfig[event.type as keyof typeof eventConfig] || eventConfig.topic;
              const Icon = config.icon;
              return (
                <div className="relative flex gap-4" key={index}>
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-background bg-background ${config.color}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 pt-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold text-muted-foreground">{event.timestamp}</span>
                      <span className={`text-xs font-semibold capitalize ${config.color}`}>{event.type}</span>
                    </div>
                    <h4 className="text-sm font-semibold mb-1">{event.title}</h4>
                    {event.description && <p className="text-xs text-muted-foreground">{event.description}</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}