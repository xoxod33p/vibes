import { NextRequest, NextResponse } from "next/server";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { db, UPLOAD_FOLDER, COVERS_FOLDER, BASE_DIR } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

const execFileAsync = promisify(execFile);

export async function POST(req: NextRequest) {
  try {
    const session = await getCurrentUser();
    if (!session?.userId) {
      return NextResponse.json(
        { error: "Please sign in or create an account to download music" },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => ({}));
    let target = (body.target || body.url || body.searchQuery || "").trim();

    if (!target && body.title) {
      target = `ytsearch1:${body.artist ? body.artist + " - " : ""}${body.title} audio`;
    }

    if (!target) {
      return NextResponse.json({ error: "Download target is required" }, { status: 400 });
    }

    const songId = crypto.randomUUID();
    const tempStem = `ytdl_${crypto.randomBytes(4).toString("hex")}`;
    const outputTemplate = path.join(UPLOAD_FOLDER, `${tempStem}.%(ext)s`);

    const args = [
      "-f", "bestaudio/best",
      "-o", outputTemplate,
      "--no-playlist",
      "--no-warnings",
      "--print-json",
    ];

    const cookiesFile = path.join(BASE_DIR, "cookies.txt");
    if (fs.existsSync(cookiesFile)) {
      try {
        const stat = fs.statSync(cookiesFile);
        if (stat.size > 10) {
          args.push("--cookies", cookiesFile);
        }
      } catch {}
    }

    args.push(target);

    const extendedPath = [
      process.env.PATH || "",
      "/usr/local/bin",
      "/usr/bin",
      "/bin",
      path.join(process.env.HOME || "/home/admin", ".local/bin"),
    ].join(process.platform === "win32" ? ";" : ":");

    let stdout = "";
    try {
      const res = await execFileAsync("yt-dlp", args, {
        timeout: 120000,
        env: {
          ...process.env,
          PATH: extendedPath,
        },
      });
      stdout = res.stdout;
    } catch (execErr: unknown) {
      const execObj = execErr as { message?: string; stderr?: string };
      const errorMsg = execObj.stderr?.trim() || execObj.message || String(execErr);
      console.error("yt-dlp download execution error:", errorMsg);
      return NextResponse.json(
        { error: `Download failed: ${errorMsg.slice(0, 300)}` },
        { status: 400 }
      );
    }

    let info: Record<string, unknown> = {};
    try {
      const lines = stdout.trim().split("\n");
      const lastJsonLine = lines.find((l) => l.startsWith("{") && l.endsWith("}")) || lines[0];
      info = JSON.parse(lastJsonLine);
    } catch (parseErr) {
      console.warn("Could not parse yt-dlp JSON output:", parseErr);
    }

    // Locate the downloaded audio file
    const files = fs.readdirSync(UPLOAD_FOLDER);
    const downloadedName = files.find((f) => f.startsWith(tempStem));

    if (!downloadedName) {
      return NextResponse.json({ error: "Audio file was not saved" }, { status: 500 });
    }

    const downloadedPath = path.join(UPLOAD_FOLDER, downloadedName);
    const finalFilename = `${tempStem}.mp3`;
    const finalPath = path.join(UPLOAD_FOLDER, finalFilename);

    if (downloadedPath !== finalPath) {
      fs.renameSync(downloadedPath, finalPath);
    }

    // Title, artist, album, duration priority: body override -> info
    const title =
      (body.title as string)?.trim() ||
      (info.title as string) ||
      "Audio Track";
    const artist =
      (body.artist as string)?.trim() ||
      (info.artist as string) ||
      (info.uploader as string) ||
      (info.channel as string) ||
      "Unknown Artist";
    const album =
      (body.album as string)?.trim() ||
      (info.album as string) ||
      "Downloaded Audio";
    const duration =
      typeof body.duration === "number" && body.duration > 0
        ? body.duration
        : typeof info.duration === "number"
        ? info.duration
        : 0;

    // Locate original song thumbnail from yt-dlp
    let downloadedThumbnail: string | null = null;
    if (info.thumbnail && typeof info.thumbnail === "string") {
      downloadedThumbnail = info.thumbnail;
    } else if (Array.isArray(info.thumbnails) && info.thumbnails.length > 0) {
      const lastThumb = info.thumbnails[info.thumbnails.length - 1];
      if (lastThumb && typeof lastThumb.url === "string") {
        downloadedThumbnail = lastThumb.url;
      }
    }

    // Cover art priority:
    // If downloading a playlist track, prefer the song's original downloaded thumbnail
    // to prevent playlist covers from being applied to individual songs.
    const isPlaylist = Boolean(body.isPlaylist || body.playlistId);
    const candidateCover = isPlaylist
      ? (downloadedThumbnail || (body.coverUrl as string) || null)
      : ((body.coverUrl as string) || downloadedThumbnail || null);
    let coverFilename: string | null = null;

    if (candidateCover) {
      try {
        const coverName = `${tempStem}.jpg`;
        const coverPath = path.join(COVERS_FOLDER, coverName);
        const imgRes = await fetch(candidateCover, {
          headers: { "User-Agent": "Mozilla/5.0" },
        });
        if (imgRes.ok) {
          const imgBuffer = Buffer.from(await imgRes.arrayBuffer());
          fs.writeFileSync(coverPath, imgBuffer);
          coverFilename = coverName;
        }
      } catch (imgErr) {
        console.warn("Could not download cover art:", imgErr);
      }
    }

    // Insert song into SQLite
    const stmt = db.prepare(`
      INSERT INTO songs (id, title, artist, album, duration, filename, cover, user_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      songId,
      title,
      artist,
      album,
      duration,
      finalFilename,
      coverFilename,
      session.userId
    );

    // If playlistId is provided, associate this track with the playlist
    const playlistId = body.playlistId as string | undefined;
    if (playlistId) {
      try {
        const posRow = db
          .prepare("SELECT COUNT(*) as count FROM playlist_songs WHERE playlist_id = ?")
          .get(playlistId) as { count: number } | undefined;
        const nextPos = posRow?.count ?? 0;

        db.prepare(`
          INSERT OR IGNORE INTO playlist_songs (playlist_id, song_id, position)
          VALUES (?, ?, ?)
        `).run(playlistId, songId, nextPos);
      } catch (plErr) {
        console.warn("Could not associate song with playlist:", plErr);
      }
    }

    return NextResponse.json({
      success: true,
      song: {
        id: songId,
        title,
        artist,
        album,
        duration,
        filename: finalFilename,
        cover: coverFilename,
      },
    });
  } catch (error) {
    console.error("Media download route error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
