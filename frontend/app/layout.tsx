import "./ssr-shim";
import "@/app/globals.css";
import { Providers } from "./providers";
import AppLayout from "@/components/layout/AppLayout";
import { Inter } from "next/font/google";

export const dynamic = "force-dynamic";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata = {
  title: "TradeKiller - Professional Forex Dashboard",
  description:
    "Real-time MT5 integration, live signals, news alerts, sentiment analysis, backtesting and more.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className={inter.variable}>
      <body className="bg-background text-foreground font-sans antialiased">
        <Providers>
          <AppLayout>{children}</AppLayout>
        </Providers>
      </body>
    </html>
  );
}
