import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
  // Disabled the experimental cache-components/partial-prefetching flags from
  // the scaffold: this app's data is mostly per-request and auth-dependent,
  // so plain dynamic rendering (the Next.js default) is simpler and safer
  // for a 2-day build than opting into the new caching model everywhere.
  images: {
    remotePatterns: [
      { protocol: "http", hostname: "localhost", port: "4000", pathname: "/uploads/**" },
    ],
  },
  turbopack: {
    root: __dirname,
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

const withNextIntl = createNextIntlPlugin();
export default withNextIntl(nextConfig);
