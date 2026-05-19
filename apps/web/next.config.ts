import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: process.env.DOCKER_BUILD === "true" ? "standalone" : undefined,
  transpilePackages: [
    "@contactship/db",
    "@contactship/hubspot",
    "@contactship/ai",
    "@contactship/shared",
  ],
  typedRoutes: true,
};

export default nextConfig;
