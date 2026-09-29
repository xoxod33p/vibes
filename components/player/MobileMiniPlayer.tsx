"use client";

import React from "react";
import Image from "next/image";
import { Play, Pause, SkipForward, Disc3 } from "lucide-react";
import { useAudio, useAudioTime } from "@/lib/audio-context";
import { cn } from "@/lib/utils";

export function MobileMiniPlayer() {
  const { currentTime, duration } = useAudioTime();
  const {
    currentSong,
    isPlaying,
    togglePlay,
    nextTrack,
    setIsMobileFullscreen,
  } = useAudio();

  if (!currentSong) return null;

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const coverUrl = currentSong.cover ? `/api/covers/${encodeURIComponent(currentSong.cover)}` : null;

  return (
    <div className="md:hidden fixed bottom-18 landscape:bottom-2 left-3 landscape:left-16 right-3 z-40">
      <div
        onClick={() => setIsMobileFullscreen(true)}
        className="glass-panel rounded-2xl p-2 landscape:py-1.5 relative overflow-hidden shadow-2xl flex items-center gap-3 cursor-pointer border border-white/10 active:scale-[0.99] transition-transform"
      >
        {/* Top Progress Indicator */}
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-white/10">
          <div
            className="h-full bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] transition-all duration-150"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Mini Album Cover */}
        <div
          className="relative w-11 h-11 rounded-xl overflow-hidden shadow-md shrink-0 border border-white/10 flex items-center justify-center bg-[#10141f]"
        >
          {coverUrl ? (
            <Image
              src={coverUrl}
              alt={currentSong.title}
              fill
              className="object-cover"
              unoptimized
            />
          ) : (
            <Disc3 className="w-6 h-6 text-[var(--accent-primary)]" />
          )}
        </div>

        {/* Track Title and Artist */}
        <div className="flex-1 min-w-0 pr-1">
          <h4 className="text-sm font-semibold text-white truncate">{currentSong.title}</h4>
          <p className="text-xs text-neutral-400 truncate">{currentSong.artist}</p>
        </div>

        {/* Quick Controls */}
        <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={togglePlay}
            className="w-9 h-9 rounded-full bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] flex items-center justify-center text-white shadow-md active:scale-90 transition-transform"
            aria-label={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? (
              <Pause className="w-4 h-4 fill-current" />
            ) : (
              <Play className="w-4 h-4 fill-current ml-0.5" />
            )}
          </button>

          <button
            onClick={nextTrack}
            className="w-9 h-9 rounded-full flex items-center justify-center text-neutral-300 hover:text-white active:scale-90 transition-transform"
            aria-label="Next track"
          >
            <SkipForward className="w-4 h-4 fill-current" />
          </button>
        </div>
      </div>
    </div>
  );
}
