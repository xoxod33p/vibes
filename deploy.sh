#!/bin/bash
set -e

BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "dev")

echo "==> Pulling latest code on branch $BRANCH..."
git pull origin "$BRANCH"

echo "==> Updating yt-dlp..."
if command -v yt-dlp &>/dev/null; then
  yt-dlp -U 2>/dev/null || true
fi
if [ -f "./bin/yt-dlp" ]; then
  ./bin/yt-dlp -U 2>/dev/null || true
fi

# Low RAM check on Linux VPS
if [ -f /proc/meminfo ]; then
  TOTAL_RAM_KB=$(grep MemTotal /proc/meminfo 2>/dev/null | awk '{print $2}' || echo "0")
  SWAP_TOTAL_KB=$(grep SwapTotal /proc/meminfo 2>/dev/null | awk '{print $2}' || echo "0")
  if [ "$TOTAL_RAM_KB" -gt 0 ] && [ "$TOTAL_RAM_KB" -lt 2500000 ] && [ "$SWAP_TOTAL_KB" -lt 500000 ]; then
    echo "⚠️  [WARNING] System has < 2.5GB RAM and no swap detected."
    echo "    If build crashes with OOM, add a 2GB swapfile: sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile && sudo mkswap /swapfile && sudo swapon /swapfile"
  fi
fi

echo "==> Installing dependencies..."
npm install --prefer-offline --no-audit

echo "==> Building production bundle (memory-optimized)..."
export NODE_OPTIONS="${NODE_OPTIONS:---max-old-space-size=1536}"
export NEXT_TELEMETRY_DISABLED=1
npm run build

echo "==> Build complete!"
echo "==> Start the server with: npm start"

