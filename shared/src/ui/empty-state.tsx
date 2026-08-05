import type { LucideIcon } from "lucide-react";
import { Button } from "@shared/ui/button";

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
 <div className="flex min-h-56 flex-col items-center justify-center rounded-lg border border-dashed bg-card p-6 text-center sm:p-8">
 <div className="relative mb-5 flex h-16 w-16 items-center justify-center rounded-lg bg-primary/10 text-primary sm:h-20 sm:w-20">
 <div className="absolute inset-2 rounded-md border border-primary/15" />
 <Icon className="h-8 w-8" />
 </div>
 <h3 className="text-base font-bold sm:text-lg">{title}</h3>
 <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">{description}</p>
 {action && (
 <Button className="mt-5" onClick={action.onClick} type="button">
 {action.label}
 </Button>
 )}
 </div>
 );
}
