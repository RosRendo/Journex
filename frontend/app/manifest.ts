import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Journex — Institutional Trading Terminal",
    short_name: "Journex",
    description: "The trading desk for MetaTrader 5 traders: real-time telemetry, quantitative confluence, and automated journal.",
    start_url: "/",
    display: "standalone",
    background_color: "#070709",
    theme_color: "#20e0b2",
    icons: [
      {
        src: "/favicon.ico",
        sizes: "any",
        type: "image/x-icon",
      },
    ],
  };
}

