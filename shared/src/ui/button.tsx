import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@shared/lib/utils";

const buttonVariants = cva(
  "inline-flex min-h-10 max-w-full items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 active:translate-y-px disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "bg-[linear-gradient(135deg,hsl(var(--primary)),hsl(var(--accent)))] text-primary-foreground shadow-md shadow-primary/25 hover:-translate-y-0.5 hover:brightness-110 hover:shadow-glow",
        secondary:
          "border border-primary/15 bg-secondary text-secondary-foreground hover:-translate-y-0.5 hover:border-primary/35 hover:bg-secondary/80",
        outline:
          "border border-primary/25 bg-background/80 shadow-sm hover:-translate-y-0.5 hover:border-primary/55 hover:bg-primary/10 hover:text-primary",
        ghost: "hover:bg-primary/10 hover:text-primary",
        glass:
          "border border-primary/20 bg-white/65 text-foreground shadow-sm backdrop-blur-xl hover:-translate-y-0.5 hover:border-primary/45 hover:bg-white/80 dark:bg-white/10 dark:hover:bg-white/15",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 px-3 text-xs",
        lg: "h-11 px-5",
        icon: "h-10 w-10 shrink-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button };
