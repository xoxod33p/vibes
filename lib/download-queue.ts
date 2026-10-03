type DownloadJob = () => Promise<void>;

interface DownloadQueueState {
  queue: DownloadJob[];
  isProcessing: boolean;
}

declare global {
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

export function enqueueDownload(job: DownloadJob): number {
  const state = getState();
  state.queue.push(job);
  const position = state.queue.length;

  processQueue().catch((err) => console.error("[dl-queue] processQueue error:", err));

  return position;
}

export function queueLength(): number {
  return getState().queue.length;
}
