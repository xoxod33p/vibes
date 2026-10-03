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

echo "==> Installing dependencies..."
npm install

echo "==> Building production bundle..."
npm run build

echo "==> Restarting with PM2..."
pm2 describe vibes > /dev/null 2>&1 \
  && pm2 reload ecosystem.config.js --update-env \
  || pm2 start ecosystem.config.js

pm2 save
echo "==> Done! App running on port 5000"
