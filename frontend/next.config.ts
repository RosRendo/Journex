import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
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
              "img-src 'self' data: blob: https: http://localhost:5003 http://127.0.0.1:5003 http://localhost:5000 http://127.0.0.1:5000",
              [
                "connect-src 'self'",
                // Cloudflare tunnel custom domains (production)
                "https://api.journex.online",
                "wss://api.journex.online",
                "https://python.journex.online",
                "wss://python.journex.online",
                // Railway fallback (keep in case direct Railway access needed)
                "https://*.up.railway.app",
                "wss://*.up.railway.app",
                // Local development
                "http://localhost:5000",
                "ws://localhost:5000",
                "http://localhost:5003",
                "ws://localhost:5003",
                "http://0.0.0.0:5003",
                "http://192.168.100.171:5000",
                "ws://192.168.100.171:5000",
                "http://192.168.100.171:5003",
                "ws://192.168.100.171:5003",
                "http://192.168.0.108:5000",
                "ws://192.168.0.108:5000",
                "http://192.168.0.108:5003",
                "ws://192.168.0.108:5003",
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
          destination: `${process.env.BRIDGE_URL || "http://127.0.0.1:5003"}/:path*`, // Proxy to MT5 Bridge
        },
        {
          source: "/api/:path*",
          destination: `${process.env.INTERNAL_API_URL || "http://127.0.0.1:5000"}/api/:path*`, // Proxy to Express backend
        },
        {
          source: "/uploads/:path*",
          destination: `${process.env.INTERNAL_API_URL || "http://127.0.0.1:5000"}/uploads/:path*`, // Proxy to Express backend for uploads
        },
      ]
    };
  },
};

export default nextConfig;
