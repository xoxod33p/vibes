"use client";

import React, { createContext, useContext, useEffect, useRef, useState, useCallback, useMemo } from "react";
import { Song, Playlist, User, WsDownloadProgress } from "./types";
import { toast } from "sonner";

export type RepeatMode = "off" | "all" | "one";
export type ThemeId = "theme-violet" | "theme-cyan" | "theme-emerald" | "theme-amber";

export interface AudioTimeContextType {
  currentTime: number;
  duration: number;
}

const AudioTimeContext = createContext<AudioTimeContextType>({
  currentTime: 0,
  duration: 0,
});

export function useAudioTime() {
  return useContext(AudioTimeContext);
}

interface AudioContextType {
  currentSong: Song | null;
  isPlaying: boolean;
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
  activeDownloads: Record<string, WsDownloadProgress>;
  isWsConnected: boolean;
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
  getCurrentTime: () => number;
  getDuration: () => number;
}

const AudioContext = createContext<AudioContextType | null>(null);

export function AudioProvider({ children }: { children: React.ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  // Ref so the one-time "ended" listener always calls the latest handleTrackEnded
  const handleTrackEndedRef = useRef<() => void>(() => {});

  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const currentSongRef = useRef<Song | null>(null);
  useEffect(() => {
    currentSongRef.current = currentSong;
  }, [currentSong]);

  const [isPlaying, setIsPlaying] = useState<boolean>(false);
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
  const [activeDownloads, setActiveDownloads] = useState<Record<string, WsDownloadProgress>>({});
  const [isWsConnected, setIsWsConnected] = useState<boolean>(false);

  const [audioInstance, setAudioInstance] = useState<HTMLAudioElement | null>(null);

  // Initialize Audio element
  useEffect(() => {
    if (typeof window === "undefined") return;
    const audio = new Audio();
    audio.preload = "auto";
    audioRef.current = audio;
    setAudioInstance(audio);

    const handleEnded = () => {
      handleTrackEndedRef.current();
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

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
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
      audio.pause();
    };
  }, []);

  // Update theme class on HTML element
  const setTheme = useCallback((newTheme: ThemeId) => {
    setThemeState(newTheme);
    localStorage.setItem("vibes_theme", newTheme);
    document.documentElement.className = newTheme;
  }, []);

  // Audio quality
  const setAudioQuality = useCallback((q: string) => {
    setAudioQualityState(q);
    localStorage.setItem("vibes_quality", q);
    toast.success(`Quality set to ${q === "original" ? "Original" : `${q} kbps`}`);
  }, []);

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

function getAuthHeaders(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const token = localStorage.getItem("vibes_token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
}

  const refreshPlaylists = useCallback(async () => {
    try {
      const res = await fetch("/api/playlists", {
        headers: getAuthHeaders(),
      });
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
      const authHeaders = getAuthHeaders();
      const res = await fetch("/api/auth/me", {
        headers: {
          "Cache-Control": "no-cache",
          ...authHeaders,
        },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.authenticated && data.user) {
          setUser(data.user);
          // Load favorites
          const favRes = await fetch("/api/favorites/ids", {
            headers: authHeaders,
          });
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

  // Real-time WebSocket connection for instant download progress and notifications
  useEffect(() => {
    if (typeof window === "undefined") return;

    let ws: WebSocket | null = null;
    let reconnectTimeout: NodeJS.Timeout | null = null;
    let isDisposed = false;

    function connect() {
      if (isDisposed) return;
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${window.location.host}/api/ws`;

      try {
        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          setIsWsConnected(true);
        };

        ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data);
            if (msg.type === "sync" && msg.data?.downloads) {
              const map: Record<string, WsDownloadProgress> = {};
              for (const dl of msg.data.downloads) {
                map[dl.songId] = dl;
              }
              setActiveDownloads(map);
            } else if (msg.type === "download:progress" && msg.data) {
              const dl: WsDownloadProgress = msg.data;
              setActiveDownloads((prev) => ({
                ...prev,
                [dl.songId]: dl,
              }));
              if (dl.status === "ready" || dl.status === "error") {
                if (dl.status === "ready") {
                  refreshSongs();
                  refreshPlaylists();
                }
                setTimeout(() => {
                  setActiveDownloads((prev) => {
                    const next = { ...prev };
                    delete next[dl.songId];
                    return next;
                  });
                }, 4000);
              }
            } else if (msg.type === "download:complete") {
              const { songId } = msg.data;
              refreshSongs();
              refreshPlaylists();
              setTimeout(() => {
                setActiveDownloads((prev) => {
                  const next = { ...prev };
                  delete next[songId];
                  return next;
                });
              }, 3000);
            } else if (msg.type === "download:error") {
              refreshSongs();
              setTimeout(() => {
                setActiveDownloads((prev) => {
                  const next = { ...prev };
                  delete next[msg.data.songId];
                  return next;
                });
              }, 4000);
            } else if (msg.type === "songs:updated") {
              refreshSongs();
            } else if (msg.type === "playlists:updated") {
              refreshPlaylists();
            }
          } catch {}
        };

        ws.onclose = () => {
          setIsWsConnected(false);
          if (!isDisposed) {
            reconnectTimeout = setTimeout(connect, 3000);
          }
        };

        ws.onerror = () => {
          ws?.close();
        };
      } catch {
        if (!isDisposed) {
          reconnectTimeout = setTimeout(connect, 3000);
        }
      }
    }

    connect();

    return () => {
      isDisposed = true;
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (ws) {
        ws.onclose = null;
        ws.close();
      }
    };
  }, [refreshSongs, refreshPlaylists]);

  // Fallback: poll for pending downloads only if WebSocket is disconnected
  useEffect(() => {
    if (isWsConnected) return; // WebSocket provides instant real-time updates!

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
  }, [allSongs, refreshSongs, refreshPlaylists, isWsConnected]);


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

  const togglePlay = useCallback(() => {
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
  }, [currentSong, playSong]);

  const pause = useCallback(() => audioRef.current?.pause(), []);
  const resume = useCallback(() => audioRef.current?.play().catch(() => {}), []);

  const seek = useCallback((time: number) => {
    const audio = audioRef.current;
    if (!audio || isNaN(time) || !isFinite(time)) return;
    const target = Math.max(0, time);
    if (audio.readyState === 0) {
      const onLoaded = () => {
        try {
          audio.currentTime = Math.min(target, audio.duration && isFinite(audio.duration) ? audio.duration : target);
        } catch {}
        audio.removeEventListener("loadedmetadata", onLoaded);
      };
      audio.addEventListener("loadedmetadata", onLoaded);
      return;
    }
    try {
      audio.currentTime = Math.min(target, audio.duration && isFinite(audio.duration) ? audio.duration : target);
    } catch (e) {
      console.warn("Seek failed:", e);
    }
  }, []);

  const nextTrack = useCallback(() => {
    if (queue.length === 0) return;
    let nextIdx: number;

    if (isShuffle) {
      if (queue.length <= 1) {
        nextIdx = 0;
      } else {
        do {
          nextIdx = Math.floor(Math.random() * queue.length);
        } while (nextIdx === queueIndex);
      }
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

  const setVolume = useCallback((val: number) => {
    const clamped = Math.max(0, Math.min(1, val));
    setVolumeState(clamped);
    if (audioRef.current) {
      audioRef.current.volume = clamped;
    }
    localStorage.setItem("vibes_volume", clamped.toString());
    setIsMuted((prev) => (clamped > 0 && prev ? false : prev));
  }, []);

  const toggleMute = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    setIsMuted((prev) => {
      const next = !prev;
      audio.muted = next;
      return next;
    });
  }, []);

  const toggleShuffle = useCallback(() => {
    setIsShuffle((prev) => {
      const next = !prev;
      toast(next ? "Shuffle Enabled" : "Shuffle Disabled");
      return next;
    });
  }, []);

  const toggleRepeat = useCallback(() => {
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
  }, []);

  const addToQueue = useCallback((song: Song) => {
    setQueue((prev) => [...prev, song]);
    toast.success(`Added "${song.title}" to queue`);
  }, []);

  const removeFromQueue = useCallback((index: number) => {
    setQueue((prev) => prev.filter((_, i) => i !== index));
    setQueueIndex((prev) => {
      if (index === prev) {
        nextTrack();
        return prev;
      } else if (index < prev) {
        return prev - 1;
      }
      return prev;
    });
  }, [nextTrack]);

  const clearQueue = useCallback(() => {
    setQueue([]);
    setQueueIndex(-1);
    toast("Queue cleared");
  }, []);

  const toggleFavorite = useCallback(async (songId: string): Promise<boolean> => {
    if (!user) {
      toast.error("Please login to save favorites");
      return false;
    }

    const isFav = favorites.has(songId);
    try {
      const res = await fetch(`/api/favorites/${songId}`, {
        method: isFav ? "DELETE" : "POST",
        headers: getAuthHeaders(),
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
  }, [user, favorites]);

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
        const audio = audioRef.current;
        if (audio) {
          audio.currentTime = Math.min(audio.duration || 0, audio.currentTime + 5);
        }
      } else if (e.code === "ArrowLeft") {
        e.preventDefault();
        const audio = audioRef.current;
        if (audio) {
          audio.currentTime = Math.max(0, audio.currentTime - 5);
        }
      } else if (e.key === "l" || e.key === "L") {
        if (currentSongRef.current) {
          e.preventDefault();
          toggleFavorite(currentSongRef.current.id);
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
  }, [togglePlay, toggleShuffle, toggleRepeat, toggleFavorite]);

  const value = useMemo<AudioContextType>(
    () => ({
      currentSong,
      isPlaying,
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
      activeDownloads,
      isWsConnected,
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
      getCurrentTime: () => audioRef.current?.currentTime ?? 0,
      getDuration: () => audioRef.current?.duration ?? 0,
    }),
    [
      currentSong,
      isPlaying,
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
      activeDownloads,
      isWsConnected,
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
    ]
  );

  return (
    <AudioContext.Provider value={value}>
      <AudioTimeProvider
        audio={audioInstance}
        currentSongDuration={currentSong?.duration || 0}
        currentSongId={currentSong?.id}
      >
        {children}
      </AudioTimeProvider>
    </AudioContext.Provider>
  );
}

function AudioTimeProvider({
  audio,
  currentSongDuration,
  currentSongId,
  children,
}: {
  audio: HTMLAudioElement | null;
  currentSongDuration: number;
  currentSongId?: string;
  children: React.ReactNode;
}) {
  const [time, setTime] = useState<AudioTimeContextType>({
    currentTime: 0,
    duration: currentSongDuration,
  });

  // When song changes, immediately sync duration and reset time
  useEffect(() => {
    setTime({
      currentTime: 0,
      duration: currentSongDuration,
    });
  }, [currentSongId, currentSongDuration]);

  useEffect(() => {
    if (!audio) return;

    let lastTime = 0;
    const updateTime = (force = false) => {
      const cur = audio.currentTime;
      if (force || Math.abs(cur - lastTime) >= 0.2 || audio.paused) {
        lastTime = cur;
        const dur = audio.duration;
        const validDur = dur && !isNaN(dur) && isFinite(dur) && dur > 0 ? dur : currentSongDuration;
        setTime({
          currentTime: cur,
          duration: validDur,
        });
      }
    };

    const handleTimeUpdate = () => updateTime(false);
    const handleDurationChange = () => updateTime(true);
    const handleSeeking = () => updateTime(true);
    const handleSeeked = () => updateTime(true);
    const handlePlayPause = () => updateTime(true);

    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("loadedmetadata", handleDurationChange);
    audio.addEventListener("durationchange", handleDurationChange);
    audio.addEventListener("seeking", handleSeeking);
    audio.addEventListener("seeked", handleSeeked);
    audio.addEventListener("play", handlePlayPause);
    audio.addEventListener("pause", handlePlayPause);

    updateTime(true);

    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("loadedmetadata", handleDurationChange);
      audio.removeEventListener("durationchange", handleDurationChange);
      audio.removeEventListener("seeking", handleSeeking);
      audio.removeEventListener("seeked", handleSeeked);
      audio.removeEventListener("play", handlePlayPause);
      audio.removeEventListener("pause", handlePlayPause);
    };
  }, [audio, currentSongDuration]);

  return (
    <AudioTimeContext.Provider value={time}>
      {children}
    </AudioTimeContext.Provider>
  );
}

export function useAudio() {
  const context = useContext(AudioContext);
  if (!context) {
    throw new Error("useAudio must be used within an AudioProvider");
  }
  return context;
}
