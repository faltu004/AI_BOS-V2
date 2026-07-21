import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type AnalyticsCardProps = {
  title: string;
  subtitle: string;
  icon: LucideIcon;
  children: ReactNode;
  className?: string;
  action?: ReactNode;
};

export function AnalyticsCard({ title, subtitle, icon: Icon, children, className, action }: AnalyticsCardProps) {
  return (
    <Card className={`glass h-full ${className ?? ""}`}>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <CardTitle className="text-base">{title}</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {action}
          <span className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Icon className="h-5 w-5" />
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-72">{children}</div>
      </CardContent>
    </Card>
  );
}