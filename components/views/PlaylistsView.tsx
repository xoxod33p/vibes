"use client";

import React, { useState, useEffect } from "react";
import { ListMusic, Plus, Play, Trash2, ArrowLeft, Disc3, AlertTriangle } from "lucide-react";
import { Playlist, Song } from "@/lib/types";
import { useAudio } from "@/lib/audio-context";
import { TrackRow } from "./TrackRow";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface PlaylistsViewProps {
  onOpenCreatePlaylist: () => void;
  onEditSong: (song: Song) => void;
}

export function PlaylistsView({ onOpenCreatePlaylist, onEditSong }: PlaylistsViewProps) {
  const { playlists, refreshPlaylists, playSong } = useAudio();
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null);
  const [playlistSongs, setPlaylistSongs] = useState<Song[]>([]);
  const [loadingSongs, setLoadingSongs] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Playlist | null>(null);

  const fetchPlaylistSongs = async (pid: string) => {
    try {
      setLoadingSongs(true);
      const res = await fetch(`/api/playlists/${pid}/songs`);
      if (res.ok) {
        const data = await res.json();
        setPlaylistSongs(data);
      }
    } catch {
      toast.error("Failed to load playlist songs");
    } finally {
      setLoadingSongs(false);
    }
  };

  const handleSelectPlaylist = (p: Playlist) => {
    setSelectedPlaylist(p);
    fetchPlaylistSongs(p.id);
  };

  const handleDeletePlaylist = async () => {
    if (!deleteTarget) return;
    const p = deleteTarget;
    setDeleteTarget(null);
    try {
      const res = await fetch(`/api/playlists/${p.id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success(`Deleted playlist "${p.name}"`);
        refreshPlaylists();
        if (selectedPlaylist?.id === p.id) {
          setSelectedPlaylist(null);
        }
      }
    } catch {
      toast.error("Failed to delete playlist");
    }
  };

  const handleRemoveSongFromPlaylist = async (song: Song) => {
    if (!selectedPlaylist) return;
    try {
      const res = await fetch(`/api/playlists/${selectedPlaylist.id}/songs/${song.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast.success(`Removed "${song.title}" from playlist`);
        fetchPlaylistSongs(selectedPlaylist.id);
        refreshPlaylists();
      }
    } catch {
      toast.error("Failed to remove song from playlist");
    }
  };

  const handlePlayPlaylist = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (playlistSongs.length > 0) {
      playSong(playlistSongs[0], playlistSongs);
    }
  };

  // If a playlist is selected, display its tracks
  if (selectedPlaylist) {
    return (
      <div className="flex flex-col h-full min-h-0 w-full max-w-7xl mx-auto gap-4">
        {/* Fixed: Back Button & Playlist Info */}
        <div className="flex items-center gap-3 pt-2 shrink-0">
          <Button
            variant="secondary"
            size="icon-sm"
            onClick={() => setSelectedPlaylist(null)}
            className="rounded-full"
            title="Back to Playlists"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <p className="text-xs uppercase tracking-wider text-neutral-400 font-semibold">Playlist</p>
            <h2 className="text-2xl md:text-3xl font-extrabold text-white flex items-center gap-3">
              {selectedPlaylist.name}
            </h2>
          </div>
        </div>

        {/* Fixed: Action Bar */}
        <div className="flex items-center gap-3 shrink-0">
          <Button
            variant="default"
            size="sm"
            onClick={() => handlePlayPlaylist()}
            disabled={playlistSongs.length === 0}
            className="gap-2 h-9 px-4"
          >
            <Play className="w-4 h-4 fill-current ml-0.5" />
            <span>Play All</span>
          </Button>
        </div>

        {/* Scrollable: Track list only */}
        <div className="flex-1 overflow-y-auto min-h-0 pb-4">
          {loadingSongs ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-neutral-500">
              <div className="w-8 h-8 rounded-full border-2 border-[var(--accent-primary)] border-t-transparent animate-spin" />
              <p className="text-sm">Loading tracks...</p>
            </div>
          ) : playlistSongs.length > 0 ? (
            <div className="flex flex-col gap-1">
              {playlistSongs.map((song, idx) => (
                <TrackRow
                  key={song.id}
                  song={song}
                  index={idx}
                  playlistContext={playlistSongs}
                  onEditSong={onEditSong}
                  onRemoveFromPlaylist={handleRemoveSongFromPlaylist}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center glass-panel rounded-3xl p-6 border border-white/5">
              <Disc3 className="w-12 h-12 text-neutral-600 mb-3" />
              <h3 className="text-base font-semibold text-white">This playlist is empty</h3>
              <p className="text-xs text-neutral-400 mt-1">
                Add tracks to this playlist by clicking the options menu on any song in your library.
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Playlist Cards Grid
  return (
    <>
      <div className="flex flex-col h-full min-h-0 w-full max-w-7xl mx-auto gap-4">
        {/* Fixed header */}
        <div className="flex items-center justify-between pt-2 shrink-0">
          <div>
            <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
              Playlists
              <span className="text-xs px-2.5 py-1 rounded-full glass-pill text-neutral-400 font-mono font-medium">
                {playlists.length}
              </span>
            </h2>
            <p className="text-xs text-neutral-400 mt-1">Curated collections &amp; custom mixtapes</p>
          </div>

          <Button
            variant="default"
            size="sm"
            onClick={onOpenCreatePlaylist}
            className="gap-2 h-9"
          >
            <Plus className="w-4 h-4" />
            <span>New Playlist</span>
          </Button>
        </div>

        {/* Scrollable: grid only */}
        <div className="flex-1 overflow-y-auto min-h-0 pb-4">
          {playlists.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {playlists.map((playlist) => (
                <div
                  key={playlist.id}
                  onClick={() => handleSelectPlaylist(playlist)}
                  className="group glass-panel rounded-2xl p-4 flex flex-col gap-3 cursor-pointer hover:border-[var(--accent-primary)]/40 hover:bg-white/5 transition-all relative overflow-hidden"
                >
                  {/* Playlist Visual Thumbnail */}
                  <div className="relative aspect-square w-full rounded-xl bg-gradient-to-br from-[#121824] to-[#0c0f17] border border-white/5 flex items-center justify-center overflow-hidden shadow-inner group-hover:scale-[1.02] transition-transform">
                    <ListMusic className="w-12 h-12 text-[var(--accent-primary)]/70 group-hover:scale-110 transition-transform" />

                    {/* Floating Play Button on hover */}
                    <div className="absolute right-3 bottom-3 w-11 h-11 rounded-full bg-[var(--accent-primary)] text-white shadow-lg flex items-center justify-center opacity-0 group-hover:opacity-100 group-hover:translate-y-0 translate-y-2 transition-all duration-200">
                      <Play className="w-5 h-5 fill-current ml-0.5" />
                    </div>
                  </div>

                  {/* Title & Count */}
                  <div className="min-w-0">
                    <h4 className="font-semibold text-sm text-white truncate group-hover:text-[var(--accent-primary-hover)] transition-colors">
                      {playlist.name}
                    </h4>
                    <div className="flex items-center justify-between mt-1 text-xs text-neutral-400">
                      <span>{playlist.song_count || 0} tracks</span>
                      <button
                        onClick={(e) => { e.stopPropagation(); setDeleteTarget(playlist); }}
                        className="p-1 rounded-md text-neutral-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                        title="Delete Playlist"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-24 text-center px-4 glass-panel rounded-3xl border border-white/5 my-4">
              <div className="w-16 h-16 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center mb-4">
                <ListMusic className="w-8 h-8 text-[var(--accent-primary)]" />
              </div>
              <h3 className="text-lg font-bold text-white mb-1">No playlists yet</h3>
              <p className="text-xs text-neutral-400 max-w-sm mb-6">
                Create custom playlists to organize your favorite albums and genres.
              </p>
              <Button variant="default" size="sm" onClick={onOpenCreatePlaylist} className="gap-2">
                <Plus className="w-4 h-4" />
                <span>Create First Playlist</span>
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Delete Playlist Confirmation Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="max-w-sm p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2.5 text-white">
              <div className="w-9 h-9 rounded-xl bg-red-500/15 border border-red-500/30 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-400" />
              </div>
              Delete Playlist
            </DialogTitle>
            <DialogDescription className="text-neutral-400 text-sm pt-1">
              Are you sure you want to delete{" "}
              <strong className="text-white">&ldquo;{deleteTarget?.name}&rdquo;</strong>? The songs
              will remain in your library. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-2 pt-2">
            <Button
              variant="ghost"
              size="sm"
              className="flex-1"
              onClick={() => setDeleteTarget(null)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              className="flex-1 gap-2"
              onClick={handleDeletePlaylist}
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
