import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { usersDb } from "@/lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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

    const user = await usersDb.findById(session.userId);

    if (!user) {
      return NextResponse.json(
        { authenticated: false, user: null },
        { headers: NO_CACHE_HEADERS }
      );
    }

    const playlistCount = await usersDb.countPlaylists(session.userId);
    const favoriteCount = await usersDb.countFavorites(session.userId);

    return NextResponse.json(
      {
        authenticated: true,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          created_at: user.created_at,
          playlist_count: playlistCount || 0,
          favorite_count: favoriteCount || 0,
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
