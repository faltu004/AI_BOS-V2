import * as React from "react";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@shared/ui/button";
import { Input } from "@shared/ui/input";
import { cn } from "@shared/lib/utils";

const PasswordInput = React.forwardRef<HTMLInputElement, Omit<React.ComponentProps<typeof Input>, "type">>(
 ({ className, ...props }, ref) => {
 const [visible, setVisible] = React.useState(false);

 return (
 <div className="relative">
 <Input {...props} className={cn("pr-11", className)} ref={ref} type={visible ? "text" : "password"} />
 <Button
 aria-label={visible ? "Hide password" : "Show password"}
 className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2 text-muted-foreground hover:text-foreground"
 onClick={() => setVisible((value) => !value)}
 size="icon"
 tabIndex={-1}
 type="button"
 variant="ghost"
 >
 {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
 </Button>
 </div>
 );
 },
);
PasswordInput.displayName = "PasswordInput";

export { PasswordInput };
