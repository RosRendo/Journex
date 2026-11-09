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
    <div className="min-h-screen bg-[#070709] text-zinc-100 antialiased selection:bg-[#20e0b2]/20 selection:text-[#20e0b2] relative overflow-hidden">
      {/* Search Engine Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Subtle institutional desk lighting (Restrained single-accent, zero rainbow orb slop) */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[420px] bg-[#20e0b2]/[0.025] blur-[160px]" />
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
