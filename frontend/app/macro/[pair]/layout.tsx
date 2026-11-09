import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ pair: string }>;
}): Promise<Metadata> {
  const { pair } = await params;
  const upperPair = (pair || "EURUSD").toUpperCase();
  return {
    title: `${upperPair} Institutional Macro Terminal — Journex`,
    description: `Live quantitative order flow, liquidity waves, central bank rates, economic calendar, and cross-asset telemetry for ${upperPair}.`,
    openGraph: {
      title: `${upperPair} Institutional Macro Intelligence — Journex`,
      description: `Live quantitative order flow, liquidity waves, central bank rates, and cross-asset correlation matrix for ${upperPair}.`,
    },
  };
}

export default function MacroPairLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

