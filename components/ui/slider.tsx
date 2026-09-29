"use client";

import * as React from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";
import { cn } from "@/lib/utils";

const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root> & {
    showThumbOnHoverOnly?: boolean;
  }
>(({ className, showThumbOnHoverOnly = false, ...props }, ref) => (
  <SliderPrimitive.Root
    ref={ref}
    className={cn(
      "group relative flex w-full touch-none select-none items-center py-2 cursor-pointer",
      className
    )}
    {...props}
  >
    <SliderPrimitive.Track className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-white/10 transition-all duration-200 group-hover:h-2">
      <SliderPrimitive.Range className="absolute h-full bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)]" />
    </SliderPrimitive.Track>
    <SliderPrimitive.Thumb
      className={cn(
        "block h-3.5 w-3.5 rounded-full border-2 border-white bg-[var(--accent-primary)] shadow-md transition-[transform,opacity] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 group-hover:scale-125",
        showThumbOnHoverOnly ? "opacity-0 group-hover:opacity-100" : "opacity-100"
      )}
    />
  </SliderPrimitive.Root>
));
Slider.displayName = SliderPrimitive.Root.displayName;

export { Slider };
