"use client";

import React, { useState } from "react";
import { Search, Play, Shuffle, Music, Download, X } from "lucide-react";
import { Song } from "@/lib/types";
import { useAudio } from "@/lib/audio-context";
import { TrackRow } from "./TrackRow";
import { Button } from "@/components/ui/button";

interface LibraryViewProps {
  onEditSong: (song: Song) => void;
  onAddToPlaylist: (song: Song) => void;
  onDeleteSong: (song: Song) => void;
  onOpenYtdl: () => void;
}

export function LibraryView({
  onEditSong,
  onAddToPlaylist,
  onDeleteSong,
  onOpenYtdl,
}: LibraryViewProps) {
  const { allSongs, playSong, isLoadingSongs } = useAudio();
  const [searchQuery, setSearchQuery] = useState("");

  const filteredSongs = allSongs.filter((song) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      song.title.toLowerCase().includes(q) ||
      song.artist.toLowerCase().includes(q) ||
      song.album.toLowerCase().includes(q)
    );
  });

  const handlePlayAll = () => {
    if (filteredSongs.length > 0) {
      playSong(filteredSongs[0], filteredSongs);
    }
  };

  const handleShuffleAll = () => {
    if (filteredSongs.length > 0) {
      const shuffled = [...filteredSongs].sort(() => Math.random() - 0.5);
      playSong(shuffled[0], shuffled);
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto pb-32">
      {/* Top Banner & Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-2">
        <div>
          <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white">
            Music Library
          </h2>
        </div>

        {/* Search Bar */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tracks, artists, albums..."
            className="w-full pl-10 pr-9 py-2.5 rounded-2xl bg-white/5 border border-white/10 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-[var(--accent-primary)] focus:ring-1 focus:ring-[var(--accent-primary)] transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Action Bar (Play All / Shuffle / Import) */}
      <div className="flex items-center gap-2.5 overflow-x-auto no-scrollbar py-0.5">
        <Button
          variant="default"
          size="sm"
          onClick={handlePlayAll}
          disabled={filteredSongs.length === 0}
          className="gap-2 h-9 px-4 shrink-0 shadow-sm"
        >
          <Play className="w-4 h-4 fill-current ml-0.5" />
          <span>Play All</span>
        </Button>

        <Button
          variant="secondary"
          size="sm"
          onClick={handleShuffleAll}
          disabled={filteredSongs.length === 0}
          className="gap-2 h-9 px-4 shrink-0"
        >
          <Shuffle className="w-4 h-4" />
          <span>Shuffle</span>
        </Button>

        <Button
          variant="secondary"
          size="sm"
          onClick={onOpenYtdl}
          className="gap-2 h-9 text-xs px-3.5 shrink-0 bg-white/5 border border-white/10 hover:bg-white/10 text-white font-medium"
        >
          <Download className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
          <span>Import / Download</span>
        </Button>
      </div>

      {/* Table Headers */}
      {filteredSongs.length > 0 && (
        <div className="flex items-center justify-between px-4 py-2 text-xs font-semibold text-neutral-400 border-b border-white/5 uppercase tracking-wider select-none">
          <div className="flex items-center gap-4 flex-1">
            <span className="w-5 text-center">#</span>
            <span>Title & Artist</span>
          </div>
          <div className="hidden lg:block w-1/4 px-2">Album</div>
          <div className="flex items-center gap-3 pr-2">
            <span>Duration</span>
          </div>
        </div>
      )}

      {/* Song List */}
      {isLoadingSongs ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-neutral-500">
          <div className="w-8 h-8 rounded-full border-2 border-[var(--accent-primary)] border-t-transparent animate-spin" />
          <p className="text-sm">Loading tracks from library...</p>
        </div>
      ) : filteredSongs.length > 0 ? (
        <div className="flex flex-col gap-1">
          {filteredSongs.map((song, idx) => (
            <TrackRow
              key={song.id}
              song={song}
              index={idx}
              playlistContext={filteredSongs}
              onEditSong={onEditSong}
              onAddToPlaylist={onAddToPlaylist}
              onDeleteSong={onDeleteSong}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-24 text-center px-4 glass-panel rounded-3xl border border-white/5 my-4">
          <div className="w-16 h-16 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center mb-4">
            <Music className="w-8 h-8 text-[var(--accent-primary)]" />
          </div>
          <h3 className="text-lg font-bold text-white mb-1">
            {searchQuery ? "No matches found" : "Your library is empty"}
          </h3>
          <p className="text-xs text-neutral-400 max-w-sm mb-6">
            {searchQuery
              ? `No tracks match "${searchQuery}". Try a different search query.`
              : "Download audio directly from YouTube to build your collection."}
          </p>
          <div className="flex items-center gap-3">
            <Button variant="default" size="default" onClick={onOpenYtdl} className="gap-2 px-6">
              <Download className="w-4 h-4" />
              <span>Import YouTube Audio</span>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
