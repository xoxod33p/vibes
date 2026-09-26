"use client";

import React from "react";
import { Music, ListMusic, Heart, User as UserIcon } from "lucide-react";
import { cn } from "@/lib/utils";

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
  const tabs = [
    { id: "library", label: "Library", icon: Music },
    { id: "playlists", label: "Playlists", icon: ListMusic },
    { id: "favorites", label: "Favorites", icon: Heart },
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
    <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 glass-surface border-t border-white/5 flex items-center justify-around z-30 select-none px-2">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = currentTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => handleTabClick(tab.id)}
            className={cn(
              "flex flex-col items-center justify-center gap-1 w-16 py-1 rounded-xl transition-all cursor-pointer",
              isActive ? "text-[var(--accent-primary)] font-semibold" : "text-neutral-400 hover:text-white"
            )}
          >
            <Icon className={cn("w-5 h-5", isActive && tab.id === "favorites" && "fill-current")} />
            <span className="text-[10px] tracking-tight">{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
