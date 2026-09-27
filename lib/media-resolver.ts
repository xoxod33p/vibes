import { execFile } from "node:child_process";
import { promisify } from "node:util";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { BASE_DIR, getCookiesPath } from "@/lib/db";

const execFileAsync = promisify(execFile);

export interface ResolvedTrack {
  id: string;
  title: string;
  artist: string;
  album?: string;
  duration: number; // in seconds
  url?: string;
  searchQuery?: string;
  coverUrl?: string | null;
}

export interface ResolvedMedia {
  source: "youtube" | "spotify";
  type: "track" | "playlist" | "album";
  title: string;
  creator: string;
  coverUrl: string | null;
  trackCount: number;
  tracks: ResolvedTrack[];
}

export function isSpotifyUrl(url: string): boolean {
  return /spotify\.com\/(track|playlist|album)\/|spotify:(track|playlist|album):/i.test(url);
}

export function isYouTubeUrl(url: string): boolean {
  return /youtube\.com|youtu\.be/i.test(url);
}

export async function resolveSpotify(url: string): Promise<ResolvedMedia> {
  // Extract entity type and ID
  let entityType: "track" | "playlist" | "album" = "track";
  let entityId = "";

  const matchWeb = url.match(/spotify\.com\/(track|playlist|album)\/([a-zA-Z0-9]+)/i);
  const matchUri = url.match(/spotify:(track|playlist|album):([a-zA-Z0-9]+)/i);

  if (matchWeb) {
    entityType = matchWeb[1].toLowerCase() as "track" | "playlist" | "album";
    entityId = matchWeb[2];
  } else if (matchUri) {
    entityType = matchUri[1].toLowerCase() as "track" | "playlist" | "album";
    entityId = matchUri[2];
  } else {
    throw new Error("Invalid Spotify URL or URI");
  }

  const embedUrl = `https://open.spotify.com/embed/${entityType}/${entityId}`;
  const res = await fetch(embedUrl, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
  });

  if (!res.ok) {
    throw new Error(`Spotify returned status ${res.status}`);
  }

  const html = await res.text();
  const marker = '<script id="__NEXT_DATA__" type="application/json">';
  const start = html.indexOf(marker);

  if (start === -1) {
    throw new Error("Could not extract Spotify metadata. Please verify the URL is public.");
  }

  const end = html.indexOf("</script>", start);
  const data = JSON.parse(html.slice(start + marker.length, end));
  const entity = data?.props?.pageProps?.state?.data?.entity;

  if (!entity) {
    throw new Error("Spotify entity not found or playlist is private.");
  }

  const mediaTitle = entity.title || entity.name || "Spotify Music";
  const creator =
    entity.subtitle ||
    (entity.artists ? entity.artists.map((a: { name: string }) => a.name).join(", ") : "") ||
    (entity.authors ? entity.authors.map((a: { name: string }) => a.name).join(", ") : "") ||
    "Spotify";

  // Pick best cover image
  let coverUrl: string | null = null;
  if (entity.coverArt?.sources && entity.coverArt.sources.length > 0) {
    coverUrl = entity.coverArt.sources[0].url;
  } else if (entity.visualIdentity?.image && entity.visualIdentity.image.length > 0) {
    const images = entity.visualIdentity.image as Array<{ url: string; maxHeight?: number }>;
    // Get the highest resolution one
    const sorted = [...images].sort((a, b) => (b.maxHeight || 0) - (a.maxHeight || 0));
    coverUrl = sorted[0]?.url || null;
  }

  const tracks: ResolvedTrack[] = [];

  if (entityType === "track") {
    const trackArtist =
      entity.subtitle ||
      (entity.artists ? entity.artists.map((a: { name: string }) => a.name).join(", ") : "") ||
      creator;
    const trackTitle = entity.title || entity.name || mediaTitle;
    const durSec = entity.duration ? Math.round(entity.duration / 1000) : 0;

    tracks.push({
      id: crypto.randomUUID(),
      title: trackTitle,
      artist: trackArtist,
      album: mediaTitle,
      duration: durSec,
      searchQuery: `ytsearch1:${trackArtist} - ${trackTitle} audio`,
      coverUrl,
    });
  } else {
    // Playlist or Album
    const isAlbum = entityType === "album";
    const trackList = (entity.trackList || []) as Array<{
      title: string;
      subtitle?: string;
      artists?: Array<{ name: string }>;
      duration?: number;
    }>;

    for (const item of trackList) {
      const trackArtist =
        item.subtitle ||
        (item.artists ? item.artists.map((a) => a.name).join(", ") : "") ||
        creator;
      const trackTitle = item.title;
      const durSec = item.duration ? Math.round(item.duration / 1000) : 0;

      tracks.push({
        id: crypto.randomUUID(),
        title: trackTitle,
        artist: trackArtist,
        album: isAlbum ? mediaTitle : undefined,
        duration: durSec,
        searchQuery: `ytsearch1:${trackArtist} - ${trackTitle} audio`,
        coverUrl: isAlbum ? coverUrl : null,
      });
    }
  }

  return {
    source: "spotify",
    type: entityType,
    title: mediaTitle,
    creator,
    coverUrl,
    trackCount: tracks.length,
    tracks,
  };
}

