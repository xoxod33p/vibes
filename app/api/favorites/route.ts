import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { Song } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await getCurrentUser(req);
    if (!session?.userId) {
      return NextResponse.json([]);
    }

    const stmt = db.prepare(`
      SELECT s.* FROM songs s
      JOIN favorites f ON f.song_id = s.id
      WHERE f.user_id = ?
      ORDER BY f.created_at DESC
    `);
    const rows = stmt.all(session.userId) as Song[];
    return NextResponse.json(rows);
  } catch (error) {
    console.error("List favorites error:", error);
    return NextResponse.json({ error: "Failed to list favorites" }, { status: 500 });
  }
}
