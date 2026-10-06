import path from "node:path";
import fs from "node:fs";
import type { Song, Playlist } from "./types";

const BASE_DIR = process.cwd();
const UPLOAD_FOLDER = path.join(BASE_DIR, "uploads");
const COVERS_FOLDER = path.join(BASE_DIR, "public", "covers");
const TRANSCODE_DIR = path.join(BASE_DIR, "cache", "transcode");
const DATA_DIR = path.join(BASE_DIR, "data");
const DB_FILE = path.join(DATA_DIR, "music-db.json");

for (const dir of [UPLOAD_FOLDER, COVERS_FOLDER, TRANSCODE_DIR, DATA_DIR]) {
  if (!fs.existsSync(/*turbopackIgnore: true*/ dir)) {
    try {
      fs.mkdirSync(/*turbopackIgnore: true*/ dir, { recursive: true });
    } catch {}
  }
}

export interface PlaylistSongItem {
  playlist_id: string;
  song_id: string;
  position: number;
}

export interface FavoriteItem {
  song_id: string;
  created_at: string;
}

export interface DbData {
  songs: Song[];
  playlists: Playlist[];
  playlist_songs: PlaylistSongItem[];
  favorites: FavoriteItem[];
}

declare global {
  var __vibes_json_db: DbData | undefined;
}

function loadDb(): DbData {
  if (globalThis.__vibes_json_db) {
    return globalThis.__vibes_json_db;
  }

  let data: DbData = {
    songs: [],
    playlists: [],
    playlist_songs: [],
    favorites: [],
  };

  try {
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, "utf-8");
      data = JSON.parse(raw);
      if (!Array.isArray(data.songs)) data.songs = [];
      if (!Array.isArray(data.playlists)) data.playlists = [];
      if (!Array.isArray(data.playlist_songs)) data.playlist_songs = [];
      if (!Array.isArray(data.favorites)) data.favorites = [];
    } else {
      // Auto-scan uploads folder if empty database to preserve existing tracks
      data = scanExistingUploads(data);
      saveDb(data);
    }
  } catch (err) {
    console.error("[json-db] Failed to read database file:", err);
  }

  globalThis.__vibes_json_db = data;
  return data;
}

function scanExistingUploads(data: DbData): DbData {
  try {
    if (fs.existsSync(UPLOAD_FOLDER)) {
      const files = fs.readdirSync(UPLOAD_FOLDER);
      const audioFiles = files.filter(
        (f) =>
          !f.endsWith(".pending") &&
          (f.endsWith(".mp3") || f.endsWith(".webm") || f.endsWith(".m4a") || f.endsWith(".opus") || f.endsWith(".wav") || f.endsWith(".flac"))
      );

      for (const filename of audioFiles) {
        const id = filename.replace(/\.[^/.]+$/, "");
        const coverCandidate = `${id}.jpg`;
        const hasCover = fs.existsSync(path.join(COVERS_FOLDER, coverCandidate));

        // Format clean title from filename
        const cleanTitle = id
          .replace(/^ytdl_/, "Track ")
          .replace(/[_-]/g, " ")
          .trim();

        data.songs.push({
          id,
          title: cleanTitle,
          artist: "Unknown Artist",
          album: "Local Library",
          duration: 0,
          filename,
          cover: hasCover ? coverCandidate : null,
          status: "ready",
          uploaded_at: new Date().toISOString(),
        });
      }
    }
  } catch (err) {
    console.warn("[json-db] Could not scan uploads:", err);
  }
  return data;
}

function saveDb(data: DbData): void {
  try {
    const tempFile = `${DB_FILE}.tmp.${Date.now()}`;
    fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), "utf-8");
    fs.renameSync(tempFile, DB_FILE);
  } catch (err) {
    console.error("[json-db] Failed to save database file:", err);
  }
}

// ---------------------------------------------------------------------------
// Songs Database
// ---------------------------------------------------------------------------
export const songsDb = {
  list(q?: string): Song[] {
    const db = loadDb();
    let songs = db.songs.filter((s) => s.status !== "pending");

    if (q && q.trim()) {
      const term = q.toLowerCase().trim();
      songs = songs.filter(
        (s) =>
          s.title?.toLowerCase().includes(term) ||
          s.artist?.toLowerCase().includes(term) ||
          s.album?.toLowerCase().includes(term)
      );
    }

    return [...songs].sort((a, b) => {
      const tA = new Date(a.uploaded_at || 0).getTime();
      const tB = new Date(b.uploaded_at || 0).getTime();
      return tB - tA;
    });
  },

  findById(id: string): Song | null {
    if (!id) return null;
    const db = loadDb();
    return db.songs.find((s) => s.id === id) || null;
  },

  create(song: Partial<Song> & { id: string; title: string; filename: string }): Song {
    const db = loadDb();
    const record: Song = {
      id: song.id,
      title: song.title,
      artist: song.artist || "Unknown Artist",
      album: song.album || "Unknown Album",
      duration: song.duration ?? 0,
      filename: song.filename,
      cover: song.cover ?? null,
      status: song.status || "ready",
      uploaded_at: song.uploaded_at || new Date().toISOString(),
    };

    const idx = db.songs.findIndex((s) => s.id === song.id);
    if (idx >= 0) {
      db.songs[idx] = record;
    } else {
      db.songs.push(record);
    }

    saveDb(db);
    return record;
  },

  update(id: string, updates: Partial<Song>): void {
    if (!id) return;
    const db = loadDb();
    const idx = db.songs.findIndex((s) => s.id === id);
    if (idx >= 0) {
      db.songs[idx] = { ...db.songs[idx], ...updates };
      saveDb(db);
    }
  },

  delete(id: string): void {
    if (!id) return;
    const db = loadDb();
    db.songs = db.songs.filter((s) => s.id !== id);
    db.playlist_songs = db.playlist_songs.filter((ps) => ps.song_id !== id);
    db.favorites = db.favorites.filter((f) => f.song_id !== id);
    saveDb(db);
  },

  deleteAll(): Song[] {
    const db = loadDb();
    const removed = [...db.songs];
    db.songs = [];
    db.playlist_songs = [];
    db.favorites = [];
    saveDb(db);
    return removed;
  },

  getStatus(id: string): Song | null {
    return songsDb.findById(id);
  },
};

