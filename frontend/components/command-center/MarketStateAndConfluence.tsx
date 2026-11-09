"use client";

import React from "react";
import {
  SlidersHorizontal,
  Activity,
  Globe,
  Zap,
  Compass,
  TrendingUp,
  TrendingDown,
  Minus,
  BarChart3,
  Scale,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";
import { MarketStateData, StrategyProfile, ConfluenceCondition } from "./types";
import { QuantitativeMetrics } from "@/utils/quantitativeEngine";

interface Props {
  marketState: MarketStateData;
  activeStrategy: StrategyProfile;
  confluenceScore: number;
  conditions: ConfluenceCondition[];
  onOpenStrategyBuilder: () => void;
  compact?: boolean;
  metrics?: QuantitativeMetrics;
}

function TrendBadge({ value }: { value: string }) {
  const isBull =
    value === "BULLISH" ||
    value === "BOS UP" ||
    value === "BULLISH BOS" ||
    value === "FULL_BULLISH_CONVERGENCE" ||
    value === "TREND_EXPANSION";
  const isBear =
    value === "BEARISH" ||
    value === "BOS DOWN" ||
    value === "BEARISH BOS" ||
    value === "FULL_BEARISH_CONVERGENCE";
  const color = isBull
    ? "text-[#20e0b2] bg-[#20e0b2]/10 border-[#20e0b2]/30"
    : isBear
    ? "text-[#ff5c73] bg-[#ff5c73]/10 border-[#ff5c73]/30"
    : "text-zinc-300 bg-white/[0.04] border-white/10";
  const Icon = isBull ? TrendingUp : isBear ? TrendingDown : Minus;
  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[9px] font-bold max-w-full min-w-0 overflow-hidden ${color}`}
    >
      <Icon className="w-2.5 h-2.5 shrink-0" />
      <span className="truncate">{value.replace(/_/g, " ")}</span>
    </span>
  );
}

// SVG Arc Progress in Mint Emerald with Motion Glow
function ScoreArc({ score, min }: { score: number; min: number }) {
  const r = 38;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(1, score / 100);
  const pass = score >= min;
  const strokeColor = pass ? "#20e0b2" : "#71717a";
  return (
    <svg width="96" height="96" viewBox="0 0 96 96" className="shrink-0 drop-shadow-md">
      <circle cx="48" cy="48" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
      <circle
        cx="48"
        cy="48"
        r={r}
        fill="none"
        stroke={strokeColor}
        strokeWidth="6"
        strokeLinecap="round"
        strokeDasharray={`${pct * circ} ${circ}`}
        strokeDashoffset={circ * 0.25}
        filter={pass ? "drop-shadow(0 0 6px rgba(32,224,178,0.5))" : undefined}
        style={{ transition: "stroke-dasharray 0.6s cubic-bezier(0.16, 1, 0.3, 1), stroke 0.4s ease" }}
      />
      <text
        x="48"
        y="44"
        textAnchor="middle"
        fill="#ffffff"
        fontSize="18"
        fontWeight="bold"
        fontFamily="monospace"
      >
        {score}
      </text>
      <text x="48" y="58" textAnchor="middle" fill="#71717a" fontSize="8" fontFamily="monospace">
        / 100
      </text>
    </svg>
  );
}

export default function MarketStateAndConfluence({
  marketState,
  activeStrategy,
  confluenceScore,
  conditions,
  onOpenStrategyBuilder,
  compact = false,
  metrics,
}: Props) {
  // Use real dynamically computed metrics if available, otherwise gracefully fallback
  const finalScore = metrics ? metrics.totalScore : confluenceScore;
  const isPass = finalScore >= activeStrategy.minScore;
  const verifiedCount = conditions.filter((c) => c.verified).length;
  const isBullishBias = metrics ? metrics.detectedBias === "BULLISH" : finalScore >= 60;

  // 7-Horizon Multi-Timeframe Alignment
  const mtfMatrix = metrics?.mtfMatrix ?? [
    { tf: "M", status: "NEUTRAL", color: "text-zinc-500 bg-white/[0.02] border-white/5" },
    { tf: "W", status: "NEUTRAL", color: "text-zinc-500 bg-white/[0.02] border-white/5" },
    { tf: "D", status: "NEUTRAL", color: "text-zinc-500 bg-white/[0.02] border-white/5" },
    { tf: "4H", status: "NEUTRAL", color: "text-zinc-500 bg-white/[0.02] border-white/5" },
    { tf: "1H", status: "NEUTRAL", color: "text-zinc-500 bg-white/[0.02] border-white/5" },
    { tf: "15m", status: "NEUTRAL", color: "text-zinc-500 bg-white/[0.02] border-white/5" },
    { tf: "5m", status: "NEUTRAL", color: "text-zinc-500 bg-white/[0.02] border-white/5" },
  ];

  // Evidence Criteria with Exact Mathematical Fractions
  const evidenceItems = metrics?.evidenceItems ?? [
    { name: "HTF alignment", scoreText: "0/20", pass: false, subtext: "Awaiting live telemetry..." },
    { name: "Market structure (analysis TF)", scoreText: "0/15", pass: false, subtext: "Awaiting live telemetry..." },
    { name: "Regime gate", scoreText: "0/15", pass: false, subtext: "Awaiting live telemetry..." },
    { name: "Statistical momentum", scoreText: "0/15", pass: false, subtext: "Awaiting live telemetry..." },
    { name: "SMT divergence", scoreText: "0/10", pass: false, subtext: "Awaiting live telemetry..." },
    { name: "Session timing", scoreText: "0/10", pass: false, subtext: "Awaiting live telemetry..." },
    { name: "News risk clear", scoreText: "0/15", pass: false, subtext: "Awaiting live telemetry..." },
  ];

  const efficiencyVal = metrics ? metrics.efficiencyRatio.toFixed(3) : "--";
  const regimeLabel = metrics ? metrics.regime : "WAIT";
  const atrPercentileVal = metrics ? metrics.atrPercentile : 0;
  const bbWidthPercentileVal = metrics ? metrics.bbWidthPercentile : 0;
  const slopeAtrVal = metrics ? metrics.slopeAtr.toFixed(4) : "--";
  const adr20Val = metrics ? metrics.adr20.toFixed(2) : "--";
  const todayVsAdrVal = metrics ? `${metrics.todayRangePct}%` : "--";
  const isAbnormal = metrics ? metrics.abnormalRange : false;
  const htfBiasVal = metrics ? metrics.htfBias : "NEUTRAL";
  const consensusPctVal = metrics ? `${metrics.htfConsensusPct}%` : "--";
  const conflictingTfVal = metrics ? metrics.conflictingTf : "--";
  const activeSessionDisplay = metrics ? metrics.sessionName : (marketState.sessionTiming || marketState.session);

  return (
    <div className={`grid gap-3.5 ${compact ? "grid-cols-1" : "grid-cols-1 xl:grid-cols-2"}`}>
      {/* ── 1. QUANTITATIVE REGIME & MULTI-TIMEFRAME BIAS ── */}
      <div className="bg-[#0b0b0f] border border-white/[0.08] rounded-xl p-3.5 shadow-lg flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-white/[0.06]">
            <div className="flex items-center gap-2">
              <Compass className="w-3.5 h-3.5 text-[#20e0b2]" />
              <span className="text-white font-bold text-[11px] uppercase tracking-widest">
                Market Regime &amp; MTF Matrix
              </span>
            </div>
            <span className="text-[9px] text-[#20e0b2] font-bold bg-[#20e0b2]/10 px-2 py-0.5 rounded border border-[#20e0b2]/20 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#20e0b2] animate-pulse" />
              {activeSessionDisplay}
            </span>
          </div>

          {/* 7-Horizon Multi-Timeframe Bias Matrix */}
          <div className="mb-3.5">
            <div className="flex items-center justify-between text-[9px] uppercase font-bold text-zinc-400 mb-1.5 font-mono">
              <span>Multi-Timeframe Bias Matrix</span>
              <span className="text-zinc-500 font-sans">7 Horizons</span>
            </div>
            <div className="grid grid-cols-7 gap-1.5 mb-2">
              {mtfMatrix.map((item) => (
                <div
                  key={item.tf}
                  className="bg-black/40 rounded-lg p-1.5 border border-white/[0.05] flex flex-col items-center gap-1 text-center"
                >
                  <span className="text-zinc-400 text-[9px] font-mono font-bold">{item.tf}</span>
                  <span
                    className={`px-1 py-0.2 rounded border text-[7.5px] font-mono font-bold w-full truncate ${item.color}`}
                  >
                    {item.status}
                  </span>
                </div>
              ))}
            </div>

            <div className="p-2 rounded-lg bg-black/30 border border-white/[0.05] flex items-center justify-between text-[9.5px] font-mono">
              <div className="flex items-center gap-1.5">
                <span className="text-zinc-500">HTF Bias (W/D/4H):</span>
                <span className={htfBiasVal === "BULLISH" ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}>
                  {htfBiasVal === "BULLISH" ? "▲ BULLISH" : htfBiasVal === "BEARISH" ? "▼ BEARISH" : "◆ NEUTRAL"}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-zinc-400">Alignment: <strong className="text-white">{consensusPctVal}</strong></span>
                <span className="text-zinc-500">Conflicting: <strong className="text-amber-400">{conflictingTfVal}</strong></span>
              </div>
            </div>
          </div>

          {/* Deep Quantitative Metrics: Kaufman Efficiency & Volatility */}
          <div className="grid grid-cols-2 gap-2 text-[9px] font-mono">
            {/* Regime Card */}
            <div className="bg-black/30 rounded-lg p-2.5 border border-white/[0.05] space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-zinc-500 text-[8px] font-bold uppercase">Market Regime</span>
                <span
                  className={`px-1.5 py-0.2 rounded text-[7.5px] font-bold border ${
                    regimeLabel === "TREND"
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                      : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                  }`}
                >
                  {regimeLabel}
                </span>
              </div>
              <div className="flex justify-between text-zinc-300 pt-0.5">
                <span className="text-zinc-500">efficiency ratio:</span>
                <span className="font-bold text-white font-mono">{efficiencyVal}</span>
              </div>
              <div className="flex justify-between text-zinc-300">
                <span className="text-zinc-500">atr percentile:</span>
                <span className="font-bold text-white font-mono">{atrPercentileVal}</span>
              </div>
              <div className="flex justify-between text-zinc-300">
                <span className="text-zinc-500">bb width percentile:</span>
                <span className="font-bold text-white font-mono">{bbWidthPercentileVal}</span>
              </div>
              <div className="flex justify-between text-zinc-300">
                <span className="text-zinc-500">slope atr per bar:</span>
                <span
                  className={`font-bold font-mono ${
                    Number(slopeAtrVal) >= 0 ? "text-emerald-400" : "text-rose-400"
                  }`}
                >
                  {slopeAtrVal}
                </span>
              </div>
            </div>

            {/* Volatility & ADR Card */}
            <div className="bg-black/30 rounded-lg p-2.5 border border-white/[0.05] space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-zinc-500 text-[8px] font-bold uppercase">Volatility &amp; ADR</span>
                <span className="px-1.5 py-0.2 rounded text-[7.5px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  EXPANSION
                </span>
              </div>
              <div className="flex justify-between text-zinc-300 pt-0.5">
                <span className="text-zinc-500">ATR 14:</span>
                <span className="font-bold text-white font-mono">
                  {metrics ? `${metrics.atrPips}p` : `${marketState.atrPips || "9.16"}p`}
                </span>
              </div>
              <div className="flex justify-between text-zinc-300">
                <span className="text-zinc-500">ADR 20:</span>
                <span className="font-bold text-white font-mono">{adr20Val}</span>
              </div>
              <div className="flex justify-between text-zinc-300">
                <span className="text-zinc-500">Today vs ADR:</span>
                <span className="font-bold text-amber-400 font-mono">{todayVsAdrVal}</span>
              </div>
              {isAbnormal ? (
                <div className="text-[7.5px] text-amber-400 font-bold pt-0.5 truncate">
                  ⚠️ Abnormal range today (&gt;150% ADR)
                </div>
              ) : (
                <div className="text-[7.5px] text-emerald-400 font-bold pt-0.5 truncate">
                  ✓ Range within expected ADR limits
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── 2. QUANTITATIVE EVIDENCE SCORECARD ── */}
      <div className="bg-[#0b0b0f] border border-white/[0.08] rounded-xl p-3.5 shadow-lg flex flex-col">
        {/* Header with Title and Tune Models */}
        <div className="flex items-center justify-between mb-2.5 pb-2 border-b border-white/[0.06]">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#20e0b2] opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#20e0b2]" />
            </span>
            <span className="text-white font-bold text-[11px] uppercase tracking-widest">
              Confluence &amp; Evidence Engine
            </span>
          </div>
          <button
            onClick={onOpenStrategyBuilder}
            className="flex items-center gap-1 px-2 py-0.5 rounded bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 hover:text-white border border-white/10 text-[9px] font-mono font-medium transition-all"
          >
            <SlidersHorizontal className="w-2.5 h-2.5 text-zinc-400" />
            Tune Models
          </button>
        </div>

        {/* Big Score Header & Bias Pill */}
        <div className="flex items-center justify-between bg-black/40 p-3 rounded-xl border border-white/[0.06] mb-3">
          <div className="flex items-center gap-3">
            <ScoreArc score={finalScore} min={activeStrategy.minScore} />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-mono font-bold text-white">{finalScore}</span>
                <span className="text-zinc-500 text-[10px] font-mono">/ 100</span>
                <span
                  className={`px-2 py-0.5 rounded text-[8.5px] font-bold uppercase tracking-wider border ${
                    isBullishBias
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                      : "bg-rose-500/15 text-rose-400 border-rose-500/30"
                  }`}
                >
                  {isBullishBias ? "▲ BULLISH DETECTED" : "▼ BEARISH DETECTED"}
                </span>
              </div>
              <p className="text-zinc-500 text-[8.5px] font-sans mt-1">
                Deterministic rule-based confluence score · Quantitative Engine v1
              </p>
            </div>
          </div>

          <div className="text-right">
            <span className="px-2 py-0.5 rounded text-[8px] font-mono font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 block mb-1">
              LIVE CALCULATION
            </span>
            <span className="text-[8.5px] text-zinc-400 font-mono">
              {metrics ? `${metrics.evidenceItems.filter((e) => e.pass).length} / ${metrics.evidenceItems.length} Criteria Passed` : `${verifiedCount} / ${conditions.length} Verified`}
            </span>
          </div>
        </div>

        {/* Deterministic Evidence Table (Dynamic Points Scored) */}
        <div className="space-y-1.5 flex-1 overflow-y-auto pr-0.5">
          <div className="text-[8.5px] uppercase font-bold text-zinc-500 tracking-wider mb-1 font-mono">
            Evidence Breakdown (Strict Point Scored)
          </div>
          {evidenceItems.map((item, idx) => (
            <div
              key={idx}
              className={`p-2 rounded-lg border transition-colors ${
                item.pass
                  ? "bg-white/[0.03] border-white/10"
                  : "bg-white/[0.015] border-white/[0.04]"
              }`}
            >
              <div className="flex items-center justify-between text-[9.5px] font-mono mb-0.5">
                <span className="text-zinc-200 font-bold">{item.name}</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-zinc-400 font-bold">{item.scoreText}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded text-[7.5px] font-bold uppercase tracking-wider border ${
                      item.pass
                        ? "bg-[#20e0b2]/15 text-[#20e0b2] border-[#20e0b2]/30"
                        : "bg-rose-500/15 text-rose-400 border-rose-500/30"
                    }`}
                  >
                    {item.pass ? "PASS" : "FAIL"}
                  </span>
                </div>
              </div>
              <div className="text-[8.5px] text-zinc-400 font-sans line-clamp-1">
                {item.subtext}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
