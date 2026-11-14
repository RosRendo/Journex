import type { Metadata } from "next";
import Nav from "@/components/landing/Nav";
import Hero from "@/components/landing/Hero";
import Problem from "@/components/landing/Problem";
import Showcase from "@/components/landing/Showcase";
import Features from "@/components/landing/Features";
import { HowItWorks, Pricing, FinalCTA } from "@/components/landing/Sections";
import Footer from "@/components/landing/Footer";

export const metadata: Metadata = {
  title: "Journex — The Institutional Trading Desk & Journal for MT5",
  description:
    "Real-time MetaTrader 5 execution telemetry, quantitative confluence engines, institutional order flow, and performance analytics.",
  openGraph: {
    title: "Journex — The Institutional Trading Desk & Journal for MT5",
    description:
      "Real-time MetaTrader 5 execution telemetry, quantitative confluence engines, institutional order flow, and performance analytics.",
    type: "website",
  },
  alternates: {
    canonical: "/",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "SoftwareApplication",
      "name": "Journex",
      "applicationCategory": "FinanceApplication",
      "operatingSystem": "Web, Windows, macOS",
      "description":
        "Real-time MetaTrader 5 execution telemetry, quantitative confluence engines, institutional order flow, and performance analytics.",
      "offers": {
        "@type": "Offer",
        "price": "29.00",
        "priceCurrency": "USD",
      },
    },
    {
      "@type": "Organization",
      "name": "Journex",
      "url": "https://journex.io",
      "logo": "https://journex.io/favicon.ico",
    },
  ],
};

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#000000] text-zinc-100 antialiased selection:bg-[#20e0b2]/20 selection:text-[#20e0b2] relative overflow-hidden">
      {/* Search Engine Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Neon-Style Luminous Radial Halo & Geometric Grid Overlay */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1200px] h-[550px] bg-[radial-gradient(ellipse_at_top,rgba(32,224,178,0.14),transparent_70%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-70" />
      </div>

      <div className="relative z-10">
        <Nav />
        <main>
          <Hero />
          <Problem />
          <Showcase />
          <Features />
          <HowItWorks />
          <Pricing />
          <FinalCTA />
        </main>
        <Footer />
      </div>
    </div>
  );
}
