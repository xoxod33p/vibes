"use client";

import React, { useState } from "react";
import { Heart, ListMusic, Music, Trash2, Loader2, AlertTriangle, Settings } from "lucide-react";
import { useAudio } from "@/lib/audio-context";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface AccountViewProps {
  onOpenAuth?: () => void;
  onOpenSettings: () => void;
}

export function AccountView({ onOpenSettings }: AccountViewProps) {
  const { allSongs, playlists, favorites, refreshSongs } = useAudio();
  const [clearing, setClearing] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const songsCount = allSongs.length;

  const handleClearAllSongs = async () => {
    setConfirmOpen(false);
    setClearing(true);
    try {
      const res = await fetch("/api/songs", { method: "DELETE" });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(`Deleted ${data.count} track${data.count === 1 ? "" : "s"} from your library!`);
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

  return (
    <>
      <div className="flex flex-col gap-6 w-full max-w-2xl mx-auto flex-1 min-h-0 overflow-y-auto pb-6 pt-2">
        {/* Profile Card */}
        <div className="glass-panel rounded-3xl p-6 md:p-8 flex flex-col md:flex-row items-center gap-6 border border-white/10 relative overflow-hidden shrink-0">
          <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-[var(--accent-glow)] blur-3xl opacity-20 pointer-events-none" />

          <Avatar className="w-20 h-20 border-2 border-[var(--accent-primary)]">
            <AvatarFallback className="bg-[var(--accent-primary)]/20 text-2xl font-bold text-[var(--accent-primary-hover)]">
              V
            </AvatarFallback>
          </Avatar>

          <div className="flex flex-col items-center md:items-start text-center md:text-left min-w-0 flex-1">
            <h2 className="text-2xl font-bold text-white">Vibes Music Library</h2>
            <p className="text-sm text-neutral-400">Offline JSON Database Mode</p>
            <div className="flex items-center gap-2 mt-2 text-xs text-neutral-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Authentication disabled • Free unlimited local playback</span>
            </div>
          </div>

          <Button
            variant="secondary"
            size="sm"
            onClick={onOpenSettings}
            className="gap-2 shrink-0"
          >
            <Settings className="w-4 h-4" />
            <span>Settings</span>
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-3 md:gap-4 shrink-0">
          <div className="glass-panel rounded-2xl p-4 md:p-5 border border-white/5 flex flex-col sm:flex-row items-center gap-3">
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-[var(--accent-primary)]/10 border border-[var(--accent-primary)]/20 flex items-center justify-center shrink-0">
              <Music className="w-5 h-5 md:w-6 md:h-6 text-[var(--accent-primary)]" />
            </div>
            <div className="text-center sm:text-left">
              <p className="text-xl md:text-2xl font-bold text-white">{songsCount}</p>
              <p className="text-xs text-neutral-400">Songs</p>
            </div>
          </div>

          <div className="glass-panel rounded-2xl p-4 md:p-5 border border-white/5 flex flex-col sm:flex-row items-center gap-3">
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
              <Heart className="w-5 h-5 md:w-6 md:h-6 text-red-400 fill-current" />
            </div>
            <div className="text-center sm:text-left">
              <p className="text-xl md:text-2xl font-bold text-white">{favorites.size}</p>
              <p className="text-xs text-neutral-400">Favorites</p>
            </div>
          </div>

          <div className="glass-panel rounded-2xl p-4 md:p-5 border border-white/5 flex flex-col sm:flex-row items-center gap-3">
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center shrink-0">
              <ListMusic className="w-5 h-5 md:w-6 md:h-6 text-sky-400" />
            </div>
            <div className="text-center sm:text-left">
              <p className="text-xl md:text-2xl font-bold text-white">{playlists.length}</p>
              <p className="text-xs text-neutral-400">Playlists</p>
            </div>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="glass-panel rounded-2xl p-5 md:p-6 border border-red-500/10 flex flex-col gap-4 shrink-0">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Trash2 className="w-4 h-4 text-red-400" />
              <span>Library Storage Management</span>
            </h3>
            <p className="text-xs text-neutral-400 mt-1">
              Permanently delete all audio files and song entries from your local library.
            </p>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-white/5 flex-wrap gap-3">
            <div className="text-xs text-neutral-400">
              {songsCount > 0 ? (
                <span>
                  Your library currently contains <strong className="text-white font-mono">{songsCount}</strong> track{songsCount === 1 ? "" : "s"}.
                </span>
              ) : (
                <span>Your library is currently empty.</span>
              )}
            </div>

            <Button
              variant="destructive"
              size="sm"
              onClick={() => setConfirmOpen(true)}
              disabled={clearing || songsCount === 0}
              className="gap-2 text-xs"
            >
              {clearing ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Trash2 className="w-3.5 h-3.5" />
              )}
              <span>Clear All Songs</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-sm p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2.5 text-white">
              <div className="w-9 h-9 rounded-xl bg-red-500/15 border border-red-500/30 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-400" />
              </div>
              Delete All Songs
            </DialogTitle>
            <DialogDescription className="text-neutral-400 text-sm pt-1">
              This will permanently delete all <strong className="text-white">{songsCount} song{songsCount !== 1 ? "s" : ""}</strong> from your local library, including audio files from disk. This cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center gap-2 pt-2">
            <Button
              variant="ghost"
              size="sm"
              className="flex-1"
              onClick={() => setConfirmOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              className="flex-1 gap-2"
              onClick={handleClearAllSongs}
            >
              <Trash2 className="w-3.5 h-3.5" />
              Yes, Delete All
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
