# Vibes 🎵

A clean, self-hosted web music player and YouTube/Spotify downloader built with Next.js 16, TypeScript, and SQLite.

## Features

- **Audio Player**: Fast byte-range streaming, queue management, shuffle, repeat, and favorites.
- **Media Downloader**: Download individual songs or entire playlists from YouTube and Spotify with original album covers.
- **Themes**: Modern dark UI with multiple color themes (**Emerald Green** default).
- **Accounts**: User authentication with private libraries and custom playlists.
- **Lightweight**: Uses native `node:sqlite` with zero database setup required.

## Requirements

- **Node.js**: v22+
- **yt-dlp**: `pip install --upgrade git+https://github.com/yt-dlp/yt-dlp.git`
- **ffmpeg**

## Quick Start

```bash
# 1. Clone repository
git clone https://github.com/xoxod33p/vibes.git
cd vibes

# 2. Install dependencies
npm install

# 3. Start development server (Port 5000)
npm run dev
```

Open [http://localhost:5000](http://localhost:5000) in your browser.

## Production

```bash
# Build
npm run build

# Start with PM2
pm2 start deploy/ecosystem.config.cjs
```

Nginx configuration is available in `deploy/music.xoxod33p.tech.conf`.

## License

MIT
