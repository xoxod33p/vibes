import { NextRequest, NextResponse } from "next/server";
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { songsDb, playlistsDb, UPLOAD_FOLDER, COVERS_FOLDER, BASE_DIR, getCookiesPath, getYtdlpPath } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { enqueueDownload, queueLength } from "@/lib/download-queue";
import {
  broadcastDownloadProgress,
  broadcastDownloadComplete,
  broadcastDownloadError,
} from "@/lib/ws-bus";

export const dynamic = "force-dynamic";

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

  broadcastDownloadProgress({
    songId,
    title,
    artist,
    status: "downloading",
    progress: 0,
  });

  const cookiesFile = getCookiesPath();
  if (cookiesFile) {
    console.log(`[download:bg] Using cookies file: ${cookiesFile}`);
  } else {
    console.log("[download:bg] No cookies file found (checked COOKIES_PATH, ./cookies.txt, /home/admin/vibes/cookies.txt)");
  }

  const extendedPath = [
    process.env.PATH || "",
    "/usr/local/bin",
    "/usr/bin",
    "/bin",
    path.join(process.env.HOME || "/home/admin", ".local/bin"),
  ].join(process.platform === "win32" ? ";" : ":");

  const runYtdlpAttempt = (useCookies: boolean, clientArg: string) => {
    return new Promise<{ exitCode: number; stdout: string; stderr: string }>((resolve) => {
      const args = [
        "-f", "bestaudio/best",
        "-x",
        "--audio-format", "mp3",
        "--audio-quality", "320K",
        "-o", outputTemplate,
        "--no-playlist",
        "--no-warnings",
        "--print-json",
        "--newline",
        "--progress-template", "VIBES_PROG:%(progress._percent_str)s|%(progress._speed_str)s|%(progress._eta_str)s|%(progress._total_bytes_estimate_str)s",
        "--concurrent-fragments", "5",
        "--no-check-certificates",
      ];

      if (clientArg) {
        args.push("--extractor-args", `youtube:player_client=${clientArg}`);
      }

      if (useCookies && cookiesFile) {
        args.push("--cookies", cookiesFile);
      }

      args.push(target);

      let stdoutData = "";
      let stderrData = "";

      const child = spawn(getYtdlpPath(), args, {
        env: { ...process.env, PATH: extendedPath },
      });

      child.stdout.on("data", (chunk: Buffer) => {
        const text = chunk.toString();
        stdoutData += text;

        const lines = text.split(/\r?\n/);
        for (const line of lines) {
          if (line.startsWith("VIBES_PROG:")) {
            const parts = line.slice("VIBES_PROG:".length).split("|");
            const rawPercent = (parts[0] || "").replace("%", "").trim();
            const percent = parseFloat(rawPercent);
            const speed = (parts[1] || "").trim();
            const eta = (parts[2] || "").trim();
            const totalSize = (parts[3] || "").trim();

            if (!isNaN(percent)) {
              broadcastDownloadProgress({
                songId,
                title,
                artist,
                status: "downloading",
                progress: Math.min(Math.max(percent, 0), 99),
                speed: speed || undefined,
                eta: eta || undefined,
                totalSize: totalSize || undefined,
              });
            }
          } else if (line.includes("[ExtractAudio]") || line.includes("[PostProcessor]")) {
            broadcastDownloadProgress({
              songId,
              title,
              artist,
              status: "transcoding",
              progress: 95,
              speed: "Converting to audio...",
            });
          }
        }
      });

      child.stderr.on("data", (chunk: Buffer) => {
        stderrData += chunk.toString();
      });

      child.on("close", (code) => {
        resolve({ exitCode: code ?? 0, stdout: stdoutData, stderr: stderrData });
      });

      child.on("error", (err) => {
        resolve({ exitCode: 1, stdout: stdoutData, stderr: stderrData + " " + err.message });
      });
    });
  };

  const attempts: Array<{ useCookies: boolean; client: string }> = [];
  if (cookiesFile) {
    attempts.push({ useCookies: true, client: "" });
    attempts.push({ useCookies: true, client: "default,web_safari,web_embedded" });
    attempts.push({ useCookies: true, client: "android,web" });
    attempts.push({ useCookies: false, client: "android,web" });
    attempts.push({ useCookies: false, client: "ios,android,web" });
  } else {
    attempts.push({ useCookies: false, client: "android,web" });
    attempts.push({ useCookies: false, client: "ios,android,web" });
    attempts.push({ useCookies: false, client: "" });
  }

  let finalStdout = "";
  let finalStderr = "";
  let success = false;

  for (let i = 0; i < attempts.length; i++) {
    const attempt = attempts[i];
    if (i > 0) {
      console.log(`[download:bg] Attempt ${i + 1}/${attempts.length} (cookies=${attempt.useCookies}, client=${attempt.client || "default"})...`);
      broadcastDownloadProgress({
        songId,
        title,
        artist,
        status: "downloading",
        progress: 1,
        speed: "Retrying download...",
      });
    }

    const res = await runYtdlpAttempt(attempt.useCookies, attempt.client);
    finalStdout = res.stdout;
    finalStderr = res.stderr;

    if (res.exitCode === 0) {
      success = true;
      break;
    }

    const isReloadOrBot = /reloaded|bot|sign in|429/i.test(res.stderr);
    if (!isReloadOrBot && i === 0 && !attempt.useCookies) {
      break;
    }
  }

  if (!success) {
    const errorMsg = finalStderr.trim().slice(0, 300) || "yt-dlp process failed";
    console.error("[download:bg] yt-dlp error:", errorMsg);

    try {
      await songsDb.update(songId, { status: "error" });
    } catch {}

    broadcastDownloadError(songId, errorMsg);
    return;
  }

  let info: Record<string, unknown> = {};
  try {
    const lines = finalStdout.trim().split("\n");
    const lastJsonLine = lines.findLast((l) => l.startsWith("{") && l.endsWith("}")) || "";
    if (lastJsonLine) {
      info = JSON.parse(lastJsonLine);
    }
  } catch {
    console.warn("[download:bg] Could not parse yt-dlp JSON output");
  }

  const files = fs.readdirSync(UPLOAD_FOLDER);
  const downloadedName = files.find((f) => f.startsWith(tempStem) && !f.endsWith(".pending"));
  if (!downloadedName) {
    console.error("[download:bg] Downloaded file not found for stem:", tempStem);
    await songsDb.update(songId, { status: "error" }).catch(() => {});
    broadcastDownloadError(songId, "Audio file not saved to disk");
    return;
  }

  const finalFilename = downloadedName;

  const finalTitle = title !== "Downloading..." ? title : ((info.title as string) || "Audio Track");
  const finalArtist = artist !== "Please wait" ? artist : (
    (info.artist as string) || (info.uploader as string) || (info.channel as string) || "Unknown Artist"
  );
  const finalAlbum = album || (info.album as string) || "Downloaded Audio";
  const finalDuration = duration > 0 ? duration : (typeof info.duration === "number" ? info.duration : 0);

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

  try {
    await songsDb.update(songId, {
      title: finalTitle,
      artist: finalArtist,
      album: finalAlbum,
      duration: finalDuration,
      filename: finalFilename,
      cover: coverFilename,
      status: "ready",
    });

    if (playlistId) {
      try {
        await playlistsDb.addSong(playlistId, songId);
      } catch (plErr) {
        console.warn("[download:bg] Could not associate song with playlist:", plErr);
      }
    }

    const songRecord = {
      id: songId,
      title: finalTitle,
      artist: finalArtist,
      album: finalAlbum,
      duration: finalDuration,
      filename: finalFilename,
      cover: coverFilename,
      status: "ready",
    };

    broadcastDownloadComplete(songId, songRecord);
    console.log(`[download:bg] Done: "${finalTitle}" (${songId})`);
  } catch (dbErr) {
    console.error("[download:bg] Failed to update song record:", dbErr);
    broadcastDownloadError(songId, "Failed to update database");
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getCurrentUser(req);
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

    const title = (body.title as string)?.trim() || "Downloading...";
    const artist = (body.artist as string)?.trim() || "Please wait";
    const album = (body.album as string)?.trim() || "Downloaded Audio";
    const duration = typeof body.duration === "number" && body.duration > 0 ? body.duration : 0;
    const coverUrl = (body.coverUrl as string) || null;
    const isPlaylist = Boolean(body.isPlaylist || body.playlistId);
    const playlistId = (body.playlistId as string) || null;

    const pendingFilename = `${tempStem}.pending`;
    await songsDb.create({
      id: songId,
      title,
      artist,
      album,
      duration,
      filename: pendingFilename,
      cover: null,
      user_id: session.userId,
      status: "pending",
    });

    broadcastDownloadProgress({
      songId,
      title,
      artist,
      status: "pending",
      progress: 0,
    });

    const position = enqueueDownload(() =>
      runBackgroundDownload({
        songId, tempStem, target, title, artist, album, duration,
        coverUrl, isPlaylist, playlistId, userId: session.userId,
      })
    );
    console.log(`[dl-queue] Queued "${title}" at position ${position}, queue length: ${queueLength()}`);

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
