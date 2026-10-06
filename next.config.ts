import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  compress: true,
  poweredByHeader: false,
  productionBrowserSourceMaps: false,
  typescript: {
    // Disables type checking during `next build` to save ~500MB-1GB RAM on low-spec VPS.
    // Run `npx tsc --noEmit` locally or in CI.
    ignoreBuildErrors: true,
  },
  serverExternalPackages: ["better-sqlite3", "music-metadata", "ws", "bcryptjs"],
  experimental: {
    // Limit Next.js build workers to 1 instead of parallel workers to prevent OOM
    cpus: 1,
    optimizePackageImports: [
      "@radix-ui/react-avatar",
      "@radix-ui/react-dialog",
      "@radix-ui/react-dropdown-menu",
      "@radix-ui/react-slider",
      "@radix-ui/react-tabs",
      "@radix-ui/react-tooltip",
      "lucide-react",
    ],
  },
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
          { key: "Cache-Control", value: "public, max-age=604800, stale-while-revalidate=86400" },
        ],
      },
      {
        source: "/covers/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET, OPTIONS" },
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
    ];
  },
};

export default nextConfig;
