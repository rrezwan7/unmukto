import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,

  ...(process.env.CODESPACES === "true" &&
  process.env.NODE_ENV === "development"
    ? {
        experimental: {
          serverActions: {
            allowedOrigins: ["localhost:3000"],
          },
        },
      }
    : {}),
};

export default nextConfig;