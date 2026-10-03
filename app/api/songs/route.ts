import { NextRequest, NextResponse } from "next/server";
import { songsDb, UPLOAD_FOLDER, COVERS_FOLDER } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import fs from "node:fs";
import path from "node:path";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const q = (searchParams.get("q") || "").trim();

    const songs = await songsDb.list(q);
    return NextResponse.json(songs);
  } catch (error) {
    console.error("Failed to list songs:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getCurrentUser(req);
    if (!session?.userId) {
      return NextResponse.json(
        { error: "Please sign in to manage your library" },
        { status: 401 }
      );
    }

    // Delete Firestore records and retrieve songs to delete associated disk files
    const userSongs = await songsDb.deleteByUserId(session.userId);

    if (userSongs.length === 0) {
      return NextResponse.json({
        success: true,
        count: 0,
        message: "No songs belonging to user",
      });
    }

    // Clean up disk files
    for (const song of userSongs) {
      if (song.filename) {
        const audioPath = path.join(UPLOAD_FOLDER, song.filename);
        if (fs.existsSync(audioPath)) {
          try {
            fs.unlinkSync(audioPath);
          } catch (e) {
            console.warn("Could not delete audio file:", e);
          }
        }
      }

      if (song.cover) {
        const coverPath = path.join(COVERS_FOLDER, song.cover);
        if (fs.existsSync(coverPath)) {
          try {
            fs.unlinkSync(coverPath);
          } catch (e) {
            console.warn("Could not delete cover file:", e);
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      count: userSongs.length,
      message: `Deleted ${userSongs.length} song${userSongs.length === 1 ? "" : "s"}`,
    });
  } catch (error) {
    console.error("Delete user songs error:", error);
    return NextResponse.json({ error: "Failed to delete user songs" }, { status: 500 });
  }
}
