"use client";

import React from "react";
import Image from "next/image";
import { Disc3 } from "lucide-react";
import { cn } from "@/lib/utils";

interface VinylDiscProps {
  coverUrl?: string | null;
  isPlaying: boolean;
  size?: "sm" | "md" | "lg" | "xl";
  showTonearm?: boolean;
  className?: string;
}

export function VinylDisc({
  coverUrl,
  isPlaying,
  size = "lg",
  showTonearm = true,
  className,
}: VinylDiscProps) {
  const sizeMap = {
    sm: "w-20 h-20",
    md: "w-36 h-36",
    lg: "w-56 h-56 md:w-64 md:h-64",
    xl: "w-64 h-64 md:w-80 md:h-80",
  };

  const centerSizeMap = {
    sm: "w-8 h-8",
    md: "w-14 h-14",
    lg: "w-24 h-24 md:w-28 md:h-28",
    xl: "w-28 h-28 md:w-36 md:h-36",
  };

  return (
    <div className={cn("relative flex items-center justify-center select-none", className)}>
      {/* Vinyl Disc Container */}
      <div
        className={cn(
          "vinyl-record rounded-full p-2 transition-transform duration-700 ease-out flex items-center justify-center",
          sizeMap[size]
        )}
      >
        {/* Radial vinyl grooves sheen */}
        <div className="vinyl-sheen" />

        {/* Center Label (Album Art or Icon) */}
        <div
          className={cn(
            "relative rounded-full overflow-hidden border-2 border-[#222] shadow-inner flex items-center justify-center bg-[#151921] z-10",
            centerSizeMap[size]
          )}
        >
          {coverUrl ? (
            <Image
              src={coverUrl}
              alt="Album Artwork"
              fill
              className="object-cover"
              unoptimized
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-white/40">
              <Disc3 className="w-8 h-8 animate-pulse text-[var(--accent-primary)]" />
            </div>
          )}

          {/* Spindle hole */}
          <div className="absolute w-3 h-3 rounded-full bg-[#05070a] border border-white/20 shadow-md z-20" />
        </div>
      </div>

      {/* Realistic Tonearm */}
      {showTonearm && size !== "sm" && (
        <div
          className={cn(
            "absolute -top-3 -right-3 z-30 transition-transform duration-700 ease-in-out origin-top-right pointer-events-none drop-shadow-2xl",
            isPlaying ? "rotate-20 translate-x-1" : "rotate-0 translate-x-3"
          )}
        >
          {/* Tonearm base pivot */}
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-neutral-700 via-neutral-900 to-black border border-white/20 flex items-center justify-center shadow-lg">
            <div className="w-3 h-3 rounded-full bg-[var(--accent-primary)] shadow-sm" />
          </div>
          {/* Arm metallic beam */}
          <div className="w-1.5 h-24 bg-gradient-to-b from-neutral-400 via-neutral-600 to-neutral-800 ml-3.5 shadow-md -mt-1 origin-top rotate-[-12deg]" />
          {/* Cartridge & stylus needle */}
          <div className="w-4 h-6 bg-gradient-to-b from-neutral-800 to-black border border-white/30 rounded-xs ml-0 -mt-1 shadow-md flex items-end justify-center">
            <div className="w-0.5 h-1.5 bg-[var(--accent-primary)] shadow-sm" />
          </div>
        </div>
      )}
    </div>
  );
}
