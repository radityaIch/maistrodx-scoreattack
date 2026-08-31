import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable `'use cache'` / cacheLife / cacheTag / updateTag (used by maimai sync, PLAN §7).
  cacheComponents: true,

  images: {
    // Allow official maimai CDN and community asset hosts used by track art.
    remotePatterns: [
      { protocol: "https", hostname: "res.cloudinary.com" },
      { protocol: "https", hostname: "dp4p6x0xfi5o9.cloudfront.net" },
      { protocol: "https", hostname: "maimai.sega.com" },
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "majdata.net" },
    ],
  },

  // Allow Server Actions up to 2 MB (admin image uploads via base64 data URL).
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },

  // Fail builds on type errors so CI catches regressions early.
  // (ESLint runs separately via `pnpm lint`; Next 16 removed the inline `eslint` key.)
  typescript: { ignoreBuildErrors: false },
};

export default nextConfig;
