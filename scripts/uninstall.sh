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

echo "[1/4] Removing yt-dlp..."
if [ -f "$BIN_DIR/yt-dlp" ]; then
    rm "$BIN_DIR/yt-dlp"
    echo "  Removed $BIN_DIR/yt-dlp"
else
    echo "  Not found, skipping"
fi
echo ""

echo "[2/4] Removing ffmpeg..."
for f in ffmpeg ffprobe; do
    if [ -f "$BIN_DIR/$f" ]; then
        rm "$BIN_DIR/$f"
        echo "  Removed $BIN_DIR/$f"
    fi
done
echo ""

echo "[3/4] Removing Node.js..."
if [ -d "$BIN_DIR/node" ]; then
    rm -rf "$BIN_DIR/node"
    echo "  Removed $BIN_DIR/node/"
else
    echo "  Not found, skipping"
fi
echo ""

echo "[4/4] Removing PATH entries..."
PROFILE_SCRIPT="/etc/profile.d/vibes.sh"
if [ -f "$PROFILE_SCRIPT" ]; then
    if [ "$EUID" -eq 0 ]; then
        rm "$PROFILE_SCRIPT"
        echo "  Removed $PROFILE_SCRIPT"
    else
        echo "  Cannot remove $PROFILE_SCRIPT (requires root)"
    fi
fi

for rc in "$HOME/.bashrc" "$HOME/.profile"; do
    if [ -f "$rc" ] && grep -q "$BIN_DIR" "$rc" 2>/dev/null; then
        sed -i "\|$BIN_DIR|d" "$rc"
        echo "  Cleaned PATH from $rc"
    fi
done
echo ""

if [ -d "$BIN_DIR" ]; then
    rmdir "$BIN_DIR" 2>/dev/null && echo "Removed empty bin/ directory" || echo "bin/ not empty, left in place"
fi

echo ""
echo "================================"
echo "  Uninstall complete!"
echo ""
echo "  Note: node_modules/ and .env"
echo "  were left untouched."
echo ""
echo "  Restart your shell or run:"
echo "    source ~/.bashrc"
echo "================================"
