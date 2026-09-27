import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { db, UPLOAD_FOLDER, COVERS_FOLDER } from "@/lib/db";
import { Song } from "@/lib/types";
import { getCurrentUser } from "@/lib/auth";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const stmt = db.prepare("SELECT * FROM songs WHERE id = ?");
  const song = stmt.get(id) as Song | undefined;

  if (!song) {
    return NextResponse.json({ error: "Song not found" }, { status: 404 });
  }

  return NextResponse.json(song);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getCurrentUser();
  if (!session?.userId) {
    return NextResponse.json({ error: "Login required" }, { status: 401 });
  }

  const stmt = db.prepare("SELECT * FROM songs WHERE id = ?");
  const song = stmt.get(id) as Song | undefined;

  if (!song) {
    return NextResponse.json({ error: "Song not found" }, { status: 404 });
  }

  if (song.user_id && song.user_id !== session.userId) {
    return NextResponse.json({ error: "Not authorized to edit this song" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const title = body.title !== undefined ? String(body.title).trim() : song.title;
  const artist = body.artist !== undefined ? String(body.artist).trim() : song.artist;
  const album = body.album !== undefined ? String(body.album).trim() : song.album;

  const updateStmt = db.prepare(
    "UPDATE songs SET title = ?, artist = ?, album = ? WHERE id = ?"
  );
  updateStmt.run(title, artist, album, id);

  return NextResponse.json({ success: true, id, title, artist, album });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getCurrentUser();
  if (!session?.userId) {
    return NextResponse.json({ error: "Login required" }, { status: 401 });
  }

  const stmt = db.prepare("SELECT * FROM songs WHERE id = ?");
  const song = stmt.get(id) as Song | undefined;

  if (!song) {
    return NextResponse.json({ error: "Song not found" }, { status: 404 });
  }

  if (song.user_id && song.user_id !== session.userId) {
    return NextResponse.json({ error: "Not authorized to delete this song" }, { status: 403 });
  }

  // Delete audio file
  if (song.filename) {
    const audioPath = path.join(UPLOAD_FOLDER, song.filename);
    if (fs.existsSync(audioPath)) {
      try {
        fs.unlinkSync(audioPath);
      } catch (e) {
        console.error("Could not delete audio file:", e);
      }
    }
  }

  // Delete cover file if exists
  if (song.cover) {
    const coverPath = path.join(COVERS_FOLDER, song.cover);
    if (fs.existsSync(coverPath)) {
      try {
        fs.unlinkSync(coverPath);
      } catch (e) {
        console.error("Could not delete cover file:", e);
      }
    }
  }

  // Delete from playlist_songs and favorites
  db.prepare("DELETE FROM playlist_songs WHERE song_id = ?").run(id);
  db.prepare("DELETE FROM favorites WHERE song_id = ?").run(id);
  db.prepare("DELETE FROM songs WHERE id = ?").run(id);

  return NextResponse.json({ success: true });
}

