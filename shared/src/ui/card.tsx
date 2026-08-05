import * as React from "react";
import { cn } from "@shared/lib/utils";

const Card = React.forwardRef<
 HTMLDivElement,
 React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
 <div
 ref={ref}
 className={cn(
 "rounded-lg border bg-card text-card-foreground shadow-sm transition-[border-color,box-shadow,transform] duration-200",
 className,
 )}
 {...props}
 />
));
Card.displayName = "Card";

const CardHeader = React.forwardRef<
 HTMLDivElement,
 React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
 <div ref={ref} className={cn("space-y-1.5 p-5 sm:p-6", className)} {...props} />
));
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<
 HTMLParagraphElement,
 React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
 <h3
 ref={ref}
 className={cn("text-base font-semibold leading-tight sm:text-lg", className)}
 {...props}
 />
));
CardTitle.displayName = "CardTitle";

const CardContent = React.forwardRef<
 HTMLDivElement,
 React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
 <div ref={ref} className={cn("p-5 pt-0 sm:p-6 sm:pt-0", className)} {...props} />
));
CardContent.displayName = "CardContent";

export { Card, CardContent, CardHeader, CardTitle };
