import { NextRequest, NextResponse } from "next/server";
import { favoritesDb } from "@/lib/db";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: songId } = await params;
  try {
    favoritesDb.add(songId);
    return NextResponse.json({ success: true, favorited: true });
  } catch (error) {
    console.error("Add favorite error:", error);
    return NextResponse.json({ error: "Failed to favorite song" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: songId } = await params;
  try {
    favoritesDb.remove(songId);
    return NextResponse.json({ success: true, favorited: false });
  } catch (error) {
    console.error("Remove favorite error:", error);
    return NextResponse.json({ error: "Failed to remove favorite" }, { status: 500 });
  }
}
