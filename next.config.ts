import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow HMR when opening the dev server from another device on your LAN (e.g. phone).
  allowedDevOrigins: ["192.168.1.154"],
};

export default nextConfig;
