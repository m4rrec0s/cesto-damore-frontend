import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
        port: "8080",
        pathname: "/api/**",
      },
      {
        protocol: "https",
        hostname: "dcd856bd81b2.ngrok-free.app",
        port: "",
        pathname: "/api/**",
      },
    ],
  },
};

export default nextConfig;
