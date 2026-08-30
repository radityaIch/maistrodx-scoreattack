import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable `'use cache'` / cacheLife / cacheTag / updateTag (used by maimai sync, PLAN §7).
  cacheComponents: true,

  images: {
    // Cloudinary asset host (PLAN decision #9).
    // maimai jacket community proxy host is configured per-deploy in code (see src/lib/maimai/image.ts).
    remotePatterns: [{ protocol: "https", hostname: "res.cloudinary.com" }],
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
