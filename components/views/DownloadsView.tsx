"use client";

import React from "react";
import { useAudio } from "@/lib/audio-context";
import {
  DownloadCloud,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Radio,
  Inbox,
} from "lucide-react";
import { WsDownloadProgress } from "@/lib/types";
import { cn } from "@/lib/utils";

function statusLabel(dl: WsDownloadProgress): string {
  switch (dl.status) {
    case "pending":
      return "Waiting in queue…";
    case "downloading":
      return "Downloading…";
    case "transcoding":
      return "Optimizing audio…";
    case "ready":
      return "Ready to play!";
    case "error":
      return dl.error || "Failed";
    default:
      return "Processing…";
  }
}

function StatusIcon({ dl }: { dl: WsDownloadProgress }) {
  if (dl.status === "ready")
    return <CheckCircle2 className="w-5 h-5 text-emerald-400" />;
  if (dl.status === "error")
    return <AlertCircle className="w-5 h-5 text-red-400" />;
  if (dl.status === "transcoding")
    return <Loader2 className="w-5 h-5 text-[var(--accent-primary)] animate-spin" />;
  if (dl.status === "pending")
    return <Radio className="w-5 h-5 text-neutral-400" />;
  return <DownloadCloud className="w-5 h-5 text-[var(--accent-primary)] animate-bounce" />;
}

function progressPercent(dl: WsDownloadProgress): number {
  if (dl.status === "ready") return 100;
  if (dl.status === "transcoding") return 95;
  if (dl.status === "pending") return 0;
  return Math.round(dl.progress ?? 0);
}

function DownloadCard({ dl }: { dl: WsDownloadProgress }) {
  const isReady = dl.status === "ready";
  const isError = dl.status === "error";
  const pct = progressPercent(dl);

  return (
    <div
      className={cn(
        "flex flex-col gap-3 p-4 rounded-2xl border transition-all duration-200",
        isReady
          ? "bg-emerald-500/5 border-emerald-500/20"
          : isError
          ? "bg-red-500/5 border-red-500/20"
          : "bg-[var(--bg-card)] border-white/5"
      )}
    >
      {/* Top row */}
      <div className="flex items-center gap-3">
        {/* Icon bubble */}
        <div
          className={cn(
            "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
            isReady
              ? "bg-emerald-500/15"
              : isError
              ? "bg-red-500/15"
              : "bg-[var(--accent-primary)]/10"
          )}
        >
          <StatusIcon dl={dl} />
        </div>

        {/* Title + meta */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white truncate leading-snug">
            {dl.title || "Downloading track…"}
          </p>
          {dl.artist && (
            <p className="text-xs text-neutral-400 truncate mt-0.5">{dl.artist}</p>
          )}
        </div>

        {/* Right side: percentage */}
        <div className="flex flex-col items-end shrink-0 ml-2">
          <span
            className={cn(
              "text-sm font-bold tabular-nums",
              isReady
                ? "text-emerald-400"
                : isError
                ? "text-red-400"
                : "text-white"
            )}
          >
            {pct}%
          </span>
        </div>
      </div>

      {/* Progress bar */}
      {!isError && (
        <div className="w-full h-2 bg-white/8 rounded-full overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-300 ease-out",
              isReady
                ? "bg-emerald-400"
                : "bg-gradient-to-r from-[var(--accent-primary)] to-emerald-400"
            )}
            style={{ width: `${Math.max(pct, isReady ? 100 : 3)}%` }}
          />
        </div>
      )}

      {/* Status / speed row */}
      <div className="flex items-center gap-3 text-[11px] text-neutral-400">
        <span
          className={cn(
            "font-medium",
            isReady
              ? "text-emerald-400"
              : isError
              ? "text-red-400"
              : "text-neutral-300"
          )}
        >
          {statusLabel(dl)}
        </span>
        {dl.speed && !isReady && !isError && (
          <span className="text-neutral-500">· {dl.speed}</span>
        )}
        {dl.eta && !isReady && !isError && (
          <span className="text-neutral-500">· ETA {dl.eta}</span>
        )}
        {dl.totalSize && !isReady && !isError && (
          <span className="text-neutral-500">· {dl.totalSize}</span>
        )}
      </div>
    </div>
  );
}

export function DownloadsView() {
  const { activeDownloads, isWsConnected } = useAudio();
  const downloads = Object.values(activeDownloads);

  const active = downloads.filter(
    (d) => d.status !== "ready" && d.status !== "error"
  );
  const completed = downloads.filter((d) => d.status === "ready");
  const failed = downloads.filter((d) => d.status === "error");

  return (
    <div className="flex flex-col h-full min-h-0 gap-6">
      {/* Fixed header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Downloads
          </h1>
          <p className="text-sm text-neutral-400 mt-0.5">
            {downloads.length === 0
              ? "No active downloads"
              : `${downloads.length} track${downloads.length !== 1 ? "s" : ""} in queue`}
          </p>
        </div>

        {/* Live WS badge */}
        <div
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border",
            isWsConnected
              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
              : "bg-white/5 border-white/10 text-neutral-500"
          )}
        >
          <span
            className={cn(
              "w-2 h-2 rounded-full",
              isWsConnected
                ? "bg-emerald-400 animate-pulse"
                : "bg-neutral-600"
            )}
          />
          {isWsConnected ? "Live" : "Offline"}
        </div>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto min-h-0 pb-4 flex flex-col gap-6">
        {/* Empty state */}
        {downloads.length === 0 && (
          <div className="flex flex-col items-center justify-center flex-1 gap-4 py-20 text-center select-none">
            <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center">
              <Inbox className="w-8 h-8 text-neutral-600" />
            </div>
            <div>
              <p className="text-neutral-300 font-semibold">No downloads yet</p>
              <p className="text-sm text-neutral-500 mt-1">
                Use the Download button to add YouTube or Spotify tracks.
              </p>
            </div>
          </div>
        )}

        {/* Active downloads */}
        {active.length > 0 && (
          <section className="flex flex-col gap-3">
            <h2 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              In Progress · {active.length}
            </h2>
            <div className="flex flex-col gap-3">
              {active.map((dl) => (
                <DownloadCard key={dl.songId} dl={dl} />
              ))}
            </div>
          </section>
        )}

        {/* Completed */}
        {completed.length > 0 && (
          <section className="flex flex-col gap-3">
            <h2 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              Completed · {completed.length}
            </h2>
            <div className="flex flex-col gap-3">
              {completed.map((dl) => (
                <DownloadCard key={dl.songId} dl={dl} />
              ))}
            </div>
          </section>
        )}

        {/* Failed */}
        {failed.length > 0 && (
          <section className="flex flex-col gap-3">
            <h2 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider flex items-center gap-2">
              <AlertCircle className="w-3.5 h-3.5 text-red-400" />
              Failed · {failed.length}
            </h2>
            <div className="flex flex-col gap-3">
              {failed.map((dl) => (
                <DownloadCard key={dl.songId} dl={dl} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
