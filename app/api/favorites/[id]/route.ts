import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: songId } = await params;
  const session = await getCurrentUser();

  if (!session?.userId) {
    return NextResponse.json({ error: "Login required to favorite tracks" }, { status: 401 });
  }

  try {
    const stmt = db.prepare(
      "INSERT OR IGNORE INTO favorites (user_id, song_id) VALUES (?, ?)"
    );
    stmt.run(session.userId, songId);

    return NextResponse.json({ success: true, favorited: true });
  } catch (error) {
    console.error("Add favorite error:", error);
    return NextResponse.json({ error: "Failed to favorite song" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: songId } = await params;
  const session = await getCurrentUser();

  if (!session?.userId) {
    return NextResponse.json({ error: "Login required" }, { status: 401 });
  }

  try {
    const stmt = db.prepare("DELETE FROM favorites WHERE user_id = ? AND song_id = ?");
    stmt.run(session.userId, songId);

    return NextResponse.json({ success: true, favorited: false });
  } catch (error) {
    console.error("Remove favorite error:", error);
    return NextResponse.json({ error: "Failed to remove favorite" }, { status: 500 });
  }
}
