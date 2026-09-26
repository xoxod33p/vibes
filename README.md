# 🎵 Vibes — Modern Web Music Player

A sleek, self-hosted web music player and downloader built with **Next.js 16 (Turbopack)**, **TypeScript**, **Tailwind CSS**, and **native SQLite** (`node:sqlite`). Supports high-speed YouTube & Spotify playlist downloading, byte-range audio streaming, isolated user accounts, and customizable glassmorphic themes.

---

## ✨ Features

- **🎧 High-Fidelity Audio Engine**:
  - HTTP 206 Partial Content audio streaming with instant byte-range scrubbing.
  - Queue drawer with reordering and one-click clear.
  - Repeat (`off`, `all`, `one`), shuffle, volume memory, and playback speed adjustments.
  - Client-side prefetching and memory caching for seamless track transitions.

- **📥 YouTube & Spotify Downloader**:
  - Powered by the latest [`yt-dlp`](https://github.com/yt-dlp/yt-dlp.git) with optional `cookies.txt` support for age-restricted or premium content.
  - Inspect public YouTube and Spotify links (tracks, albums, playlists) before downloading.
  - Auto-generates playlists matching imported collections while keeping original track covers.
  - Sequential batch downloading with real-time progress indicators.

- **🎨 Modern Aesthetic & Glassmorphic UI**:
  - Immersive fullscreen player with dynamic ambient album art backlight and animated equalizers.
  - Persistent desktop bottom player and mobile mini player.
  - Four curated color themes with **Emerald Groove (Green)** as the default:
    - 🟢 **Emerald Groove** (Default)
    - 🟣 **Midnight Violet**
    - 🔵 **Electric Cyan**
    - 🟡 **Cyberpunk Amber**

- **👤 User Isolation & Library Management**:
  - Built-in lightweight authentication (register/login) with HTTP-only session cookies.
  - Isolated music libraries, custom playlists, and liked favorites per user.
  - One-click "Clear All My Songs" option that safely removes only the authenticated user's tracks from disk and database.

- **💾 Zero-Dependency SQLite Storage**:
  - Built using Node.js's native `node:sqlite` (`DatabaseSync`), eliminating the need for bulky C++ build tools or external databases.

---

## 🛠️ Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router, Turbopack)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) & Vanilla CSS variables
- **Icons**: [Lucide React](https://lucide.dev/)
- **Database**: Native `node:sqlite` (Node.js 22+)
- **Audio Downloader**: [`yt-dlp`](https://github.com/yt-dlp/yt-dlp.git) + `ffmpeg`
- **Process Manager & Proxy**: [PM2](https://pm2.keymetrics.io/) & [Nginx](https://nginx.org/)

---

## 🚀 Getting Started

### Prerequisites

- **Node.js**: v20+ or v22+ (v22+ recommended for native `node:sqlite`)
- **Python 3** & **Git**
- **FFmpeg** (for audio extraction and transcoding)
- **yt-dlp** (latest from GitHub):
  ```bash
  pip install --upgrade git+https://github.com/yt-dlp/yt-dlp.git
  ```

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/xoxod33p/vibes.git
   cd vibes
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **(Optional) Add YouTube Cookies**:
   If downloading YouTube tracks that require authentication or bypass bot verification, place your exported Netscape-format cookies in the project root:
   ```text
   cookies.txt
   ```
   *(This file is automatically ignored by Git).*

4. **Run Development Server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:5000](http://localhost:5000) in your browser.

---

## 🌐 Production Deployment

The project includes preconfigured deployment scripts in the [`deploy/`](./deploy) directory for hosting with **PM2** and **Nginx** (configured for port `5000` at `/home/admin/vibes`):

### 1. Build Production Bundle
```bash
npm run build
```

### 2. Start with PM2
```bash
pm2 start deploy/ecosystem.config.cjs
pm2 save
pm2 startup
```

### 3. Nginx Reverse Proxy
Copy and enable the Nginx configuration:
```bash
sudo cp deploy/music.xoxod33p.tech.conf /etc/nginx/sites-available/
sudo ln -sf /etc/nginx/sites-available/music.xoxod33p.tech.conf /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 4. Enable SSL (Certbot)
```bash
sudo certbot --nginx -d music.xoxod33p.tech
```

For complete deployment instructions, see [`deploy/README.md`](./deploy/README.md).

---

## 📁 Project Structure

```text
├── app/
│   ├── api/
│   │   ├── auth/          # Login, register, session management
│   │   ├── cache/         # Storage and memory cache endpoints
│   │   ├── covers/        # Album cover streaming
│   │   ├── favorites/     # User liked songs
│   │   ├── media/         # YTDL/Spotify inspect & batch download
│   │   ├── playlists/     # Playlist CRUD & track linking
│   │   ├── songs/         # Song listing, metadata edit & deletion
│   │   └── stream/        # HTTP 206 audio byte-range streaming
│   ├── globals.css        # Global CSS & theme design tokens
│   ├── layout.tsx         # Root layout with AudioProvider & Toaster
│   └── page.tsx           # Main application view container
├── components/
│   ├── layout/            # Sidebar, mobile header, navigation
│   ├── modals/            # Ytdl downloader, playlist, auth & settings
│   ├── player/            # Desktop player, fullscreen sheet, mini player
│   ├── ui/                # Accessible UI components (buttons, dialogs, sliders)
│   └── views/             # Library, Favorites, Playlists, Account views
├── deploy/                # PM2 ecosystem and Nginx configurations
├── lib/                   # Audio context, database singleton, auth & media resolver
└── public/                # Branding assets, icons, manifest
```

---

## 📄 License

MIT License. Free for personal and commercial use.
