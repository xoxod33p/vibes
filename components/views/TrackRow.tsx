"use client";

import React from "react";
import Image from "next/image";
import {
  Play,
  Pause,
  Heart,
  MoreVertical,
  Plus,
  ListPlus,
  Edit2,
  Trash2,
  Disc3,
  Loader2,
} from "lucide-react";
import { Song } from "@/lib/types";
import { useAudio } from "@/lib/audio-context";
import { formatTime, cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface TrackRowProps {
  song: Song;
  index: number;
  playlistContext?: Song[];
  onEditSong?: (song: Song) => void;
  onAddToPlaylist?: (song: Song) => void;
  onDeleteSong?: (song: Song) => void;
  onRemoveFromPlaylist?: (song: Song) => void;
}

function TrackRowComponent({
  song,
  index,
  playlistContext,
  onEditSong,
  onAddToPlaylist,
  onDeleteSong,
  onRemoveFromPlaylist,
}: TrackRowProps) {
  const {
    currentSong,
    isPlaying,
    playSong,
    togglePlay,
    addToQueue,
    favorites,
    toggleFavorite,
  } = useAudio();

  const isCurrent = currentSong?.id === song.id;
  const isFav = favorites.has(song.id);
  const coverUrl = song.cover ? `/api/covers/${encodeURIComponent(song.cover)}` : null;

  const isPending = song.status === "pending";

  const handleRowClick = () => {
    if (isPending) return;
    if (isCurrent) {
      togglePlay();
    } else {
      playSong(song, playlistContext);
    }
  };

  return (
    <div
      onClick={handleRowClick}
      className={cn(
        "group flex items-center justify-between px-3 md:px-4 py-2.5 rounded-2xl transition-all select-none",
        isPending
          ? "opacity-60 cursor-default border border-white/5 bg-white/3"
          : isCurrent
          ? "bg-[var(--accent-primary)]/15 border border-[var(--accent-primary)]/30 text-white shadow-sm cursor-pointer"
          : "hover:bg-white/5 border border-transparent text-neutral-300 cursor-pointer"
      )}
    >
      {/* Left: Index / Equalizer + Thumbnail + Details */}
      <div className="flex items-center gap-3 md:gap-4 min-w-0 flex-1">
        {/* Track Index or Playing Indicator */}
        <div className="w-5 text-center shrink-0">
          {isPending ? (
            <Loader2 className="w-3.5 h-3.5 mx-auto text-[var(--accent-primary)] animate-spin" />
          ) : isCurrent && isPlaying ? (
            <div className="flex items-center justify-center gap-0.5 h-4">
              <span className="w-0.5 bg-[var(--accent-primary)] eq-bar-1" />
              <span className="w-0.5 bg-[var(--accent-primary)] eq-bar-2" />
              <span className="w-0.5 bg-[var(--accent-secondary)] eq-bar-3" />
            </div>
          ) : (
            <span className="text-xs font-mono text-neutral-500 group-hover:hidden">
              {index + 1}
            </span>
          )}
          {!isPending && (
            <span className="hidden group-hover:block text-neutral-200">
              {isCurrent && isPlaying ? (
                <Pause className="w-3.5 h-3.5 mx-auto fill-current" />
              ) : (
                <Play className="w-3.5 h-3.5 mx-auto fill-current ml-0.5" />
              )}
            </span>
          )}
        </div>

        {/* Thumbnail */}
        <div className="relative w-11 h-11 rounded-xl overflow-hidden shadow-md shrink-0 bg-[#10141f] border border-white/5">
          {coverUrl ? (
            <Image
              src={coverUrl}
              alt={song.title}
              fill
              className="object-cover"
              unoptimized
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Disc3 className="w-5 h-5 text-neutral-600" />
            </div>
          )}
        </div>

        {/* Title & Artist */}
        <div className="min-w-0 flex-1 pr-2">
          <div className="flex items-center gap-2">
            <p
              className={cn(
                "font-medium text-sm truncate",
                isCurrent ? "text-white font-semibold" : "text-neutral-200 group-hover:text-white"
              )}
            >
              {song.title}
            </p>
            {isPending && (
              <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--accent-primary)]/20 text-[var(--accent-primary)] border border-[var(--accent-primary)]/30 font-medium">
                Downloading
              </span>
            )}
          </div>
          <p className="text-xs text-neutral-400 truncate mt-0.5">{song.artist}</p>
        </div>
      </div>

      {/* Middle: Album (Hidden on mobile) */}
      <div className="hidden lg:block w-1/4 min-w-0 px-2">
        <p className="text-xs text-neutral-400 truncate">{song.album}</p>
      </div>

      {/* Right: Duration, Like, Menu */}
      <div className="flex items-center gap-2 md:gap-3 shrink-0" onClick={(e) => e.stopPropagation()}>
        <span className="text-xs font-mono text-neutral-400">
          {formatTime(song.duration)}
        </span>

        {/* Favorite Heart Button */}
        <button
          onClick={() => toggleFavorite(song.id)}
          className={cn(
            "p-1.5 rounded-full transition-colors cursor-pointer",
            isFav
              ? "text-red-400 hover:text-red-300"
              : "text-neutral-500 hover:text-white opacity-0 group-hover:opacity-100"
          )}
          title={isFav ? "Remove Favorite" : "Add Favorite"}
        >
          <Heart className={cn("w-4 h-4", isFav && "fill-current opacity-100")} />
        </button>

        {/* Action Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title="Track Options"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => addToQueue(song)}>
              <ListPlus className="w-4 h-4 mr-2" />
              <span>Add to Queue</span>
            </DropdownMenuItem>

            {onAddToPlaylist && (
              <DropdownMenuItem onClick={() => onAddToPlaylist(song)}>
                <Plus className="w-4 h-4 mr-2" />
                <span>Add to Playlist</span>
              </DropdownMenuItem>
            )}

            {onRemoveFromPlaylist && (
              <DropdownMenuItem onClick={() => onRemoveFromPlaylist(song)} className="text-red-400">
                <Trash2 className="w-4 h-4 mr-2" />
                <span>Remove from Playlist</span>
              </DropdownMenuItem>
            )}

            {onEditSong && (
              <DropdownMenuItem onClick={() => onEditSong(song)}>
                <Edit2 className="w-4 h-4 mr-2" />
                <span>Edit Metadata</span>
              </DropdownMenuItem>
            )}

            {onDeleteSong && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onDeleteSong(song)} className="text-red-400">
                  <Trash2 className="w-4 h-4 mr-2" />
                  <span>Delete Track</span>
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

export const TrackRow = React.memo(TrackRowComponent);
