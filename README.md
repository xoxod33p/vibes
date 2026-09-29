# Vibes 🎵

A modern, self-hosted web music player and media downloader built with **Next.js 16**, **React 19**, **TypeScript**, and **Firebase Firestore** / WebSocket real-time sync.

---

## ✨ Features

- **High-Performance Audio Player** — Smooth timeline scrubber with instant seek preview, byte-range HTTP 206 streaming, queue reordering, shuffle, repeat, and keyboard shortcuts (`Space`, `ArrowLeft`, `ArrowRight`, `L`, `S`, `R`).
- **Media Downloader** — Download individual songs, full albums, or playlists from YouTube and Spotify with metadata tags and high-res album covers.
- **Real-Time Downloads Center** — Live WebSocket progress updates (download speed, ETA, percentage, file size) with automatic background transcode to MP3 320kbps.
- **Resilient yt-dlp Engine** — Multi-client cascade (`default`, `web_embedded,web,tv`, `mweb`), automated cookie fallback, and anti-403 mitigations.
- **Customizable Dark Themes** — **Emerald** (default), Cyan, Violet, and Amber with ambient album glow effects.
- **Playlists & Favorites** — Per-user library management, playlist creation, and instant favorite toggles.
- **Containerized** — Docker & Docker Compose support with pre-configured `ffmpeg` and `yt-dlp`.

---

## 📋 System Requirements

- **Node.js** v20+ or v22+
- **ffmpeg** (required for audio extraction & transcoding)
- **yt-dlp** (latest build recommended: `yt-dlp -U`)
- **Docker & Docker Compose** *(optional, for containerized deployment)*

---

## 🚀 Quick Start (Local Development)

### Automated Setup

**Linux / macOS:**
```bash
./scripts/install.sh
npm run dev
```

**Windows (PowerShell as Admin):**
```powershell
.\scripts\install.ps1
npm run dev
```

### Manual Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/xoxod33p/vibes.git
   cd vibes
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment:**
   ```bash
   cp .env.example .env
   ```
   *Edit `.env` and fill in your secrets or Firebase credentials (if using cloud persistence).*

4. **Start development server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:5000](http://localhost:5000) in your browser.

---

## 🐳 Docker Deployment (Recommended)

Run Vibes fully containerized with Node.js, `ffmpeg`, and `yt-dlp` bundled in a multi-stage Debian image:

```bash
# 1. Start the container in background
docker compose up -d --build

# 2. View live application logs
docker compose logs -f

# 3. Stop the container
docker compose down
```

The application will run on port `5000` at [http://localhost:5000](http://localhost:5000).

### Persistent Volumes

| Host Path | Container Path | Purpose |
|---|---|---|
| `./uploads` | `/app/uploads` | Downloaded audio tracks |
| `./public/covers` | `/app/public/covers` | Downloaded album art |
| `./cache` | `/app/cache` | Audio transcoding cache |
| `./cookies.txt` *(optional)* | `/app/cookies.txt` | YouTube cookies file for bot bypass |
| `./serviceAccountKey.json` *(optional)* | `/app/serviceAccountKey.json` | Firebase Admin SDK credentials |

---

## ⚙️ Environment Variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `5000` | HTTP and WebSocket server port |
| `HOSTNAME` | `0.0.0.0` | Hostname to bind |
| `NODE_ENV` | `development` | `development` or `production` |
| `SESSION_SECRET` | - | 32+ character random string for JWT sessions |
| `COOKIE_SECURE` | `false` | Set to `true` when behind HTTPS / SSL |
| `YTDLP_PATH` | `yt-dlp` | Custom binary path for yt-dlp |
| `COOKIES_PATH` | `./cookies.txt` | Path to Netscape-format YouTube cookies |
| `FIREBASE_SERVICE_ACCOUNT_PATH` | `./serviceAccountKey.json` | Path to Firebase credentials JSON |
| `FIREBASE_SERVICE_ACCOUNT_KEY` | - | Raw JSON string for Firebase credentials |
| `GOOGLE_CLIENT_ID` | - | Google OAuth Client ID |
| `GOOGLE_CLIENT_SECRET` | - | Google OAuth Client Secret |

---

## 🌐 Production Deployment (Bare Metal / VPS)

For deploying directly to a Linux server with PM2 and Nginx:

1. **Deploy using the deployment script:**
   ```bash
   ./deploy.sh
   ```
   *This automatically pulls latest code, updates `yt-dlp`, installs packages, builds the Next.js bundle, and reloads PM2.*

2. **Manual PM2 commands:**
   ```bash
   npm run build
   pm2 start ecosystem.config.js
   pm2 save
   ```

3. **Nginx Reverse Proxy:**
   A sample Nginx configuration with WebSocket upgrade and byte-range streaming support is provided in [`deploy/music.xoxod33p.tech.conf`](deploy/music.xoxod33p.tech.conf).

---

## 🍪 YouTube Cookies Setup

If downloading from YouTube encounters `HTTP 403 Forbidden` or bot verification on cloud server IPs:

1. Export cookies from your desktop browser using an extension like **Get cookies.txt LOCALLY**.
2. Save the file as `cookies.txt` in the project root (or `/home/admin/vibes/cookies.txt`).
3. Vibes auto-detects `cookies.txt` in the root folder, in `/home/admin/vibes/cookies.txt`, or at the path defined by `COOKIES_PATH`.

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Space` | Play / Pause |
| `ArrowRight` | Seek forward 5 seconds |
| `ArrowLeft` | Seek backward 5 seconds |
| `L` | Toggle Favorite for current song |
| `S` | Toggle Shuffle |
| `R` | Cycle Repeat (Off / All / One) |

---

## 📄 License

MIT © [xoxod33p](https://github.com/xoxod33p)
