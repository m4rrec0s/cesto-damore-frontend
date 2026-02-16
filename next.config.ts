import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Frame-Options",
            value: "SAMEORIGIN",
          },
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin-allow-popups",
          },

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
              "default-src 'self' localhost:* api.cestodamore.com.br cestodamore_api:*; script-src 'self' 'unsafe-eval' 'unsafe-inline' blob: localhost:* https://apis.google.com https://www.gstatic.com https://sdk.mercadopago.com https://*.mercadopago.com https://*.mercadolivre.com.br https://*.mercadopago.com.br https://*.mercadolivre.com https://*.mercadolibre.com https://*.mlstatic.com https://*.firebaseapp.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' blob: data: drive.google.com api.cestodamore.com.br *.googleusercontent.com https://*.mercadopago.com https://*.mercadolivre.com.br https://*.mlstatic.com http://*.mlstatic.com https://*.mercadolivre.com https://*.mercadolibre.com https://*.google.com https://*.googleusercontent.com; font-src 'self' https://fonts.gstatic.com; connect-src 'self' blob: data: api.cestodamore.com.br cestodamore_api:* *.googleapis.com *.google.com *.githack.com *.mercadopago.com *.mercadolivre.com.br *.mercadopago.com.br *.mercadolivre.com *.mercadolibre.com *.mlstatic.com *.firebaseio.com *.firebaseapp.com ws: wss: localhost:*; frame-src 'self' https://sdk.mercadopago.com https://*.mercadopago.com https://*.mercadolivre.com.br https://*.mercadolivre.com https://*.mercadolibre.com https://*.mercadopago.com.br https://*.firebaseapp.com https://*.google.com https://*.google.com.br;",
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
