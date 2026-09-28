"use client";

import React from "react";
import { Download, Settings } from "lucide-react";

interface MobileHeaderProps {
  onOpenYtdl: () => void;
  onOpenSettings: () => void;
}

export function MobileHeader({ onOpenYtdl, onOpenSettings }: MobileHeaderProps) {
  return (
    <header className="md:hidden landscape:hidden flex items-center justify-between px-4 py-3 glass-surface border-b border-white/5 sticky top-0 z-30 select-none">
      <div className="w-16" />

      <div className="flex items-center justify-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo.png"
          alt="Vibes Logo"
          className="h-6 w-auto object-contain mix-blend-screen select-none"
        />
      </div>

      <div className="flex items-center gap-1 w-16 justify-end">
        <button
          onClick={onOpenYtdl}
          className="p-2 rounded-xl text-neutral-300 hover:text-white cursor-pointer"
          title="Download Music & Playlists"
        >
          <Download className="w-4 h-4 text-[var(--accent-primary)]" />
        </button>

        <button
          onClick={onOpenSettings}
          className="p-2 rounded-xl text-neutral-300 hover:text-white cursor-pointer"
          title="Settings"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
