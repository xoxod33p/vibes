"use client";

import React from "react";
import { Music, ListMusic, Heart, User as UserIcon, DownloadCloud } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAudio } from "@/lib/audio-context";

interface MobileBottomNavProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  onOpenAuth: () => void;
  isLoggedIn: boolean;
}

export function MobileBottomNav({
  currentTab,
  onSelectTab,
  onOpenAuth,
  isLoggedIn,
}: MobileBottomNavProps) {
  const { activeDownloads } = useAudio();
  const activeDownloadCount = Object.values(activeDownloads).filter(
    (d) => d.status !== "ready" && d.status !== "error"
  ).length;

  const tabs = [
    { id: "library", label: "Library", icon: Music },
    { id: "playlists", label: "Playlists", icon: ListMusic },
    { id: "favorites", label: "Favorites", icon: Heart },
    { id: "downloads", label: "Downloads", icon: DownloadCloud },
    { id: "account", label: isLoggedIn ? "Account" : "Sign In", icon: UserIcon },
  ];

  const handleTabClick = (id: string) => {
    if (id === "account" && !isLoggedIn) {
      onOpenAuth();
    } else {
      onSelectTab(id);
    }
  };

  return (
    <>
      {/* Portrait: bottom bar */}
      <nav className="md:hidden landscape:hidden fixed bottom-0 left-0 right-0 h-16 glass-surface border-t border-white/5 flex items-center justify-around z-30 select-none px-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;
          const showBadge = tab.id === "downloads" && activeDownloadCount > 0;
          return (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              className={cn(
                "relative flex flex-col items-center justify-center gap-0.5 w-14 py-1 rounded-xl transition-all cursor-pointer",
                isActive ? "text-[var(--accent-primary)] font-semibold" : "text-neutral-400 hover:text-white"
              )}
            >
              <div className="relative">
                <Icon className={cn("w-5 h-5", isActive && tab.id === "favorites" && "fill-current")} />
                {showBadge && (
                  <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-[var(--accent-primary)] text-black text-[9px] font-bold flex items-center justify-center animate-pulse tabular-nums">
                    {activeDownloadCount > 9 ? "9+" : activeDownloadCount}
                  </span>
                )}
              </div>
              <span className="text-[9px] tracking-tight">{tab.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Landscape: left side rail */}
      <nav className="md:hidden portrait:hidden fixed left-0 top-0 bottom-0 w-14 glass-surface border-r border-white/5 flex flex-col items-center justify-center gap-1 z-30 select-none py-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;
          const showBadge = tab.id === "downloads" && activeDownloadCount > 0;
          return (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              title={tab.label}
              className={cn(
                "relative flex items-center justify-center w-10 h-10 rounded-xl transition-all cursor-pointer",
                isActive
                  ? "bg-[var(--accent-primary)]/15 text-[var(--accent-primary)] border border-[var(--accent-primary)]/30"
                  : "text-neutral-400 hover:text-white hover:bg-white/5"
              )}
            >
              <div className="relative">
                <Icon className={cn("w-5 h-5", isActive && tab.id === "favorites" && "fill-current")} />
                {showBadge && (
                  <span className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 rounded-full bg-[var(--accent-primary)] text-black text-[8px] font-bold flex items-center justify-center animate-pulse">
                    {activeDownloadCount > 9 ? "9+" : activeDownloadCount}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </nav>
    </>
  );
}