export async function resolveYouTube(url: string): Promise<ResolvedMedia> {
  const args = [
    "--flat-playlist",
    "-J",
    "--no-warnings",
    "--skip-download",
  ];

  const cookiesFile = getCookiesPath();
  if (cookiesFile) {
    console.log(`[resolveYouTube] Using cookies: ${cookiesFile}`);
    args.push("--cookies", cookiesFile);
  } else {
    console.log("[resolveYouTube] No cookies file found");
  }

  args.push(url);

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
      timeout: 60000,
      env: {
        ...process.env,
        PATH: extendedPath,
      },
    });
    stdout = res.stdout;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to inspect YouTube URL: ${msg.slice(0, 200)}`);
  }

  let info: Record<string, unknown> = {};
  try {
    info = JSON.parse(stdout.trim());
  } catch {
    throw new Error("Failed to parse YouTube metadata output.");
  }

  const isPlaylist = info._type === "playlist" && Array.isArray(info.entries);

  if (isPlaylist) {
    const playlistTitle = (info.title as string) || "YouTube Playlist";
    const creator =
      (info.uploader as string) ||
      (info.channel as string) ||
      "YouTube";

    const entries = (info.entries as Array<Record<string, unknown>>) || [];
    const tracks: ResolvedTrack[] = [];

    // Find playlist cover
    const thumbnails = (info.thumbnails as Array<{ url: string }>) || [];
    const coverUrl = thumbnails.length > 0 ? thumbnails[thumbnails.length - 1].url : null;

    for (const entry of entries) {
      if (!entry) continue;
      const entryId = (entry.id as string) || "";
      const entryTitle = (entry.title as string) || "YouTube Audio";
      const entryArtist =
        (entry.artist as string) ||
        (entry.uploader as string) ||
        (entry.channel as string) ||
        creator;
      const duration = typeof entry.duration === "number" ? entry.duration : 0;
      const entryUrl =
        (entry.url as string) ||
        (entryId ? `https://www.youtube.com/watch?v=${entryId}` : "");

      const entryThumbs = (entry.thumbnails as Array<{ url: string }>) || [];
      const entryCover =
        entryThumbs.length > 0
          ? entryThumbs[entryThumbs.length - 1].url
          : entryId
          ? `https://i.ytimg.com/vi/${entryId}/hqdefault.jpg`
          : null;

      if (entryUrl) {
        tracks.push({
          id: crypto.randomUUID(),
          title: entryTitle,
          artist: entryArtist,
          album: playlistTitle,
          duration,
          url: entryUrl,
          coverUrl: entryCover,
        });
      }
    }

    return {
      source: "youtube",
      type: "playlist",
      title: playlistTitle,
      creator,
      coverUrl,
      trackCount: tracks.length,
      tracks,
    };
  } else {
    // Single Video
    const title = (info.title as string) || "YouTube Audio";
    const artist =
      (info.artist as string) ||
      (info.uploader as string) ||
      (info.channel as string) ||
      "Unknown Artist";
    const album = (info.album as string) || "YouTube Single";
    const duration = typeof info.duration === "number" ? info.duration : 0;

    const thumbnails = (info.thumbnails as Array<{ url: string }>) || [];
    const coverUrl =
      (info.thumbnail as string) ||
      (thumbnails.length > 0 ? thumbnails[thumbnails.length - 1].url : null);

    const tracks: ResolvedTrack[] = [
      {
        id: crypto.randomUUID(),
        title,
        artist,
        album,
        duration,
        url,
        coverUrl,
      },
    ];

    return {
      source: "youtube",
      type: "track",
      title,
      creator: artist,
      coverUrl,
      trackCount: 1,
      tracks,
    };
  }
}

/**
 * Clean YouTube URLs by stripping auto-generated Mix playlist params (list=RD...).
 * YouTube Mixes are personalized and can't be fetched via yt-dlp.
 * Regular playlists (list=PL...) are kept intact.
 */
function cleanYouTubeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const list = parsed.searchParams.get("list");
    // YouTube Mixes start with "RD" — remove them
    if (list && list.startsWith("RD")) {
      parsed.searchParams.delete("list");
      // Also remove the mix-related index/start_radio params
      parsed.searchParams.delete("index");
      parsed.searchParams.delete("start_radio");
      return parsed.toString();
    }
    return url;
  } catch {
    return url;
  }
}

export async function inspectMediaUrl(url: string): Promise<ResolvedMedia> {
  const trimmed = url.trim();
  if (isSpotifyUrl(trimmed)) {
    return resolveSpotify(trimmed);
  } else if (isYouTubeUrl(trimmed)) {
    return resolveYouTube(cleanYouTubeUrl(trimmed));
  } else {
    // Fallback: try YouTube ytsearch or URL
    return resolveYouTube(trimmed);
  }
}
