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
  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET, POST, PUT, DELETE, OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type, Authorization, Range, X-Requested-With" },
          { key: "Access-Control-Expose-Headers", value: "Content-Range, Content-Length, Accept-Ranges" },
        ],
      },
      {
        source: "/stream/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET, OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Range, Content-Type" },
          { key: "Access-Control-Expose-Headers", value: "Content-Range, Content-Length, Accept-Ranges" },
        ],
      },
      {
        source: "/covers/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET, OPTIONS" },
        ],
      },
    ];
  },
};

export default nextConfig;
