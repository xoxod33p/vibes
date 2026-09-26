"use client";

import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";
import { Song, Playlist, User } from "./types";
import { toast } from "sonner";

export type RepeatMode = "off" | "all" | "one";
export type ThemeId = "theme-violet" | "theme-cyan" | "theme-emerald" | "theme-amber";

interface AudioContextType {
  currentSong: Song | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  queue: Song[];
  queueIndex: number;
  isShuffle: boolean;
  repeatMode: RepeatMode;
  audioQuality: string;
  theme: ThemeId;
  user: User | null;
  favorites: Set<string>;
  allSongs: Song[];
  playlists: Playlist[];
  isLoadingSongs: boolean;
  isMobileFullscreen: boolean;
  setIsMobileFullscreen: (open: boolean) => void;
  playSong: (song: Song, queueList?: Song[]) => void;
  togglePlay: () => void;
  pause: () => void;
  resume: () => void;
  seek: (time: number) => void;
  nextTrack: () => void;
  prevTrack: () => void;
  setVolume: (val: number) => void;
  toggleMute: () => void;
  toggleShuffle: () => void;
  toggleRepeat: () => void;
  setAudioQuality: (q: string) => void;
  setTheme: (theme: ThemeId) => void;
  addToQueue: (song: Song) => void;
  removeFromQueue: (index: number) => void;
  clearQueue: () => void;
  toggleFavorite: (songId: string) => Promise<boolean>;
  refreshSongs: (searchQuery?: string) => Promise<void>;
  refreshPlaylists: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AudioContext = createContext<AudioContextType | null>(null);

export function AudioProvider({ children }: { children: React.ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  // Ref so the one-time "ended" listener always calls the latest handleTrackEnded
  const handleTrackEndedRef = useRef<() => void>(() => {});

  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [volume, setVolumeState] = useState<number>(0.8);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [queue, setQueue] = useState<Song[]>([]);
  const [queueIndex, setQueueIndex] = useState<number>(-1);
  const [isShuffle, setIsShuffle] = useState<boolean>(false);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>("off");
  const [audioQuality, setAudioQualityState] = useState<string>("original");
  const [theme, setThemeState] = useState<ThemeId>("theme-emerald");
  const [user, setUser] = useState<User | null>(null);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [allSongs, setAllSongs] = useState<Song[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [isLoadingSongs, setIsLoadingSongs] = useState<boolean>(true);
  const [isMobileFullscreen, setIsMobileFullscreen] = useState<boolean>(false);

  // Initialize Audio element
  useEffect(() => {
    if (typeof window === "undefined") return;
    const audio = new Audio();
    audio.preload = "auto";
    audioRef.current = audio;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleLoadedMetadata = () => {
      if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
        setDuration(audio.duration);
      }
    };

    const handleEnded = () => {
      handleTrackEndedRef.current();
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);

    // Load saved preferences
    const savedTheme = localStorage.getItem("vibes_theme") as ThemeId;
    if (savedTheme) {
      setThemeState(savedTheme);
      document.documentElement.className = savedTheme;
    } else {
      document.documentElement.className = "theme-emerald";
    }

    const savedVol = localStorage.getItem("vibes_volume");
    if (savedVol) {
      const parsed = parseFloat(savedVol);
      if (!isNaN(parsed)) {
        audio.volume = parsed;
        setVolumeState(parsed);
      }
    } else {
      audio.volume = 0.8;
    }

    const savedQuality = localStorage.getItem("vibes_quality");
    if (savedQuality) {
      setAudioQualityState(savedQuality);
    }

    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
      audio.pause();
    };
  }, []);

  // Update theme class on HTML element
  const setTheme = (newTheme: ThemeId) => {
    setThemeState(newTheme);
    localStorage.setItem("vibes_theme", newTheme);
    document.documentElement.className = newTheme;
  };

  // Audio quality
  const setAudioQuality = (q: string) => {
    setAudioQualityState(q);
    localStorage.setItem("vibes_quality", q);
    toast.success(`Quality set to ${q === "original" ? "Original" : `${q} kbps`}`);
  };

  // Fetch initial songs, playlists, user, favorites
  const refreshSongs = useCallback(async (query: string = "") => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    try {
      setIsLoadingSongs(true);
      const url = query ? `/api/songs?q=${encodeURIComponent(query)}` : "/api/songs";
      const res = await fetch(url, { signal: controller.signal });
      if (res.ok) {
        const data = await res.json();
        setAllSongs(Array.isArray(data) ? data : []);
      } else {
        setAllSongs([]);
      }
    } catch (e) {
      console.error("Failed to load songs:", e);
      setAllSongs([]);
    } finally {
      clearTimeout(timeout);
      setIsLoadingSongs(false);
    }
  }, []);

