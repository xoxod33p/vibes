#!/bin/bash
set -e

echo ""
echo "================================"
echo "  Vibes Music Player - Uninstall"
echo "  Linux Prerequisites Remover"
echo "================================"
echo ""

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
BIN_DIR="$PROJECT_DIR/bin"

if [ ! -d "$BIN_DIR" ]; then
    echo "Nothing to uninstall — bin/ directory not found."
    exit 0
fi

echo "[1/3] Removing yt-dlp..."
if [ -f "$BIN_DIR/yt-dlp" ]; then
    rm "$BIN_DIR/yt-dlp"
    echo "  Removed $BIN_DIR/yt-dlp"
else
    echo "  Not found, skipping"
fi
echo ""

echo "[2/3] Removing ffmpeg..."
for f in ffmpeg ffprobe; do
    if [ -f "$BIN_DIR/$f" ]; then
        rm "$BIN_DIR/$f"
        echo "  Removed $BIN_DIR/$f"
    fi
done
echo ""

echo "[3/3] Removing Node.js..."
if [ -d "$BIN_DIR/node" ]; then
    rm -rf "$BIN_DIR/node"
    echo "  Removed $BIN_DIR/node/"
else
    echo "  Not found, skipping"
fi
echo ""

# Clean up empty bin dir
rmdir "$BIN_DIR" 2>/dev/null && echo "Removed empty bin/ directory" || true

echo ""
echo "================================"
echo "  Uninstall complete!"
echo ""
echo "  Note: node_modules/ and .env"
echo "  were left untouched."
echo "================================"
