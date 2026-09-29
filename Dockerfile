# =============================================================
# Multi-stage Dockerfile for Vibes Music Player
# Includes Node.js 20, ffmpeg, python3, and yt-dlp
# =============================================================

# -------------------------------------------------------------
# Base Image: System runtime dependencies
# -------------------------------------------------------------
FROM node:20-bookworm-slim AS base

ENV DEBIAN_FRONTEND=noninteractive

# Install ffmpeg, python3, curl, ca-certificates
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    python3 \
    ca-certificates \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install latest yt-dlp binary
RUN curl -fSL https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp \
    && chmod a+rx /usr/local/bin/yt-dlp

WORKDIR /app

# -------------------------------------------------------------
# Dependencies Stage
# -------------------------------------------------------------
FROM base AS deps
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

# -------------------------------------------------------------
# Builder Stage: Build Next.js production assets
# -------------------------------------------------------------
FROM base AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# -------------------------------------------------------------
# Production Runner Stage
# -------------------------------------------------------------
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000
ENV HOSTNAME=0.0.0.0
ENV NEXT_TELEMETRY_DISABLED=1

# Create persistent storage directories
RUN mkdir -p /app/uploads /app/public/covers /app/cache/transcode

# Copy dependencies, compiled bundle, and runtime files
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/server.js ./server.js
COPY --from=builder /app/next.config.ts ./next.config.ts

# Ensure node user owns writable storage paths
RUN chown -R node:node /app/uploads /app/public/covers /app/cache

EXPOSE 5000

USER node

CMD ["node", "server.js"]
