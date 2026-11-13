import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Dev JS is blocked for any host other than localhost and the bind
  // address. `next dev -H 0.0.0.0` allows 0.0.0.0, so 127.0.0.1 is separate.
  // Private ranges cover the phone when this machine's LAN address changes.
  allowedDevOrigins: ["127.0.0.1", "10.*.*.*", "192.168.*.*", "172.*.*.*"],
};

export default nextConfig;
