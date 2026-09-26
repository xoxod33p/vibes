import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const song = db
      .prepare("SELECT id, title, artist, album, duration, filename, cover, status FROM songs WHERE id = ?")
      .get(id) as {
        id: string; title: string; artist: string; album: string;
        duration: number; filename: string; cover: string | null; status: string;
      } | undefined;

    if (!song) {
      return NextResponse.json({ error: "Song not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, song });
  } catch (err) {
    console.error("Song status check error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
