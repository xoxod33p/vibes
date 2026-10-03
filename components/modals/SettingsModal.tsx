"use client";

import React, { useState, useEffect } from "react";
import {
  Settings,
  HardDrive,
  Trash2,
  Loader2,
  Palette,
  Check,
  Radio,
  AlertTriangle,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
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
  const {
    theme,
    setTheme,
    user,
    allSongs,
    refreshSongs,
    audioQuality,
    setAudioQuality,
  } = useAudio();
  const [cacheInfo, setCacheInfo] = useState<CacheInfo | null>(null);
  const [clearing, setClearing] = useState(false);
  const [clearingSongs, setClearingSongs] = useState(false);
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);

  const mySongsCount = user ? allSongs.filter((s) => s.user_id === user.id).length : 0;

  const themes: { id: ThemeId; name: string; shortName: string; color: string }[] = [
    { id: "theme-emerald", name: "Emerald Groove", shortName: "Emerald", color: "#10b981" },
    { id: "theme-violet", name: "Midnight Violet", shortName: "Violet", color: "#a855f7" },
    { id: "theme-cyan", name: "Electric Cyan", shortName: "Cyan", color: "#06b6d4" },
    { id: "theme-amber", name: "Cyberpunk Amber", shortName: "Amber", color: "#f59e0b" },
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
    setConfirmClearOpen(false);
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
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-[94vw] max-w-md max-h-[88vh] sm:max-h-[85vh] p-4 sm:p-6 rounded-3xl overflow-y-auto">
          <DialogHeader className="pr-6">
            <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Settings className="w-5 h-5 text-[var(--accent-primary)] shrink-0" />
              <span>Settings</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-neutral-400">
              Customize appearance, streaming quality, and storage
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 sm:gap-5 py-1">
            {/* Appearance & Color Themes */}
            <div className="flex flex-col gap-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
                <span>Theme & Accent Color</span>
              </h4>

              <div className="grid grid-cols-2 gap-2">
                {themes.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setTheme(t.id)}
                    type="button"
                    className={cn(
                      "flex items-center gap-2 p-2.5 sm:p-3 rounded-2xl border transition-all text-left cursor-pointer",
                      theme === t.id
                        ? "bg-[var(--accent-primary)]/15 border-[var(--accent-primary)]/40 shadow-sm text-white"
                        : "bg-white/5 border-white/5 hover:border-white/10 text-neutral-400 hover:text-white"
                    )}
                  >
                    <span
                      className="w-3.5 h-3.5 rounded-full border border-white/20 shrink-0"
                      style={{ backgroundColor: t.color }}
                    />
                    <span className="text-xs font-medium truncate flex-1">
                      <span className="sm:hidden">{t.shortName}</span>
                      <span className="hidden sm:inline">{t.name}</span>
                    </span>
                    {theme === t.id && (
                      <Check className="w-3.5 h-3.5 text-[var(--accent-primary)] shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Audio Quality Preferences */}
            <div className="flex flex-col gap-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
                <span>Streaming Quality</span>
              </h4>

              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "original", label: "Original", sub: "Lossless" },
                  { id: "320", label: "320 kbps", sub: "High" },
                  { id: "192", label: "192 kbps", sub: "Data Saver" },
                ].map((q) => (
                  <button
                    key={q.id}
                    onClick={() => setAudioQuality(q.id)}
                    type="button"
                    className={cn(
                      "flex flex-col items-center justify-center p-2 rounded-xl border transition-all cursor-pointer text-center",
                      audioQuality === q.id
                        ? "bg-[var(--accent-primary)]/15 border-[var(--accent-primary)]/40 text-white"
                        : "bg-white/5 border-white/5 hover:border-white/10 text-neutral-400 hover:text-white"
                    )}
                  >
                    <span className="text-xs font-semibold">{q.label}</span>
                    <span className="text-[10px] text-neutral-500 mt-0.5">{q.sub}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Storage & Cache */}
            <div className="flex flex-col gap-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
                <HardDrive className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
                <span>Storage Usage</span>
              </h4>

              <div className="glass-panel rounded-2xl p-3.5 sm:p-4 flex flex-col gap-2.5 border border-white/5">
                <div className="flex justify-between items-center text-xs sm:text-sm">
                  <span className="text-neutral-400">Uploads Library</span>
                  <span className="font-mono text-white">
                    {formatBytes(cacheInfo?.uploads?.size_bytes || 0)}
                  </span>
                </div>

                <div className="flex justify-between items-center text-xs sm:text-sm">
                  <span className="text-neutral-400">Transcode Cache</span>
                  <span className="font-mono text-white">
                    {cacheInfo?.transcode?.files || 0} files ({formatBytes(cacheInfo?.transcode?.size_bytes || 0)})
                  </span>
                </div>

                <div className="pt-2.5 border-t border-white/5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
                  {user && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setConfirmClearOpen(true)}
                      disabled={clearingSongs || mySongsCount === 0}
                      className="gap-1.5 text-xs border-red-500/30 text-red-400 hover:text-red-300 hover:bg-red-500/10 cursor-pointer w-full sm:w-auto h-8"
                    >
                      {clearingSongs ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                      ) : (
                        <Trash2 className="w-3.5 h-3.5 shrink-0" />
                      )}
                      <span>Clear My Songs ({mySongsCount})</span>
                    </Button>
                  )}

                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleClearCache}
                    disabled={clearing}
                    className="gap-1.5 text-xs cursor-pointer w-full sm:w-auto sm:ml-auto h-8"
                  >
                    {clearing ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5 shrink-0" />
                    )}
                    <span>Clear Cache</span>
                  </Button>
                </div>
              </div>
            </div>

          </div>
        </DialogContent>
      </Dialog>

      {/* In-app Confirmation Dialog for Clear My Songs */}
      <Dialog open={confirmClearOpen} onOpenChange={setConfirmClearOpen}>
        <DialogContent className="w-[90vw] max-w-sm p-5 sm:p-6 rounded-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2.5 text-white text-base sm:text-lg">
              <div className="w-8 h-8 rounded-xl bg-red-500/15 border border-red-500/30 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-4 h-4 text-red-400" />
              </div>
              Delete All My Songs
            </DialogTitle>
            <DialogDescription className="text-neutral-400 text-xs sm:text-sm pt-1">
              Permanently delete all <strong className="text-white">{mySongsCount} track{mySongsCount !== 1 ? "s" : ""}</strong> belonging to your account. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center gap-2 pt-3">
            <Button
              variant="ghost"
              size="sm"
              className="flex-1 text-xs"
              onClick={() => setConfirmClearOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              className="flex-1 gap-1.5 text-xs"
              onClick={handleClearMySongs}
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
