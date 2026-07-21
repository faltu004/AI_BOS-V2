import { CheckCircle2, Circle, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ExtractedActionItem } from "../meeting-ai.types";

type ActionItemsExtractorProps = {
  actionItems: ExtractedActionItem[];
  onToggle?: (id: string) => void;
  onConvertToTask?: (item: ExtractedActionItem) => void;
  className?: string;
};

export function ActionItemsExtractor({ actionItems, onToggle, onConvertToTask, className }: ActionItemsExtractorProps) {
  const priorityColors = {
    high: "text-rose-600 dark:text-rose-400",
    medium: "text-amber-600 dark:text-amber-400",
    low: "text-emerald-600 dark:text-emerald-400",
  };

  return (
    <Card className={`glass ${className ?? ""}`}>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>Action Items</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">AI-extracted tasks and assignments</p>
        </div>
        <span className="text-xs text-muted-foreground">{actionItems.length} items</span>
      </CardHeader>
      <CardContent className="space-y-3">
        {actionItems.length === 0 ? (
          <p className="text-sm text-muted-foreground">No action items extracted</p>
        ) : (
          actionItems.map((item) => (
            <div className="rounded-lg border bg-background/65 p-4" key={item.id}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-xs font-semibold capitalize ${priorityColors[item.priority as keyof typeof priorityColors]}`}>
                      {item.priority}
                    </span>
                    <span className="text-xs text-muted-foreground">Due: {item.due_date}</span>
                  </div>
                  <h4 className="text-sm font-semibold mb-1">{item.title}</h4>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                    <User className="h-3 w-3" />
                    {item.owner}
                  </div>
                  <p className="text-xs text-muted-foreground">{item.context}</p>
                </div>
                <div className="flex flex-col gap-1">
                  {onToggle && (
                    <Button
                      aria-label="Toggle complete"
                      onClick={() => onToggle(item.id)}
                      size="icon"
                      type="button"
                      variant="ghost"
                    >
                      <Circle className="h-4 w-4" />
                    </Button>
                  )}
                  {onConvertToTask && (
                    <Button
                      aria-label="Convert to task"
                      onClick={() => onConvertToTask(item)}
                      size="icon"
                      type="button"
                      variant="ghost"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}