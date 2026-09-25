import type { NextConfig } from "next";

// When media is served from a separate host (NEXT_PUBLIC_MEDIA_BASE_URL, see
// lib/media.ts), next/image has to be told that host is allowed.
const mediaBase = process.env.NEXT_PUBLIC_MEDIA_BASE_URL?.replace(/\/$/, "");

const nextConfig: NextConfig = {
  // Hide the "N" dev-tools badge (dev-only; it never ships to production).
  // Compile/runtime errors still surface in dev.
  devIndicators: false,
  images: {
    // Only allowed quality - every <Image> (default 75) is served at 90, so
    // photos aren't visibly recompressed.
    qualities: [90],
    ...(mediaBase ? { remotePatterns: [new URL(`${mediaBase}/**`)] } : {}),
  },
};

export default nextConfig;
