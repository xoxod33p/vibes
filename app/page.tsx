"use client";

import React, { useState } from "react";
import { useAudio } from "@/lib/audio-context";
import { Song } from "@/lib/types";

// Layout components
import { Sidebar } from "@/components/layout/Sidebar";
import { MobileHeader } from "@/components/layout/MobileHeader";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";

// Player components
import { DesktopNowPlaying } from "@/components/player/DesktopNowPlaying";
import { MobileMiniPlayer } from "@/components/player/MobileMiniPlayer";
import { FullscreenPlayerSheet } from "@/components/player/FullscreenPlayerSheet";

// View components
import { LibraryView } from "@/components/views/LibraryView";
import { PlaylistsView } from "@/components/views/PlaylistsView";
import { FavoritesView } from "@/components/views/FavoritesView";
import { AccountView } from "@/components/views/AccountView";

// Modal components
import { YtdlModal } from "@/components/modals/YtdlModal";
import { AuthModal } from "@/components/modals/AuthModal";
import { CreatePlaylistModal } from "@/components/modals/CreatePlaylistModal";
import { AddToPlaylistModal } from "@/components/modals/AddToPlaylistModal";
import { EditSongModal } from "@/components/modals/EditSongModal";
import { QueueDrawer } from "@/components/modals/QueueDrawer";
import { SettingsModal } from "@/components/modals/SettingsModal";

import { toast } from "sonner";

export default function HomePage() {
  const { user, refreshSongs } = useAudio();

  const [currentTab, setCurrentTab] = useState<string>("library");

  // Modals state
  const [ytdlOpen, setYtdlOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [createPlaylistOpen, setCreatePlaylistOpen] = useState(false);
  const [addToPlaylistSong, setAddToPlaylistSong] = useState<Song | null>(null);
  const [editSong, setEditSong] = useState<Song | null>(null);
  const [queueOpen, setQueueOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const handleOpenYtdl = () => {
    if (!user) {
      toast.info("Please sign in or register to add new music");
      setAuthOpen(true);
    } else {
      setYtdlOpen(true);
    }
  };

  const handleDeleteSong = async (song: Song) => {
    if (!confirm(`Are you sure you want to delete "${song.title}"?`)) return;

    try {
      const res = await fetch(`/api/songs/${song.id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success(`Deleted "${song.title}"`);
        await refreshSongs();
      } else {
        toast.error("Failed to delete track");
      }
    } catch {
      toast.error("Network error");
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[var(--bg-base)]">
      {/* Desktop Sidebar */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        onOpenYtdl={handleOpenYtdl}
        onOpenCreatePlaylist={() => setCreatePlaylistOpen(true)}
        onOpenAuth={() => setAuthOpen(true)}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      {/* Main View Area */}
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden relative">
        {/* Mobile Header */}
        <MobileHeader
          onOpenYtdl={handleOpenYtdl}
          onOpenSettings={() => setSettingsOpen(true)}
        />

        {/* View Area - no scroll here, each view manages its own */}
        <main className="flex-1 flex flex-col min-h-0 px-4 md:px-8 py-4 md:py-6 overflow-hidden">
          {currentTab === "library" && (
            <LibraryView
              onEditSong={(song) => setEditSong(song)}
              onAddToPlaylist={(song) => setAddToPlaylistSong(song)}
              onDeleteSong={handleDeleteSong}
              onOpenYtdl={handleOpenYtdl}
            />
          )}

          {currentTab === "playlists" && (
            <PlaylistsView
              onOpenCreatePlaylist={() => setCreatePlaylistOpen(true)}
              onEditSong={(song) => setEditSong(song)}
            />
          )}

          {currentTab === "favorites" && (
            <FavoritesView
              onEditSong={(song) => setEditSong(song)}
              onAddToPlaylist={(song) => setAddToPlaylistSong(song)}
              onOpenAuth={() => setAuthOpen(true)}
            />
          )}

          {currentTab === "account" && (
            <AccountView
              onOpenAuth={() => setAuthOpen(true)}
              onOpenSettings={() => setSettingsOpen(true)}
            />
          )}
        </main>

        {/* Mobile Mini Player */}
        <MobileMiniPlayer />

        {/* Mobile Bottom Navigation */}
        <MobileBottomNav
          currentTab={currentTab}
          onSelectTab={setCurrentTab}
          onOpenAuth={() => setAuthOpen(true)}
          isLoggedIn={!!user}
        />

        {/* Desktop Fixed Player Bar */}
        <DesktopNowPlaying
          onOpenQueue={() => setQueueOpen(true)}
          onOpenSettings={() => setSettingsOpen(true)}
        />
      </div>

      {/* Immersive Turntable Fullscreen Sheet */}
      <FullscreenPlayerSheet onOpenQueue={() => setQueueOpen(true)} />

      {/* Modals & Dialogs */}
      <YtdlModal open={ytdlOpen} onOpenChange={setYtdlOpen} />
      <AuthModal open={authOpen} onOpenChange={setAuthOpen} />
      <CreatePlaylistModal open={createPlaylistOpen} onOpenChange={setCreatePlaylistOpen} />
      <AddToPlaylistModal
        song={addToPlaylistSong}
        open={!!addToPlaylistSong}
        onOpenChange={(open) => !open && setAddToPlaylistSong(null)}
        onOpenCreatePlaylist={() => setCreatePlaylistOpen(true)}
      />
      <EditSongModal
        song={editSong}
        open={!!editSong}
        onOpenChange={(open) => !open && setEditSong(null)}
      />
      <QueueDrawer open={queueOpen} onOpenChange={setQueueOpen} />
      <SettingsModal open={settingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  );
}