// ---------------------------------------------------------------------------
// Playlists Database
// ---------------------------------------------------------------------------
export const playlistsDb = {
  list(): (Playlist & { song_count: number })[] {
    const db = loadDb();
    const list = db.playlists.map((p) => {
      const count = db.playlist_songs.filter((ps) => ps.playlist_id === p.id).length;
      return {
        ...p,
        song_count: count,
      };
    });

    return list.sort((a, b) => {
      const tA = new Date(a.created_at || 0).getTime();
      const tB = new Date(b.created_at || 0).getTime();
      return tB - tA;
    });
  },

  findById(id: string): Playlist | null {
    if (!id) return null;
    const db = loadDb();
    return db.playlists.find((p) => p.id === id) || null;
  },

  create(data: { id: string; name: string }): Playlist & { song_count: number } {
    const db = loadDb();
    const record: Playlist = {
      id: data.id,
      name: data.name,
      created_at: new Date().toISOString(),
    };
    db.playlists.push(record);
    saveDb(db);
    return { ...record, song_count: 0 };
  },

  delete(id: string): boolean {
    if (!id) return false;
    const db = loadDb();
    const initialLen = db.playlists.length;
    db.playlists = db.playlists.filter((p) => p.id !== id);
    db.playlist_songs = db.playlist_songs.filter((ps) => ps.playlist_id !== id);
    saveDb(db);
    return db.playlists.length < initialLen;
  },

  getSongs(playlistId: string): Song[] {
    if (!playlistId) return [];
    const db = loadDb();
    const playlistItems = db.playlist_songs
      .filter((ps) => ps.playlist_id === playlistId)
      .sort((a, b) => a.position - b.position);

    const songs: Song[] = [];
    for (const item of playlistItems) {
      const song = db.songs.find((s) => s.id === item.song_id);
      if (song) songs.push(song);
    }
    return songs;
  },

  addSong(playlistId: string, songId: string): void {
    if (!playlistId || !songId) return;
    const db = loadDb();
    const exists = db.playlist_songs.some(
      (ps) => ps.playlist_id === playlistId && ps.song_id === songId
    );
    if (!exists) {
      const currentItems = db.playlist_songs.filter((ps) => ps.playlist_id === playlistId);
      const position = currentItems.length;
      db.playlist_songs.push({ playlist_id: playlistId, song_id: songId, position });
      saveDb(db);
    }
  },

  removeSong(playlistId: string, songId: string): void {
    if (!playlistId || !songId) return;
    const db = loadDb();
    db.playlist_songs = db.playlist_songs.filter(
      (ps) => !(ps.playlist_id === playlistId && ps.song_id === songId)
    );
    saveDb(db);
  },

  countAll(): number {
    return loadDb().playlists.length;
  },
};

