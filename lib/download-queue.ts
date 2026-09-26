/**
 * Simple in-memory sequential download queue.
 * Ensures only one yt-dlp process runs at a time to avoid
 * YouTube rate limits and VPS resource exhaustion.
 *
 * Uses a global singleton to survive Next.js hot-reload in dev.
 */

type DownloadJob = () => Promise<void>;

interface DownloadQueueState {
  queue: DownloadJob[];
  isProcessing: boolean;
}

declare global {
  // eslint-disable-next-line no-var
  var __vibes_dl_queue: DownloadQueueState | undefined;
}

function getState(): DownloadQueueState {
  if (!globalThis.__vibes_dl_queue) {
    globalThis.__vibes_dl_queue = { queue: [], isProcessing: false };
  }
  return globalThis.__vibes_dl_queue;
}

async function processQueue() {
  const state = getState();
  if (state.isProcessing) return;
  state.isProcessing = true;

  while (state.queue.length > 0) {
    const job = state.queue.shift()!;
    try {
      await job();
    } catch (err) {
      console.error("[dl-queue] Job error:", err);
    }
  }

  state.isProcessing = false;
}

/** Add a download job to the queue. It will run after all previous jobs finish. */
export function enqueueDownload(job: DownloadJob): number {
  const state = getState();
  state.queue.push(job);
  const position = state.queue.length;

  // Kick off processing if not already running
  processQueue().catch((err) => console.error("[dl-queue] processQueue error:", err));

  return position;
}

/** How many jobs are currently waiting (not including the one running). */
export function queueLength(): number {
  return getState().queue.length;
}
