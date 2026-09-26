"use client";

import React, { useState, useEffect } from "react";
import { Edit2, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Song } from "@/lib/types";
import { useAudio } from "@/lib/audio-context";
import { toast } from "sonner";

interface EditSongModalProps {
  song: Song | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditSongModal({ song, open, onOpenChange }: EditSongModalProps) {
  const { refreshSongs } = useAudio();
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [album, setAlbum] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (song) {
      setTitle(song.title || "");
      setArtist(song.artist || "");
      setAlbum(song.album || "");
    }
  }, [song]);

  if (!song) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch(`/api/songs/${song.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, artist, album }),
      });

      if (res.ok) {
        toast.success("Updated track details");
        await refreshSongs();
        onOpenChange(false);
      } else {
        toast.error("Failed to update song");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit2 className="w-5 h-5 text-[var(--accent-primary)]" />
            <span>Edit Track Information</span>
          </DialogTitle>
          <DialogDescription>
            Modify title, artist, or album metadata for this song.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSave} className="flex flex-col gap-3 py-2">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-neutral-300">Title</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-[var(--accent-primary)]"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-neutral-300">Artist</label>
            <input
              type="text"
              value={artist}
              onChange={(e) => setArtist(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-[var(--accent-primary)]"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-neutral-300">Album</label>
            <input
              type="text"
              value={album}
              onChange={(e) => setAlbum(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-[var(--accent-primary)]"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="default"
              size="sm"
              disabled={loading}
              className="px-5"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