// ---------------------------------------------------------------------------
// Favorites Database (Shared / Local)
// ---------------------------------------------------------------------------
export const favoritesDb = {
  list(): Song[] {
    const db = loadDb();
    const favsSorted = [...db.favorites].sort(
      (a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
    );
    const songs: Song[] = [];
    for (const item of favsSorted) {
      const song = db.songs.find((s) => s.id === item.song_id);
      if (song) songs.push(song);
    }
    return songs;
  },

  listIds(): string[] {
    return loadDb().favorites.map((f) => f.song_id);
  },

  add(songId: string): void {
    if (!songId) return;
    const db = loadDb();
    const exists = db.favorites.some((f) => f.song_id === songId);
    if (!exists) {
      db.favorites.push({ song_id: songId, created_at: new Date().toISOString() });
      saveDb(db);
    }
  },

  remove(songId: string): void {
    if (!songId) return;
    const db = loadDb();
    db.favorites = db.favorites.filter((f) => f.song_id !== songId);
    saveDb(db);
  },

  countAll(): number {
    return loadDb().favorites.length;
  },
};

// ---------------------------------------------------------------------------
// Path helpers (unchanged)
// ---------------------------------------------------------------------------
export function getCookiesPath(): string | null {
  const envPath = process.env.COOKIES_PATH;
  if (envPath) {
    try {
      if (fs.existsSync(envPath)) {
        const stat = fs.statSync(envPath);
        if (stat.isFile() && stat.size > 0) return envPath;
      }
    } catch {}
  }

  const rootCookies = path.join(BASE_DIR, "cookies.txt");
  try {
    if (fs.existsSync(rootCookies)) {
      const stat = fs.statSync(rootCookies);
      if (stat.isFile() && stat.size > 0) return rootCookies;
    }
  } catch {}

  const linuxCookies = "/home/admin/vibes/cookies.txt";
  try {
    if (fs.existsSync(linuxCookies)) {
      const stat = fs.statSync(linuxCookies);
      if (stat.isFile() && stat.size > 0) return linuxCookies;
    }
  } catch {}

  return null;
}

export function getYtdlpPath(): string {
  const envPath = process.env.YTDLP_PATH;
  if (envPath && envPath !== "yt-dlp") {
    try {
      if (fs.existsSync(envPath)) return envPath;
    } catch {}
  }

  const isWin = process.platform === "win32";
  const binaryName = isWin ? "yt-dlp.exe" : "yt-dlp";

  const candidates = [
    path.join(BASE_DIR, "bin", binaryName),
    path.join(BASE_DIR, "bin", "yt-dlp"),
    path.join(process.cwd(), "bin", binaryName),
    path.join(process.cwd(), "bin", "yt-dlp"),
    path.join(process.env.HOME || "/root", ".local", "bin", binaryName),
    path.join(process.env.HOME || "/root", "bin", binaryName),
    "/usr/local/bin/yt-dlp",
    "/usr/bin/yt-dlp",
    "/bin/yt-dlp",
  ];

  for (const candidate of candidates) {
    try {
      if (fs.existsSync(/*turbopackIgnore: true*/ candidate)) {
        if (!isWin) {
          try {
            fs.chmodSync(candidate, 0o755);
          } catch {}
        }
        return candidate;
      }
    } catch {}
  }

  // Probe system PATH via which / where to retrieve absolute path
  try {
    const { execSync } = require("node:child_process");
    const cmd = isWin ? "where yt-dlp" : "which yt-dlp";
    const resolved = execSync(cmd, { stdio: ["pipe", "pipe", "ignore"], encoding: "utf8" })
      .trim()
      .split(/\r?\n/)[0];
    if (resolved && fs.existsSync(resolved)) {
      return resolved;
    }
  } catch {}

  const defaultLocal = path.join(BASE_DIR, "bin", binaryName);
  if (fs.existsSync(defaultLocal)) return defaultLocal;

  return envPath || "yt-dlp";
}

export function getFfmpegPath(): string | null {
  const envPath = process.env.FFMPEG_PATH;
  if (envPath && envPath !== "ffmpeg") {
    try {
      if (fs.existsSync(envPath)) return envPath;
    } catch {}
  }

  const isWin = process.platform === "win32";
  const binaryName = isWin ? "ffmpeg.exe" : "ffmpeg";

  const candidates = [
    path.join(BASE_DIR, "bin", binaryName),
    path.join(BASE_DIR, "bin", "ffmpeg"),
    path.join(process.cwd(), "bin", binaryName),
    path.join(process.cwd(), "bin", "ffmpeg"),
    path.join(process.env.HOME || "/root", ".local", "bin", binaryName),
    path.join(process.env.HOME || "/root", "bin", binaryName),
    "/usr/local/bin/ffmpeg",
    "/usr/bin/ffmpeg",
    "/bin/ffmpeg",
  ];

  for (const candidate of candidates) {
    try {
      if (fs.existsSync(/*turbopackIgnore: true*/ candidate)) {
        if (!isWin) {
          try {
            fs.chmodSync(candidate, 0o755);
          } catch {}
        }
        return candidate;
      }
    } catch {}
  }

  try {
    const { execSync } = require("node:child_process");
    const cmd = isWin ? "where ffmpeg" : "which ffmpeg";
    const resolved = execSync(cmd, { stdio: ["pipe", "pipe", "ignore"], encoding: "utf8" })
      .trim()
      .split(/\r?\n/)[0];
    if (resolved && fs.existsSync(resolved)) {
      return resolved;
    }
  } catch {}

  return envPath || null;
}

export function getExtendedPath(): string {
  const binDir = path.join(BASE_DIR, "bin");
  const candidates = [
    binDir,
    path.join(process.cwd(), "bin"),
    path.join(binDir, "node", "bin"),
    process.env.PATH || "",
    "/usr/local/bin",
    "/usr/bin",
    "/bin",
    path.join(process.env.HOME || "/root", ".local", "bin"),
    path.join(process.env.HOME || "/root", "bin"),
  ];
  return candidates.filter(Boolean).join(process.platform === "win32" ? ";" : ":");
}

export { UPLOAD_FOLDER, COVERS_FOLDER, TRANSCODE_DIR, BASE_DIR };
