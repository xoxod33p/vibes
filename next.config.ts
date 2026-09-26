import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/stream/:filename*",
        destination: "/api/stream/:filename*",
      },
      {
        source: "/covers/:filename*",
        destination: "/api/covers/:filename*",
      },
    ];
  },
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
