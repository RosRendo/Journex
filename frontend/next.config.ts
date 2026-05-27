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
              "img-src 'self' data: blob: https:",
              [
                "connect-src 'self'",
                // Cloudflare tunnel custom domains (production)
                "https://api.dashboardkiller.online",
                "wss://api.dashboardkiller.online",
                "https://python.dashboardkiller.online",
                "wss://python.dashboardkiller.online",
                // Railway fallback (keep in case direct Railway access needed)
                "https://dashboard-production-f374.up.railway.app",
                "wss://dashboard-production-f374.up.railway.app",
                // Local development
                "http://localhost:5000",
                "http://localhost:5003",
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
};

export default nextConfig;
