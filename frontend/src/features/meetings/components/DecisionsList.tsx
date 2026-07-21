import { GitBranch, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { MeetingDecision } from "../meeting-ai.types";

type DecisionsListProps = {
  decisions: MeetingDecision[];
  className?: string;
};

export function DecisionsList({ decisions, className }: DecisionsListProps) {
  const impactColors = {
    high: "text-rose-600 dark:text-rose-400",
    medium: "text-amber-600 dark:text-amber-400",
    low: "text-emerald-600 dark:text-emerald-400",
  };

  return (
    <Card className={`glass ${className ?? ""}`}>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>Decisions Made</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">Key decisions and their rationale</p>
        </div>
        <span className="text-xs text-muted-foreground">{decisions.length} decisions</span>
      </CardHeader>
      <CardContent className="space-y-3">
        {decisions.length === 0 ? (
          <p className="text-sm text-muted-foreground">No decisions extracted</p>
        ) : (
          decisions.map((decision) => (
            <div className="rounded-lg border bg-background/65 p-4" key={decision.id}>
              <div className="flex items-start gap-2 mb-2">
                <GitBranch className="h-4 w-4 text-primary mt-0.5" />
                <h4 className="text-sm font-semibold flex-1">{decision.decision}</h4>
              </div>
              
              {decision.rationale && (
                <p className="text-xs text-muted-foreground mb-2 ml-6">{decision.rationale}</p>
              )}

              <div className="flex items-center justify-between ml-6">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Users className="h-3 w-3" />
                  {decision.stakeholders.slice(0, 2).join(", ")}
                  {decision.stakeholders.length > 2 && ` +${decision.stakeholders.length - 2}`}
                </div>
                <span className={`text-xs font-semibold capitalize ${impactColors[decision.impact as keyof typeof impactColors]}`}>
                  {decision.impact} impact
                </span>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}