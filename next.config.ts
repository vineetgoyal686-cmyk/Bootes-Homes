import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Hide the "N" dev-tools badge (dev-only; it never ships to production).
  // Compile/runtime errors still surface in dev.
  devIndicators: false,
};

export default nextConfig;
