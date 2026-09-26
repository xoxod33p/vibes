import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

interface UserRow {
  id: string;
  username: string;
  email: string;
  created_at: string;
}

export async function GET() {
  try {
    const session = await getCurrentUser();
    if (!session?.userId) {
      return NextResponse.json({ authenticated: false, user: null });
    }

    const user = db.prepare(
      "SELECT id, username, email, created_at FROM users WHERE id = ?"
    ).get(session.userId) as UserRow | undefined;

    if (!user) {
      return NextResponse.json({ authenticated: false, user: null });
    }

    const plCountRow = db.prepare(
      "SELECT COUNT(*) as count FROM playlists WHERE user_id = ?"
    ).get(session.userId) as { count: number };

    const favCountRow = db.prepare(
      "SELECT COUNT(*) as count FROM favorites WHERE user_id = ?"
    ).get(session.userId) as { count: number };

    return NextResponse.json({
      authenticated: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        created_at: user.created_at,
        playlist_count: plCountRow?.count || 0,
        favorite_count: favCountRow?.count || 0,
      },
    });
  } catch (error) {
    console.error("Auth me error:", error);
    return NextResponse.json({ authenticated: false, user: null });
  }
}
