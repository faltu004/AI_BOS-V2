import { cn } from "@shared/lib/utils";

export type AvatarProps = {
 value?: string;
 name?: string;
 className?: string;
};

function isPhotoValue(value?: string): value is string {
 return typeof value === "string" && value.startsWith("data:image/");
}

/** Renders an employee/user's avatar — a real uploaded photo when `value` is an image data URL, otherwise the plain-text value (initials) as a fallback. */
export function Avatar({ value, name, className }: AvatarProps) {
 if (isPhotoValue(value)) {
 return (
 <span className={cn("flex shrink-0 items-center justify-center overflow-hidden rounded-lg bg-primary/10", className)}>
 <img alt={name ?? "Avatar"} className="h-full w-full object-cover" src={value} />
 </span>
 );
 }

 return (
 <span className={cn("flex shrink-0 items-center justify-center rounded-lg bg-primary/10 font-bold text-primary", className)}>
 {value}
 </span>
 );
}
