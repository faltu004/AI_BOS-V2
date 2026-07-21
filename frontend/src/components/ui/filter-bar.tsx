import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

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
    <div className={`glass rounded-lg border bg-card/70 p-4 ${className ?? ""}`}>
      <div className="grid gap-3 lg:grid-cols-[1fr_160px_auto]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
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