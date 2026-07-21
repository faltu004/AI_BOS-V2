import { FileText, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { MeetingSummary } from "../meeting-ai.types";

type MeetingSummaryProps = {
  summary: MeetingSummary;
  className?: string;
};

export function MeetingSummary({ summary, className }: MeetingSummaryProps) {
  const sentimentColors = {
    positive: "text-emerald-600 dark:text-emerald-400",
    neutral: "text-amber-600 dark:text-amber-400",
    negative: "text-rose-600 dark:text-rose-400",
  };

  return (
    <Card className={`glass ${className ?? ""}`}>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>Meeting Summary</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">AI-generated summary and key insights</p>
        </div>
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
          <FileText className="h-5 w-5" />
        </span>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h4 className="mb-2 text-sm font-semibold">Summary</h4>
          <p className="text-sm leading-relaxed text-muted-foreground">{summary.summary}</p>
        </div>

        <div>
          <h4 className="mb-2 text-sm font-semibold">Key Points</h4>
          <ul className="space-y-1">
            {summary.key_points.map((point, index) => (
              <li className="flex items-start gap-2 text-sm text-muted-foreground" key={index}>
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                {point}
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="mb-2 text-sm font-semibold">Topics Discussed</h4>
          <div className="flex flex-wrap gap-2">
            {summary.topics.map((topic) => (
              <span className="rounded-full border bg-background/65 px-3 py-1 text-xs font-semibold" key={topic}>
                {topic}
              </span>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-lg border bg-background/65 p-3">
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-semibold">Sentiment:</span>
          <span className={`text-sm font-semibold capitalize ${sentimentColors[summary.sentiment as keyof typeof sentimentColors]}`}>
            {summary.sentiment}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}