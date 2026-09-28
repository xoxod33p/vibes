"use client";

import React, { useState } from "react";
import {
  Download,
  Loader2,
  ClipboardPaste,
  PlaySquare,
  Radio,
  CheckCircle2,
  Sparkles,
  X,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useAudio } from "@/lib/audio-context";
import { toast } from "sonner";

interface YtdlModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function YtdlModal({ open, onOpenChange }: YtdlModalProps) {
  const { refreshSongs, refreshPlaylists } = useAudio();
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [queued, setQueued] = useState(0);

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) setUrl(text.trim());
    } catch {
      toast.error("Could not access clipboard");
    }
  };

  const handleDownload = async () => {
    const target = url.trim();
    if (!target) {
      toast.error("Please enter a YouTube or Spotify URL");
      return;
    }

    setLoading(true);
    setDone(false);
    setQueued(0);

    try {
      // 1. Inspect to resolve Spotify / get track list for playlists
      const inspectRes = await fetch("/api/media/inspect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: target }),
      });

      let tracks: Array<{
        id: string; title: string; artist: string; album?: string;
        duration: number; url?: string; searchQuery?: string; coverUrl?: string | null;
      }> = [];
      let playlistName = "";
      let coverUrl: string | null = null;
      let isPlaylist = false;
      let isAlbum = false;

      if (inspectRes.ok) {
        const data = await inspectRes.json();
        if (data.success && data.tracks?.length) {
          tracks = data.tracks;
          playlistName = data.title || "";
          coverUrl = data.coverUrl || null;
          isPlaylist = data.type === "playlist";
          isAlbum = data.type === "album";
        }
      }

      // Fallback: treat the URL as a single track
      if (tracks.length === 0) {
        tracks = [{ id: "direct", title: "", artist: "", duration: 0, url: target }];
      }

      const isMultiTrack = tracks.length > 1;
      let createdPlaylistId: string | null = null;

      // 2. Auto-create playlist for multi-track
      if (isMultiTrack && playlistName) {
        try {
          const plRes = await fetch("/api/playlists", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: playlistName }),
          });
          if (plRes.ok) {
            const plData = await plRes.json();
            createdPlaylistId = plData.id;
          }
        } catch { /* ignore */ }
      }

      // 3. Queue downloads one at a time (sequential)
      let successCount = 0;
      for (const track of tracks) {
        try {
          const res = await fetch("/api/media/download", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              target: track.url || track.searchQuery || `ytsearch1:${track.artist} - ${track.title} audio`,
              title: track.title || undefined,
              artist: track.artist || undefined,
              album: track.album || (isAlbum ? playlistName : undefined),
              duration: track.duration || undefined,
              coverUrl: track.coverUrl || (isAlbum ? coverUrl : undefined),
              playlistId: createdPlaylistId,
              isPlaylist,
            }),
          });
          if (res.ok || res.status === 202) successCount++;
        } catch {
          console.warn(`[ytdl] Failed to queue: ${track.title}`);
        }
      }
      setQueued(successCount);
      setDone(true);

      await refreshSongs();
      await refreshPlaylists();

      if (successCount > 0) {
        setTimeout(() => {
          onOpenChange(false);
          handleReset();
        }, 400);
      } else {
        setDone(false);
      }
    } catch (err) {
      console.error("Download error:", err);
      toast.error("Network error. Please try again.");
      setDone(false);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setUrl("");
    setDone(false);
    setQueued(0);
    setLoading(false);
  };

  const isYouTube = /youtube\.com|youtu\.be|music\.youtube/i.test(url);
  const isSpotify = /spotify\.com|spotify:/i.test(url);

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!loading) {
          onOpenChange(v);
          if (!v) handleReset();
        }
      }}
    >
      <DialogContent className="max-w-md p-6 overflow-hidden">
        <DialogHeader className="pb-2">
          <DialogTitle className="flex items-center gap-2.5 text-lg">
            <Download className="w-5 h-5 text-[var(--accent-primary)]" />
            <span>Download Music</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-neutral-400">
            Paste a YouTube or Spotify link to download instantly in the background.
          </DialogDescription>
        </DialogHeader>

        {/* Source Badges */}
        <div className="flex items-center gap-2 py-1">
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-[11px] font-medium text-red-400">
            <PlaySquare className="w-3.5 h-3.5" />
            <span>YouTube / Music</span>
          </span>
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[11px] font-medium text-emerald-400">
            <Radio className="w-3.5 h-3.5" />
            <span>Spotify</span>
          </span>
        </div>

        {/* URL Input */}
        <div className="flex gap-2 items-center pt-1">
          <div className="relative flex-1">
            <input
              type="text"
              value={url}
              onChange={(e) => { setUrl(e.target.value); setDone(false); }}
              onKeyDown={(e) => e.key === "Enter" && !loading && handleDownload()}
              placeholder="Paste YouTube or Spotify link..."
              disabled={loading}
              className="w-full pl-3.5 pr-9 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-[var(--accent-primary)] focus:ring-1 focus:ring-[var(--accent-primary)] transition-all"
            />
            {url && !loading && (
              <button
                onClick={() => { setUrl(""); setDone(false); }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <button
            onClick={handlePaste}
            disabled={loading}
            className="px-2.5 py-2.5 rounded-xl glass-pill text-xs text-neutral-300 hover:text-white flex items-center gap-1 cursor-pointer transition-colors shrink-0 border border-white/10"
          >
            <ClipboardPaste className="w-4 h-4" />
          </button>
        </div>

        {/* URL type indicator */}
        {url && (
          <p className="text-[11px] text-neutral-500 px-1">
            {isYouTube && "📺 YouTube link detected"}
            {isSpotify && "🎵 Spotify link detected"}
            {!isYouTube && !isSpotify && "🔗 Link detected — will attempt direct download"}
          </p>
        )}

        {/* Status */}
        {done && (
          <div className="flex items-center gap-2.5 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-sm text-emerald-400">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>
              {queued} track{queued !== 1 ? "s" : ""} queued — downloading in background
            </span>
          </div>
        )}

        {/* Info box */}
        {!url && !loading && (
          <div className="p-3.5 rounded-xl bg-white/5 border border-white/5 text-[11px] text-neutral-400 space-y-1.5">
            <div className="flex items-center gap-1.5 font-semibold text-neutral-300">
              <Sparkles className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
              <span>Supports</span>
            </div>
            <ul className="list-disc pl-4 space-y-1">
              <li>YouTube videos &amp; playlists</li>
              <li>YouTube Music tracks &amp; albums</li>
              <li>Spotify tracks, albums &amp; playlists</li>
            </ul>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/5">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={handleDownload}
            disabled={!url.trim() || loading}
            className="gap-2 px-5"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Queuing...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>Download</span>
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
