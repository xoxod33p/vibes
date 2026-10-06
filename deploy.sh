#!/bin/bash
set -e

BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "dev")

echo "==> Pulling latest code on branch $BRANCH..."
git pull origin "$BRANCH"

echo "==> Ensuring yt-dlp is installed and up-to-date..."
mkdir -p "./bin"
if [ -f "./bin/yt-dlp" ]; then
  chmod +x "./bin/yt-dlp"
  ./bin/yt-dlp -U 2>/dev/null || true
elif command -v yt-dlp &>/dev/null; then
  yt-dlp -U 2>/dev/null || true
else
  echo "    Downloading yt-dlp binary to ./bin/yt-dlp..."
  ARCH=$(uname -m 2>/dev/null || echo "x86_64")
  case "$ARCH" in
    aarch64|arm64) YTDLP_URL="https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_linux_aarch64" ;;
    armv7l)        YTDLP_URL="https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_linux_armv7l" ;;
    *)             YTDLP_URL="https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_linux" ;;
  esac
  curl -fsSL "$YTDLP_URL" -o "./bin/yt-dlp" 2>/dev/null || wget -qO "./bin/yt-dlp" "$YTDLP_URL"
  chmod +x "./bin/yt-dlp"
  echo "    Installed yt-dlp: $(./bin/yt-dlp --version 2>/dev/null || echo 'installed')"
fi

# Ensure ffmpeg availability
if ! command -v ffmpeg &>/dev/null && [ ! -f "./bin/ffmpeg" ]; then
  echo "⚠️  [WARNING] ffmpeg not found! Audio transcoding requires ffmpeg."
  echo "    Install with: sudo apt install -y ffmpeg (or run ./scripts/install.sh)"
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

