"use client";

import React, { useState } from "react";
import {
  Download,
  Loader2,
  ClipboardPaste,
  PlaySquare,
  Radio,
  ListMusic,
  CheckCircle2,
  AlertCircle,
  FolderPlus,
  Sparkles,
  Music,
  Check,
  RotateCcw,
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
import { formatTime } from "@/lib/utils";
import { toast } from "sonner";

interface TrackItem {
  id: string;
  title: string;
  artist: string;
  album?: string;
  duration: number;
  url?: string;
  searchQuery?: string;
  coverUrl?: string | null;
  selected: boolean;
  status: "idle" | "downloading" | "done" | "error";
  errorMsg?: string;
}

interface InspectedMedia {
  source: "youtube" | "spotify";
  type: "track" | "playlist" | "album";
  title: string;
  creator: string;
  coverUrl: string | null;
  trackCount: number;
  tracks: TrackItem[];
}

interface YtdlModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function YtdlModal({ open, onOpenChange }: YtdlModalProps) {
  const { refreshSongs, refreshPlaylists } = useAudio();
  const [url, setUrl] = useState("");
  const [inspecting, setInspecting] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [inspected, setInspected] = useState<InspectedMedia | null>(null);

  // Playlist options
  const [createPlaylist, setCreatePlaylist] = useState(true);
  const [playlistName, setPlaylistName] = useState("");

  // Progress stats
  const [currentIndex, setCurrentIndex] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);
  const [currentTrackName, setCurrentTrackName] = useState("");

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setUrl(text.trim());
        triggerInspect(text.trim());
      }
    } catch {
      toast.error("Could not access clipboard");
    }
  };

  const triggerInspect = async (inputUrl?: string) => {
    const targetUrl = (inputUrl || url).trim();
    if (!targetUrl) {
      toast.error("Please enter a YouTube or Spotify URL");
      return;
    }

    setInspecting(true);
    setInspected(null);

    try {
      const res = await fetch("/api/media/inspect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: targetUrl }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        toast.error(data.error || "Failed to inspect link");
        return;
      }

      const tracksWithSelection: TrackItem[] = (data.tracks || []).map((t: TrackItem) => ({
        ...t,
        selected: true,
        status: "idle",
      }));

      setInspected({
        source: data.source,
        type: data.type,
        title: data.title,
        creator: data.creator,
        coverUrl: data.coverUrl,
        trackCount: tracksWithSelection.length,
        tracks: tracksWithSelection,
      });

      setPlaylistName(data.title || "Imported Playlist");
      setCreatePlaylist(data.type === "playlist" || data.type === "album");
    } catch (err) {
      console.error("Inspect error:", err);
      toast.error("Network error while inspecting media link");
    } finally {
      setInspecting(false);
    }
  };

  const toggleSelectTrack = (trackId: string) => {
    if (!inspected) return;
    setInspected({
      ...inspected,
      tracks: inspected.tracks.map((t) =>
        t.id === trackId ? { ...t, selected: !t.selected } : t
      ),
    });
  };

  const toggleSelectAll = (select: boolean) => {
    if (!inspected) return;
    setInspected({
      ...inspected,
      tracks: inspected.tracks.map((t) => ({ ...t, selected: select })),
    });
  };

  const handleStartDownload = async () => {
    if (!inspected) return;

    const selectedTracks = inspected.tracks.filter((t) => t.selected);
    if (selectedTracks.length === 0) {
      toast.error("Please select at least one track to download");
      return;
    }

    setDownloading(true);
    setCurrentIndex(0);
    setCompletedCount(0);

    let createdPlaylistId: string | null = null;
    const isMultiTrack =
      selectedTracks.length > 1 ||
      inspected.type === "playlist" ||
      inspected.type === "album";
    const targetPlaylistName = playlistName.trim() || inspected.title || "Imported Playlist";

    // 1. Automatically create playlist in library for any playlist/album or multi-track download
    if (isMultiTrack) {
      try {
        const plRes = await fetch("/api/playlists", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: targetPlaylistName }),
        });
        if (plRes.ok) {
          const plData = await plRes.json();
          createdPlaylistId = plData.id;
        }
      } catch (plErr) {
        console.warn("Could not auto-create playlist:", plErr);
      }
    }

    let successCount = 0;

    // 2. Download selected tracks sequentially
    for (let i = 0; i < selectedTracks.length; i++) {
      const track = selectedTracks[i];
      setCurrentIndex(i + 1);
      setCurrentTrackName(`${track.artist} - ${track.title}`);

      // Update track status to downloading
      setInspected((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          tracks: prev.tracks.map((t) =>
            t.id === track.id ? { ...t, status: "downloading" } : t
          ),
        };
      });

      try {
        const res = await fetch("/api/media/download", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            target: track.url || track.searchQuery,
            title: track.title,
            artist: track.artist,
            album: track.album || inspected.title,
            duration: track.duration,
            coverUrl: track.coverUrl || inspected.coverUrl,
            playlistId: createdPlaylistId,
          }),
        });

        const data = await res.json();
        if (res.ok && data.success) {
          successCount++;
          setCompletedCount(successCount);
          setInspected((prev) => {
            if (!prev) return null;
            return {
              ...prev,
              tracks: prev.tracks.map((t) =>
                t.id === track.id ? { ...t, status: "done" } : t
              ),
            };
          });
        } else {
          setInspected((prev) => {
            if (!prev) return null;
            return {
              ...prev,
              tracks: prev.tracks.map((t) =>
                t.id === track.id
                  ? { ...t, status: "error", errorMsg: data.error || "Failed" }
                  : t
              ),
            };
          });
        }
      } catch (dlErr) {
        console.error("Track download error:", dlErr);
        setInspected((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            tracks: prev.tracks.map((t) =>
              t.id === track.id
                ? { ...t, status: "error", errorMsg: "Network error" }
                : t
            ),
          };
        });
      }
    }

    setDownloading(false);
    await refreshSongs();
    await refreshPlaylists();

    if (successCount > 0) {
      if (createdPlaylistId) {
        toast.success(
          `Downloaded ${successCount} tracks and added to playlist "${targetPlaylistName}"!`
        );
      } else {
        toast.success(
          `Successfully downloaded ${successCount} track${successCount === 1 ? "" : "s"}!`
        );
      }
    } else {
      toast.error("Download failed for selected tracks.");
    }
  };

  const handleReset = () => {
    setInspected(null);
    setUrl("");
    setDownloading(false);
    setCompletedCount(0);
    setCurrentIndex(0);
  };

  const selectedCount = inspected?.tracks.filter((t) => t.selected).length || 0;
  const totalSelected = inspected?.tracks.filter((t) => t.selected).length || 0;
  const progressPercent = totalSelected > 0 ? Math.round((completedCount / totalSelected) * 100) : 0;

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!downloading) {
          onOpenChange(v);
          if (!v) handleReset();
        }
      }}
    >
      <DialogContent className="max-w-xl max-h-[85vh] flex flex-col p-6 overflow-hidden">
        <DialogHeader className="shrink-0 pb-1">
          <DialogTitle className="flex items-center gap-2.5 text-lg">
            <Download className="w-5 h-5 text-[var(--accent-primary)]" />
            <span>Playlist & Music Downloader</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-neutral-400">
            Paste links from YouTube or Spotify to import single tracks, albums, or full playlists.
          </DialogDescription>
        </DialogHeader>

        {/* Source Badges */}
        <div className="flex items-center gap-2 shrink-0 py-1">
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-[11px] font-medium text-red-400">
            <PlaySquare className="w-3.5 h-3.5" />
            <span>YouTube / Music</span>
          </span>
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[11px] font-medium text-emerald-400">
            <Radio className="w-3.5 h-3.5" />
            <span>Spotify (Tracks & Playlists)</span>
          </span>
        </div>

        {/* URL Input Bar */}
        <div className="flex gap-2 items-center shrink-0 pt-1">
          <div className="relative flex-1">
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !inspecting && !downloading && triggerInspect()}
              placeholder="Paste YouTube or Spotify playlist/track link..."
              disabled={inspecting || downloading}
              className="w-full pl-3.5 pr-20 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-[var(--accent-primary)] focus:ring-1 focus:ring-[var(--accent-primary)] transition-all"
            />
            <button
              onClick={handlePaste}
              type="button"
              disabled={inspecting || downloading}
              className="absolute right-2 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-lg glass-pill text-xs text-neutral-300 hover:text-white flex items-center gap-1 cursor-pointer transition-colors"
            >
              <ClipboardPaste className="w-3.5 h-3.5" />
              <span>Paste</span>
            </button>
          </div>

          <Button
            variant="default"
            size="sm"
            onClick={() => triggerInspect()}
            disabled={!url.trim() || inspecting || downloading}
            className="gap-1.5 h-10 px-4 shrink-0"
          >
            {inspecting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Analyzing...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Inspect</span>
              </>
            )}
          </Button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto min-h-0 mt-3 flex flex-col gap-3 pr-1">
          {/* Inspecting Spinner */}
          {inspecting && (
            <div className="flex flex-col items-center justify-center p-8 rounded-2xl bg-white/5 border border-white/10 text-center gap-3">
              <Loader2 className="w-8 h-8 text-[var(--accent-primary)] animate-spin" />
              <div>
                <p className="text-sm font-semibold text-white">Inspecting Link</p>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Fetching playlist tracklist, high-res artwork, and metadata...
                </p>
              </div>
            </div>
          )}

          {/* Inspected Preview */}
          {!inspecting && inspected && (
            <div className="flex flex-col gap-3">
              {/* Media Header Banner */}
              <div className="flex items-center gap-4 p-3.5 rounded-2xl bg-white/5 border border-white/10">
                <div className="w-16 h-16 rounded-xl overflow-hidden bg-neutral-900 border border-white/10 shrink-0 relative flex items-center justify-center">
                  {inspected.coverUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={inspected.coverUrl}
                      alt={inspected.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Music className="w-6 h-6 text-neutral-500" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-md bg-white/10 text-neutral-300">
                      {inspected.source === "spotify" ? "Spotify" : "YouTube"}{" "}
                      {inspected.type}
                    </span>
                    <span className="text-[10px] text-neutral-400">
                      {inspected.trackCount} {inspected.trackCount === 1 ? "track" : "tracks"}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-white truncate">{inspected.title}</h3>
                  <p className="text-xs text-neutral-400 truncate">{inspected.creator}</p>
                </div>
              </div>

              {/* Automatic Playlist Creation Info & Name Field */}
              {(inspected.tracks.length > 1 || inspected.type === "playlist" || inspected.type === "album") && (
                <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 flex flex-col gap-2">
                  <div className="flex items-center gap-2 text-xs font-semibold text-white">
                    <FolderPlus className="w-4 h-4 text-[var(--accent-primary)]" />
                    <span>Auto-Save to Playlist</span>
                  </div>
                  <input
                    type="text"
                    value={playlistName}
                    onChange={(e) => setPlaylistName(e.target.value)}
                    disabled={downloading}
                    placeholder="Playlist Name"
                    className="w-full px-3 py-1.5 text-xs rounded-lg bg-black/40 border border-white/10 text-white placeholder-neutral-500 focus:outline-none focus:border-[var(--accent-primary)]"
                  />
                  <p className="text-[11px] text-neutral-400">
                    Downloaded tracks will automatically be added to this playlist in your library.
                  </p>
                </div>
              )}

              {/* Track Selection Controls */}
              {inspected.tracks.length > 1 && (
                <div className="flex items-center justify-between text-xs px-1 text-neutral-400">
                  <span>
                    Selected: {selectedCount} of {inspected.tracks.length}
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => toggleSelectAll(true)}
                      disabled={downloading}
                      className="hover:text-white transition-colors cursor-pointer"
                    >
                      Select All
                    </button>
                    <span>•</span>
                    <button
                      onClick={() => toggleSelectAll(false)}
                      disabled={downloading}
                      className="hover:text-white transition-colors cursor-pointer"
                    >
                      Deselect All
                    </button>
                  </div>
                </div>
              )}

              {/* Track List */}
              <div className="flex flex-col gap-1 max-h-56 overflow-y-auto rounded-xl border border-white/5 p-1 bg-black/20">
                {inspected.tracks.map((track, idx) => (
                  <div
                    key={track.id}
                    onClick={() => !downloading && toggleSelectTrack(track.id)}
                    className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-colors cursor-pointer ${
                      track.selected ? "bg-white/5 hover:bg-white/10 text-white" : "opacity-40 text-neutral-400"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-2">
                      <input
                        type="checkbox"
                        checked={track.selected}
                        onChange={() => {}}
                        disabled={downloading}
                        className="w-3.5 h-3.5 rounded border-white/20 bg-white/10 accent-[var(--accent-primary)] cursor-pointer"
                      />
                      <span className="w-5 text-neutral-500 font-mono text-[11px]">
                        {idx + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate">{track.title}</p>
                        <p className="text-[11px] text-neutral-400 truncate">{track.artist}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {track.status === "downloading" && (
                        <Loader2 className="w-4 h-4 text-[var(--accent-primary)] animate-spin" />
                      )}
                      {track.status === "done" && (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      )}
                      {track.status === "error" && (
                        <span title={track.errorMsg}>
                          <AlertCircle className="w-4 h-4 text-red-400" />
                        </span>
                      )}
                      {track.status === "idle" && track.duration > 0 && (
                        <span className="text-[11px] text-neutral-500 font-mono">
                          {formatTime(track.duration)}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Live Download Progress Card */}
              {downloading && (
                <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 flex flex-col gap-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-neutral-300 font-medium flex items-center gap-1.5">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-[var(--accent-primary)]" />
                      <span>
                        Downloading {currentIndex} of {totalSelected}
                      </span>
                    </span>
                    <span className="font-mono text-neutral-400">{progressPercent}%</span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] transition-all duration-300"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>

                  <p className="text-[11px] text-neutral-400 truncate">
                    Track: <span className="text-white">{currentTrackName}</span>
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Initial State Helper */}
          {!inspecting && !inspected && (
            <div className="p-4 rounded-xl bg-white/5 border border-white/5 text-xs text-neutral-400 space-y-2">
              <div className="flex items-center gap-2 font-semibold text-neutral-300">
                <Sparkles className="w-4 h-4 text-[var(--accent-primary)]" />
                <span>How Playlist & Track Import Works</span>
              </div>
              <ul className="list-disc pl-4 space-y-1 text-neutral-400">
                <li>
                  <strong className="text-neutral-300">YouTube:</strong> Paste any video or full playlist URL.
                </li>
                <li>
                  <strong className="text-neutral-300">Spotify:</strong> Paste any song, album, or playlist URL. The tracks and high-res cover art are resolved and downloaded in high quality.
                </li>
                <li>
                  Playlists can automatically be saved as a new playlist inside your library.
                </li>
              </ul>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-white/5 shrink-0">
          <div>
            {inspected && !downloading && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleReset}
                className="gap-1.5 text-xs text-neutral-400 hover:text-white"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Clear / New Link</span>
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={downloading}
            >
              Close
            </Button>

            {inspected && (
              <Button
                variant="default"
                size="sm"
                onClick={handleStartDownload}
                disabled={downloading || selectedCount === 0}
                className="gap-2 px-5"
              >
                {downloading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>
                      Downloading ({completedCount}/{totalSelected})...
                    </span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <span>
                      {selectedCount === 1
                        ? "Download Track"
                        : `Download ${selectedCount} Tracks`}
                    </span>
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
