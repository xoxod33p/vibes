#!/bin/bash
# deploy.sh — pull latest code, rebuild, and restart via PM2
set -e

echo "==> Pulling latest code..."
git pull origin main

echo "==> Installing dependencies..."
npm ci --omit=dev

echo "==> Building..."
npm run build

echo "==> Restarting with PM2..."
# Start fresh if not already managed, otherwise reload
pm2 describe vibes > /dev/null 2>&1 \
  && pm2 reload ecosystem.config.js --update-env \
  || pm2 start ecosystem.config.js

pm2 save
echo "==> Done! App running on port 5000"
