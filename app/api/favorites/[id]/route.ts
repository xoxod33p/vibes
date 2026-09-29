import { NextRequest, NextResponse } from "next/server";
import { favoritesDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: songId } = await params;
  const session = await getCurrentUser();

  if (!session?.userId) {
    return NextResponse.json({ error: "Login required to favorite tracks" }, { status: 401 });
  }

  try {
    await favoritesDb.add(session.userId, songId);
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
  const session = await getCurrentUser();

  if (!session?.userId) {
    return NextResponse.json({ error: "Login required" }, { status: 401 });
  }

  try {
    await favoritesDb.remove(session.userId, songId);
    return NextResponse.json({ success: true, favorited: false });
  } catch (error) {
    console.error("Remove favorite error:", error);
    return NextResponse.json({ error: "Failed to remove favorite" }, { status: 500 });
  }
}
