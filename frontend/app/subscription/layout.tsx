import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Pricing & Plans — Journex Institutional Trading Terminal",
  description:
    "Choose your Journex tier: Starter, Professional, or Lifetime. Real-time MT5 bridge telemetry, quantitative confluence engine, and institutional order flow.",
  openGraph: {
    title: "Pricing & Plans — Journex Institutional Trading Terminal",
    description: "Choose your Journex tier: Starter, Professional, or Lifetime.",
  },
};

export default function SubscriptionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
