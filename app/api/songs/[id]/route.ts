import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { songsDb, UPLOAD_FOLDER, COVERS_FOLDER } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const song = songsDb.findById(id);
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
  const song = songsDb.findById(id);
  if (!song) {
    return NextResponse.json({ error: "Song not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const title = body.title !== undefined ? String(body.title).trim() : song.title;
  const artist = body.artist !== undefined ? String(body.artist).trim() : song.artist;
  const album = body.album !== undefined ? String(body.album).trim() : song.album;

  songsDb.update(id, { title, artist, album });
  return NextResponse.json({ success: true, id, title, artist, album });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const song = songsDb.findById(id);
  if (!song) {
    return NextResponse.json({ error: "Song not found" }, { status: 404 });
  }

  // Delete audio file from disk
  if (song.filename) {
    const audioPath = path.join(UPLOAD_FOLDER, song.filename);
    if (fs.existsSync(audioPath)) {
      try { fs.unlinkSync(audioPath); } catch (e) { console.error("Could not delete audio file:", e); }
    }
  }

  // Delete cover file from disk
  if (song.cover) {
    const coverPath = path.join(COVERS_FOLDER, song.cover);
    if (fs.existsSync(coverPath)) {
      try { fs.unlinkSync(coverPath); } catch (e) { console.error("Could not delete cover file:", e); }
    }
  }

  songsDb.delete(id);
  return NextResponse.json({ success: true });
}
