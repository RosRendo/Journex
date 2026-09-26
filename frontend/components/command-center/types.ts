export interface ConfluenceCondition {
  id: string;
  name: string;
  weight: number;
  verified: boolean;
  required: boolean;
  statusText?: string;
}

export interface StrategyProfile {
  id: string;
  name: string;
  icon: string;
  description: string;
  minScore: number;
  minRR: number;
  targetMarkets: string[];
  activeSessions: string[];
  conditions: ConfluenceCondition[];
}

export interface MarketStateData {
  symbol: string;
  htfTrend: "BULLISH" | "BEARISH" | "NEUTRAL";
  h4Structure: "BULLISH" | "BEARISH" | "SIDEWAYS";
  h1Structure: "BULLISH" | "BEARISH" | "SIDEWAYS";
  m15Structure: "BULLISH" | "BEARISH" | "SIDEWAYS";
  structureEvent: "BOS" | "CHOCH" | "RNG BOUND";
  session: string;
  volatility: "LOW" | "NORMAL" | "HIGH" | "EXTREME";
  liquidityBias: "SWEEP_BELOW" | "SWEEP_ABOVE" | "POOLS_BALANCED";
  atrPips: number;
  spreadPips: number;
}

export interface SetupSignalData {
  bias: "LONG" | "SHORT" | "NO_SETUP";
  headline: string;
  confidenceScore: number; // 0 - 100
  readinessState: "WAIT" | "READY" | "CONFIRMED" | "REJECTED";
  entryPrice: number;
  slPrice: number;
  tp1Price: number;
  tp2Price: number;
  rrRatio: string;
  setupChecks: { label: string; passed: boolean }[];
  confirmationChecks: { label: string; passed: boolean }[];
  readinessBars: {
    market: number; // e.g. 90
    setup: number; // e.g. 80
    confirmation: number; // e.g. 70
  };
  invalidationRules: string[];
  evidenceLog: { time: string; event: string; type: "sweep" | "mss" | "fvg" | "retest" | "close" }[];
}

export interface NewsEventData {
  id: string;
  currency: string;
  title: string;
  timeString: string;
  impact: "HIGH" | "MED" | "LOW";
  minutesUntil: number;
  pairImpacts: Record<string, { impactScore: number; severity: "VERY HIGH" | "HIGH" | "MEDIUM" | "LOW" }>;
  restrictionNotice: string;
}

export interface WorkspaceWidgets {
  watchlist: boolean;
  chart: boolean;
  marketState: boolean;
  confluence: boolean;
  setupHero: boolean;
  news: boolean;
  riskCheck: boolean;
  smt: boolean;
}
