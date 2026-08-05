import { Search } from "lucide-react";
import { Input } from "@shared/ui/input";
import { cn } from "@shared/lib/utils";

type FilterBarProps = {
 search: string;
 onSearchChange: (value: string) => void;
 placeholder?: string;
 filters?: React.ReactNode;
 actions?: React.ReactNode;
 className?: string;
};

export function FilterBar({
 search,
 onSearchChange,
 placeholder = "Search...",
 filters,
 actions,
 className,
}: FilterBarProps) {
 return (
 <div className={cn("glass rounded-lg border bg-card p-3 sm:p-4", className)}>
 <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] lg:grid-cols-[minmax(0,1fr)_minmax(150px,auto)_auto]">
 <div className="relative">
 <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
 <Input
 aria-label={placeholder}
 className="pl-9"
 onChange={(e) => onSearchChange(e.target.value)}
 placeholder={placeholder}
 value={search}
 />
 </div>
 {filters}
 {actions}
 </div>
 </div>
 );
}
