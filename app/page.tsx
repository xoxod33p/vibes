"use client";

import React, { useState } from "react";
import { useAudio } from "@/lib/audio-context";
import { Song } from "@/lib/types";

import dynamic from "next/dynamic";

// Layout components (core shell)
import { Sidebar } from "@/components/layout/Sidebar";
import { MobileHeader } from "@/components/layout/MobileHeader";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";

// Player components
import { DesktopNowPlaying } from "@/components/player/DesktopNowPlaying";
import { MobileMiniPlayer } from "@/components/player/MobileMiniPlayer";

// Core default view
import { LibraryView } from "@/components/views/LibraryView";

// Lazy-loaded secondary views
const PlaylistsView = dynamic(
  () => import("@/components/views/PlaylistsView").then((m) => m.PlaylistsView)
);
const FavoritesView = dynamic(
  () => import("@/components/views/FavoritesView").then((m) => m.FavoritesView)
);
const AccountView = dynamic(
  () => import("@/components/views/AccountView").then((m) => m.AccountView)
);
const DownloadsView = dynamic(
  () => import("@/components/views/DownloadsView").then((m) => m.DownloadsView)
);

// Lazy-loaded player overlays & modals
const FullscreenPlayerSheet = dynamic(
  () => import("@/components/player/FullscreenPlayerSheet").then((m) => m.FullscreenPlayerSheet)
);
const YtdlModal = dynamic(
  () => import("@/components/modals/YtdlModal").then((m) => m.YtdlModal)
);
const CreatePlaylistModal = dynamic(
  () => import("@/components/modals/CreatePlaylistModal").then((m) => m.CreatePlaylistModal)
);
const AddToPlaylistModal = dynamic(
  () => import("@/components/modals/AddToPlaylistModal").then((m) => m.AddToPlaylistModal)
);
const EditSongModal = dynamic(
  () => import("@/components/modals/EditSongModal").then((m) => m.EditSongModal)
);
const QueueDrawer = dynamic(
  () => import("@/components/modals/QueueDrawer").then((m) => m.QueueDrawer)
);
const SettingsModal = dynamic(
  () => import("@/components/modals/SettingsModal").then((m) => m.SettingsModal)
);

import { toast } from "sonner";

export default function HomePage() {
  const { user, refreshSongs } = useAudio();

  const [currentTab, setCurrentTab] = useState<string>("library");

  // Modals state
  const [ytdlOpen, setYtdlOpen] = useState(false);
  const [createPlaylistOpen, setCreatePlaylistOpen] = useState(false);
  const [addToPlaylistSong, setAddToPlaylistSong] = useState<Song | null>(null);
  const [editSong, setEditSong] = useState<Song | null>(null);
  const [queueOpen, setQueueOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const handleOpenYtdl = () => {
    setYtdlOpen(true);
  };

  const handleDeleteSong = async (song: Song) => {
    toast(`Delete "${song.title}"?`, {
      description: "This will permanently remove the audio file.",
      action: {
        label: "Delete",
        onClick: async () => {
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
        },
      },
      cancel: { label: "Cancel", onClick: () => {} },
    });
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[var(--bg-base)]">
      {/* Desktop Sidebar */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        onOpenYtdl={handleOpenYtdl}
        onOpenCreatePlaylist={() => setCreatePlaylistOpen(true)}
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
        <main className="flex-1 flex flex-col min-h-0 px-4 md:px-8 landscape:pl-16 landscape:pr-4 py-4 md:py-6 landscape:py-2 overflow-hidden">
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
            />
          )}

          {currentTab === "account" && (
            <AccountView
              onOpenSettings={() => setSettingsOpen(true)}
            />
          )}

          {currentTab === "downloads" && <DownloadsView />}
        </main>

        {/* Mobile Mini Player */}
        <MobileMiniPlayer />

        {/* Mobile Bottom Navigation */}
        <MobileBottomNav
          currentTab={currentTab}
          onSelectTab={setCurrentTab}
          onOpenAuth={() => {}}
          isLoggedIn={true}
        />

        {/* Desktop Fixed Player Bar */}
        <DesktopNowPlaying
          onOpenQueue={() => setQueueOpen(true)}
          onOpenSettings={() => setSettingsOpen(true)}
        />
      </div>

      {/* Immersive Turntable Fullscreen Sheet */}
      <FullscreenPlayerSheet onOpenQueue={() => setQueueOpen(true)} />

      {/* Modals & Dialogs - dynamically mounted when triggered */}
      {ytdlOpen && <YtdlModal open={ytdlOpen} onOpenChange={setYtdlOpen} />}
      {createPlaylistOpen && (
        <CreatePlaylistModal open={createPlaylistOpen} onOpenChange={setCreatePlaylistOpen} />
      )}
      {addToPlaylistSong && (
        <AddToPlaylistModal
          song={addToPlaylistSong}
          open={!!addToPlaylistSong}
          onOpenChange={(open) => !open && setAddToPlaylistSong(null)}
          onOpenCreatePlaylist={() => setCreatePlaylistOpen(true)}
        />
      )}
      {editSong && (
        <EditSongModal
          song={editSong}
          open={!!editSong}
          onOpenChange={(open) => !open && setEditSong(null)}
        />
      )}
      {queueOpen && <QueueDrawer open={queueOpen} onOpenChange={setQueueOpen} />}
      {settingsOpen && <SettingsModal open={settingsOpen} onOpenChange={setSettingsOpen} />}
    </div>
  );
}
