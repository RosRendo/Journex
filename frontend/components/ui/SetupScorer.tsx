"use client";
import { useMemo } from "react";
import { Check, X, Info } from "lucide-react";

export interface SetupScorerProps {
  currentRSI: number | null;
  currentATR: number | null;
  avgATR: number | null;
  currentSpread: number | null;
  avgSpread: number | null;
  rrRatio: number | null;
  nextNewsMinutes: number | null;
  livePrice: number | null;
  sma50: number | null;
  tradeDirection?: "buy" | "sell" | null;
}

interface Criterion {
  id: string;
  label: string;
  weight: number;
  passed: boolean | null; // null = data missing (cannot evaluate)
  desc: string;
}

export function SetupScorer({
  currentRSI,
  currentATR,
  avgATR,
  currentSpread,
  avgSpread,
  rrRatio,
  nextNewsMinutes,
  livePrice,
  sma50,
  tradeDirection = null,
}: SetupScorerProps) {
  
  // Rule 1: Trend Aligned (Weight: 2)
  const isTrendAligned = useMemo(() => {
    if (livePrice === null || sma50 === null) return null;
    const isUptrend = livePrice > sma50;
    if (tradeDirection) {
      if (tradeDirection === "buy") return isUptrend;
      if (tradeDirection === "sell") return !isUptrend;
    }
    return true; // if no direction proposed, trend exists
  }, [livePrice, sma50, tradeDirection]);

  // Rule 2: Session Active (Weight: 2)
  const isSessionActive = useMemo(() => {
    const now = new Date();
    const h = now.getUTCHours();
    const isLondon = h >= 8 && h < 17;
    const isNy = h >= 13 && h < 22;
    return isLondon || isNy;
  }, []);

  // Rule 3: No News within 2 hours (Weight: 2)
  const isNewsClear = useMemo(() => {
    if (nextNewsMinutes === null) return null;
    return nextNewsMinutes > 120;
  }, [nextNewsMinutes]);

  // Rule 4: Risk / Reward >= 1.5 (Weight: 1)
  const isGoodRR = useMemo(() => {
    if (rrRatio === null) return null;
    return rrRatio >= 1.5;
  }, [rrRatio]);

  // Rule 5: RSI Neutral (Weight: 1)
  const isRsiNeutral = useMemo(() => {
    if (currentRSI === null) return null;
    return currentRSI >= 30 && currentRSI <= 70;
  }, [currentRSI]);

  // Rule 6: ATR Normal (Weight: 1)
  const isAtrNormal = useMemo(() => {
    if (currentATR === null || avgATR === null || avgATR === 0) return null;
    // Current ATR within 50% of the 20-period average ATR
    return currentATR <= avgATR * 1.5;
  }, [currentATR, avgATR]);

  // Rule 7: Spread Normal (Weight: 1)
  const isSpreadNormal = useMemo(() => {
    if (currentSpread === null || avgSpread === null || avgSpread === 0) return null;
    return currentSpread <= avgSpread * 1.5;
  }, [currentSpread, avgSpread]);

  const criteria: Criterion[] = [
    { id: "trend", label: "Trend Aligned", weight: 2, passed: isTrendAligned, desc: "Price aligned with SMA50" },
    { id: "session", label: "Session Active", weight: 2, passed: isSessionActive, desc: "London or NY open" },
    { id: "news", label: "No Urgent News", weight: 2, passed: isNewsClear, desc: "No high impact news next 2h" },
    { id: "rr", label: "R:R Ratio ≥ 1.5", weight: 1, passed: isGoodRR, desc: "Good risk to reward ratio" },
    { id: "rsi", label: "RSI Neutral", weight: 1, passed: isRsiNeutral, desc: "RSI between 30 and 70" },
    { id: "atr", label: "Volatility Normal", weight: 1, passed: isAtrNormal, desc: "ATR within 1.5x of average" },
    { id: "spread", label: "Spread Normal", weight: 1, passed: isSpreadNormal, desc: "Spread within 1.5x of average" },
  ];

  let score = 0;
  let maxScore = 0;

  for (const c of criteria) {
    if (c.passed !== null) {
      maxScore += c.weight;
      if (c.passed) score += c.weight;
    }
  }

  // Normalize to 10 if some data is missing
  const finalScore = maxScore > 0 ? Math.round((score / maxScore) * 10) : 0;

  const verdict = 
    finalScore >= 8 ? { text: "GO", color: "#00c896" } :
    finalScore >= 5 ? { text: "WAIT", color: "#f5a623" } :
    { text: "NO", color: "#ff4d6a" };

  return (
    <div className="rounded-xl overflow-hidden border transition-all duration-300"
      style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
      
      {/* Top Header - Score display */}
      <div className="p-5 border-b" style={{ borderColor: "var(--border)" }}>
        <div className="flex items-center justify-between mb-4">
          <span className="text-[11px] font-bold tracking-widest uppercase" style={{ color: "var(--text-tertiary)" }}>
            Setup Quality Score
          </span>
          <div className="text-[10px] font-mono px-2 py-0.5 rounded-md" style={{ background: "var(--bg-elevated)", color: verdict.color }}>
            {maxScore < 10 && "Awaiting Data"}
          </div>
        </div>

        <div className="flex items-end gap-4">
          <div className="text-[64px] font-bold leading-none tracking-tighter"
            style={{ fontFamily: "var(--font-display, Syne, sans-serif)", color: verdict.color }}>
            {finalScore}
            <span className="text-[24px] opacity-40 ml-1 font-mono">/10</span>
          </div>
          <div className="text-[32px] font-bold leading-tight pb-1"
            style={{ fontFamily: "var(--font-display, Syne, sans-serif)", color: verdict.color }}>
            {verdict.text}
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-1.5 w-full bg-[--bg-base] mt-5 rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all duration-1000 ease-out"
            style={{ width: `${(finalScore / 10) * 100}%`, background: verdict.color }} />
        </div>
      </div>

      {/* Checklist Grid */}
      <div className="p-3">
        {criteria.map((c) => (
          <div key={c.id} className="flex items-center justify-between py-2 px-2 rounded-lg transition-colors hover:bg-[--bg-elevated]">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded-full"
                style={{ 
                  background: c.passed === true ? "rgba(0,200,150,0.15)" : c.passed === false ? "rgba(255,77,106,0.15)" : "var(--bg-base)",
                  color: c.passed === true ? "#00c896" : c.passed === false ? "#ff4d6a" : "var(--text-tertiary)"
                }}>
                {c.passed === true ? <Check size={12} strokeWidth={3} /> : c.passed === false ? <X size={12} strokeWidth={3} /> : <div className="w-1.5 h-1.5 rounded-full bg-[--text-tertiary]" />}
              </div>
              <div>
                <div className="text-[12px] font-bold" style={{ color: "var(--text-secondary)" }}>
                  {c.label}
                </div>
              </div>
            </div>
            
            {c.passed === null ? (
              <span className="text-[10px] text-[--text-tertiary] font-mono">Loading</span>
            ) : (
              <div className="group relative flex items-center justify-center text-[--text-tertiary] hover:text-[--text-primary] cursor-help">
                <Info size={12} />
                {/* Tooltip */}
                <div className="absolute right-0 bottom-full mb-2 w-48 p-2 rounded bg-[#111118] border border-[--border] shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-20">
                  <p className="text-[10px] text-[--text-secondary]">{c.desc}</p>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
