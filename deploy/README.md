# Deployment Guide: music.xoxod33p.tech (PM2 + Nginx)

This folder contains the production Nginx and PM2 ecosystem configurations for deploying Vibes Music Player to `music.xoxod33p.tech`.

---

## 1. Prerequisites on Server (Ubuntu/Debian)

```bash
# Update packages
sudo apt update && sudo apt upgrade -y

# Install Node.js 20+ or 22+ (or 24)
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs nginx certbot python3-certbot-nginx yt-dlp

# Install PM2 globally
sudo npm install -g pm2

# Verify installations
node -v
pm2 -v
yt-dlp --version
```

---

## 2. Deploy Application Files

```bash
# Prepare project directory
sudo mkdir -p /var/www/music-player
sudo chown -R $USER:$USER /var/www/music-player

# Copy project files into /var/www/music-player/
cd /var/www/music-player

# Install dependencies and build production bundle
npm install --production=false
npm run build
```

---

## 3. Run with PM2

```bash
# Start app with PM2 using the ecosystem configuration
pm2 start deploy/ecosystem.config.cjs

# Save PM2 process list
pm2 save

# Setup PM2 to auto-start on server boot
pm2 startup
# (Run the sudo env PATH... command that PM2 outputs)
```

Useful PM2 management commands:
```bash
pm2 status                  # Check app status
pm2 logs music-player       # View live server logs
pm2 reload music-player     # Zero-downtime reload after code updates
pm2 restart music-player    # Restart the application
```

---

## 4. Configure Nginx

```bash
# Copy Nginx config to sites-available
sudo cp deploy/music.xoxod33p.tech.conf /etc/nginx/sites-available/music.xoxod33p.tech.conf

# Enable site
sudo ln -sf /etc/nginx/sites-available/music.xoxod33p.tech.conf /etc/nginx/sites-enabled/

# Test Nginx syntax
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

---

## 5. Obtain Free SSL Certificate (Certbot)

Run Certbot to generate the Let's Encrypt SSL certificate:

```bash
sudo certbot --nginx -d music.xoxod33p.tech
```

Certbot will automatically verify the domain, populate the certificate paths in Nginx, and configure automatic certificate renewals.
