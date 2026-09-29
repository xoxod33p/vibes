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

echo "[1/5] Architecture: $ARCH ($ARCH_LABEL)"
echo ""

NODE_INSTALLED=false
echo "[2/5] Setting up Node.js..."
if command -v node &>/dev/null; then
    NODE_PATH="$(which node)"
    NODE_INSTALLED=true
    echo "  Already installed: $(node -v) at $NODE_PATH"
else
    NODE_VERSION=$(curl -fsSL https://nodejs.org/dist/index.json | grep -oP '"version":"v\K[0-9.]+' | head -1)
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

FFMPEG_INSTALLED=false
echo "[3/5] Setting up ffmpeg..."
if command -v ffmpeg &>/dev/null; then
    FFMPEG_PATH="$(which ffmpeg)"
    FFMPEG_INSTALLED=true
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

YTDLP_INSTALLED=false
echo "[4/5] Setting up yt-dlp..."
if command -v yt-dlp &>/dev/null; then
    YTDLP_PATH="$(which yt-dlp)"
    YTDLP_INSTALLED=true
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
    export PATH="$BIN_DIR:$PATH"
    echo "  Installed: $($BIN_DIR/yt-dlp --version) at $YTDLP_PATH"
fi
echo ""

echo "[5/5] Adding to PATH..."
PATHS_TO_ADD=""
if [ "$FFMPEG_INSTALLED" = false ] || [ "$YTDLP_INSTALLED" = false ]; then
    PATHS_TO_ADD="$BIN_DIR"
fi
if [ "$NODE_INSTALLED" = false ]; then
    NODE_BIN_DIR="$BIN_DIR/node/bin"
    if [ -n "$PATHS_TO_ADD" ]; then
        PATHS_TO_ADD="$PATHS_TO_ADD:$NODE_BIN_DIR"
    else
        PATHS_TO_ADD="$NODE_BIN_DIR"
    fi
fi

if [ -z "$PATHS_TO_ADD" ]; then
    echo "  All components already installed and in PATH, skipping"
else
    if [ "$EUID" -eq 0 ]; then
        PROFILE_SCRIPT="/etc/profile.d/vibes.sh"
        echo "export PATH=\"$PATHS_TO_ADD:\$PATH\"" > "$PROFILE_SCRIPT"
        chmod +x "$PROFILE_SCRIPT"
        echo "  Created $PROFILE_SCRIPT (persisted system-wide)"
    else
        RC_FILE="$HOME/.bashrc"
        [ -f "$HOME/.profile" ] && [ ! -f "$HOME/.bashrc" ] && RC_FILE="$HOME/.profile"
        if ! grep -q "$PATHS_TO_ADD" "$RC_FILE" 2>/dev/null; then
            echo "" >> "$RC_FILE"
            echo "export PATH=\"$PATHS_TO_ADD:\$PATH\"" >> "$RC_FILE"
            echo "  Added to $RC_FILE"
        else
            echo "  Already in $RC_FILE"
        fi
    fi
    export PATH="$PATHS_TO_ADD:$PATH"
    echo "  Added: $PATHS_TO_ADD"
fi
echo ""

echo "[+] Installing npm dependencies..."
cd "$PROJECT_DIR"
npm install
echo ""

ENV_FILE="$PROJECT_DIR/.env"
if [ ! -f "$ENV_FILE" ]; then
    YTDLP_FINAL="${YTDLP_PATH:-$BIN_DIR/yt-dlp}"
    COOKIES_FINAL="$PROJECT_DIR/cookies.txt"
    SECRET=$(openssl rand -hex 32 2>/dev/null || head -c 64 /dev/urandom | base64 | tr -dc 'a-zA-Z0-9' | head -c 64)

    cat > "$ENV_FILE" <<EOF
PORT=5000
HOSTNAME=0.0.0.0
NODE_ENV=development
SESSION_SECRET=$SECRET
COOKIE_SECURE=false
YTDLP_PATH=$YTDLP_FINAL
COOKIES_PATH=$COOKIES_FINAL
FIREBASE_SERVICE_ACCOUNT_KEY=
FIREBASE_SERVICE_ACCOUNT_PATH=./serviceAccountKey.json
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
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
