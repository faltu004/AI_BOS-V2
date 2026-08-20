import { cn } from "@shared/lib/utils";

type CompanyLogoProps = {
 collapsed?: boolean;
 logoUrl?: string;
 name?: string;
 subtitle?: string;
 className?: string;
};

export function CompanyLogo({
 collapsed = false,
 logoUrl,
 name = "AI BOS",
 subtitle = "Business OS",
 className,
}: CompanyLogoProps) {
 const initials = name
 .split(/\s+/)
 .filter(Boolean)
 .slice(0, 2)
 .map((part) => part[0]?.toUpperCase() ?? "")
 .join("") || "AI";
 return (
 <span className={cn("flex min-w-0 items-center gap-3", className)}>
 <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-cyan-300/40 bg-slate-950 text-cyan-200 shadow-glow">
 {logoUrl ? (
 <img alt={`${name} logo`} className="h-full w-full object-contain p-1.5" src={logoUrl} />
 ) : (
 <span className="relative flex h-full w-full items-center justify-center bg-[linear-gradient(135deg,#101828_0%,#164e63_52%,#0f766e_100%)] text-sm font-black tracking-normal">
 {initials}
 <span className="absolute bottom-2 left-2 h-1 w-7 rounded-full bg-cyan-300" />
 </span>
 )}
 </span>
 {!collapsed && (
 <span className="min-w-0">
 <span className="block truncate text-base font-bold">{name}</span>
 <span className="block truncate text-xs text-muted-foreground">{subtitle}</span>
 </span>
 )}
 </span>
 );
}
