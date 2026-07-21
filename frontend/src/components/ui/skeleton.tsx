import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-lg bg-muted/70", className)} />;
}

export function SkeletonCard() {
  return (
    <div className="rounded-2xl border bg-card/60 p-5 shadow-sm">
      <Skeleton className="h-9 w-9" />
      <Skeleton className="mt-6 h-4 w-24" />
      <Skeleton className="mt-3 h-8 w-32" />
      <Skeleton className="mt-4 h-3 w-full" />
    </div>
  );
}
