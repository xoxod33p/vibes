import { NextRequest, NextResponse } from "next/server";
import { songsDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const q = (req.nextUrl.searchParams.get("q") || "").trim();
    const songs = songsDb.list(q || undefined);
    return NextResponse.json(songs);
  } catch (error) {
    console.error("Failed to list songs:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const userSongs = songsDb.deleteAll();
    return NextResponse.json({
      success: true,
      count: userSongs.length,
      message: `Deleted ${userSongs.length} song${userSongs.length === 1 ? "" : "s"}`,
    });
  } catch (error) {
    console.error("Delete songs error:", error);
    return NextResponse.json({ error: "Failed to delete songs" }, { status: 500 });
  }
}
