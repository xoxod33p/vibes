"use client";

import React from "react";
import { useAudio } from "@/lib/audio-context";
import { DownloadCloud, CheckCircle2, AlertCircle, Loader2, Radio } from "lucide-react";

export function DownloadProgressWidget() {
  const { activeDownloads, isWsConnected } = useAudio();
  const downloads = Object.values(activeDownloads);

  if (downloads.length === 0) return null;

  return (
    <div className="fixed bottom-24 right-6 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none select-none">
      {downloads.map((dl) => {
        const isError = dl.status === "error";
        const isReady = dl.status === "ready";
        const isTranscoding = dl.status === "transcoding";

        return (
          <div
            key={dl.songId}
            className="pointer-events-auto flex flex-col gap-2 p-3.5 rounded-2xl bg-[#0f141f]/95 border border-white/10 shadow-2xl backdrop-blur-xl animate-in slide-in-from-bottom-3 duration-200"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                    isReady
                      ? "bg-emerald-500/20 text-emerald-400"
                      : isError
                      ? "bg-red-500/20 text-red-400"
                      : "bg-[var(--accent-primary)]/20 text-[var(--accent-primary)]"
                  }`}
                >
                  {isReady ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : isError ? (
                    <AlertCircle className="w-4 h-4" />
                  ) : isTranscoding ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <DownloadCloud className="w-4 h-4 animate-bounce" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-semibold text-white truncate">
                    {dl.title || "Downloading track..."}
                  </div>
                  <div className="text-[11px] text-neutral-400 flex items-center gap-2 mt-0.5">
                    {isReady ? (
                      <span className="text-emerald-400 font-medium">Ready to play!</span>
                    ) : isError ? (
                      <span className="text-red-400 truncate">{dl.error || "Failed"}</span>
                    ) : isTranscoding ? (
                      <span>Optimizing audio...</span>
                    ) : (
                      <>
                        {dl.speed && <span>{dl.speed}</span>}
                        {dl.eta && <span>• ETA {dl.eta}</span>}
                        {dl.totalSize && <span>• {dl.totalSize}</span>}
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* WebSocket live badge & percentage */}
              <div className="flex flex-col items-end shrink-0">
                <span className="text-xs font-bold text-white tabular-nums">
                  {isReady ? "100%" : isTranscoding ? "95%" : `${Math.round(dl.progress)}%`}
                </span>
                {isWsConnected && (
                  <span className="flex items-center gap-1 text-[9px] text-emerald-400 font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Live WS
                  </span>
                )}
              </div>
            </div>

            {/* Progress Bar */}
            {!isReady && !isError && (
              <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[var(--accent-primary)] to-emerald-400 rounded-full transition-all duration-200 ease-out"
                  style={{ width: `${Math.max(dl.progress, 5)}%` }}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
