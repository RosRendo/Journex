import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://journex.io";
  const now = new Date();

  const pairs = ["EURUSD", "XAUUSD", "GBPUSD", "USDJPY", "AUDUSD", "USDCHF", "USDCAD", "NZDUSD"];

  const macroRoutes: MetadataRoute.Sitemap = pairs.map((pair) => ({
    url: `${baseUrl}/macro/${pair}`,
    lastModified: now,
    changeFrequency: "hourly",
    priority: 0.8,
  }));

  return [
    {
      url: baseUrl,
      lastModified: now,
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${baseUrl}/subscription`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    ...macroRoutes,
  ];
}