  const refreshPlaylists = useCallback(async () => {
    try {
      const res = await fetch("/api/playlists");
      if (res.ok) {
        const data = await res.json();
        setPlaylists(data);
      }
    } catch (e) {
      console.error("Failed to load playlists:", e);
    }
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const data = await res.json();
        if (data.authenticated && data.user) {
          setUser(data.user);
          // Load favorites
          const favRes = await fetch("/api/favorites/ids");
          if (favRes.ok) {
            const favIds = await favRes.json();
            setFavorites(new Set(favIds));
          }
        } else {
          setUser(null);
          setFavorites(new Set());
        }
      }
    } catch (e) {
      console.error("Failed to check auth:", e);
    }
  }, []);

  useEffect(() => {
    refreshSongs();
    refreshPlaylists();
    refreshUser();
  }, [refreshSongs, refreshPlaylists, refreshUser]);

  // Poll for pending downloads every 3s and refresh when they complete
  useEffect(() => {
    const interval = setInterval(async () => {
      const pendingSongs = allSongs.filter((s) => s.status === "pending");
      if (pendingSongs.length === 0) return;

      let anyResolved = false;
      await Promise.all(
        pendingSongs.map(async (s) => {
          try {
            const res = await fetch(`/api/songs/${s.id}/status`);
            if (!res.ok) return;
            const data = await res.json();
            if (data.song?.status === "ready" || data.song?.status === "error") {
              anyResolved = true;
            }
          } catch { /* ignore */ }
        })
      );

      if (anyResolved) {
        await refreshSongs();
        await refreshPlaylists();
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [allSongs, refreshSongs, refreshPlaylists]);


  // Set audio source and play
  const playSong = useCallback(
    (song: Song, newQueue?: Song[]) => {
      const audio = audioRef.current;
      if (!audio) return;

      let queueToUse = queue;
      if (newQueue && newQueue.length > 0) {
        queueToUse = newQueue;
        setQueue(newQueue);
      } else if (queue.length === 0) {
        queueToUse = [song];
        setQueue([song]);
      }

      const idx = queueToUse.findIndex((s) => s.id === song.id);
      setQueueIndex(idx !== -1 ? idx : 0);
      setCurrentSong(song);

      const streamUrl = `/api/stream/${encodeURIComponent(song.filename)}${
        audioQuality !== "original" ? `?q=${audioQuality}` : ""
      }`;

      audio.src = streamUrl;
      audio.load();
      audio
        .play()
        .then(() => setIsPlaying(true))
        .catch((e) => {
          console.warn("Autoplay interrupted or failed:", e);
          setIsPlaying(false);
        });

      // Update Media Session API
      if (typeof window !== "undefined" && "mediaSession" in navigator) {
        const artwork = song.cover
          ? [{ src: `/api/covers/${encodeURIComponent(song.cover)}`, sizes: "512x512", type: "image/jpeg" }]
          : [];

        navigator.mediaSession.metadata = new MediaMetadata({
          title: song.title,
          artist: song.artist,
          album: song.album,
          artwork,
        });
      }
    },
    [queue, audioQuality]
  );

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      if (!audio.src && currentSong) {
        playSong(currentSong);
      } else {
        audio.play().catch(() => {});
      }
    } else {
      audio.pause();
    }
  };

  const pause = () => audioRef.current?.pause();
  const resume = () => audioRef.current?.play().catch(() => {});

  const seek = (time: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = time;
    setCurrentTime(time);
  };

  const nextTrack = useCallback(() => {
    if (queue.length === 0) return;
    let nextIdx: number;

    if (isShuffle) {
      nextIdx = Math.floor(Math.random() * queue.length);
    } else {
      nextIdx = queueIndex + 1;
      if (nextIdx >= queue.length) {
        if (repeatMode === "all") {
          nextIdx = 0;
        } else {
          return;
        }
      }
    }

    if (queue[nextIdx]) {
      playSong(queue[nextIdx]);
    }
  }, [queue, queueIndex, isShuffle, repeatMode, playSong]);

  const prevTrack = useCallback(() => {
    const audio = audioRef.current;
    if (audio && audio.currentTime > 3) {
      audio.currentTime = 0;
      setCurrentTime(0);
      return;
    }

    if (queue.length === 0) return;
    let prevIdx = queueIndex - 1;
    if (prevIdx < 0) {
      prevIdx = repeatMode === "all" ? queue.length - 1 : 0;
    }

    if (queue[prevIdx]) {
      playSong(queue[prevIdx]);
    }
  }, [queue, queueIndex, repeatMode, playSong]);


  const handleTrackEnded = useCallback(() => {
    if (repeatMode === "one") {
      const audio = audioRef.current;
      if (audio) {
        audio.currentTime = 0;
        audio.play().catch(() => {});
      }
    } else {
      nextTrack();
    }
  }, [repeatMode, nextTrack]);

  // Sync the ref whenever handleTrackEnded changes
  useEffect(() => {
    handleTrackEndedRef.current = handleTrackEnded;
  }, [handleTrackEnded]);

  const setVolume = (val: number) => {
    const clamped = Math.max(0, Math.min(1, val));
    setVolumeState(clamped);
    if (audioRef.current) {
      audioRef.current.volume = clamped;
    }
    localStorage.setItem("vibes_volume", clamped.toString());
    if (clamped > 0 && isMuted) {
      setIsMuted(false);
    }
  };

  const toggleMute = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isMuted) {
      audio.muted = false;
      setIsMuted(false);
    } else {
      audio.muted = true;
      setIsMuted(true);
    }
  };

  const toggleShuffle = () => {
    setIsShuffle((prev) => {
      const next = !prev;
      toast(next ? "Shuffle Enabled" : "Shuffle Disabled");
      return next;
    });
  };

  const toggleRepeat = () => {
    setRepeatMode((prev) => {
      if (prev === "off") {
        toast("Repeat All");
        return "all";
      }
      if (prev === "all") {
        toast("Repeat One");
        return "one";
      }
      toast("Repeat Off");
      return "off";
    });
  };

  const addToQueue = (song: Song) => {
    setQueue((prev) => [...prev, song]);
    toast.success(`Added "${song.title}" to queue`);
  };

  const removeFromQueue = (index: number) => {
    setQueue((prev) => prev.filter((_, i) => i !== index));
    if (index === queueIndex) {
      nextTrack();
    } else if (index < queueIndex) {
      setQueueIndex((prev) => prev - 1);
    }
  };

  const clearQueue = () => {
    setQueue([]);
    setQueueIndex(-1);
    toast("Queue cleared");
  };

  const toggleFavorite = async (songId: string): Promise<boolean> => {
    if (!user) {
      toast.error("Please login to save favorites");
      return false;
    }

    const isFav = favorites.has(songId);
    try {
      const res = await fetch(`/api/favorites/${songId}`, {
        method: isFav ? "DELETE" : "POST",
      });
      if (res.ok) {
        setFavorites((prev) => {
          const next = new Set(prev);
          if (isFav) {
            next.delete(songId);
            toast("Removed from Favorites");
          } else {
            next.add(songId);
            toast.success("Added to Favorites ❤️");
          }
          return next;
        });
        return !isFav;
      }
    } catch {
      toast.error("Failed to update favorite");
    }
    return isFav;
  };

  // Setup MediaSession handlers
  useEffect(() => {
    if (typeof window === "undefined" || !("mediaSession" in navigator)) return;
    navigator.mediaSession.setActionHandler("play", togglePlay);
    navigator.mediaSession.setActionHandler("pause", togglePlay);
    navigator.mediaSession.setActionHandler("previoustrack", prevTrack);
    navigator.mediaSession.setActionHandler("nexttrack", nextTrack);
    navigator.mediaSession.setActionHandler("seekto", (details) => {
      if (details.seekTime !== undefined) seek(details.seekTime);
    });
  }, [togglePlay, prevTrack, nextTrack]);

  // Desktop Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      if (e.code === "Space") {
        e.preventDefault();
        togglePlay();
      } else if (e.code === "ArrowRight") {
        e.preventDefault();
        seek(Math.min(duration, currentTime + 5));
      } else if (e.code === "ArrowLeft") {
        e.preventDefault();
        seek(Math.max(0, currentTime - 5));
      } else if (e.key === "l" || e.key === "L") {
        if (currentSong) {
          e.preventDefault();
          toggleFavorite(currentSong.id);
        }
      } else if (e.key === "s" || e.key === "S") {
        e.preventDefault();
        toggleShuffle();
      } else if (e.key === "r" || e.key === "R") {
        e.preventDefault();
        toggleRepeat();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentTime, duration, volume, isMuted, currentSong, favorites, user]);

  return (
    <AudioContext.Provider
      value={{
        currentSong,
        isPlaying,
        currentTime,
        duration,
        volume,
        isMuted,
        queue,
        queueIndex,
        isShuffle,
        repeatMode,
        audioQuality,
        theme,
        user,
        favorites,
        allSongs,
        playlists,
        isLoadingSongs,
        isMobileFullscreen,
        setIsMobileFullscreen,
        playSong,
        togglePlay,
        pause,
        resume,
        seek,
        nextTrack,
        prevTrack,
        setVolume,
        toggleMute,
        toggleShuffle,
        toggleRepeat,
        setAudioQuality,
        setTheme,
        addToQueue,
        removeFromQueue,
        clearQueue,
        toggleFavorite,
        refreshSongs,
        refreshPlaylists,
        refreshUser,
      }}
    >
      {children}
    </AudioContext.Provider>
  );
}

export function useAudio() {
  const context = useContext(AudioContext);
  if (!context) {
    throw new Error("useAudio must be used within an AudioProvider");
  }
  return context;
}
