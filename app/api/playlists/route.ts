import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { playlistsDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const playlists = playlistsDb.list();
    return NextResponse.json(playlists);
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

    const pid = crypto.randomUUID();
    const created = playlistsDb.create({ id: pid, name });
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("Create playlist error:", error);
    return NextResponse.json({ error: "Failed to create playlist" }, { status: 500 });
  }
}
