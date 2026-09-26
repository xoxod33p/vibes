import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getCurrentUser();
    if (!session?.userId) {
      return NextResponse.json([]);
    }

    const stmt = db.prepare("SELECT song_id FROM favorites WHERE user_id = ?");
    const rows = stmt.all(session.userId) as { song_id: string }[];
    return NextResponse.json(rows.map((r) => r.song_id));
  } catch (error) {
    console.error("List favorite IDs error:", error);
    return NextResponse.json({ error: "Failed to list favorite IDs" }, { status: 500 });
  }
}
