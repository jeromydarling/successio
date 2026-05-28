import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // OpenNext Cloudflare adapter consumes the standard Next build output.
  // See: https://developers.cloudflare.com/workers/framework-guides/web-apps/nextjs/
  experimental: {
    optimizePackageImports: ["lucide-react", "framer-motion"],
  },
};

export default nextConfig;
