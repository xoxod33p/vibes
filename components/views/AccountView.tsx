"use client";

import React, { useState } from "react";
import { User as UserIcon, LogOut, Heart, ListMusic, ShieldCheck, Trash2, Loader2 } from "lucide-react";
import { useAudio } from "@/lib/audio-context";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";

interface AccountViewProps {
  onOpenAuth: () => void;
  onOpenSettings: () => void;
}

export function AccountView({ onOpenAuth, onOpenSettings }: AccountViewProps) {
  const { user, refreshUser, allSongs, refreshSongs } = useAudio();
  const [clearing, setClearing] = useState(false);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      await refreshUser();
    } catch (e) {
      console.error("Logout failed:", e);
    }
  };

  const mySongsCount = user ? allSongs.filter((s) => s.user_id === user.id).length : 0;

  const handleClearMySongs = async () => {
    if (!user) return;
    if (
      !confirm(
        "Are you sure you want to permanently delete all songs belonging to your account? This will remove all your uploaded and downloaded audio files and cannot be undone."
      )
    ) {
      return;
    }

    setClearing(true);
    try {
      const res = await fetch("/api/songs", { method: "DELETE" });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(`Deleted ${data.count} track${data.count === 1 ? "" : "s"} belonging to your account!`);
        await refreshSongs();
      } else {
        toast.error(data.error || "Failed to delete songs");
      }
    } catch (e) {
      console.error("Failed to clear songs:", e);
      toast.error("Network error while deleting songs");
    } finally {
      setClearing(false);
    }
  };

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center px-6 glass-panel rounded-3xl border border-white/5 my-4 max-w-md mx-auto">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo.png"
          alt="Vibes Logo"
          className="h-10 w-auto object-contain mix-blend-screen select-none mb-4"
        />
        <h3 className="text-xl font-bold text-white mb-2">Guest Mode</h3>
        <p className="text-sm text-neutral-400 mb-6">
          Sign in or create an account to save playlists, like songs, and personalize your experience.
        </p>
        <Button variant="default" size="lg" onClick={onOpenAuth} className="w-full">
          Sign In / Create Account
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 w-full max-w-2xl mx-auto pb-32 pt-2">
      {/* User Card */}
      <div className="glass-panel rounded-3xl p-6 md:p-8 flex flex-col md:flex-row items-center gap-6 border border-white/10 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-[var(--accent-glow)] blur-3xl opacity-20 pointer-events-none" />

        <Avatar className="w-24 h-24 border-2 border-[var(--accent-primary)]">
          <AvatarFallback className="bg-[var(--accent-primary)]/20 text-3xl font-bold text-[var(--accent-primary-hover)]">
            {user.username.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>

        <div className="flex flex-col items-center md:items-start text-center md:text-left min-w-0 flex-1">
          <h2 className="text-2xl font-bold text-white">{user.username}</h2>
          {user.email && <p className="text-sm text-neutral-400">{user.email}</p>}
          <div className="flex items-center gap-2 mt-2 text-xs text-neutral-400">
            <ShieldCheck className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
            <span>Registered Member</span>
          </div>
        </div>

        <Button
          variant="destructive"
          size="sm"
          onClick={handleLogout}
          className="gap-2 shrink-0"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="glass-panel rounded-2xl p-5 border border-white/5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
            <Heart className="w-6 h-6 text-red-400 fill-current" />
          </div>
          <div>
            <p className="text-2xl font-bold text-white">{user.favorite_count || 0}</p>
            <p className="text-xs text-neutral-400">Favorites</p>
          </div>
        </div>

        <div className="glass-panel rounded-2xl p-5 border border-white/5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[var(--accent-primary)]/10 border border-[var(--accent-primary)]/20 flex items-center justify-center">
            <ListMusic className="w-6 h-6 text-[var(--accent-primary)]" />
          </div>
          <div>
            <p className="text-2xl font-bold text-white">{user.playlist_count || 0}</p>
            <p className="text-xs text-neutral-400">Playlists</p>
          </div>
        </div>
      </div>

      {/* Library Management / Clear Songs Danger Zone */}
      <div className="glass-panel rounded-2xl p-5 md:p-6 border border-white/5 flex flex-col gap-4">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Trash2 className="w-4 h-4 text-red-400" />
            <span>Library Storage Management</span>
          </h3>
          <p className="text-xs text-neutral-400 mt-1">
            Permanently delete all audio files and songs uploaded or downloaded under your account.
          </p>
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-white/5 flex-wrap gap-3">
          <div className="text-xs text-neutral-400">
            {mySongsCount > 0 ? (
              <span>
                Your library contains <strong className="text-white font-mono">{mySongsCount}</strong> song{mySongsCount === 1 ? "" : "s"} belonging to you.
              </span>
            ) : (
              <span>You currently have 0 personal tracks in the library.</span>
            )}
          </div>

          <Button
            variant="destructive"
            size="sm"
            onClick={handleClearMySongs}
            disabled={clearing || mySongsCount === 0}
            className="gap-2 text-xs"
          >
            {clearing ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Trash2 className="w-3.5 h-3.5" />
            )}
            <span>Clear All My Songs</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
