import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await getCurrentUser(req);
    let rows: unknown[];

    if (session?.userId) {
      const stmt = db.prepare(`
        SELECT p.*, COUNT(ps.song_id) as song_count 
        FROM playlists p
        LEFT JOIN playlist_songs ps ON ps.playlist_id = p.id
        WHERE p.user_id = ? OR p.user_id IS NULL
        GROUP BY p.id
        ORDER BY p.created_at DESC
      `);
      rows = stmt.all(session.userId);
    } else {
      const stmt = db.prepare(`
        SELECT p.*, COUNT(ps.song_id) as song_count 
        FROM playlists p
        LEFT JOIN playlist_songs ps ON ps.playlist_id = p.id
        WHERE p.user_id IS NULL
        GROUP BY p.id
        ORDER BY p.created_at DESC
      `);
      rows = stmt.all();
    }

    return NextResponse.json(rows);
  } catch (error) {
    console.error("List playlists error:", error);
    return NextResponse.json({ error: "Failed to list playlists" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const name = (body.name || "").trim();

    if (!name) {
      return NextResponse.json({ error: "Playlist name is required" }, { status: 400 });
    }

    const session = await getCurrentUser(req);
    const pid = crypto.randomUUID();

    const stmt = db.prepare(`
      INSERT INTO playlists (id, name, user_id)
      VALUES (?, ?, ?)
    `);
    stmt.run(pid, name, session?.userId || null);

    return NextResponse.json(
      { id: pid, name, user_id: session?.userId || null, song_count: 0 },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create playlist error:", error);
    return NextResponse.json({ error: "Failed to create playlist" }, { status: 500 });
  }
}
