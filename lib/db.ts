import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import fs from "node:fs";

// Ensure directories exist
const BASE_DIR = process.cwd();
const UPLOAD_FOLDER = path.join(BASE_DIR, "uploads");
const COVERS_FOLDER = path.join(BASE_DIR, "public", "covers");
const TRANSCODE_DIR = path.join(BASE_DIR, "cache", "transcode");
const DB_PATH = path.join(BASE_DIR, "music.db");

for (const dir of [UPLOAD_FOLDER, COVERS_FOLDER, TRANSCODE_DIR]) {
  if (!fs.existsSync(/*turbopackIgnore: true*/ dir)) {
    fs.mkdirSync(/*turbopackIgnore: true*/ dir, { recursive: true });
  }
}

// Global singleton for DatabaseSync to prevent multiple open handles in Next.js hot reload
declare global {
  // eslint-disable-next-line no-var
  var __vibes_db: DatabaseSync | undefined;
}

let dbInstance: DatabaseSync;

if (globalThis.__vibes_db) {
  dbInstance = globalThis.__vibes_db;
} else {
  dbInstance = new DatabaseSync(DB_PATH);
  globalThis.__vibes_db = dbInstance;

  // Enable foreign key enforcement (SQLite has them off by default)
  dbInstance.exec("PRAGMA foreign_keys = ON");

  // Initialize schema if not present
  dbInstance.exec(`
    CREATE TABLE IF NOT EXISTS users (
        id            TEXT PRIMARY KEY,
        username      TEXT NOT NULL UNIQUE COLLATE NOCASE,
        email         TEXT DEFAULT '',
        password_hash TEXT NOT NULL,
        created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS songs (
        id          TEXT PRIMARY KEY,
        title       TEXT NOT NULL,
        artist      TEXT DEFAULT 'Unknown Artist',
        album       TEXT DEFAULT 'Unknown Album',
        duration    REAL DEFAULT 0,
        filename    TEXT NOT NULL UNIQUE,
        cover       TEXT,
        user_id     TEXT,
        status      TEXT DEFAULT 'ready',
        uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    );
    CREATE TABLE IF NOT EXISTS playlists (
        id         TEXT PRIMARY KEY,
        name       TEXT NOT NULL,
        user_id    TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS playlist_songs (
        playlist_id TEXT NOT NULL,
        song_id     TEXT NOT NULL,
        position    INTEGER DEFAULT 0,
        PRIMARY KEY (playlist_id, song_id),
        FOREIGN KEY (playlist_id) REFERENCES playlists(id) ON DELETE CASCADE,
        FOREIGN KEY (song_id)     REFERENCES songs(id)     ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS favorites (
        user_id    TEXT NOT NULL,
        song_id    TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (user_id, song_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (song_id) REFERENCES songs(id) ON DELETE CASCADE
    );
  `);

  // Migrate: add status column to existing songs tables
  try {
    dbInstance.exec("ALTER TABLE songs ADD COLUMN status TEXT DEFAULT 'ready'");
  } catch { /* column already exists */ }
}

export function getCookiesPath(): string | null {
  // Check env var first
  const envPath = process.env.COOKIES_PATH;
  if (envPath) {
    try {
      if (fs.existsSync(envPath)) {
        const stat = fs.statSync(envPath);
        if (stat.isFile() && stat.size > 0) return envPath;
      }
    } catch {}
    console.warn(`[getCookiesPath] COOKIES_PATH="${envPath}" not found or empty, falling back to auto-detect`);
  }

  const candidates = [
    path.join(BASE_DIR, "cookies.txt"),
    "/home/admin/vibes/cookies.txt",
    path.join(process.cwd(), "cookies.txt"),
    path.join(process.env.HOME || "", "vibes", "cookies.txt"),
    path.join(BASE_DIR, "Cookies.txt"),
    path.join(BASE_DIR, "cookies.txt.txt"),
    path.join(BASE_DIR, "cookies"),
    "/home/admin/vibes/Cookies.txt",
    "/home/admin/vibes/cookies.txt.txt",
    "/home/admin/vibes/cookies",
  ];

  for (const candidate of candidates) {
    if (!candidate) continue;
    try {
      if (fs.existsSync(candidate)) {
        const stat = fs.statSync(candidate);
        if (stat.isFile() && stat.size > 0) {
          return candidate;
        }
      }
    } catch {}
  }
  return null;
}

/** Returns the yt-dlp binary path from YTDLP_PATH env, or defaults to "yt-dlp". */
export function getYtdlpPath(): string {
  return process.env.YTDLP_PATH || "yt-dlp";
}

export const db = dbInstance;
export { UPLOAD_FOLDER, COVERS_FOLDER, TRANSCODE_DIR, BASE_DIR };
