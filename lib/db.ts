import { getApps, initializeApp, cert, type Credential } from "firebase-admin/app";
import { getFirestore, Firestore } from "firebase-admin/firestore";
import path from "node:path";
import fs from "node:fs";
import { Song, Playlist } from "./types";

// Ensure static media directories exist
const BASE_DIR = process.cwd();
const UPLOAD_FOLDER = path.join(BASE_DIR, "uploads");
const COVERS_FOLDER = path.join(BASE_DIR, "public", "covers");
const TRANSCODE_DIR = path.join(BASE_DIR, "cache", "transcode");

for (const dir of [UPLOAD_FOLDER, COVERS_FOLDER, TRANSCODE_DIR]) {
  if (!fs.existsSync(/*turbopackIgnore: true*/ dir)) {
    try {
      fs.mkdirSync(/*turbopackIgnore: true*/ dir, { recursive: true });
    } catch {}
  }
}

const isBuild = process.env.NEXT_PHASE === "phase-production-build";

declare global {
  // eslint-disable-next-line no-var
  var __vibes_firestore: Firestore | undefined;
}

function initFirestore(): Firestore {
  if (globalThis.__vibes_firestore) {
    return globalThis.__vibes_firestore;
  }

  if (getApps().length === 0) {
    let credential: Credential | undefined;

    // Option 1: Entire service account JSON as environment variable string
    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      try {
        const parsed = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
        credential = cert(parsed);
      } catch (err) {
        console.error("[firebase] Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY:", err);
      }
    }

    // Option 2: Individual environment variables
    if (!credential && process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
      try {
        credential = cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
        });
      } catch (err) {
        console.error("[firebase] Failed to initialize credentials from env vars:", err);
      }
    }

    // Option 3: Service account JSON file
    if (!credential) {
      const filePath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || path.join(BASE_DIR, "serviceAccountKey.json");
      if (fs.existsSync(/*turbopackIgnore: true*/ filePath)) {
        try {
          const fileContent = fs.readFileSync(/*turbopackIgnore: true*/ filePath, "utf-8");
          const parsed = JSON.parse(fileContent);
          credential = cert(parsed);
        } catch (err) {
          console.error("[firebase] Failed to read serviceAccountKey file:", err);
        }
      }
    }

    // Initialize Firebase app
    try {
      if (credential) {
        initializeApp({ credential });
      } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.GCLOUD_PROJECT) {
        initializeApp();
      } else {
        // Fallback for build phase or unconfigured local setup
        if (!isBuild) {
          console.warn(
            "[firebase] Warning: No Firebase credentials provided. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY or FIREBASE_SERVICE_ACCOUNT_KEY in your environment."
          );
        }
        initializeApp({
          projectId: process.env.FIREBASE_PROJECT_ID || "vibes-music-player",
        });
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (!msg.includes("already exists")) {
        console.warn("[firebase] initializeApp warning:", msg);
      }
    }
  }

  const firestoreInstance = getFirestore();
  globalThis.__vibes_firestore = firestoreInstance;
  return firestoreInstance;
}

export const db: Firestore = initFirestore();

// ==========================================
// User Data Access
// ==========================================
export interface UserDoc {
  id: string;
  username: string;
  username_lower: string;
  email: string;
  email_lower: string;
  password_hash: string;
  created_at: string;
}

export const usersDb = {
  async findByUsernameOrEmail(identifier: string): Promise<UserDoc | null> {
    if (!identifier) return null;
    const lower = identifier.toLowerCase().trim();
    const col = db.collection("users");

    // Match username
    const uSnap = await col.where("username_lower", "==", lower).limit(1).get();
    if (!uSnap.empty) {
      return uSnap.docs[0].data() as UserDoc;
    }

    // Match email
    const eSnap = await col.where("email_lower", "==", lower).limit(1).get();
    if (!eSnap.empty) {
      return eSnap.docs[0].data() as UserDoc;
    }

    return null;
  },

  async findById(id: string): Promise<UserDoc | null> {
    if (!id) return null;
    const doc = await db.collection("users").doc(id).get();
    return doc.exists ? (doc.data() as UserDoc) : null;
  },

  async findByUsername(username: string): Promise<UserDoc | null> {
    if (!username) return null;
    const snap = await db.collection("users").where("username_lower", "==", username.toLowerCase().trim()).limit(1).get();
    return snap.empty ? null : (snap.docs[0].data() as UserDoc);
  },

  async findByEmail(email: string): Promise<UserDoc | null> {
    if (!email) return null;
    const snap = await db.collection("users").where("email_lower", "==", email.toLowerCase().trim()).limit(1).get();
    return snap.empty ? null : (snap.docs[0].data() as UserDoc);
  },

  async create(user: { id: string; username: string; email: string; password_hash: string }): Promise<UserDoc> {
    const docData: UserDoc = {
      id: user.id,
      username: user.username,
      username_lower: user.username.toLowerCase(),
      email: user.email || "",
      email_lower: (user.email || "").toLowerCase(),
      password_hash: user.password_hash,
      created_at: new Date().toISOString(),
    };
    await db.collection("users").doc(user.id).set(docData);
    return docData;
  },

  async countPlaylists(userId: string): Promise<number> {
    if (!userId) return 0;
    const snap = await db.collection("playlists").where("user_id", "==", userId).count().get();
    return snap.data().count;
  },

  async countFavorites(userId: string): Promise<number> {
    if (!userId) return 0;
    const snap = await db.collection("favorites").where("user_id", "==", userId).count().get();
    return snap.data().count;
  },
};

