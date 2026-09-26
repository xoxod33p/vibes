"use client";

import React, { useState, useEffect } from "react";
import { Settings, HardDrive, Trash2, Keyboard, Sparkles, Loader2, Palette, Check } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CacheInfo } from "@/lib/types";
import { useAudio, ThemeId } from "@/lib/audio-context";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface SettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SettingsModal({ open, onOpenChange }: SettingsModalProps) {
  const { theme, setTheme, user, allSongs, refreshSongs } = useAudio();
  const [cacheInfo, setCacheInfo] = useState<CacheInfo | null>(null);
  const [clearing, setClearing] = useState(false);
  const [clearingSongs, setClearingSongs] = useState(false);

  const mySongsCount = user ? allSongs.filter((s) => s.user_id === user.id).length : 0;

  const themes: { id: ThemeId; name: string; color: string }[] = [
    { id: "theme-emerald", name: "Emerald Groove (Default)", color: "#10b981" },
    { id: "theme-violet", name: "Midnight Violet", color: "#a855f7" },
    { id: "theme-cyan", name: "Electric Cyan", color: "#06b6d4" },
    { id: "theme-amber", name: "Cyberpunk Amber", color: "#f59e0b" },
  ];

  const fetchCacheInfo = async () => {
    try {
      const res = await fetch("/api/cache/info");
      if (res.ok) {
        const data = await res.json();
        setCacheInfo(data);
      }
    } catch (e) {
      console.error("Failed to read cache info:", e);
    }
  };

  useEffect(() => {
    if (open) {
      fetchCacheInfo();
    }
  }, [open]);

  const handleClearCache = async () => {
    setClearing(true);
    try {
      const res = await fetch("/api/cache/clear", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target: "all" }),
      });
      if (res.ok) {
        toast.success("Cache cleared successfully");
        await fetchCacheInfo();
      } else {
        toast.error("Failed to clear cache");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setClearing(false);
    }
  };

  const handleClearMySongs = async () => {
    if (!user) return;
    if (
      !confirm(
        "Are you sure you want to permanently delete all songs uploaded or downloaded by your account? This action cannot be undone."
      )
    ) {
      return;
    }

    setClearingSongs(true);
    try {
      const res = await fetch("/api/songs", { method: "DELETE" });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(`Deleted ${data.count} track${data.count === 1 ? "" : "s"} belonging to your account!`);
        await refreshSongs();
        await fetchCacheInfo();
      } else {
        toast.error(data.error || "Failed to delete songs");
      }
    } catch {
      toast.error("Network error while deleting songs");
    } finally {
      setClearingSongs(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (!bytes) return "0 MB";
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-[var(--accent-primary)]" />
            <span>Settings</span>
          </DialogTitle>
          <DialogDescription>
            Appearance, audio cache, and keyboard shortcuts
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-5 py-2">
          {/* Appearance & Color Themes */}
          <div className="flex flex-col gap-2.5">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 flex items-center gap-2">
              <Palette className="w-4 h-4 text-[var(--accent-primary)]" />
              <span>Theme & Accent Color</span>
            </h4>

            <div className="grid grid-cols-2 gap-2">
              {themes.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTheme(t.id)}
                  type="button"
                  className={cn(
                    "flex items-center gap-2.5 p-3 rounded-2xl border transition-all text-left cursor-pointer",
                    theme === t.id
                      ? "bg-white/10 border-[var(--accent-primary)] shadow-md text-white"
                      : "bg-white/5 border-white/5 hover:border-white/10 text-neutral-400 hover:text-white"
                  )}
                >
                  <span
                    className="w-3.5 h-3.5 rounded-full border border-white/20 shrink-0"
                    style={{ backgroundColor: t.color }}
                  />
                  <span className="text-xs font-medium truncate flex-1">{t.name}</span>
                  {theme === t.id && (
                    <Check className="w-3.5 h-3.5 text-[var(--accent-primary)] shrink-0" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Storage & Cache */}
          <div className="flex flex-col gap-2.5">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-[var(--accent-primary)]" />
              <span>Storage Usage</span>
            </h4>

            <div className="glass-panel rounded-2xl p-4 flex flex-col gap-3 border border-white/5">
              <div className="flex justify-between items-center text-sm">
                <span className="text-neutral-400">Uploads Library</span>
                <span className="font-mono text-white">
                  {formatBytes(cacheInfo?.uploads?.size_bytes || 0)}
                </span>
              </div>

              <div className="flex justify-between items-center text-sm">
                <span className="text-neutral-400">Transcoded Variants</span>
                <span className="font-mono text-white">
                  {cacheInfo?.transcode?.files || 0} files ({formatBytes(cacheInfo?.transcode?.size_bytes || 0)})
                </span>
              </div>

              <div className="pt-2 border-t border-white/5 flex items-center justify-between flex-wrap gap-2">
                {user && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleClearMySongs}
                    disabled={clearingSongs || mySongsCount === 0}
                    className="gap-2 text-xs border-red-500/30 text-red-400 hover:text-red-300 hover:bg-red-500/10 cursor-pointer"
                  >
                    {clearingSongs ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
                    <span>Clear My Songs ({mySongsCount})</span>
                  </Button>
                )}

                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleClearCache}
                  disabled={clearing}
                  className="gap-2 text-xs ml-auto cursor-pointer"
                >
                  {clearing ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="w-3.5 h-3.5" />
                  )}
                  <span>Clear Transcode Cache</span>
                </Button>
              </div>
            </div>
          </div>

          {/* Keyboard Shortcuts Cheatsheet */}
          <div className="flex flex-col gap-2.5">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 flex items-center gap-2">
              <Keyboard className="w-4 h-4 text-[var(--accent-primary)]" />
              <span>Keyboard Shortcuts</span>
            </h4>

            <div className="glass-panel rounded-2xl p-3 border border-white/5 grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center justify-between p-1.5 rounded-lg bg-white/5">
                <span className="text-neutral-400">Play / Pause</span>
                <kbd className="px-1.5 py-0.5 rounded bg-white/10 font-mono text-white">Space</kbd>
              </div>

              <div className="flex items-center justify-between p-1.5 rounded-lg bg-white/5">
                <span className="text-neutral-400">Seek ±5s</span>
                <kbd className="px-1.5 py-0.5 rounded bg-white/10 font-mono text-white">← / →</kbd>
              </div>



              <div className="flex items-center justify-between p-1.5 rounded-lg bg-white/5">
                <span className="text-neutral-400">Like Track</span>
                <kbd className="px-1.5 py-0.5 rounded bg-white/10 font-mono text-white">L</kbd>
              </div>

              <div className="flex items-center justify-between p-1.5 rounded-lg bg-white/5">
                <span className="text-neutral-400">Shuffle / Repeat</span>
                <kbd className="px-1.5 py-0.5 rounded bg-white/10 font-mono text-white">S / R</kbd>
              </div>
            </div>
          </div>

          {/* Engine Info */}
          <div className="p-3 rounded-2xl bg-white/5 border border-white/5 text-xs text-neutral-400 flex items-center gap-3">
            <Sparkles className="w-5 h-5 text-[var(--accent-primary)] shrink-0" />
            <span>
              Built with Next.js, SQLite, and shadcn/ui.
            </span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
