import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

export function EmptyState({
  action,
  description,
  icon: Icon,
  title,
}: {
  action?: { label: string; onClick: () => void };
  description: string;
  icon: LucideIcon;
  title: string;
}) {
  return (
    <div className="flex min-h-64 flex-col items-center justify-center rounded-2xl border border-dashed bg-card/45 p-8 text-center">
      <div className="relative mb-5 flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <div className="absolute inset-2 rounded-xl border border-primary/15" />
        <Icon className="h-8 w-8" />
      </div>
      <h3 className="text-lg font-bold">{title}</h3>
      <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">{description}</p>
      {action && (
        <Button className="mt-5" onClick={action.onClick} type="button">
          {action.label}
        </Button>
      )}
    </div>
  );
}
