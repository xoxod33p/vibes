"use client";

import React from "react";
import { ListMusic, Trash2, Play, Disc3, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useAudio } from "@/lib/audio-context";
import { formatTime, cn } from "@/lib/utils";

interface QueueDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function QueueDrawer({ open, onOpenChange }: QueueDrawerProps) {
  const { queue, queueIndex, playSong, removeFromQueue, clearQueue } = useAudio();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader className="flex flex-row items-center justify-between pr-6">
          <DialogTitle className="flex items-center gap-2">
            <ListMusic className="w-5 h-5 text-[var(--accent-primary)]" />
            <span>Play Queue ({queue.length})</span>
          </DialogTitle>
          {queue.length > 0 && (
            <button
              onClick={clearQueue}
              className="text-xs text-red-400 hover:text-red-300 hover:underline cursor-pointer"
            >
              Clear Queue
            </button>
          )}
        </DialogHeader>

        {queue.length > 0 ? (
          <div className="max-h-80 overflow-y-auto flex flex-col gap-1 pr-1 py-1">
            {queue.map((song, idx) => {
              const isCurrent = idx === queueIndex;
              return (
                <div
                  key={`${song.id}-${idx}`}
                  onClick={() => playSong(song, queue)}
                  className={cn(
                    "group flex items-center justify-between p-2.5 rounded-xl transition-all cursor-pointer",
                    isCurrent
                      ? "bg-[var(--accent-primary)]/20 border border-[var(--accent-primary)]/40 text-white font-medium shadow-sm"
                      : "hover:bg-white/5 text-neutral-300"
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0 pr-2">
                    <span className="w-4 text-center text-xs font-mono text-neutral-500">
                      {isCurrent ? (
                        <div className="flex items-center justify-center gap-0.5 h-3">
                          <span className="w-0.5 bg-[var(--accent-primary)] eq-bar-1" />
                          <span className="w-0.5 bg-[var(--accent-primary)] eq-bar-2" />
                          <span className="w-0.5 bg-[var(--accent-secondary)] eq-bar-3" />
                        </div>
                      ) : (
                        idx + 1
                      )}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm truncate font-medium">{song.title}</p>
                      <p className="text-xs text-neutral-400 truncate">{song.artist}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs font-mono text-neutral-400">
                      {formatTime(song.duration)}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFromQueue(idx);
                      }}
                      className="p-1 rounded-md text-neutral-500 hover:text-red-400 hover:bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Remove from queue"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center text-neutral-400">
            <Disc3 className="w-10 h-10 text-neutral-600 mb-2 animate-spin-slow animate-spin-paused" />
            <p className="text-sm">Queue is empty</p>
            <p className="text-xs text-neutral-500 mt-1">Play any song to populate the queue</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
