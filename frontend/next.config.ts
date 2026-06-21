import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  typescript: {
    ignoreBuildErrors: false,
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://s3.tradingview.com https://www.tradingview.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: blob: https: http://localhost:5003 http://127.0.0.1:5003",
              [
                "connect-src 'self'",
                // Cloudflare tunnel custom domains (production)
                "https://api.journex.online",
                "wss://api.journex.online",
                "https://python.journex.online",
                "wss://python.journex.online",
                // Railway fallback (keep in case direct Railway access needed)
                "https://dashboard-production-f374.up.railway.app",
                "wss://dashboard-production-f374.up.railway.app",
                // Supabase
                "https://*.supabase.co",
                "wss://*.supabase.co",
                // Local development
                "http://localhost:5000",
                "/api/bridge",
                "ws://localhost:5000",
                "ws://localhost:5003",
                "http://0.0.0.0:5003",
              ].join(" "),
              "frame-src 'self' https://www.tradingview.com https://s3.tradingview.com",
              "worker-src 'self' blob:",
            ].join("; "),
          },
          {
            key: "X-Frame-Options",
            value: "SAMEORIGIN",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
        ],
      },
    ];
  },
  async rewrites() {
    return {
      fallback: [
        {
          source: "/api/bridge/:path*",
          destination: "http://127.0.0.1:5003/:path*", // Proxy to MT5 Bridge
        },
        {
          source: "/api/:path*",
          destination: "http://127.0.0.1:5000/api/:path*", // Proxy to Express backend
        },
      ]
    };
  },
};

export default nextConfig;
