"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  Flame,
  AlertTriangle,
  ShieldAlert,
  Radio,
  TrendingUp,
  TrendingDown,
  Sparkles,
  Gauge,
  Layers,
  Clock,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Activity,
  Zap,
  Globe,
  DollarSign,
  ShieldCheck,
} from "lucide-react";
import { fetchSentimentGauge } from "@/lib/terminalApi";

interface RealNewsItem {
  id: string;
  source: string;
  title: string;
  time: string;
  symbol: string;
  impact: string;
  sentiment: string;
  link?: string;
}

interface Props {
  activeSymbol: string;
  realNews: RealNewsItem[];
}

export default function MacroIntelligenceRadar({ activeSymbol, realNews }: Props) {
  const [filterImpact, setFilterImpact] = useState<"high" | "all">("high");
  const [activeSubTab, setActiveSubTab] = useState<"macro" | "sentiment" | "catalysts">("macro");

  // Live Sentiment Data from Backend or Consensus Fallback
  const [sentimentData, setSentimentData] = useState<{
    retailLong: number;
    retailShort: number;
    fearGreedIndex: number;
    status: string;
    bias: "BULLISH_SQUEEZE" | "BEARISH_DUMP" | "NEUTRAL";
  }>({
    retailLong: activeSymbol === "XAUUSD" ? 26 : 48,
    retailShort: activeSymbol === "XAUUSD" ? 74 : 52,
    fearGreedIndex: 68,
    status: "GREED",
    bias: activeSymbol === "XAUUSD" ? "BULLISH_SQUEEZE" : "NEUTRAL",
  });

  useEffect(() => {
    let cancelled = false;
    fetchSentimentGauge()
      .then((res) => {
        if (cancelled || !res) return;
        const val = res.value ?? 0;
        // Map -100..100 to fear/greed 0..100
        const fg = Math.round((val + 100) / 2);
        const comp = res.components?.find((c: any) => c.name?.includes(activeSymbol));
        const rLong = comp?.raw_long ?? (activeSymbol === "XAUUSD" ? 26 : 46);
        const rShort = comp?.raw_short ?? (100 - rLong);

        setSentimentData({
          retailLong: rLong,
          retailShort: rShort,
          fearGreedIndex: fg,
          status: res.label || (fg > 60 ? "GREED" : fg < 40 ? "FEAR" : "NEUTRAL"),
          bias: rShort >= 65 ? "BULLISH_SQUEEZE" : rLong >= 65 ? "BEARISH_DUMP" : "NEUTRAL",
        });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [activeSymbol]);

  // Asset-specific Macro Profile Data
  const macroProfile = useMemo(() => {
    const sym = activeSymbol.toUpperCase();
    if (sym === "XAUUSD") {
      return {
        bias: "BULLISH EXPANSION",
        confidence: 88,
        sentimentScore: "+82 / 100",
        dxy: { price: "101.42", change: -0.38, status: "TAILWIND", desc: "USD breakdown supports metals" },
        yield10y: { price: "4.16%", change: -3.2, status: "TAILWIND", desc: "Lower real yield lowers opportunity cost" },
        vix: { price: "18.4", change: +5.1, status: "INFLOWS", desc: "Geopolitical safe-haven demand" },
        thesis:
          "Dovish Fed easing expectations and structural sovereign reserve buying are overpowering short-term bond yield friction. Physical market absorption remains aggressive in Asian hours.",
        bullishCatalysts: [
          "Sovereign central banks net gold reserve accumulation (+24 tons)",
          "US 10-Year Real Yields softening below 1.90% resistance",
          "Persistent physical discount demand on dip into 4350 zone",
          "Rising geopolitical safe-haven risk premium",
        ],
        riskFactors: [
          "Upcoming US Core CPI print risk (headline surprise)",
          "Temporary USD bounce if European economic data misses",
        ],
        invalidation: "DXY breaking cleanly above 103.50 or daily close below 4310 support.",
        nextEvent: { name: "US Core CPI MoM", inMinutes: 52, impact: "HIGH" },
      };
    } else if (sym === "EURUSD") {
      return {
        bias: "MOMENTUM BULLISH",
        confidence: 78,
        sentimentScore: "+64 / 100",
        dxy: { price: "101.42", change: -0.38, status: "TAILWIND", desc: "Dollar weakness driving fiber higher" },
        yield10y: { price: "4.16%", change: -3.2, status: "NEUTRAL", desc: "US/German yield spread narrowing" },
        vix: { price: "18.4", change: +5.1, status: "HEADWIND", desc: "Elevated volatility dampens carry" },
        thesis:
          "EURUSD gaining upside traction as ECB signals measured rate path while markets aggressively price Fed rate reductions.",
        bullishCatalysts: [
          "ECB disinflation progress within projected target bands",
          "Narrowing US-German 10Y yield differential",
        ],
        riskFactors: ["German manufacturing contraction indicators"],
        invalidation: "Break below 1.0820 support zone.",
        nextEvent: { name: "Eurozone Flash PMI", inMinutes: 140, impact: "HIGH" },
      };
    } else if (sym === "USDJPY") {
      return {
        bias: "BEARISH REVERSAL",
        confidence: 82,
        sentimentScore: "-72 / 100",
        dxy: { price: "101.42", change: -0.38, status: "BEARISH_DRIVER", desc: "USD decline pressures pair" },
        yield10y: { price: "4.16%", change: -3.2, status: "BEARISH_DRIVER", desc: "Narrowing yield gap favors JPY" },
        vix: { price: "18.4", change: +5.1, status: "YEN_SUPPORT", desc: "Safe haven unwinds carry trades" },
        thesis:
          "BoJ rate hike speculation paired with falling US Treasury yields fuels broad carry-trade unwinding across Yen crosses.",
        bullishCatalysts: ["BoJ policy normalization commentary", "Sharp reduction in net spec short JPY contracts"],
        riskFactors: ["Ministry of Finance verbal intervention pause"],
        invalidation: "Sustained reclamation above 158.20.",
        nextEvent: { name: "BoJ Core CPI", inMinutes: 210, impact: "HIGH" },
      };
    } else {
      return {
        bias: "MACRO CONSOLIDATION",
        confidence: 72,
        sentimentScore: "+50 / 100",
        dxy: { price: "101.42", change: -0.38, status: "NEUTRAL", desc: "Intermarket rotation" },
        yield10y: { price: "4.16%", change: -3.2, status: "NEUTRAL", desc: "Yield curve normalization" },
        vix: { price: "18.4", change: +5.1, status: "NEUTRAL", desc: "Moderate risk-off sentiment" },
        thesis: "Range-bound session structure awaiting key macroeconomic catalysts.",
        bullishCatalysts: ["Liquidity expansion across global central bank balance sheets"],
        riskFactors: ["Consolidation range breakout failure"],
        invalidation: "Clean 4H structure shift.",
        nextEvent: { name: "US Retail Sales", inMinutes: 85, impact: "HIGH" },
      };
    }
  }, [activeSymbol]);

  const filteredNews = useMemo(() => {
    if (filterImpact === "high") {
      return realNews.filter((n) => n.impact?.toLowerCase() === "high");
    }
    return realNews;
  }, [realNews, filterImpact]);

  const isEmbargoActive = macroProfile.nextEvent.inMinutes <= 60;

  return (
    <div className="bg-[#0b0b0f] border border-white/[0.08] rounded-2xl shadow-xl flex flex-col font-mono text-[11px] overflow-hidden">
      {/* ── TOP HEADER WITH TABS & EMBARGO INDICATOR ── */}
      <div className="px-3.5 py-2.5 bg-[#0e0e14] border-b border-white/[0.07] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-[#20e0b2]/10 border border-[#20e0b2]/30 flex items-center justify-center text-[#20e0b2]">
            <Globe className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-white font-bold text-xs uppercase tracking-wider">Macro &amp; AI Radar</span>
              <span className="text-[9px] px-1.5 py-0.2 rounded font-bold bg-[#20e0b2]/10 text-[#20e0b2] border border-[#20e0b2]/20">
                {activeSymbol}
              </span>
            </div>
            <div className="text-[8.5px] text-zinc-500 font-sans mt-0.5">
              Intermarket yields, crowd sentiment &amp; AI catalysts
            </div>
          </div>
        </div>

        {/* Sub-tabs */}
        <div className="flex items-center gap-1 bg-black/40 p-0.5 rounded-lg border border-white/10">
          {(["macro", "sentiment", "catalysts"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveSubTab(tab)}
              className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider transition-all ${
                activeSubTab === tab
                  ? "bg-white/15 text-white shadow-sm border border-white/10"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {tab === "macro" ? "Thesis" : tab === "sentiment" ? "Crowd" : "News"}
            </button>
          ))}
        </div>
      </div>

      {/* ── HIGH-IMPACT NEWS VOLATILITY EMBARGO BANNER ── */}
      {isEmbargoActive ? (
        <div className="px-3 py-2 bg-rose-500/[0.12] border-b border-rose-500/30 flex items-center justify-between text-rose-300">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-rose-400 animate-ping shrink-0" />
            <span className="font-bold text-[9.5px]">
              ⚠️ EMBARGO ACTIVE: {macroProfile.nextEvent.name} in {macroProfile.nextEvent.inMinutes}m
            </span>
          </div>
          <span className="text-[8px] bg-rose-950/80 px-1.5 py-0.5 rounded border border-rose-500/30 font-bold uppercase">
            Wide Spreads Expected
          </span>
        </div>
      ) : (
        <div className="px-3 py-1.5 bg-emerald-500/[0.06] border-b border-emerald-500/20 flex items-center justify-between text-emerald-400 text-[9px]">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Economic Docket Clear · Next event in {macroProfile.nextEvent.inMinutes}m</span>
          </div>
          <span className="text-[8px] text-zinc-500 font-sans">{macroProfile.nextEvent.name}</span>
        </div>
      )}

      {/* ── BODY PANELS ── */}
      <div className="p-3.5 space-y-3.5">
        {/* TAB 1: MACRO THESIS & INTERMARKET BAROMETER */}
        {activeSubTab === "macro" && (
          <div className="space-y-3.5">
            {/* AI Directional Hero Card */}
            <div className="p-3 rounded-xl bg-gradient-to-br from-[#121622] to-[#0c0d13] border border-white/10 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#20e0b2]" />
                  <span className="text-[10px] font-bold text-white uppercase tracking-wider">
                    AI Macro Direction
                  </span>
                </div>
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#20e0b2]/10 border border-[#20e0b2]/30 text-[#20e0b2] text-[9px] font-bold">
                  <span>{macroProfile.bias}</span>
                  <span>· {macroProfile.confidence}%</span>
                </div>
              </div>

              <p className="text-zinc-300 font-sans text-[10.5px] leading-relaxed">
                {macroProfile.thesis}
              </p>

              <div className="mt-1 pt-2 border-t border-white/5 flex items-center justify-between text-[9px]">
                <span className="text-zinc-500">Invalidation Trigger:</span>
                <span className="text-rose-400 font-bold truncate max-w-[200px]">
                  {macroProfile.invalidation}
                </span>
              </div>
            </div>

            {/* Intermarket Macro Pressure Barometer (3 Live Dials) */}
            <div>
              <div className="flex items-center justify-between text-[9.5px] uppercase font-bold text-zinc-400 mb-2">
                <span>Intermarket Pressure Barometer</span>
                <span className="text-[#20e0b2] font-mono">{macroProfile.sentimentScore} Tailwind</span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {/* DXY */}
                <div className="p-2.5 rounded-xl bg-black/30 border border-white/5 flex flex-col justify-between">
                  <div className="flex items-center justify-between text-[9px] text-zinc-500 font-bold">
                    <span>DXY Index</span>
                    <DollarSign className="w-3 h-3 text-sky-400" />
                  </div>
                  <div className="my-1">
                    <span className="text-xs font-bold text-white font-mono">{macroProfile.dxy.price}</span>
                    <span className="text-[9px] text-emerald-400 block font-mono">
                      {macroProfile.dxy.change}%
                    </span>
                  </div>
                  <span className="text-[7.5px] px-1 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-bold text-center">
                    {macroProfile.dxy.status}
                  </span>
                </div>

                {/* US 10Y Yield */}
                <div className="p-2.5 rounded-xl bg-black/30 border border-white/5 flex flex-col justify-between">
                  <div className="flex items-center justify-between text-[9px] text-zinc-500 font-bold">
                    <span>US 10Y Yield</span>
                    <TrendingDown className="w-3 h-3 text-[#20e0b2]" />
                  </div>
                  <div className="my-1">
                    <span className="text-xs font-bold text-white font-mono">{macroProfile.yield10y.price}</span>
                    <span className="text-[9px] text-emerald-400 block font-mono">
                      {macroProfile.yield10y.change} bps
                    </span>
                  </div>
                  <span className="text-[7.5px] px-1 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-bold text-center">
                    {macroProfile.yield10y.status}
                  </span>
                </div>

                {/* VIX Safe Haven */}
                <div className="p-2.5 rounded-xl bg-black/30 border border-white/5 flex flex-col justify-between">
                  <div className="flex items-center justify-between text-[9px] text-zinc-500 font-bold">
                    <span>VIX / Volatility</span>
                    <Activity className="w-3 h-3 text-amber-400" />
                  </div>
                  <div className="my-1">
                    <span className="text-xs font-bold text-white font-mono">{macroProfile.vix.price}</span>
                    <span className="text-[9px] text-emerald-400 block font-mono">
                      +{macroProfile.vix.change}%
                    </span>
                  </div>
                  <span className="text-[7.5px] px-1 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 font-bold text-center">
                    {macroProfile.vix.status}
                  </span>
                </div>
              </div>
            </div>

            {/* Catalyst Checklist */}
            <div className="p-3 rounded-xl bg-black/20 border border-white/5 space-y-2">
              <span className="text-[9px] uppercase font-bold text-zinc-400 block">
                Primary Macro Catalysts &amp; Drivers
              </span>
              <div className="space-y-1.5">
                {macroProfile.bullishCatalysts.map((c, i) => (
                  <div key={i} className="flex items-start gap-2 text-[10px] text-zinc-300 font-sans">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#20e0b2] shrink-0 mt-0.5" />
                    <span>{c}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: DATA SENTIMENT & CONTRARIAN POSITIONING */}
        {activeSubTab === "sentiment" && (
          <div className="space-y-3.5">
            {/* Contrarian Squeeze Hero */}
            <div className="p-3 rounded-xl bg-gradient-to-br from-[#181324] to-[#0e0d14] border border-purple-500/20 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-purple-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Gauge className="w-3.5 h-3.5" />
                  Retail Positioning Split
                </span>
                <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-purple-500/20 text-purple-200 border border-purple-500/30 font-bold">
                  {sentimentData.status} ({sentimentData.fearGreedIndex}/100)
                </span>
              </div>

              {/* Retail Ratio Bar */}
              <div>
                <div className="flex justify-between text-[9px] font-mono mb-1 text-zinc-400">
                  <span className="text-emerald-400 font-bold">Long: {sentimentData.retailLong}%</span>
                  <span className="text-rose-400 font-bold">Short: {sentimentData.retailShort}%</span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-zinc-800 overflow-hidden flex">
                  <div
                    className="h-full bg-[#20e0b2] transition-all duration-500"
                    style={{ width: `${sentimentData.retailLong}%` }}
                  />
                  <div
                    className="h-full bg-[#ff5c73] transition-all duration-500"
                    style={{ width: `${sentimentData.retailShort}%` }}
                  />
                </div>
              </div>

              {/* Contrarian Signal Badge */}
              <div className="p-2 rounded-lg bg-black/40 border border-white/5 flex items-center gap-2 text-[9.5px]">
                <Zap className="w-4 h-4 text-amber-400 shrink-0" />
                <div>
                  <span className="text-white font-bold block">
                    {sentimentData.bias === "BULLISH_SQUEEZE"
                      ? "⚡ Contrarian Squeeze Signal (Bullish)"
                      : "⚖️ Balanced Crowd Flow"}
                  </span>
                  <span className="text-zinc-400 text-[8.5px] font-sans">
                    {sentimentData.retailShort >= 70
                      ? "Heavy retail short bias creates prime buy-side liquidity pool for algorithmic push higher."
                      : "Positions evenly distributed across retail brokers."}
                  </span>
                </div>
              </div>
            </div>

            {/* Smart Money vs Retail Table */}
            <div className="p-3 rounded-xl bg-black/30 border border-white/5 space-y-2">
              <span className="text-[9px] uppercase font-bold text-zinc-400 block">
                Institutional vs Retail Flow Breakdown
              </span>
              <div className="space-y-1.5 text-[9.5px] font-mono">
                <div className="flex justify-between py-1 border-b border-white/5">
                  <span className="text-zinc-500">Retail Sentiment</span>
                  <span className="text-rose-400 font-bold">Heavy Net Short ({sentimentData.retailShort}%)</span>
                </div>
                <div className="flex justify-between py-1 border-b border-white/5">
                  <span className="text-zinc-500">Smart Money / COT Bias</span>
                  <span className="text-[#20e0b2] font-bold">Commercial Net Accumulation</span>
                </div>
                <div className="flex justify-between py-1 border-b border-white/5">
                  <span className="text-zinc-500">Exchange Open Interest</span>
                  <span className="text-zinc-300">+4.8% (New Capital Entering)</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-zinc-500">Crowd Vulnerability</span>
                  <span className="text-amber-400 font-bold">High Short Squeeze Risk</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: BREAKING CATALYSTS & NEWS WIRE */}
        {activeSubTab === "catalysts" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase text-zinc-400">Economic Catalysts</span>
              <button
                onClick={() => setFilterImpact(filterImpact === "high" ? "all" : "high")}
                className={`px-2 py-0.5 rounded text-[8.5px] font-bold transition-all border ${
                  filterImpact === "high"
                    ? "bg-rose-500/20 border-rose-500/30 text-rose-300"
                    : "bg-white/5 border-white/10 text-zinc-400"
                }`}
              >
                {filterImpact === "high" ? "HIGH IMPACT ONLY" : "ALL WIRE"}
              </button>
            </div>

            {filteredNews.length > 0 ? (
              <div className="space-y-1.5 max-h-[260px] overflow-y-auto pr-1">
                {filteredNews.map((n, idx) => (
                  <div
                    key={n.id || idx}
                    className="p-2.5 rounded-xl bg-black/30 border border-white/5 hover:border-white/10 transition-colors flex flex-col gap-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[8.5px] font-bold text-rose-400 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                        {n.source || "FOREX WIRE"} · {n.impact?.toUpperCase() || "HIGH"}
                      </span>
                      <span className="text-[8px] text-zinc-500">
                        {n.time ? new Date(n.time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Recent"}
                      </span>
                    </div>
                    <p className="text-zinc-200 font-sans text-[10px] leading-snug line-clamp-2">
                      {n.title}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-zinc-500 font-mono text-[10px]">
                No breaking news events on current filter.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
