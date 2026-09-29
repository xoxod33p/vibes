"use client";

import React, { useState } from "react";
import Image from "next/image";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Repeat1,
  Heart,
  ListMusic,
  Disc3,
  SlidersHorizontal,
} from "lucide-react";
import { useAudio, useAudioTime } from "@/lib/audio-context";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatTime, cn } from "@/lib/utils";

interface DesktopNowPlayingProps {
  onOpenQueue: () => void;
  onOpenSettings: () => void;
}

export function DesktopNowPlaying({ onOpenQueue, onOpenSettings }: DesktopNowPlayingProps) {
  const { currentTime, duration } = useAudioTime();
  const {
    currentSong,
    isPlaying,
    volume,
    isMuted,
    isShuffle,
    repeatMode,
    audioQuality,
    favorites,
    queue,
    setIsMobileFullscreen,
    togglePlay,
    seek,
    nextTrack,
    prevTrack,
    setVolume,
    toggleMute,
    toggleShuffle,
    toggleRepeat,
    setAudioQuality,
    toggleFavorite,
  } = useAudio();

  const [isHovered, setIsHovered] = useState(false);

  if (!currentSong) {
    return (
      <footer className="hidden md:flex fixed bottom-0 left-0 md:left-64 right-0 h-24 bg-[#080b14] border-t border-white/10 items-center justify-between px-8 z-40 shadow-2xl">
        <div className="flex items-center gap-4 text-neutral-500">
          <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center">
            <Disc3 className="w-6 h-6 text-neutral-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-neutral-400">No track selected</p>
            <p className="text-xs text-neutral-600">Select a song to start playing</p>
          </div>
        </div>
      </footer>
    );
  }

  const isFav = favorites.has(currentSong.id);
  const coverUrl = currentSong.cover ? `/api/covers/${encodeURIComponent(currentSong.cover)}` : null;

  return (
    <footer
      className="hidden md:flex fixed bottom-0 left-0 md:left-64 right-0 h-24 bg-[#080b14] border-t border-white/10 items-center justify-between px-8 z-40 shadow-2xl"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Left: Track Details */}
      <div className="flex items-center gap-4 w-1/4 min-w-[240px]">
        <button
          onClick={() => setIsMobileFullscreen(true)}
          className="relative w-14 h-14 rounded-2xl overflow-hidden shadow-lg border border-white/10 group cursor-pointer shrink-0"
          title="Expand Now Playing"
        >
          {coverUrl ? (
            <Image
              src={coverUrl}
              alt={currentSong.title}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              unoptimized
            />
          ) : (
            <div className="w-full h-full bg-[#131926] flex items-center justify-center">
              <Disc3 className="w-6 h-6 text-[var(--accent-primary)]" />
            </div>
          )}
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <Disc3 className="w-5 h-5 text-white" />
          </div>
        </button>

        <div className="flex flex-col min-w-0 pr-2">
          <span className="font-semibold text-sm truncate text-white hover:underline cursor-pointer" onClick={() => setIsMobileFullscreen(true)}>
            {currentSong.title}
          </span>
          <span className="text-xs text-neutral-400 truncate">
            {currentSong.artist}
          </span>
          <div className="flex items-center gap-1.5 mt-0.5">
            <Badge variant="glow" className="text-[10px] py-0 px-1.5 font-mono">
              {audioQuality === "original" ? "HQ AUDIO" : `${audioQuality}k`}
            </Badge>
          </div>
        </div>

        <button
          onClick={() => toggleFavorite(currentSong.id)}
          className={cn(
            "p-2 rounded-full transition-all duration-200 cursor-pointer ml-auto",
            isFav
              ? "text-red-400 hover:text-red-300 hover:bg-red-500/10 scale-110"
              : "text-neutral-400 hover:text-white hover:bg-white/10"
          )}
          title={isFav ? "Remove Favorite" : "Add Favorite"}
        >
          <Heart className={cn("w-4 h-4", isFav && "fill-current")} />
        </button>
      </div>

      {/* Center: Playback Controls & Scrubber */}
      <div className="flex flex-col items-center gap-1 w-2/4 max-w-2xl px-4">
        {/* Buttons */}
        <div className="flex items-center gap-4">
          <button
            onClick={toggleShuffle}
            className={cn(
              "p-2 rounded-full transition-all cursor-pointer text-xs",
              isShuffle ? "text-[var(--accent-primary)] bg-[var(--accent-primary)]/10" : "text-neutral-400 hover:text-white"
            )}
            title={isShuffle ? "Shuffle On" : "Shuffle Off"}
          >
            <Shuffle className="w-4 h-4" />
          </button>

          <button
            onClick={prevTrack}
            className="p-2 text-neutral-300 hover:text-white transition-colors cursor-pointer"
            title="Previous Track (ArrowLeft)"
          >
            <SkipBack className="w-5 h-5 fill-current" />
          </button>

          <button
            onClick={togglePlay}
            className="w-12 h-12 rounded-full bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] flex items-center justify-center text-white glow-accent hover:scale-105 active:scale-95 transition-all cursor-pointer shadow-lg"
            title={isPlaying ? "Pause (Space)" : "Play (Space)"}
          >
            {isPlaying ? (
              <Pause className="w-5 h-5 fill-current" />
            ) : (
              <Play className="w-5 h-5 fill-current ml-0.5" />
            )}
          </button>

          <button
            onClick={nextTrack}
            className="p-2 text-neutral-300 hover:text-white transition-colors cursor-pointer"
            title="Next Track (ArrowRight)"
          >
            <SkipForward className="w-5 h-5 fill-current" />
          </button>

          <button
            onClick={toggleRepeat}
            className={cn(
              "p-2 rounded-full transition-all cursor-pointer",
              repeatMode !== "off"
                ? "text-[var(--accent-primary)] bg-[var(--accent-primary)]/10"
                : "text-neutral-400 hover:text-white"
            )}
            title={`Repeat: ${repeatMode}`}
          >
            {repeatMode === "one" ? (
              <Repeat1 className="w-4 h-4" />
            ) : (
              <Repeat className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Timeline Scrubber */}
        <div className="flex items-center gap-3 w-full">
          <span className="text-xs font-mono text-neutral-400 w-10 text-right">
            {formatTime(currentTime)}
          </span>
          <Slider
            value={[currentTime]}
            max={duration || 100}
            step={0.5}
            onValueChange={(val) => seek(val[0])}
            showThumbOnHoverOnly={!isHovered}
            className="w-full"
          />
          <span className="text-xs font-mono text-neutral-400 w-10 text-left">
            {formatTime(duration)}
          </span>
        </div>
      </div>

      {/* Right: Audio Quality, Volume & Extras */}
      <div className="flex items-center justify-end gap-3 w-1/4 min-w-[240px]">
        {/* Quality Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="text-xs text-neutral-300 gap-1.5 h-8 px-2 font-mono">
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>{audioQuality === "original" ? "Auto" : `${audioQuality}k`}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem onClick={() => setAudioQuality("original")}>
              Original / HQ
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setAudioQuality("320")}>
              320 kbps (High)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setAudioQuality("192")}>
              192 kbps (Standard)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setAudioQuality("128")}>
              128 kbps (Saver)
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>


        {/* Queue Button */}
        <Button
          variant="secondary"
          size="icon-sm"
          onClick={onOpenQueue}
          className="relative text-neutral-300 hover:text-white"
          title="Play Queue"
        >
          <ListMusic className="w-4 h-4" />
          {queue.length > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[var(--accent-primary)] text-white text-[10px] font-bold flex items-center justify-center">
              {queue.length}
            </span>
          )}
        </Button>

        {/* Fullscreen view button */}
        <Button
          variant="secondary"
          size="icon-sm"
          onClick={() => setIsMobileFullscreen(true)}
          className="text-neutral-300 hover:text-white"
          title="Fullscreen View"
        >
          <Disc3 className="w-4 h-4 text-[var(--accent-primary)]" />
        </Button>
      </div>
    </footer>
  );
}
