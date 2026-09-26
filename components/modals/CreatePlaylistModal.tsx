"use client";

import React, { useState } from "react";
import { Plus, ListMusic, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useAudio } from "@/lib/audio-context";
import { toast } from "sonner";

interface CreatePlaylistModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreatePlaylistModal({ open, onOpenChange }: CreatePlaylistModalProps) {
  const { refreshPlaylists } = useAudio();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);

    try {
      const res = await fetch("/api/playlists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });

      if (res.ok) {
        toast.success(`Created playlist "${name.trim()}"`);
        await refreshPlaylists();
        setName("");
        onOpenChange(false);
      } else {
        toast.error("Failed to create playlist");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5 text-[var(--accent-primary)]" />
            <span>New Playlist</span>
          </DialogTitle>
          <DialogDescription>
            Give your playlist a title to start curating tracks.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleCreate} className="flex flex-col gap-4 py-2">
          <input
            type="text"
            required
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="My Synthwave Mix"
            className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-[var(--accent-primary)]"
          />

          <div className="flex justify-end gap-2">
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
              disabled={!name.trim() || loading}
              className="gap-2 px-4"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
