import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-[var(--accent-primary)]/20 text-[var(--accent-primary-hover)] border-[var(--accent-primary)]/30",
        secondary:
          "border-transparent bg-white/10 text-white/80 hover:bg-white/15",
        outline:
          "text-white/60 border-white/15",
        glow:
          "bg-gradient-to-r from-[var(--accent-primary)]/30 to-[var(--accent-secondary)]/30 text-white border-[var(--accent-primary)]/40 shadow-sm",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
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
