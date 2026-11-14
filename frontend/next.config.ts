import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Next's dev server blocks cross-origin requests to /_next/* assets and HMR by
  // default (CSRF-style protection). Without this, loading the app via the LAN IP
  // returns the HTML shell fine but every JS chunk 403s, so the page never hydrates.
  allowedDevOrigins: ["192.168.31.50"],
  // Disabled the experimental cache-components/partial-prefetching flags from
  // the scaffold: this app's data is mostly per-request and auth-dependent,
  // so plain dynamic rendering (the Next.js default) is simpler and safer
  // for a 2-day build than opting into the new caching model everywhere.
  images: {
    remotePatterns: [
      { protocol: "http", hostname: "localhost", port: "4000", pathname: "/uploads/**" },
      { protocol: "http", hostname: "192.168.31.50", port: "4000", pathname: "/uploads/**" },
    ],
    // The backend's upload host is localhost in dev, which Next's image optimizer
    // otherwise blocks as a potential SSRF target (private/loopback IP).
    dangerouslyAllowLocalIP: true,
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

export default nextConfig;
