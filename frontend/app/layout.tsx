import "./ssr-shim";
import "@/app/globals.css";
import { Providers } from "./providers";
import AppLayout from "@/components/layout/AppLayout";
import { TrialBanner } from "@/components/ui/TrialBanner";
import { Syne, DM_Sans, JetBrains_Mono } from "next/font/google";

export const dynamic = "force-dynamic";

const syne = Syne({ subsets: ["latin"], variable: "--font-syne", weight: ["400", "600", "700", "800"] });
const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-dm-sans", weight: ["300", "400", "500", "600"] });
const jetbrains = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains", weight: ["400", "500"] });

export const metadata = {
  title: "Journex — Professional Trading Terminal",
  description:
    "Real-time MT5 integration, live signals, news alerts, sentiment analysis, backtesting and more.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className={`${syne.variable} ${dmSans.variable} ${jetbrains.variable}`}>
      <body style={{ background: "var(--bg-base)", color: "var(--text-primary)" }}>
        <Providers>
          <AppLayout>{children}</AppLayout>
          <TrialBanner />
        </Providers>
      </body>
    </html>
  );
}
