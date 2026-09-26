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
    if (session?.userId) {
      const stmt = db.prepare(
        "DELETE FROM playlists WHERE id = ? AND (user_id = ? OR user_id IS NULL)"
      );
      stmt.run(id, session.userId);
    } else {
      const stmt = db.prepare("DELETE FROM playlists WHERE id = ? AND user_id IS NULL");
      stmt.run(id);
    }

    db.prepare("DELETE FROM playlist_songs WHERE playlist_id = ?").run(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete playlist error:", error);
    return NextResponse.json({ error: "Failed to delete playlist" }, { status: 500 });
  }
}
