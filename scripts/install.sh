#!/bin/bash
set -e

echo "================================"
echo "  Vibes Music Player - Setup"
echo "  Linux Prerequisites Installer"
echo "================================"
echo ""

# Detect package manager
if command -v apt-get &>/dev/null; then
    PKG="apt"
elif command -v dnf &>/dev/null; then
    PKG="dnf"
elif command -v pacman &>/dev/null; then
    PKG="pacman"
elif command -v brew &>/dev/null; then
    PKG="brew"
else
    echo "ERROR: No supported package manager found (apt, dnf, pacman, brew)"
    exit 1
fi

echo "[1/4] Detected package manager: $PKG"
echo ""

# Install Node.js
echo "[2/4] Checking Node.js..."
if command -v node &>/dev/null; then
    echo "  Node.js $(node -v) already installed"
else
    echo "  Installing Node.js..."
    case $PKG in
        apt)
            curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
            sudo apt-get install -y nodejs
            ;;
        dnf)
            sudo dnf install -y nodejs
            ;;
        pacman)
            sudo pacman -S --noconfirm nodejs npm
            ;;
        brew)
            brew install node
            ;;
    esac
    echo "  Node.js $(node -v) installed"
fi
echo ""

# Install ffmpeg
echo "[3/4] Checking ffmpeg..."
if command -v ffmpeg &>/dev/null; then
    echo "  ffmpeg already installed: $(ffmpeg -version | head -1)"
else
    echo "  Installing ffmpeg..."
    case $PKG in
        apt)
            sudo apt-get update && sudo apt-get install -y ffmpeg
            ;;
        dnf)
            sudo dnf install -y ffmpeg
            ;;
        pacman)
            sudo pacman -S --noconfirm ffmpeg
            ;;
        brew)
            brew install ffmpeg
            ;;
    esac
    echo "  ffmpeg installed"
fi
echo ""

# Install yt-dlp
echo "[4/4] Checking yt-dlp..."
if command -v yt-dlp &>/dev/null; then
    echo "  yt-dlp already installed: $(yt-dlp --version)"
else
    echo "  Installing yt-dlp..."
    case $PKG in
        apt)
            sudo curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp
            sudo chmod a+rx /usr/local/bin/yt-dlp
            ;;
        dnf)
            sudo curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp
            sudo chmod a+rx /usr/local/bin/yt-dlp
            ;;
        pacman)
            sudo pacman -S --noconfirm yt-dlp
            ;;
        brew)
            brew install yt-dlp
            ;;
    esac
    echo "  yt-dlp installed: $(yt-dlp --version)"
fi
echo ""

# Install npm dependencies
echo "[+] Installing npm dependencies..."
cd "$(dirname "$0")/.."
npm install
echo ""

# Copy .env.example if no .env exists
if [ ! -f .env ]; then
    cp .env.example .env
    echo "[+] Created .env from .env.example — fill in your values"
else
    echo "[+] .env already exists, skipping"
fi

echo ""
echo "================================"
echo "  Setup complete!"
echo ""
echo "  yt-dlp:  $(which yt-dlp 2>/dev/null || echo 'not found')"
echo "  ffmpeg:  $(which ffmpeg 2>/dev/null || echo 'not found')"
echo "  node:    $(which node 2>/dev/null || echo 'not found')"
echo ""
echo "  Set your env vars in .env:"
echo "    YTDLP_PATH=$(which yt-dlp 2>/dev/null || echo '/path/to/yt-dlp')"
echo "    COOKIES_PATH=/path/to/cookies.txt"
echo "================================"
