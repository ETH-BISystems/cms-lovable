import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-[color,background-color,border-color,box-shadow,transform] duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-b from-primary to-primary/90 text-primary-foreground shadow-[0_1px_2px_rgb(15_23_42/0.12),inset_0_1px_0_rgb(255_255_255/0.12)] hover:from-primary/95 hover:to-primary/85 hover:shadow-[0_2px_6px_-1px_rgb(15_23_42/0.25)]",
        destructive:
          "bg-destructive/90 text-destructive-foreground shadow-[0_1px_2px_rgb(15_23_42/0.10)] hover:bg-destructive",
        outline:
          "border border-input bg-card text-foreground shadow-[0_1px_2px_rgb(15_23_42/0.04)] hover:bg-muted/60 hover:border-border hover:text-foreground",
        secondary:
          "bg-secondary text-secondary-foreground border border-transparent hover:bg-secondary/70",
        ghost: "text-foreground/80 hover:bg-muted/70 hover:text-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
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
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
