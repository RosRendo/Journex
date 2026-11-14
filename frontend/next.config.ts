import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  compress: true,
  poweredByHeader: false,
  logging: {
    incomingRequests: false,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  async redirects() {
    return [
      { source: "/login", destination: "/auth", permanent: false },
      { source: "/news", destination: "/calendar", permanent: false },
      { source: "/performance", destination: "/analytics", permanent: false },
      { source: "/notificationandmonitor", destination: "/alerts?tab=targets", permanent: false },
      { source: "/calculators", destination: "/risk?tab=calculator", permanent: false },
    ];
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
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://*.tradingview.com https://*.tradingview-widget.com https://s3.tradingview.com https://www.tradingview.com https://s.tradingview.com https://www.tradingview-widget.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: blob: https: http://localhost:5003 http://127.0.0.1:5003 http://localhost:5000 http://127.0.0.1:5000",
              [
                "connect-src *",
              ].join(" "),
              "frame-src 'self' https://*.tradingview.com https://*.tradingview-widget.com https://www.tradingview.com https://s3.tradingview.com https://s.tradingview.com https://www.tradingview-widget.com",
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
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
  async rewrites() {
    const isVercel = Boolean(process.env.VERCEL);
    const bridgeUrl = process.env.BRIDGE_URL || process.env.NEXT_PUBLIC_BRIDGE_URL || (isVercel ? "https://python.dashboardkiller.online" : "http://127.0.0.1:5003");
    const apiUrl = process.env.INTERNAL_API_URL || (isVercel ? "https://api.dashboardkiller.online" : "http://127.0.0.1:5000");

    return {
      fallback: [
        {
          source: "/api/bridge/:path*",
          destination: `${bridgeUrl}/:path*`, // Proxy to MT5 Bridge
        },
        {
          source: "/api/:path*",
          destination: `${apiUrl}/api/:path*`, // Proxy to Express backend
        },
        {
          source: "/uploads/:path*",
          destination: `${apiUrl}/uploads/:path*`, // Proxy to Express backend for uploads
        },
      ]
    };
  },
};

export default nextConfig;
