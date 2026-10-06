import { NextResponse } from "next/server";
import { favoritesDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const songs = favoritesDb.list();
    return NextResponse.json(songs);
  } catch (error) {
    console.error("List favorites error:", error);
    return NextResponse.json({ error: "Failed to list favorites" }, { status: 500 });
  }
}
