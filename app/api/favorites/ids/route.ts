import { NextResponse } from "next/server";
import { favoritesDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const ids = favoritesDb.listIds();
    return NextResponse.json(ids);
  } catch (error) {
    console.error("List favorite IDs error:", error);
    return NextResponse.json({ error: "Failed to list favorite IDs" }, { status: 500 });
  }
}
