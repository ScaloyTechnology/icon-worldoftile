import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  agentRules: false,

  allowedDevOrigins: ["127.0.0.1", "localhost"],

  images: {
    formats: ["image/avif", "image/webp"],
  },
};

export default nextConfig;
