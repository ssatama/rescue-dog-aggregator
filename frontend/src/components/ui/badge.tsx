import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground shadow hover:bg-primary/80 dark:shadow-purple-500/20 dark:ring-1 dark:ring-purple-500/30 hover:dark:shadow-purple-500/30",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80 dark:shadow-orange-500/15 dark:ring-1 dark:ring-orange-500/25 hover:dark:shadow-orange-500/25",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground shadow hover:bg-destructive/80 dark:shadow-red-500/20 dark:ring-1 dark:ring-red-500/30 hover:dark:shadow-red-500/30",
        outline:
          "text-foreground dark:border-purple-500/40 dark:bg-purple-500/10 dark:text-purple-300",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