// ==========================================
// Songs Data Access
// ==========================================
export const songsDb = {
  async list(q?: string): Promise<Song[]> {
    const snap = await db.collection("songs").get();
    let songs: Song[] = [];

    snap.forEach((doc) => {
      const data = doc.data() as Song;
      // Filter out pending songs from general library list
      if (data.status !== "pending") {
        songs.push(data);
      }
    });

    // In-memory search filter if query is provided
    if (q && q.trim()) {
      const query = q.toLowerCase().trim();
      songs = songs.filter(
        (s) =>
          s.title?.toLowerCase().includes(query) ||
          s.artist?.toLowerCase().includes(query) ||
          s.album?.toLowerCase().includes(query)
      );
    }

    // Sort newest uploaded first
    songs.sort((a, b) => {
      const tA = new Date(a.uploaded_at || 0).getTime();
      const tB = new Date(b.uploaded_at || 0).getTime();
      return tB - tA;
    });

    return songs;
  },

  async findById(id: string): Promise<Song | null> {
    if (!id) return null;
    const doc = await db.collection("songs").doc(id).get();
    return doc.exists ? (doc.data() as Song) : null;
  },

  async create(song: Partial<Song> & { id: string; title: string; filename: string }): Promise<Song> {
    const record: Song = {
      id: song.id,
      title: song.title,
      artist: song.artist || "Unknown Artist",
      album: song.album || "Unknown Album",
      duration: song.duration ?? 0,
      filename: song.filename,
      cover: song.cover ?? null,
      user_id: song.user_id ?? null,
      status: song.status || "ready",
      uploaded_at: song.uploaded_at || new Date().toISOString(),
    };
    await db.collection("songs").doc(song.id).set(record);
    return record;
  },

  async update(id: string, updates: Partial<Song>): Promise<void> {
    if (!id) return;
    await db.collection("songs").doc(id).set(updates, { merge: true });
  },

  async delete(id: string): Promise<void> {
    if (!id) return;
    const batch = db.batch();

    // 1. Delete song document
    batch.delete(db.collection("songs").doc(id));

    // 2. Delete all playlist association documents
    const psSnap = await db.collection("playlist_songs").where("song_id", "==", id).get();
    psSnap.forEach((doc) => batch.delete(doc.ref));

    // 3. Delete from favorites
    const favSnap = await db.collection("favorites").where("song_id", "==", id).get();
    favSnap.forEach((doc) => batch.delete(doc.ref));

    await batch.commit();
  },

  async deleteByUserId(userId: string): Promise<Song[]> {
    if (!userId) return [];
    const snap = await db.collection("songs").where("user_id", "==", userId).get();
    const songs: Song[] = [];

    const batch = db.batch();
    for (const doc of snap.docs) {
      const song = doc.data() as Song;
      songs.push(song);
      batch.delete(doc.ref);

      const psSnap = await db.collection("playlist_songs").where("song_id", "==", song.id).get();
      psSnap.forEach((pDoc) => batch.delete(pDoc.ref));

      const favSnap = await db.collection("favorites").where("song_id", "==", song.id).get();
      favSnap.forEach((fDoc) => batch.delete(fDoc.ref));
    }

    await batch.commit();
    return songs;
  },

  async getStatus(id: string): Promise<Song | null> {
    if (!id) return null;
    const doc = await db.collection("songs").doc(id).get();
    return doc.exists ? (doc.data() as Song) : null;
  },
};

