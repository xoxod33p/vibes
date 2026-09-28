import { NextRequest, NextResponse } from "next/server";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { db, UPLOAD_FOLDER, COVERS_FOLDER, BASE_DIR, getCookiesPath, getYtdlpPath } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

const execFileAsync = promisify(execFile);

export async function POST(req: NextRequest) {
  try {
    const session = await getCurrentUser();
    if (!session?.userId) {
      return NextResponse.json(
        { error: "Please sign in or create an account to add music" },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const url = (body.url || "").trim();

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    let target = url;
    let overrideTitle: string | null = null;
    let overrideArtist: string | null = null;
    let overrideAlbum: string | null = null;
    let overrideCoverUrl: string | null = null;

    if (/spotify\.com|spotify:/i.test(url)) {
      try {
        const { resolveSpotify } = await import("@/lib/media-resolver");
        const resolved = await resolveSpotify(url);
        if (resolved.tracks.length > 0) {
          const firstTrack = resolved.tracks[0];
          target = firstTrack.searchQuery || `ytsearch1:${firstTrack.artist} - ${firstTrack.title} audio`;
          overrideTitle = firstTrack.title;
          overrideArtist = firstTrack.artist;
          overrideAlbum = firstTrack.album || (resolved.type === "album" ? resolved.title : null);
          overrideCoverUrl = firstTrack.coverUrl || (resolved.type === "album" ? resolved.coverUrl : null);
        }
      } catch (err) {
        console.warn("Could not resolve Spotify URL:", err);
      }
    }

    const songId = crypto.randomUUID();
    const tempStem = `ytdl_${crypto.randomBytes(4).toString("hex")}`;
    const outputTemplate = path.join(UPLOAD_FOLDER, `${tempStem}.%(ext)s`);

    const args = [
      "-f", "bestaudio/best",
      "-x",
      "--audio-format", "mp3",
      "--audio-quality", "320K",
      "-o", outputTemplate,
      "--no-playlist",
      "--no-warnings",
      "--print-json",
      "--concurrent-fragments", "5",
    ];

    const cookiesFile = getCookiesPath();
    if (cookiesFile) {
      console.log(`[ytdl] Using cookies file: ${cookiesFile}`);
      args.push("--cookies", cookiesFile);
    } else {
      console.log("[ytdl] No cookies file found");
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
      const res = await execFileAsync(getYtdlpPath(), args, {
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
      console.error("yt-dlp execution error:", errorMsg);
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

    // Locate the downloaded file
    const files = fs.readdirSync(UPLOAD_FOLDER);
    const downloadedName = files.find((f) => f.startsWith(tempStem));

    if (!downloadedName) {
      return NextResponse.json({ error: "Audio file was not saved" }, { status: 500 });
    }

    const downloadedPath = path.join(UPLOAD_FOLDER, downloadedName);
    // Keep the actual file extension (m4a, opus, webm) - don't force .mp3
    const finalFilename = downloadedName;

    const title = overrideTitle || (info.title as string) || "Audio Track";
    const artist =
      overrideArtist ||
      (info.artist as string) ||
      (info.uploader as string) ||
      (info.channel as string) ||
      "Unknown Artist";
    const album = overrideAlbum || (info.album as string) || "Downloaded Audio";
    const duration = typeof info.duration === "number" ? info.duration : 0;
    let downloadedThumbnail: string | null = null;
    if (info.thumbnail && typeof info.thumbnail === "string") {
      downloadedThumbnail = info.thumbnail;
    } else if (Array.isArray(info.thumbnails) && info.thumbnails.length > 0) {
      const lastThumb = info.thumbnails[info.thumbnails.length - 1];
      if (lastThumb && typeof lastThumb.url === "string") {
        downloadedThumbnail = lastThumb.url;
      }
    }

    const isPlaylist = /playlist/i.test(url);
    const thumbnailUrl = isPlaylist
      ? (downloadedThumbnail || overrideCoverUrl || null)
      : (overrideCoverUrl || downloadedThumbnail || null);

    let coverFilename: string | null = null;
    if (thumbnailUrl) {
      try {
        const coverName = `${tempStem}.jpg`;
        const coverPath = path.join(COVERS_FOLDER, coverName);
        const imgRes = await fetch(thumbnailUrl, {
          headers: { "User-Agent": "Mozilla/5.0" },
        });
        if (imgRes.ok) {
          const imgBuffer = Buffer.from(await imgRes.arrayBuffer());
          fs.writeFileSync(coverPath, imgBuffer);
          coverFilename = coverName;
        }
      } catch (imgErr) {
        console.warn("Could not download thumbnail:", imgErr);
      }
    }

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
      session?.userId || null
    );

    return NextResponse.json({
      success: true,
      id: songId,
      title,
      artist,
      album,
      duration,
      filename: finalFilename,
      cover: coverFilename,
    });
  } catch (error) {
    console.error("YTDL error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
