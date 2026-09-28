"use client";

import React from "react";
import {
  Music,
  ListMusic,
  Heart,
  Download,
  Plus,
  Settings,
  User as UserIcon,
  LogOut,
  DownloadCloud,
} from "lucide-react";
import { useAudio } from "@/lib/audio-context";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface SidebarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  onOpenYtdl: () => void;
  onOpenCreatePlaylist: () => void;
  onOpenAuth: () => void;
  onOpenSettings: () => void;
}

export function Sidebar({
  currentTab,
  onSelectTab,
  onOpenYtdl,
  onOpenCreatePlaylist,
  onOpenAuth,
  onOpenSettings,
}: SidebarProps) {
  const { user, refreshUser, activeDownloads } = useAudio();
  const activeDownloadCount = Object.values(activeDownloads).filter(
    (d) => d.status !== "ready" && d.status !== "error"
  ).length;

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      try {
        localStorage.removeItem("vibes_token");
      } catch {}
      await refreshUser();
    } catch (e) {
      console.error("Logout failed:", e);
    }
  };

  return (
    <aside className="hidden md:flex flex-col justify-between w-64 h-screen border-r border-white/5 bg-[#080b12]/80 backdrop-blur-xl p-5 select-none shrink-0 z-30">
      {/* Top Section */}
      <div className="flex flex-col gap-6">
        {/* Brand Header with centered logo */}
        <div className="flex items-center justify-center py-2 px-2 border-b border-white/5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.png"
            alt="Vibes Logo"
            className="h-8 w-auto object-contain mix-blend-screen select-none"
          />
        </div>

        {/* Primary Navigation */}
        <nav className="flex flex-col gap-1">
          <button
            onClick={() => onSelectTab("library")}
            className={cn(
              "flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all text-left cursor-pointer",
              currentTab === "library"
                ? "bg-[var(--accent-primary)]/15 text-white border border-[var(--accent-primary)]/30 shadow-sm"
                : "text-neutral-400 hover:text-white hover:bg-white/5"
            )}
          >
            <Music className={cn("w-4 h-4", currentTab === "library" ? "text-[var(--accent-primary)]" : "")} />
            <span>Music Library</span>
          </button>

          <button
            onClick={() => onSelectTab("playlists")}
            className={cn(
              "flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all text-left cursor-pointer",
              currentTab === "playlists"
                ? "bg-[var(--accent-primary)]/15 text-white border border-[var(--accent-primary)]/30 shadow-sm"
                : "text-neutral-400 hover:text-white hover:bg-white/5"
            )}
          >
            <ListMusic className={cn("w-4 h-4", currentTab === "playlists" ? "text-[var(--accent-primary)]" : "")} />
            <span>Playlists</span>
          </button>

          <button
            onClick={() => onSelectTab("favorites")}
            className={cn(
              "flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all text-left cursor-pointer",
              currentTab === "favorites"
                ? "bg-[var(--accent-primary)]/15 text-white border border-[var(--accent-primary)]/30 shadow-sm"
                : "text-neutral-400 hover:text-white hover:bg-white/5"
            )}
          >
            <Heart className={cn("w-4 h-4", currentTab === "favorites" ? "text-red-400 fill-current" : "")} />
            <span>Favorites</span>
          </button>

          <button
            onClick={() => onSelectTab("downloads")}
            className={cn(
              "flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all text-left cursor-pointer",
              currentTab === "downloads"
                ? "bg-[var(--accent-primary)]/15 text-white border border-[var(--accent-primary)]/30 shadow-sm"
                : "text-neutral-400 hover:text-white hover:bg-white/5"
            )}
          >
            <DownloadCloud className={cn("w-4 h-4", currentTab === "downloads" ? "text-[var(--accent-primary)]" : "")} />
            <span className="flex-1">Downloads</span>
            {activeDownloadCount > 0 && (
              <span className="ml-auto px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-[var(--accent-primary)]/20 text-[var(--accent-primary)] tabular-nums min-w-[18px] text-center animate-pulse">
                {activeDownloadCount}
              </span>
            )}
          </button>
        </nav>

        {/* Quick Actions */}
        <div className="flex flex-col gap-2 pt-2 border-t border-white/5">
          <p className="px-3 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">
            Quick Actions
          </p>

          <Button
            variant="default"
            size="sm"
            onClick={onOpenYtdl}
            className="justify-start gap-2.5 h-9"
          >
            <Download className="w-4 h-4" />
            <span>Download Music</span>
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={onOpenCreatePlaylist}
            className="justify-start gap-2.5 h-9 text-neutral-300 hover:text-white"
          >
            <Plus className="w-4 h-4" />
            <span>New Playlist</span>
          </Button>
        </div>
      </div>

      {/* Bottom Profile / Account Section */}
      <div className="pt-4 border-t border-white/5 flex flex-col gap-2">
        <div className="flex items-center justify-between p-2 rounded-xl glass-pill">
          {user ? (
            <div className="flex items-center gap-3 min-w-0">
              <Avatar className="w-8 h-8">
                <AvatarFallback className="bg-[var(--accent-primary)]/30 text-[var(--accent-primary-hover)] font-bold">
                  {user.username.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 pr-1">
                <p className="text-xs font-semibold text-white truncate">{user.username}</p>
                <p className="text-[10px] text-neutral-400 truncate">{user.favorite_count || 0} Favorites</p>
              </div>
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="flex items-center gap-2.5 text-xs text-neutral-300 hover:text-white transition-colors cursor-pointer w-full text-left"
            >
              <UserIcon className="w-4 h-4 text-[var(--accent-primary)]" />
              <span>Sign in / Register</span>
            </button>
          )}

          <div className="flex items-center gap-1">
            <button
              onClick={onOpenSettings}
              className="p-1.5 rounded-lg hover:bg-white/10 text-neutral-400 hover:text-white transition-colors cursor-pointer"
              title="Settings & Cache"
            >
              <Settings className="w-4 h-4" />
            </button>

            {user && (
              <button
                onClick={handleLogout}
                className="p-1.5 rounded-lg hover:bg-red-500/10 text-neutral-400 hover:text-red-400 transition-colors cursor-pointer"
                title="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}
