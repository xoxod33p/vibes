import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getCurrentUser();

  try {
    let changes = 0;
    if (session?.userId) {
      const stmt = db.prepare(
        "DELETE FROM playlists WHERE id = ? AND (user_id = ? OR user_id IS NULL)"
      );
      const result = stmt.run(id, session.userId);
      changes = (result as unknown as { changes: number }).changes ?? 0;
    } else {
      const stmt = db.prepare("DELETE FROM playlists WHERE id = ? AND user_id IS NULL");
      const result = stmt.run(id);
      changes = (result as unknown as { changes: number }).changes ?? 0;
    }

    if (changes === 0) {
      return NextResponse.json({ error: "Playlist not found or not authorized" }, { status: 404 });
    }

    // Only clean up associations if we actually deleted the playlist
    db.prepare("DELETE FROM playlist_songs WHERE playlist_id = ?").run(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete playlist error:", error);
    return NextResponse.json({ error: "Failed to delete playlist" }, { status: 500 });
  }
}

