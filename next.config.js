/** @type {import('next').NextConfig} */
const path = require("path");

const nextConfig = {
  reactStrictMode: true,
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  distDir: process.env.NODE_ENV === "production" ? ".next-build" : ".next",
  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
      },
    ],
    unoptimized: process.env.NODE_ENV === "development",
  },
  // Standalone output for Docker - enable when network is available
  // output: "standalone",
  // Tell Turbopack the correct project root (prevents lockfile warning)
  turbopack: {
    root: path.resolve(__dirname),
    resolveExtensions: [".tsx", ".ts", ".jsx", ".js", ".json"],
  },
};

module.exports = nextConfig;
