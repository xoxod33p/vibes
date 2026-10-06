import { NextRequest, NextResponse } from "next/server";
import { playlistsDb } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const songs = playlistsDb.getSongs(id);
    return NextResponse.json(songs);
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

    playlistsDb.addSong(playlistId, songId);
    return NextResponse.json({ success: true, playlistId, songId });
  } catch (error) {
    console.error("Add to playlist error:", error);
    return NextResponse.json({ error: "Failed to add song to playlist" }, { status: 500 });
  }
}
