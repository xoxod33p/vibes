"use client";

import React from "react";
import { ListPlus, ListMusic } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Song } from "@/lib/types";
import { useAudio } from "@/lib/audio-context";
import { toast } from "sonner";

interface AddToPlaylistModalProps {
  song: Song | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenCreatePlaylist: () => void;
}

export function AddToPlaylistModal({
  song,
  open,
  onOpenChange,
  onOpenCreatePlaylist,
}: AddToPlaylistModalProps) {
  const { playlists, refreshPlaylists } = useAudio();

  if (!song) return null;

  const handleAdd = async (playlistId: string, playlistName: string) => {
    try {
      const res = await fetch(`/api/playlists/${playlistId}/songs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ song_id: song.id }),
      });

      if (res.ok) {
        toast.success(`Added "${song.title}" to ${playlistName}`);
        await refreshPlaylists();
        onOpenChange(false);
      } else {
        toast.error("Failed to add song to playlist");
      }
    } catch {
      toast.error("Network error");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ListPlus className="w-5 h-5 text-[var(--accent-primary)]" />
            <span>Add to Playlist</span>
          </DialogTitle>
          <DialogDescription className="truncate">
            Select a playlist for &quot;{song.title}&quot;
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2 max-h-60 overflow-y-auto pr-1 py-1">
          {playlists.length > 0 ? (
            playlists.map((pl) => (
              <button
                key={pl.id}
                onClick={() => handleAdd(pl.id, pl.name)}
                className="flex items-center justify-between p-3 rounded-xl glass-pill hover:bg-white/10 hover:border-[var(--accent-primary)]/40 transition-all text-left cursor-pointer"
              >
                <div className="flex items-center gap-2.5 min-w-0 pr-2">
                  <ListMusic className="w-4 h-4 text-[var(--accent-primary)] shrink-0" />
                  <span className="text-sm font-medium text-white truncate">{pl.name}</span>
                </div>
                <span className="text-xs text-neutral-400 font-mono shrink-0">
                  {pl.song_count || 0} tracks
                </span>
              </button>
            ))
          ) : (
            <p className="text-xs text-neutral-400 text-center py-4">No playlists found.</p>
          )}
        </div>

        <div className="pt-2 border-t border-white/5 flex justify-between items-center">
          <button
            onClick={() => {
              onOpenChange(false);
              onOpenCreatePlaylist();
            }}
            className="text-xs text-[var(--accent-primary-hover)] hover:underline cursor-pointer"
          >
            + Create New Playlist
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
