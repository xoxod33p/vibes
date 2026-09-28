import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface UserRow {
  id: string;
  username: string;
  email: string;
  created_at: string;
}

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

export async function GET(req: NextRequest) {
  try {
    const session = await getCurrentUser(req);
    if (!session?.userId) {
      return NextResponse.json(
        { authenticated: false, user: null },
        { headers: NO_CACHE_HEADERS }
      );
    }

    const user = db.prepare(
      "SELECT id, username, email, created_at FROM users WHERE id = ?"
    ).get(session.userId) as UserRow | undefined;

    if (!user) {
      return NextResponse.json(
        { authenticated: false, user: null },
        { headers: NO_CACHE_HEADERS }
      );
    }

    const plCountRow = db.prepare(
      "SELECT COUNT(*) as count FROM playlists WHERE user_id = ?"
    ).get(session.userId) as { count: number } | undefined;

    const favCountRow = db.prepare(
      "SELECT COUNT(*) as count FROM favorites WHERE user_id = ?"
    ).get(session.userId) as { count: number } | undefined;

    return NextResponse.json(
      {
        authenticated: true,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          created_at: user.created_at,
          playlist_count: plCountRow?.count || 0,
          favorite_count: favCountRow?.count || 0,
        },
      },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (error) {
    console.error("Auth me error:", error);
    return NextResponse.json(
      { authenticated: false, user: null },
      { headers: NO_CACHE_HEADERS }
    );
  }
}

