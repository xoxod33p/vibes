import { NextRequest, NextResponse } from "next/server";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { db, UPLOAD_FOLDER, COVERS_FOLDER, BASE_DIR, getCookiesPath } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { enqueueDownload, queueLength } from "@/lib/download-queue";

const execFileAsync = promisify(execFile);

// Run the actual yt-dlp download in the background and update DB when done
async function runBackgroundDownload(opts: {
  songId: string;
  tempStem: string;
  target: string;
  title: string;
  artist: string;
  album: string;
  duration: number;
  coverUrl: string | null;
  isPlaylist: boolean;
  playlistId: string | null;
  userId: string;
}) {
  const { songId, tempStem, target, title, artist, album, duration, coverUrl, isPlaylist, playlistId, userId } = opts;
  const outputTemplate = path.join(UPLOAD_FOLDER, `${tempStem}.%(ext)s`);

  const args = [
    "-f", "bestaudio[ext=m4a]/bestaudio/best",
    "-o", outputTemplate,
    "--no-playlist",
    "--no-warnings",
    "--print-json",
    "--concurrent-fragments", "5",
    // iOS + web fallback: iOS avoids n-challenge, web covers missing formats
    "--extractor-args", "youtube:player_client=ios,web",
    // Point yt-dlp to the Node.js binary running this process (handles nvm paths)
    "--js-runtimes", `node:${process.execPath}`,
  ];

  const cookiesFile = getCookiesPath();
  if (cookiesFile) {
    console.log(`[download:bg] Using cookies file: ${cookiesFile}`);
    args.push("--cookies", cookiesFile);
  } else {
    console.log("[download:bg] No cookies file found");
  }

  args.push(target);

  const extendedPath = [
    process.env.PATH || "",
    "/usr/local/bin",
    "/usr/bin",
    "/bin",
    path.join(process.env.HOME || "/home/admin", ".local/bin"),
  ].join(process.platform === "win32" ? ";" : ":");

  let info: Record<string, unknown> = {};
  try {
    const res = await execFileAsync("yt-dlp", args, {
      timeout: 180000,
      env: { ...process.env, PATH: extendedPath },
    });

    try {
      const lines = res.stdout.trim().split("\n");
      const lastJsonLine = lines.find((l) => l.startsWith("{") && l.endsWith("}")) || lines[0];
      info = JSON.parse(lastJsonLine);
    } catch {
      console.warn("[download:bg] Could not parse yt-dlp JSON output");
    }
  } catch (execErr: unknown) {
    const execObj = execErr as { message?: string; stderr?: string };
    const errorMsg = execObj.stderr?.trim() || execObj.message || String(execErr);
    console.error("[download:bg] yt-dlp error:", errorMsg.slice(0, 300));

    // Mark song as error in DB
    try {
      db.prepare("UPDATE songs SET status = 'error' WHERE id = ?").run(songId);
    } catch (dbErr) {
      console.error("[download:bg] Failed to update error status:", dbErr);
    }
    return;
  }

  // Locate and rename the downloaded file
  const files = fs.readdirSync(UPLOAD_FOLDER);
  const downloadedName = files.find((f) => f.startsWith(tempStem) && !f.endsWith(".pending"));
  if (!downloadedName) {
    console.error("[download:bg] Downloaded file not found for stem:", tempStem);
    db.prepare("UPDATE songs SET status = 'error' WHERE id = ?").run(songId);
    return;
  }

  // Use the real downloaded filename (keep actual extension - m4a, opus, webm, etc.)
  const downloadedPath = path.join(UPLOAD_FOLDER, downloadedName);
  const finalFilename = downloadedName; // keep as-is, don't force .mp3
  const finalPath = downloadedPath;
  void finalPath; // no rename needed

  // Resolve final metadata (yt-dlp info overrides if user didn't provide)
  const finalTitle = title !== "Downloading..." ? title : ((info.title as string) || "Audio Track");
  const finalArtist = artist !== "Please wait" ? artist : (
    (info.artist as string) || (info.uploader as string) || (info.channel as string) || "Unknown Artist"
  );
  const finalAlbum = album || (info.album as string) || "Downloaded Audio";
  const finalDuration = duration > 0 ? duration : (typeof info.duration === "number" ? info.duration : 0);

  // Cover art
  let downloadedThumbnail: string | null = null;
  if (info.thumbnail && typeof info.thumbnail === "string") {
    downloadedThumbnail = info.thumbnail;
  } else if (Array.isArray(info.thumbnails) && info.thumbnails.length > 0) {
    const lastThumb = info.thumbnails[info.thumbnails.length - 1];
    if (lastThumb && typeof lastThumb.url === "string") downloadedThumbnail = lastThumb.url;
  }

  const candidateCover = isPlaylist
    ? (downloadedThumbnail || coverUrl || null)
    : (coverUrl || downloadedThumbnail || null);

  let coverFilename: string | null = null;
  if (candidateCover) {
    try {
      const coverName = `${tempStem}.jpg`;
      const coverPath = path.join(COVERS_FOLDER, coverName);
      const imgRes = await fetch(candidateCover, { headers: { "User-Agent": "Mozilla/5.0" } });
      if (imgRes.ok) {
        fs.writeFileSync(coverPath, Buffer.from(await imgRes.arrayBuffer()));
        coverFilename = coverName;
      }
    } catch {
      console.warn("[download:bg] Could not download cover art");
    }
  }

  // Update DB record with final data
  try {
    db.prepare(`
      UPDATE songs
      SET title = ?, artist = ?, album = ?, duration = ?, filename = ?, cover = ?, status = 'ready'
      WHERE id = ?
    `).run(finalTitle, finalArtist, finalAlbum, finalDuration, finalFilename, coverFilename, songId);

    // Associate with playlist if needed
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
        console.warn("[download:bg] Could not associate song with playlist:", plErr);
      }
    }

    console.log(`[download:bg] Done: "${finalTitle}" (${songId})`);
  } catch (dbErr) {
    console.error("[download:bg] Failed to update song record:", dbErr);
  }
}

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

    // Use provided metadata as placeholders while downloading
    const title = (body.title as string)?.trim() || "Downloading...";
    const artist = (body.artist as string)?.trim() || "Please wait";
    const album = (body.album as string)?.trim() || "Downloaded Audio";
    const duration = typeof body.duration === "number" && body.duration > 0 ? body.duration : 0;
    const coverUrl = (body.coverUrl as string) || null;
    const isPlaylist = Boolean(body.isPlaylist || body.playlistId);
    const playlistId = (body.playlistId as string) || null;

    // Insert a pending placeholder immediately so it shows in the library
    const pendingFilename = `${tempStem}.pending`;
    db.prepare(`
      INSERT INTO songs (id, title, artist, album, duration, filename, cover, user_id, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')
    `).run(songId, title, artist, album, duration, pendingFilename, null, session.userId);

    // Add to sequential download queue (one at a time)
    const position = enqueueDownload(() =>
      runBackgroundDownload({
        songId, tempStem, target, title, artist, album, duration,
        coverUrl, isPlaylist, playlistId, userId: session.userId,
      })
    );
    console.log(`[dl-queue] Queued "${title}" at position ${position}, queue length: ${queueLength()}`);

    // Return immediately with the pending song
    return NextResponse.json({
      success: true,
      pending: true,
      queuePosition: position,
      song: { id: songId, title, artist, album, duration, filename: pendingFilename, cover: null, status: "pending" },
    }, { status: 202 });

  } catch (error) {
    console.error("Media download route error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
