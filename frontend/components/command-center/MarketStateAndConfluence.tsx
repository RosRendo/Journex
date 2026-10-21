"use client";

import React from "react";
import { SlidersHorizontal, Activity, Globe, Zap, Compass, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { MarketStateData, StrategyProfile, ConfluenceCondition } from "./types";

interface Props {
  marketState: MarketStateData;
  activeStrategy: StrategyProfile;
  confluenceScore: number;
  conditions: ConfluenceCondition[];
  onOpenStrategyBuilder: () => void;
  compact?: boolean;
}

function TrendBadge({ value }: { value: string }) {
  const isBull = value === "BULLISH" || value === "BOS UP" || value === "BULLISH BOS";
  const isBear = value === "BEARISH" || value === "BOS DOWN" || value === "BEARISH BOS";
  const color = isBull ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/25"
    : isBear ? "text-rose-400 bg-rose-500/10 border-rose-500/25"
    : "text-zinc-300 bg-white/[0.04] border-white/10";
  const Icon = isBull ? TrendingUp : isBear ? TrendingDown : Minus;
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[9px] font-bold max-w-full min-w-0 overflow-hidden ${color}`}>
      <Icon className="w-2.5 h-2.5 shrink-0" />
      <span className="truncate">{value}</span>
    </span>
  );
}

// SVG Arc Progress
function ScoreArc({ score, min }: { score: number; min: number }) {
  const r = 38;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(1, score / 100);
  const pass = score >= min;
  const strokeColor = pass ? "#ffffff" : "#71717a";
  return (
    <svg width="96" height="96" viewBox="0 0 96 96" className="shrink-0">
      <circle cx="48" cy="48" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
      <circle
        cx="48" cy="48" r={r}
        fill="none"
        stroke={strokeColor}
        strokeWidth="6"
        strokeLinecap="round"
        strokeDasharray={`${pct * circ} ${circ}`}
        strokeDashoffset={circ * 0.25}
        style={{ transition: "stroke-dasharray 0.6s ease" }}
      />
      <text x="48" y="44" textAnchor="middle" fill="#ffffff" fontSize="18" fontWeight="bold" fontFamily="monospace">{score}</text>
      <text x="48" y="58" textAnchor="middle" fill="#71717a" fontSize="8" fontFamily="monospace">/ 100</text>
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
}: Props) {
  const isPass = confluenceScore >= activeStrategy.minScore;
  const verifiedCount = conditions.filter((c) => c.verified).length;

  return (
    <div className={`grid gap-3.5 ${compact ? "grid-cols-1" : "grid-cols-1 xl:grid-cols-2"}`}>

      {/* ── MARKET STATE ── */}
      <div className="bg-[#0b0b0f] border border-white/[0.07] rounded-xl p-3.5 shadow-lg">
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-white/[0.06]">
          <div className="flex items-center gap-2">
            <Compass className="w-3.5 h-3.5 text-zinc-400" />
            <span className="text-white font-bold text-[11px] uppercase tracking-widest">Market State</span>
          </div>
          <span className="text-[9px] text-zinc-500 flex items-center gap-1">
            <Globe className="w-3 h-3 text-zinc-500" /> {marketState.session}
          </span>
        </div>

        {/* Trend Tiles */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          {[
            { label: "4H", value: marketState.h4Structure },
            { label: "1H", value: marketState.h1Structure },
            { label: "15M", value: marketState.m15Structure },
          ].map((item) => (
            <div key={item.label} className="bg-black/30 rounded-lg p-2 border border-white/[0.05] flex flex-col items-center gap-1.5">
              <span className="text-zinc-500 text-[9px] font-semibold">{item.label}</span>
              <TrendBadge value={item.value} />
            </div>
          ))}
        </div>

        {/* Key Stats Row */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-black/20 rounded-lg p-2 border border-white/[0.04]">
            <span className="text-zinc-500 text-[9px] block mb-0.5">HTF Trend</span>
            <TrendBadge value={marketState.htfTrend} />
          </div>
          <div className="bg-black/20 rounded-lg p-2 border border-white/[0.04]">
            <span className="text-zinc-500 text-[9px] block mb-0.5">Volatility</span>
            <span className="text-zinc-200 font-bold text-[10.5px]">{marketState.volatility}
              <span className="text-zinc-500 text-[9px] font-normal ml-1">{marketState.atrPips}p ATR</span>
            </span>
          </div>
          <div className="bg-black/20 rounded-lg p-2 border border-white/[0.04]">
            <span className="text-zinc-500 text-[9px] block mb-0.5">Structure Event</span>
            <span className="text-white font-bold text-[10px]">{marketState.structureEvent}</span>
          </div>
          <div className="bg-black/20 rounded-lg p-2 border border-white/[0.04]">
            <span className="text-zinc-500 text-[9px] block mb-0.5">Liquidity</span>
            <span className="text-zinc-200 font-bold text-[10px]">
              {marketState.liquidityBias === "SWEEP_BELOW" ? "Sell-Side Swept" : "Buy-Side Swept"}
            </span>
          </div>
        </div>
      </div>

      {/* ── CONFLUENCE ENGINE ── */}
      <div className="bg-[#0b0b0f] border border-white/[0.07] rounded-xl p-3.5 shadow-lg">
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-white/[0.06]">
          <div className="flex items-center gap-2">
            <Zap className="w-3.5 h-3.5 text-zinc-400" />
            <span className="text-white font-bold text-[11px] uppercase tracking-widest">Confluence</span>
          </div>
          <button
            onClick={onOpenStrategyBuilder}
            className="flex items-center gap-1 px-2 py-0.5 rounded bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 hover:text-white border border-white/10 text-[9px] font-mono font-medium transition-all"
          >
            <SlidersHorizontal className="w-2.5 h-2.5 text-zinc-400" />
            Edit
          </button>
        </div>

        <div className="flex items-center gap-3 mb-3">
          {/* Arc Score */}
          <ScoreArc score={confluenceScore} min={activeStrategy.minScore} />

          {/* Right-side info */}
          <div className="flex-1 flex flex-col gap-2">
            <div className={`text-center py-1.5 rounded-lg border font-bold text-[10px] ${
              isPass
                ? "bg-white/10 border-white/20 text-white"
                : "bg-white/[0.04] border-white/10 text-zinc-400"
            }`}>
              {isPass ? "CONFLUENCE VALID" : `NEED ${activeStrategy.minScore - confluenceScore} MORE`}
            </div>
            <div className="text-center text-[9px] text-zinc-500">
              <span className="text-white font-semibold">{verifiedCount}</span>
              <span> / {conditions.length} conditions met</span>
            </div>
            {/* Mini bar */}
            <div className="w-full h-1.5 bg-zinc-900 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${isPass ? "bg-white" : "bg-zinc-600"}`}
                style={{ width: `${Math.min(100, confluenceScore)}%` }}
              />
            </div>
            <div className="text-[9px] text-zinc-500">{activeStrategy.name}</div>
          </div>
        </div>

        {/* Condition Checklist */}
        <div className={`grid gap-1.5 ${compact ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2"}`}>
          {conditions.map((cond) => (
            <div
              key={cond.id}
              title={cond.name}
              className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg border text-[9.5px] font-medium transition-all ${
                cond.verified
                  ? "bg-white/[0.04] border-white/10 text-zinc-200"
                  : "bg-white/[0.015] border-white/[0.04] text-zinc-600"
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className={`w-3.5 h-3.5 rounded flex items-center justify-center text-[8px] font-bold shrink-0 ${
                  cond.verified ? "bg-white/15 text-white" : "bg-white/5 text-zinc-600"
                }`}>
                  {cond.verified ? "✓" : "·"}
                </span>
                <span className="truncate">{cond.name}</span>
              </div>
              <span className={`font-mono text-[9px] font-bold shrink-0 ml-2 ${cond.verified ? "text-zinc-300" : "text-zinc-600"}`}>
                +{cond.weight}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}