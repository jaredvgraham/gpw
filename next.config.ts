import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Dev JS is blocked for any host other than localhost unless listed here.
  // Private ranges cover the phone when this machine's LAN address changes.
  allowedDevOrigins: ["10.*.*.*", "192.168.*.*", "172.*.*.*"],
};

export default nextConfig;
