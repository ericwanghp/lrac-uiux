/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  distDir: process.env.NODE_ENV === "production" ? ".next-build" : ".next",
  images: {
    domains: ["localhost"],
    unoptimized: process.env.NODE_ENV === "development",
  },
  // Standalone output for Docker - enable when network is available
  // output: "standalone",
  experimental: {
    turbo: {
      resolveExtensions: [".tsx", ".ts", ".jsx", ".js", ".json"],
    },
  },
};

module.exports = nextConfig;
