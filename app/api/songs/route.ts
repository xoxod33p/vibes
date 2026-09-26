import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { db, UPLOAD_FOLDER, COVERS_FOLDER } from "@/lib/db";
import { Song } from "@/lib/types";
import { getCurrentUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const q = (searchParams.get("q") || "").trim();

    let rows: unknown[];
    if (q) {
      const pattern = `%${q}%`;
      const stmt = db.prepare(
        "SELECT * FROM songs WHERE title LIKE ? OR artist LIKE ? OR album LIKE ? ORDER BY uploaded_at DESC"
      );
      rows = stmt.all(pattern, pattern, pattern);
    } else {
      const stmt = db.prepare("SELECT * FROM songs ORDER BY uploaded_at DESC");
      rows = stmt.all();
    }

    return NextResponse.json(rows as Song[]);
  } catch (error) {
    console.error("Failed to list songs:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const session = await getCurrentUser();
    if (!session?.userId) {
      return NextResponse.json(
        { error: "Please sign in to manage your library" },
        { status: 401 }
      );
    }

    // Select songs belonging strictly to the current user
    const stmt = db.prepare("SELECT * FROM songs WHERE user_id = ?");
    const userSongs = stmt.all(session.userId) as Song[];

    if (userSongs.length === 0) {
      return NextResponse.json({
        success: true,
        count: 0,
        message: "No songs belonging to user",
      });
    }

    // Delete disk files and associations
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

      // Cleanup playlist and favorite associations
      try {
        db.prepare("DELETE FROM playlist_songs WHERE song_id = ?").run(song.id);
        db.prepare("DELETE FROM favorites WHERE song_id = ?").run(song.id);
      } catch (assocErr) {
        console.warn("Could not clean associations:", assocErr);
      }
    }

    // Delete database records
    const delStmt = db.prepare("DELETE FROM songs WHERE user_id = ?");
    delStmt.run(session.userId);

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
