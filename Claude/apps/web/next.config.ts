import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@serviceline/db"],
  serverExternalPackages: ["pg"],
};

export default nextConfig;
