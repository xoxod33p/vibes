#!/bin/bash
set -e

echo ""
echo "================================"
echo "  Vibes Music Player - Setup"
echo "  Linux Server Installer"
echo "================================"
echo ""

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
BIN_DIR="$PROJECT_DIR/bin"
mkdir -p "$BIN_DIR"

ARCH=$(uname -m)
case "$ARCH" in
    x86_64)  ARCH_LABEL="amd64" ;;
    aarch64) ARCH_LABEL="arm64" ;;
    armv7l)  ARCH_LABEL="armv7l" ;;
    *)
        echo "ERROR: Unsupported architecture: $ARCH"
        exit 1
        ;;
esac

echo "[1/4] Architecture: $ARCH ($ARCH_LABEL)"
echo ""

# Install Node.js
echo "[2/4] Setting up Node.js..."
if command -v node &>/dev/null; then
    NODE_PATH="$(which node)"
    echo "  Already installed: $(node -v) at $NODE_PATH"
else
    NODE_VERSION="20.18.0"
    NODE_TAR="node-v${NODE_VERSION}-linux-${ARCH_LABEL}.tar.xz"
    NODE_URL="https://nodejs.org/dist/v${NODE_VERSION}/${NODE_TAR}"
    NODE_DIR="$BIN_DIR/node"

    echo "  Downloading Node.js v${NODE_VERSION}..."
    curl -fSL "$NODE_URL" -o "$BIN_DIR/$NODE_TAR"
    mkdir -p "$NODE_DIR"
    tar -xJf "$BIN_DIR/$NODE_TAR" -C "$NODE_DIR" --strip-components=1
    rm "$BIN_DIR/$NODE_TAR"

    NODE_PATH="$NODE_DIR/bin/node"
    export PATH="$NODE_DIR/bin:$PATH"
    echo "  Installed: $(node -v) at $NODE_PATH"
fi
echo ""

# Install ffmpeg
echo "[3/4] Setting up ffmpeg..."
if command -v ffmpeg &>/dev/null; then
    FFMPEG_PATH="$(which ffmpeg)"
    echo "  Already installed at $FFMPEG_PATH"
else
    echo "  Downloading ffmpeg static build..."
    case "$ARCH_LABEL" in
        amd64)  FFMPEG_URL="https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-amd64-static.tar.xz" ;;
        arm64)  FFMPEG_URL="https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-arm64-static.tar.xz" ;;
        armv7l) FFMPEG_URL="https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-armhf-static.tar.xz" ;;
    esac

    curl -fSL "$FFMPEG_URL" -o "$BIN_DIR/ffmpeg.tar.xz"
    mkdir -p "$BIN_DIR/ffmpeg-tmp"
    tar -xJf "$BIN_DIR/ffmpeg.tar.xz" -C "$BIN_DIR/ffmpeg-tmp" --strip-components=1
    mv "$BIN_DIR/ffmpeg-tmp/ffmpeg" "$BIN_DIR/ffmpeg"
    mv "$BIN_DIR/ffmpeg-tmp/ffprobe" "$BIN_DIR/ffprobe"
    rm -rf "$BIN_DIR/ffmpeg-tmp" "$BIN_DIR/ffmpeg.tar.xz"
    chmod +x "$BIN_DIR/ffmpeg" "$BIN_DIR/ffprobe"

    FFMPEG_PATH="$BIN_DIR/ffmpeg"
    export PATH="$BIN_DIR:$PATH"
    echo "  Installed at $FFMPEG_PATH"
fi
echo ""

# Install yt-dlp
echo "[4/4] Setting up yt-dlp..."
if command -v yt-dlp &>/dev/null; then
    YTDLP_PATH="$(which yt-dlp)"
    echo "  Already installed: $(yt-dlp --version) at $YTDLP_PATH"
else
    echo "  Downloading yt-dlp..."
    case "$ARCH_LABEL" in
        amd64)  YTDLP_URL="https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_linux" ;;
        arm64)  YTDLP_URL="https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_linux_aarch64" ;;
        armv7l) YTDLP_URL="https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_linux_armv7l" ;;
    esac

    curl -fSL "$YTDLP_URL" -o "$BIN_DIR/yt-dlp"
    chmod +x "$BIN_DIR/yt-dlp"

    YTDLP_PATH="$BIN_DIR/yt-dlp"
    echo "  Installed: $($BIN_DIR/yt-dlp --version) at $YTDLP_PATH"
fi
echo ""

# Install npm dependencies
echo "[+] Installing npm dependencies..."
cd "$PROJECT_DIR"
npm install
echo ""

# Setup .env
ENV_FILE="$PROJECT_DIR/.env"
if [ ! -f "$ENV_FILE" ]; then
    YTDLP_FINAL="${YTDLP_PATH:-$BIN_DIR/yt-dlp}"
    COOKIES_FINAL="$PROJECT_DIR/cookies.txt"

    cat > "$ENV_FILE" <<EOF
SESSION_SECRET=$(openssl rand -hex 32 2>/dev/null || head -c 64 /dev/urandom | base64 | tr -dc 'a-zA-Z0-9' | head -c 64)
YTDLP_PATH=$YTDLP_FINAL
COOKIES_PATH=$COOKIES_FINAL
EOF
    echo "[+] Created .env with auto-detected paths"
else
    echo "[+] .env already exists, skipping"
fi

echo ""
echo "================================"
echo "  Setup complete!"
echo ""
echo "  yt-dlp:  ${YTDLP_PATH:-$(which yt-dlp 2>/dev/null || echo "$BIN_DIR/yt-dlp")}"
echo "  ffmpeg:  ${FFMPEG_PATH:-$(which ffmpeg 2>/dev/null || echo "$BIN_DIR/ffmpeg")}"
echo "  node:    ${NODE_PATH:-$(which node 2>/dev/null || echo 'not found')}"
echo "  bin dir: $BIN_DIR"
echo ""
echo "  Run with: npm run dev"
echo "================================"
