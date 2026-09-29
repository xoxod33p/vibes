# Production Deployment Guide: music.xoxod33p.tech

This folder contains the production Nginx and PM2 configurations for deploying **Vibes Music Player** to `music.xoxod33p.tech`.

---

## Option A: Automated One-Click Deployment (Recommended)

From the project root:

```bash
chmod +x deploy.sh
./deploy.sh
```

The script will automatically:
1. Pull latest git changes on the active branch
2. Update `yt-dlp` to the latest release
3. Install production dependencies via `npm install`
4. Build the optimized Next.js bundle via `npm run build`
5. Start or zero-downtime reload the application in PM2 (`ecosystem.config.js`)

---

## Option B: Docker Container Deployment

If Docker and Docker Compose are installed on the server:

```bash
# 1. Build and run in background
docker compose up -d --build

# 2. View logs
docker compose logs -f

# 3. Update container when code changes
git pull origin dev
docker compose up -d --build
```

Persistent files are stored in `./uploads`, `./public/covers`, and `./cache`.

---

## Option C: Manual Bare-Metal Setup (Ubuntu/Debian)

### 1. Install Prerequisites

```bash
# Update package repositories
sudo apt update && sudo apt upgrade -y

# Install Node.js 20+ or 22+, Nginx, Certbot, Python3, and ffmpeg
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs nginx certbot python3-certbot-nginx python3-pip git ffmpeg curl

# Install standalone yt-dlp binary (recommended over apt)
sudo curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp
sudo chmod a+rx /usr/local/bin/yt-dlp

# Install PM2 globally
sudo npm install -g pm2
```

### 2. Configure Application & Environment

```bash
# Navigate to deployment directory
cd /home/admin/vibes

# Install dependencies and build
npm install
npm run build
```

Configure environment file `.env`:
```bash
cp .env.example .env
nano .env
```
Ensure `SESSION_SECRET` is set and `PORT=5000`.

### 3. YouTube Cookies (Prevent 403 Forbidden)

If downloading triggers YouTube bot detection on cloud datacenter IPs:
1. Export your browser cookies using the **Get cookies.txt LOCALLY** extension.
2. Upload the file to `/home/admin/vibes/cookies.txt`.
3. The server auto-detects `cookies.txt` in the project root or `/home/admin/vibes/cookies.txt`.

Keep `yt-dlp` updated:
```bash
sudo yt-dlp -U
```

### 4. Manage with PM2

```bash
# Start app with PM2
pm2 start ecosystem.config.js

# Save process list and enable system boot start
pm2 save
pm2 startup
```

Useful commands:
```bash
pm2 status                  # Check process status
pm2 logs vibes              # View live logs
pm2 reload vibes            # Zero-downtime reload
pm2 restart vibes           # Restart process
```

---

## 5. Configure Nginx Reverse Proxy

```bash
# Copy Nginx config to sites-available
sudo cp deploy/music.xoxod33p.tech.conf /etc/nginx/sites-available/music.xoxod33p.tech.conf

# Enable site
sudo ln -sf /etc/nginx/sites-available/music.xoxod33p.tech.conf /etc/nginx/sites-enabled/

# Test syntax
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

---

## 6. Obtain Free SSL Certificate (Certbot)

```bash
sudo certbot --nginx -d music.xoxod33p.tech
```

Certbot automatically configures Let's Encrypt certificates, HTTPS redirects, and automated renewal timers.
