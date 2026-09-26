import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { Song } from "@/lib/types";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const stmt = db.prepare(`
      SELECT s.* FROM songs s
      JOIN playlist_songs ps ON ps.song_id = s.id
      WHERE ps.playlist_id = ?
      ORDER BY ps.position ASC
    `);
    const rows = stmt.all(id) as Song[];
    return NextResponse.json(rows);
  } catch (error) {
    console.error("List playlist songs error:", error);
    return NextResponse.json({ error: "Failed to list playlist songs" }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: playlistId } = await params;
  try {
    const body = await req.json().catch(() => ({}));
    const songId = body.song_id;

    if (!songId) {
      return NextResponse.json({ error: "song_id is required" }, { status: 400 });
    }

    const countRow = db.prepare(
      "SELECT COUNT(*) as count FROM playlist_songs WHERE playlist_id = ?"
    ).get(playlistId) as { count: number };

    const pos = countRow?.count ?? 0;

    const stmt = db.prepare(`
      INSERT OR IGNORE INTO playlist_songs (playlist_id, song_id, position)
      VALUES (?, ?, ?)
    `);
    stmt.run(playlistId, songId, pos);

    return NextResponse.json({ success: true, playlistId, songId });
  } catch (error) {
    console.error("Add to playlist error:", error);
    return NextResponse.json({ error: "Failed to add song to playlist" }, { status: 500 });
  }
}
