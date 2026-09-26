"use client";

import React from "react";
import Image from "next/image";
import {
  ChevronDown,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Repeat1,
  Heart,
  ListMusic,
  SlidersHorizontal,
  Music,
} from "lucide-react";
import { useAudio } from "@/lib/audio-context";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { formatTime, cn } from "@/lib/utils";

interface FullscreenPlayerSheetProps {
  onOpenQueue: () => void;
}

export function FullscreenPlayerSheet({ onOpenQueue }: FullscreenPlayerSheetProps) {
  const {
    currentSong,
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    isShuffle,
    repeatMode,
    audioQuality,
    favorites,
    isMobileFullscreen,
    setIsMobileFullscreen,
    togglePlay,
    seek,
    nextTrack,
    prevTrack,
    setVolume,
    toggleMute,
    toggleShuffle,
    toggleRepeat,
    toggleFavorite,
    setAudioQuality,
  } = useAudio();

  if (!isMobileFullscreen || !currentSong) return null;

  const isFav = favorites.has(currentSong.id);
  const coverUrl = currentSong.cover ? `/api/covers/${encodeURIComponent(currentSong.cover)}` : null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-between bg-[#07090e]/95 backdrop-blur-2xl text-white p-6 md:p-12 animate-in fade-in slide-in-from-bottom duration-300 overflow-y-auto">
      {/* Top Ambient Glow Backdrop */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-[var(--accent-glow)] blur-3xl opacity-30 pointer-events-none" />

      {/* Top Bar Header */}
      <div className="relative flex items-center justify-between w-full max-w-2xl mx-auto z-10 shrink-0">
        <button
          onClick={() => setIsMobileFullscreen(false)}
          className="p-2.5 rounded-full glass-pill hover:bg-white/10 active:scale-90 transition-all text-neutral-300 hover:text-white"
          title="Collapse Player"
        >
          <ChevronDown className="w-6 h-6" />
        </button>

        <div className="text-center">
          <p className="text-xs uppercase tracking-widest text-neutral-400 font-medium">Now Playing</p>
          <Badge variant="glow" className="mt-0.5 text-[10px] px-2 py-0">
            {audioQuality === "original" ? "HQ AUDIO" : `${audioQuality} KBPS`}
          </Badge>
        </div>

        <button
          onClick={onOpenQueue}
          className="p-2.5 rounded-full glass-pill hover:bg-white/10 active:scale-90 transition-all text-neutral-300 hover:text-white"
          title="Queue"
        >
          <ListMusic className="w-5 h-5" />
        </button>
      </div>

      {/* Center: Full Album Cover Artwork Display */}
      <div className="relative flex-1 flex flex-col items-center justify-center my-6 min-h-[260px] z-10 select-none">
        <div className="relative group">
          {/* Ambient Glow from Album Artwork */}
          {coverUrl && (
            <div
              className={cn(
                "absolute -inset-4 rounded-3xl blur-3xl transition-opacity duration-700 pointer-events-none -z-10",
                isPlaying ? "opacity-60" : "opacity-25"
              )}
              style={{
                backgroundImage: `url(${coverUrl})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            />
          )}

          {/* Square Album Cover Card */}
          <div
            className={cn(
              "relative w-64 h-64 sm:w-72 sm:h-72 md:w-80 md:h-80 lg:w-92 lg:h-92 aspect-square rounded-3xl overflow-hidden border border-white/10 shadow-2xl shadow-black/80 transition-transform duration-500",
              isPlaying ? "scale-100" : "scale-95"
            )}
          >
            {coverUrl ? (
              <Image
                src={coverUrl}
                alt={currentSong.title}
                fill
                className="object-cover"
                unoptimized
                priority
              />
            ) : (
              <div className="w-full h-full bg-[#121622] flex flex-col items-center justify-center text-neutral-500">
                <Music className="w-16 h-16 text-[var(--accent-primary)]/60" />
              </div>
            )}
          </div>
        </div>

        {/* Equalizer Visualizer Bars */}
        <div className="flex items-center gap-1.5 mt-8 h-6">
          <div className={cn("w-1 rounded-full bg-[var(--accent-primary)]", isPlaying ? "eq-bar-1" : "h-1")} />
          <div className={cn("w-1 rounded-full bg-[var(--accent-primary)]", isPlaying ? "eq-bar-2" : "h-1")} />
          <div className={cn("w-1 rounded-full bg-[var(--accent-secondary)]", isPlaying ? "eq-bar-3" : "h-1")} />
          <div className={cn("w-1 rounded-full bg-[var(--accent-secondary)]", isPlaying ? "eq-bar-4" : "h-1")} />
          <div className={cn("w-1 rounded-full bg-[var(--accent-primary)]", isPlaying ? "eq-bar-2" : "h-1")} />
        </div>
      </div>

      {/* Bottom Section: Info, Scrubber, Controls */}
      <div className="w-full max-w-xl mx-auto flex flex-col gap-5 z-10 shrink-0">
        {/* Track Title, Artist & Like Button */}
        <div className="flex items-center justify-between">
          <div className="min-w-0 pr-4">
            <h2 className="text-xl md:text-2xl font-bold truncate text-white drop-shadow-md">
              {currentSong.title}
            </h2>
            <p className="text-sm md:text-base text-neutral-400 truncate">
              {currentSong.artist} • {currentSong.album}
            </p>
          </div>

          <button
            onClick={() => toggleFavorite(currentSong.id)}
            className={cn(
              "p-3 rounded-full glass-pill transition-all active:scale-90",
              isFav ? "text-red-400 border-red-500/30 bg-red-500/10 scale-110" : "text-neutral-400 hover:text-white"
            )}
            title={isFav ? "Remove Favorite" : "Add Favorite"}
          >
            <Heart className={cn("w-6 h-6", isFav && "fill-current")} />
          </button>
        </div>

        {/* Progress Bar & Time */}
        <div className="flex flex-col gap-1.5">
          <Slider
            value={[currentTime]}
            max={duration || 100}
            step={0.5}
            onValueChange={(val) => seek(val[0])}
            className="w-full py-2"
          />
          <div className="flex justify-between text-xs font-mono text-neutral-400">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Main Playback Controls */}
        <div className="flex items-center justify-between px-4">
          <button
            onClick={toggleShuffle}
            className={cn(
              "p-2.5 rounded-full transition-all active:scale-90",
              isShuffle ? "text-[var(--accent-primary)] bg-[var(--accent-primary)]/15" : "text-neutral-400 hover:text-white"
            )}
            title="Toggle Shuffle"
          >
            <Shuffle className="w-5 h-5" />
          </button>

          <button
            onClick={prevTrack}
            className="p-3 text-neutral-200 hover:text-white active:scale-90 transition-transform"
            title="Previous Track"
          >
            <SkipBack className="w-7 h-7 fill-current" />
          </button>

          {/* Central Big Play/Pause Button */}
          <button
            onClick={togglePlay}
            className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] flex items-center justify-center text-white glow-accent hover:scale-105 active:scale-95 transition-all shadow-2xl"
            title={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? (
              <Pause className="w-7 h-7 md:w-8 md:h-8 fill-current" />
            ) : (
              <Play className="w-7 h-7 md:w-8 md:h-8 fill-current ml-1" />
            )}
          </button>

          <button
            onClick={nextTrack}
            className="p-3 text-neutral-200 hover:text-white active:scale-90 transition-transform"
            title="Next Track"
          >
            <SkipForward className="w-7 h-7 fill-current" />
          </button>

          <button
            onClick={toggleRepeat}
            className={cn(
              "p-2.5 rounded-full transition-all active:scale-90",
              repeatMode !== "off" ? "text-[var(--accent-primary)] bg-[var(--accent-primary)]/15" : "text-neutral-400 hover:text-white"
            )}
            title={`Repeat mode: ${repeatMode}`}
          >
            {repeatMode === "one" ? <Repeat1 className="w-5 h-5" /> : <Repeat className="w-5 h-5" />}
          </button>
        </div>

        {/* Quality Selector Row */}
        <div className="flex items-center justify-center gap-1.5 pt-2 border-t border-white/5">
          {["original", "320", "192"].map((q) => (
            <button
              key={q}
              onClick={() => setAudioQuality(q)}
              className={cn(
                "text-xs px-3 py-1 rounded-lg font-mono transition-colors cursor-pointer",
                audioQuality === q
                  ? "bg-[var(--accent-primary)] text-white font-semibold"
                  : "text-neutral-400 hover:text-white hover:bg-white/5"
              )}
            >
              {q === "original" ? "Original" : `${q}k`}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
