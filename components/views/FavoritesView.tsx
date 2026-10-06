"use client";

import React, { useState, useEffect } from "react";
import { Heart, Play, Shuffle, Disc3 } from "lucide-react";
import { Song } from "@/lib/types";
import { useAudio } from "@/lib/audio-context";
import { TrackRow } from "./TrackRow";
import { Button } from "@/components/ui/button";

interface FavoritesViewProps {
  onEditSong: (song: Song) => void;
  onAddToPlaylist: (song: Song) => void;
  onOpenAuth?: () => void;
}

export function FavoritesView({ onEditSong, onAddToPlaylist }: FavoritesViewProps) {
  const { playSong, favorites } = useAudio();
  const [favoriteSongs, setFavoriteSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchFavorites = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/favorites");
      if (res.ok) {
        const data = await res.json();
        setFavoriteSongs(data);
      }
    } catch (e) {
      console.error("Failed to load favorites:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFavorites();
  }, [favorites]);

  const handlePlayAll = () => {
    if (favoriteSongs.length > 0) {
      playSong(favoriteSongs[0], favoriteSongs);
    }
  };

  const handleShuffleAll = () => {
    if (favoriteSongs.length > 0) {
      const shuffled = [...favoriteSongs].sort(() => Math.random() - 0.5);
      playSong(shuffled[0], shuffled);
    }
  };

  return (
    <div className="flex flex-col h-full min-h-0 w-full max-w-7xl mx-auto gap-4">
      {/* Fixed header */}
      <div className="flex items-center justify-between pt-2 shrink-0">
        <div>
          <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white">
            Favorite Tracks
          </h2>
          <p className="text-xs text-neutral-400 mt-1">Your liked songs collection</p>
        </div>

        {favoriteSongs.length > 0 && (
          <div className="flex items-center gap-2">
            <Button variant="default" size="sm" onClick={handlePlayAll} className="gap-2 h-9 px-4">
              <Play className="w-4 h-4 fill-current ml-0.5" />
              <span>Play All</span>
            </Button>
            <Button variant="secondary" size="sm" onClick={handleShuffleAll} className="gap-2 h-9 px-4">
              <Shuffle className="w-4 h-4" />
              <span>Shuffle</span>
            </Button>
          </div>
        )}
      </div>

      {/* Scrollable list only */}
      <div className="flex-1 overflow-y-auto min-h-0 pb-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-neutral-500">
            <div className="w-8 h-8 rounded-full border-2 border-red-500 border-t-transparent animate-spin" />
            <p className="text-sm">Loading favorites...</p>
          </div>
        ) : favoriteSongs.length > 0 ? (
          <div className="flex flex-col gap-1">
            {favoriteSongs.map((song, idx) => (
              <TrackRow
                key={song.id}
                song={song}
                index={idx}
                playlistContext={favoriteSongs}
                onEditSong={onEditSong}
                onAddToPlaylist={onAddToPlaylist}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-24 text-center px-4 glass-panel rounded-3xl border border-white/5 my-4">
            <div className="w-16 h-16 rounded-3xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-4">
              <Heart className="w-8 h-8 text-red-400" />
            </div>
            <h3 className="text-lg font-bold text-white mb-1">No favorite tracks yet</h3>
            <p className="text-xs text-neutral-400 max-w-sm mb-6">
              Click the heart icon on any song while listening to add it to your favorites.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
