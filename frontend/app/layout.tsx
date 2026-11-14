import "./ssr-shim";
import "@/app/globals.css";
import type { Metadata, Viewport } from "next";
import { Providers } from "./providers";
import AppLayout from "@/components/layout/AppLayout";
import { TrialBanner } from "@/components/ui/TrialBanner";
import { Syne, DM_Sans, JetBrains_Mono } from "next/font/google";

const syne = Syne({ subsets: ["latin"], variable: "--font-syne", weight: ["400", "600", "700", "800"] });
const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-dm-sans", weight: ["300", "400", "500", "600"] });
const jetbrains = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains", weight: ["400", "500"] });

export const viewport: Viewport = {
  themeColor: "#070709",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://journex.io"),
  title: {
    default: "Journex — The Institutional Trading Desk & Journal for MT5",
    template: "%s | Journex",
  },
  description:
    "Real-time MetaTrader 5 execution telemetry, quantitative confluence engines, institutional order flow, backtesting, and automated trade journaling.",
  keywords: [
    "MetaTrader 5",
    "MT5 journal",
    "trading desk",
    "institutional trading",
    "ICT trading",
    "forex analytics",
    "automated trade journaling",
    "quantitative confluence",
    "macro calendar",
    "order flow",
  ],
  authors: [{ name: "Journex Quant Team" }],
  creator: "Journex",
  publisher: "Journex",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    title: "Journex — The Institutional Trading Desk & Journal for MT5",
    description:
      "Real-time MetaTrader 5 execution telemetry, quantitative confluence engines, institutional order flow, and performance analytics.",
    url: "https://journex.io",
    siteName: "Journex",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Journex — The Institutional Trading Desk & Journal for MT5",
    description:
      "Real-time MetaTrader 5 execution telemetry, quantitative confluence engines, institutional order flow, and performance analytics.",
    creator: "@journex_app",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: "/favicon.ico",
  },
  alternates: {
    canonical: "/",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      data-scroll-behavior="smooth"
      className={`${syne.variable} ${dmSans.variable} ${jetbrains.variable}`}
    >
      <body style={{ background: "var(--bg-base)", color: "var(--text-primary)" }}>
        <Providers>
          <AppLayout>{children}</AppLayout>
          <TrialBanner />
        </Providers>
      </body>
    </html>
  );
}
