import type { WebSocket, WebSocketServer } from "ws";
import { WsDownloadProgress } from "./types";

export type { WsDownloadProgress };

export type WsMessage =
  | { type: "sync"; data: { downloads: WsDownloadProgress[] } }
  | { type: "download:progress"; data: WsDownloadProgress }
  | { type: "download:complete"; data: { songId: string; song?: Record<string, unknown> } }
  | { type: "download:error"; data: { songId: string; error: string } }
  | { type: "songs:updated" }
  | { type: "playlists:updated" }
  | { type: "ping" }
  | { type: "pong" };

declare global {
  // eslint-disable-next-line no-var
  var __vibes_wss: WebSocketServer | undefined;
  // eslint-disable-next-line no-var
  var __vibes_ws_clients: Set<WebSocket> | undefined;
  // eslint-disable-next-line no-var
  var __vibes_downloads: Map<string, WsDownloadProgress> | undefined;
}

function getClients(): Set<WebSocket> {
  if (!globalThis.__vibes_ws_clients) {
    globalThis.__vibes_ws_clients = new Set<WebSocket>();
  }
  return globalThis.__vibes_ws_clients;
}

function getDownloadsMap(): Map<string, WsDownloadProgress> {
  if (!globalThis.__vibes_downloads) {
    globalThis.__vibes_downloads = new Map<string, WsDownloadProgress>();
  }
  return globalThis.__vibes_downloads;
}

/**
 * Register a client WebSocket connection
 */
export function registerWsClient(ws: WebSocket) {
  const clients = getClients();
  clients.add(ws);

  // Send current active downloads state upon connection
  const active = Array.from(getDownloadsMap().values()).filter(
    (d) => d.status === "pending" || d.status === "downloading" || d.status === "transcoding"
  );
  try {
    ws.send(JSON.stringify({ type: "sync", data: { downloads: active } }));
  } catch {}

  ws.on("close", () => {
    clients.delete(ws);
  });

  ws.on("error", () => {
    clients.delete(ws);
  });

  ws.on("message", (raw) => {
    try {
      const msg = JSON.parse(raw.toString());
      if (msg.type === "ping") {
        ws.send(JSON.stringify({ type: "pong" }));
      }
    } catch {}
  });
}

/**
 * Broadcast a JSON message to all connected clients
 */
export function broadcastWs(message: WsMessage) {
  const clients = getClients();
  const payload = JSON.stringify(message);

  for (const client of clients) {
    if (client.readyState === 1 /* OPEN */) {
      try {
        client.send(payload);
      } catch (err) {
        clients.delete(client);
      }
    }
  }
}

/**
 * Update download progress and broadcast to all connected WebSocket clients
 */
export function broadcastDownloadProgress(progress: WsDownloadProgress) {
  const map = getDownloadsMap();
  if (progress.status === "ready" || progress.status === "error") {
    // Keep in map briefly so late clients know it finished, then clean up
    map.set(progress.songId, progress);
    setTimeout(() => {
      map.delete(progress.songId);
    }, 15000);
  } else {
    map.set(progress.songId, progress);
  }

  broadcastWs({
    type: "download:progress",
    data: progress,
  });
}

/**
 * Broadcast song download completion
 */
export function broadcastDownloadComplete(songId: string, song?: Record<string, unknown>) {
  const map = getDownloadsMap();
  const existing = map.get(songId);
  if (existing) {
    existing.status = "ready";
    existing.progress = 100;
  }
  setTimeout(() => map.delete(songId), 15000);

  broadcastWs({
    type: "download:complete",
    data: { songId, song },
  });
  broadcastWs({ type: "songs:updated" });
}

/**
 * Broadcast song download error
 */
export function broadcastDownloadError(songId: string, error: string) {
  const map = getDownloadsMap();
  const existing = map.get(songId);
  if (existing) {
    existing.status = "error";
    existing.error = error;
  }
  setTimeout(() => map.delete(songId), 15000);

  broadcastWs({
    type: "download:error",
    data: { songId, error },
  });
}
