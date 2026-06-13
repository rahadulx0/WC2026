import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // World Cup data comes from the backend proxy; no remote images needed
  // because team flags are emoji (mock) or handled inline.
  images: { remotePatterns: [{ protocol: "https", hostname: "media.api-sports.io" }] },
};

export default nextConfig;
