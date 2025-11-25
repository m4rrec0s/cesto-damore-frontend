import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
        port: "3333",
        pathname: "/api/**",
      },
      {
        protocol: "https",
        hostname: "drive.google.com",
        pathname: "/uc",
      },
      {
        protocol: "https",
        hostname: "drive.google.com",
        pathname: "/file/**",
      },
      {
        protocol: "https",
        hostname: "api.cestodamore.com.br",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
