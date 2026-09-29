import { getApps, initializeApp, cert, type Credential } from "firebase-admin/app";
import { getFirestore, Firestore, type QueryDocumentSnapshot } from "firebase-admin/firestore";
import path from "node:path";
import fs from "node:fs";
import { Song, Playlist } from "./types";

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
  var __vibes_firestore: Firestore | undefined;
}

function initFirestore(): Firestore {
  if (globalThis.__vibes_firestore) {
    return globalThis.__vibes_firestore;
  }

  if (getApps().length === 0) {
    let credential: Credential | undefined;

    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      try {
        const parsed = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
        credential = cert(parsed);
      } catch (err) {
        console.error("[firebase] Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY:", err);
      }
    }

    if (!credential) {
      const candidates = [
        process.env.FIREBASE_SERVICE_ACCOUNT_PATH,
        path.join(BASE_DIR, "serviceAccountKey.json"),
        "/app/serviceAccountKey.json",
        "/home/admin/vibes/serviceAccountKey.json",
      ].filter(Boolean) as string[];

      for (const filePath of candidates) {
        try {
          if (fs.existsSync(/*turbopackIgnore: true*/ filePath)) {
            const stat = fs.statSync(/*turbopackIgnore: true*/ filePath);
            if (stat.isFile() && stat.size > 0) {
              const fileContent = fs.readFileSync(/*turbopackIgnore: true*/ filePath, "utf-8");
              const parsed = JSON.parse(fileContent);
              credential = cert(parsed);
              break;
            }
          }
        } catch (err) {
          console.error("[firebase] Failed to read serviceAccountKey file:", err);
        }
      }
    }

    try {
      if (credential) {
        initializeApp({ credential, projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || undefined });
      } else {
        if (!isBuild) {
          console.warn("[firebase] Warning: No Firebase Service Account JSON provided.");
        }
        initializeApp({ projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "vibes-app" });
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

    const uSnap = await col.where("username_lower", "==", lower).limit(1).get();
    if (!uSnap.empty) {
      return uSnap.docs[0].data() as UserDoc;
    }

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

export const songsDb = {
  async list(q?: string): Promise<Song[]> {
    const snap = await db.collection("songs").get();
    let songs: Song[] = [];

    snap.forEach((doc: QueryDocumentSnapshot) => {
      const data = doc.data() as Song;
      if (data.status !== "pending") {
        songs.push(data);
      }
    });

    if (q && q.trim()) {
      const query = q.toLowerCase().trim();
      songs = songs.filter(
        (s) =>
          s.title?.toLowerCase().includes(query) ||
          s.artist?.toLowerCase().includes(query) ||
          s.album?.toLowerCase().includes(query)
      );
    }

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

    batch.delete(db.collection("songs").doc(id));

    const psSnap = await db.collection("playlist_songs").where("song_id", "==", id).get();
    psSnap.forEach((doc: QueryDocumentSnapshot) => batch.delete(doc.ref));

    const favSnap = await db.collection("favorites").where("song_id", "==", id).get();
    favSnap.forEach((doc: QueryDocumentSnapshot) => batch.delete(doc.ref));

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
      psSnap.forEach((pDoc: QueryDocumentSnapshot) => batch.delete(pDoc.ref));

      const favSnap = await db.collection("favorites").where("song_id", "==", song.id).get();
      favSnap.forEach((fDoc: QueryDocumentSnapshot) => batch.delete(fDoc.ref));
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

export const playlistsDb = {
  async list(userId?: string | null): Promise<(Playlist & { song_count: number })[]> {
    const snap = await db.collection("playlists").get();
    const playlists: (Playlist & { song_count: number })[] = [];

    for (const doc of snap.docs) {
      const data = doc.data() as Playlist;
      if (!userId || data.user_id === userId || !data.user_id) {
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

    const psSnap = await db.collection("playlist_songs").where("playlist_id", "==", id).get();
    psSnap.forEach((pDoc: QueryDocumentSnapshot) => batch.delete(pDoc.ref));

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

    const items = psSnap.docs.map((d: QueryDocumentSnapshot) => d.data() as { song_id: string; position: number });
    items.sort((a: { position?: number }, b: { position?: number }) => (a.position ?? 0) - (b.position ?? 0));

    const songIds = items.map((i: { song_id: string }) => i.song_id);
    const songs: Song[] = [];

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

export const favoritesDb = {
  async list(userId: string): Promise<Song[]> {
    if (!userId) return [];
    const snap = await db.collection("favorites").where("user_id", "==", userId).get();
    if (snap.empty) return [];

    const items = snap.docs.map((d: QueryDocumentSnapshot) => d.data() as { song_id: string; created_at: string });
    items.sort((a: { created_at?: string }, b: { created_at?: string }) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());

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
    return snap.docs.map((d: QueryDocumentSnapshot) => (d.data() as { song_id: string }).song_id);
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

  const dockerCookies = "/app/cookies.txt";
  try {
    if (fs.existsSync(dockerCookies)) {
      const stat = fs.statSync(dockerCookies);
      if (stat.isFile() && stat.size > 0) return dockerCookies;
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
  return process.env.YTDLP_PATH || "yt-dlp";
}

export { UPLOAD_FOLDER, COVERS_FOLDER, TRANSCODE_DIR, BASE_DIR };
