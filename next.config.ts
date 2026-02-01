import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          // {
          //   key: "X-Content-Type-Options",
          //   value: "nosniff",
          // },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value:
              "camera=(), microphone=(), geolocation=(), interest-cohort=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains; preload",
          },
          {
            key: "Content-Security-Policy",
            value:
              "default-src 'self' localhost:* api.cestodamore.com.br; script-src 'self' 'unsafe-eval' 'unsafe-inline' blob: localhost:* https://apis.google.com https://www.gstatic.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' blob: data: drive.google.com api.cestodamore.com.br *.googleusercontent.com; font-src 'self' https://fonts.gstatic.com; connect-src 'self' blob: data: api.cestodamore.com.br *.googleapis.com *.githack.com ws: wss: localhost:*;",
          },
        ],
      },
    ];
  },
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
