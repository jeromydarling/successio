import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // OpenNext Cloudflare adapter consumes the standard Next build output.
  // See: https://developers.cloudflare.com/workers/framework-guides/web-apps/nextjs/
  experimental: {
    optimizePackageImports: ["lucide-react", "framer-motion"],
  },
};

export default withSentryConfig(nextConfig, {
  org: "cros-llc",
  project: "successio",
  silent: !process.env.CI,
  // Upload a wider set of client source maps so stack traces resolve. The
  // upload step is skipped automatically unless SENTRY_AUTH_TOKEN is present,
  // so local/CI builds without the token still succeed.
  widenClientFileUpload: true,
  disableLogger: true,
});
