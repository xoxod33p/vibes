import { NextRequest, NextResponse } from "next/server";
import { favoritesDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await getCurrentUser(req);
    if (!session?.userId) {
      return NextResponse.json([]);
    }

    const songs = await favoritesDb.list(session.userId);
    return NextResponse.json(songs);
  } catch (error) {
    console.error("List favorites error:", error);
    return NextResponse.json({ error: "Failed to list favorites" }, { status: 500 });
  }
}
