import { NextRequest, NextResponse } from "next/server";
import { playlistsDb } from "@/lib/db";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; songId: string }> }
) {
  const { id: playlistId, songId } = await params;
  try {
    playlistsDb.removeSong(playlistId, songId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Remove from playlist error:", error);
    return NextResponse.json({ error: "Failed to remove song from playlist" }, { status: 500 });
  }
}
