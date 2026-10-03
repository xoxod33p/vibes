import { NextRequest, NextResponse } from "next/server";
import { playlistsDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getCurrentUser();

  try {
    const success = await playlistsDb.delete(id, session?.userId || null);

    if (!success) {
      return NextResponse.json({ error: "Playlist not found or not authorized" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete playlist error:", error);
    return NextResponse.json({ error: "Failed to delete playlist" }, { status: 500 });
  }
}
