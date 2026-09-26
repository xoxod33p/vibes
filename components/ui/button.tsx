import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 disabled:pointer-events-none disabled:opacity-50 cursor-pointer active:scale-95",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--accent-primary)] text-white hover:bg-[var(--accent-primary-hover)] shadow-lg shadow-[var(--accent-glow)]",
        secondary:
          "glass-pill text-white/90 hover:text-white hover:bg-white/10 hover:border-white/20",
        ghost:
          "text-white/70 hover:text-white hover:bg-white/5",
        outline:
          "border border-white/10 text-white/80 hover:bg-white/5 hover:text-white hover:border-white/20",
        destructive:
          "bg-red-500/20 text-red-300 border border-red-500/30 hover:bg-red-500/30",
        glow:
          "bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] text-white font-semibold glow-accent hover:brightness-110",
        icon:
          "p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-full",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 rounded-lg px-3 text-xs",
        lg: "h-12 rounded-2xl px-6 text-base",
        icon: "h-10 w-10 p-0 rounded-full",
        "icon-sm": "h-8 w-8 p-0 rounded-full",
        "icon-lg": "h-14 w-14 p-0 rounded-full",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
