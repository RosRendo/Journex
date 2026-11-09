import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://journex.io";

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/subscription", "/pricing", "/macro"],
        disallow: [
          "/api/",
          "/dashboard",
          "/terminal",
          "/accounts",
          "/settings",
          "/profile",
          "/journal",
          "/risk",
          "/analytics",
          "/signals",
          "/bot",
          "/positions",
          "/alerts",
          "/backtesting",
          "/practice",
          "/tradingstyle",
          "/auth",
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}

