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
  // ── 9 Quantitative Decision Pillars ─────────────────────────────────
  marketRegime: "TREND_EXPANSION" | "MEAN_REVERSION" | "VOLATILITY_SQUEEZE" | "BREAKOUT_HIGH_VOL";
  volatilityRegime: "LOW_COMPRESSION" | "OPTIMAL_EXPANSION" | "ELEVATED_RISK" | "EXTREME";
  htfLtfAlignment: "FULL_BULLISH_CONVERGENCE" | "FULL_BEARISH_CONVERGENCE" | "DIVERGENT";
  statisticalMomentum: string;
  crossAssetCorrelation: string;
  smtMeasurement: string;
  sessionTiming: string;
  newsRiskStatus: "CLEAR" | "WARNING_WINDOW" | "EMBARGO_ACTIVE";
  riskRewardRatio: string;
  atrPips: number;
  spreadPips: number;

  // Legacy mappings for backward compatibility
  htfTrend?: "BULLISH" | "BEARISH" | "NEUTRAL";
  h4Structure?: "BULLISH" | "BEARISH" | "SIDEWAYS";
  h1Structure?: "BULLISH" | "BEARISH" | "SIDEWAYS";
  m15Structure?: "BULLISH" | "BEARISH" | "SIDEWAYS";
  structureEvent?: string;
  session?: string;
  volatility?: "LOW" | "NORMAL" | "HIGH" | "EXTREME";
  liquidityBias?: string;
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
  evidenceLog: {
    time: string;
    event: string;
    type:
      | "regime"
      | "volatility"
      | "alignment"
      | "momentum"
      | "correlation"
      | "smt"
      | "session"
      | "news"
      | "risk"
      | "sweep"
      | "mss"
      | "fvg"
      | "retest"
      | "close";
  }[];
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
