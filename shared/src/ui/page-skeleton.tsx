import { Skeleton } from "@shared/ui/skeleton";

export function PageSkeleton() {
 return (
 <div aria-label="Loading page" className="min-h-screen bg-enterprise p-4 lg:p-6" role="status">
 <div className="mx-auto max-w-7xl space-y-6">
 <span className="sr-only">Loading page content</span>
 <div className="flex items-center justify-between gap-4">
 <div className="space-y-3">
 <Skeleton className="h-4 w-32" />
 <Skeleton className="h-10 w-80 max-w-[70vw]" />
 </div>
 <Skeleton className="h-10 w-32 rounded-lg" />
 </div>
 <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
 {Array.from({ length: 4 }).map((_, index) => (
 <Skeleton className="h-32 rounded-lg" key={index} />
 ))}
 </div>
 <div className="grid gap-4 lg:grid-cols-[1.4fr_0.6fr]">
 <Skeleton className="h-96 rounded-lg" />
 <div className="space-y-4">
 <Skeleton className="h-28 rounded-lg" />
 <Skeleton className="h-28 rounded-lg" />
 <Skeleton className="h-28 rounded-lg" />
 </div>
 </div>
 </div>
 </div>
 );
}
