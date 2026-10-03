import { NextRequest, NextResponse } from "next/server";
import { songsDb } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const song = await songsDb.getStatus(id);

    if (!song) {
      return NextResponse.json({ error: "Song not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      song: {
        id: song.id,
        title: song.title,
        artist: song.artist,
        album: song.album,
        duration: song.duration,
        filename: song.filename,
        cover: song.cover,
        status: song.status,
      },
    });
  } catch (err) {
    console.error("Song status check error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
