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

    const ids = await favoritesDb.listIds(session.userId);
    return NextResponse.json(ids);
  } catch (error) {
    console.error("List favorite IDs error:", error);
    return NextResponse.json({ error: "Failed to list favorite IDs" }, { status: 500 });
  }
}
