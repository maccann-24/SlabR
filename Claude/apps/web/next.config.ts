import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable the instrumentation hook so instrumentation.ts runs at server startup.
  // This is where production environment variable validation is performed.
  experimental: {
    instrumentationHook: true,
  },
};

export default nextConfig;