// ==========================================
// Playlists Data Access
// ==========================================
export const playlistsDb = {
  async list(userId?: string | null): Promise<(Playlist & { song_count: number })[]> {
    const snap = await db.collection("playlists").get();
    const playlists: (Playlist & { song_count: number })[] = [];

    for (const doc of snap.docs) {
      const data = doc.data() as Playlist;
      if (!userId || data.user_id === userId || !data.user_id) {
        // Count songs in this playlist
        const countSnap = await db
          .collection("playlist_songs")
          .where("playlist_id", "==", data.id)
          .count()
          .get();

        playlists.push({
          ...data,
          song_count: countSnap.data().count,
        });
      }
    }

    playlists.sort((a, b) => {
      const tA = new Date(a.created_at || 0).getTime();
      const tB = new Date(b.created_at || 0).getTime();
      return tB - tA;
    });

    return playlists;
  },

  async findById(id: string): Promise<Playlist | null> {
    if (!id) return null;
    const doc = await db.collection("playlists").doc(id).get();
    return doc.exists ? (doc.data() as Playlist) : null;
  },

  async create(data: { id: string; name: string; user_id?: string | null }): Promise<Playlist & { song_count: number }> {
    const record: Playlist = {
      id: data.id,
      name: data.name,
      user_id: data.user_id ?? null,
      created_at: new Date().toISOString(),
    };
    await db.collection("playlists").doc(data.id).set(record);
    return { ...record, song_count: 0 };
  },

  async delete(id: string, userId?: string | null): Promise<boolean> {
    if (!id) return false;
    const docRef = db.collection("playlists").doc(id);
    const doc = await docRef.get();
    if (!doc.exists) return false;

    const data = doc.data() as Playlist;
    if (userId && data.user_id && data.user_id !== userId) {
      return false;
    }

    const batch = db.batch();
    batch.delete(docRef);

    // Clean up playlist_songs
    const psSnap = await db.collection("playlist_songs").where("playlist_id", "==", id).get();
    psSnap.forEach((pDoc) => batch.delete(pDoc.ref));

    await batch.commit();
    return true;
  },

  async getSongs(playlistId: string): Promise<Song[]> {
    if (!playlistId) return [];
    const psSnap = await db
      .collection("playlist_songs")
      .where("playlist_id", "==", playlistId)
      .get();

    if (psSnap.empty) return [];

    const items = psSnap.docs.map((d) => d.data() as { song_id: string; position: number });
    items.sort((a, b) => (a.position ?? 0) - (b.position ?? 0));

    const songIds = items.map((i) => i.song_id);
    const songs: Song[] = [];

    // Fetch songs in parallel or batches
    for (const songId of songIds) {
      const sDoc = await db.collection("songs").doc(songId).get();
      if (sDoc.exists) {
        songs.push(sDoc.data() as Song);
      }
    }

    return songs;
  },

  async addSong(playlistId: string, songId: string): Promise<void> {
    if (!playlistId || !songId) return;
    const countSnap = await db
      .collection("playlist_songs")
      .where("playlist_id", "==", playlistId)
      .count()
      .get();

    const position = countSnap.data().count;
    const docId = `${playlistId}_${songId}`;
    await db.collection("playlist_songs").doc(docId).set({
      playlist_id: playlistId,
      song_id: songId,
      position,
    });
  },

  async removeSong(playlistId: string, songId: string): Promise<void> {
    if (!playlistId || !songId) return;
    const docId = `${playlistId}_${songId}`;
    await db.collection("playlist_songs").doc(docId).delete();
  },
};

// ==========================================
// Favorites Data Access
// ==========================================
export const favoritesDb = {
  async list(userId: string): Promise<Song[]> {
    if (!userId) return [];
    const snap = await db.collection("favorites").where("user_id", "==", userId).get();
    if (snap.empty) return [];

    const items = snap.docs.map((d) => d.data() as { song_id: string; created_at: string });
    items.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());

    const songs: Song[] = [];
    for (const item of items) {
      const sDoc = await db.collection("songs").doc(item.song_id).get();
      if (sDoc.exists) {
        songs.push(sDoc.data() as Song);
      }
    }
    return songs;
  },

  async listIds(userId: string): Promise<string[]> {
    if (!userId) return [];
    const snap = await db.collection("favorites").where("user_id", "==", userId).get();
    return snap.docs.map((d) => (d.data() as { song_id: string }).song_id);
  },

  async add(userId: string, songId: string): Promise<void> {
    if (!userId || !songId) return;
    const docId = `${userId}_${songId}`;
    await db.collection("favorites").doc(docId).set({
      user_id: userId,
      song_id: songId,
      created_at: new Date().toISOString(),
    });
  },

  async remove(userId: string, songId: string): Promise<void> {
    if (!userId || !songId) return;
    const docId = `${userId}_${songId}`;
    await db.collection("favorites").doc(docId).delete();
  },
};

/** Returns the cookies file path from COOKIES_PATH env, or null if not set. */
export function getCookiesPath(): string | null {
  return process.env.COOKIES_PATH || null;
}

/** Returns the yt-dlp binary path from YTDLP_PATH env, or defaults to "yt-dlp". */
export function getYtdlpPath(): string {
  return process.env.YTDLP_PATH || "yt-dlp";
}

export { UPLOAD_FOLDER, COVERS_FOLDER, TRANSCODE_DIR, BASE_DIR };
