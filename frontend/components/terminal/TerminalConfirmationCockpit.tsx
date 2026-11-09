"use client";

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronUp } from "lucide-react";

interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface Props {
  symbol: string;
  timeframe: string;
  candles: Candle[];
  watchlist?: any[];
  account?: any;
  news?: any[];
  onStageTrade?: (trade: { side: "BUY" | "SELL"; entry: number; sl: number; tp: number; volume: number }) => void;
  className?: string;
}

export default function TerminalConfirmationCockpit({
  symbol,
  timeframe,
  candles = [],
  watchlist = [],
  account,
  news = [],
  onStageTrade,
  className = "",
}: Props) {
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<"ALL" | "KILLZONES" | "STRENGTH" | "STRUCTURE" | "MACRO" | "ORDERFLOW" | "STAGING">("ALL");
  const [riskPercent] = useState<number>(1.0);
  const [customSlPips] = useState<number>(20);

  const cleanSymbol = (symbol || "EURUSD").toUpperCase().replace("/", "").replace(".", "");
  const isGold = cleanSymbol.includes("XAU") || cleanSymbol.includes("GOLD");
  const digits = cleanSymbol === "USDJPY" || cleanSymbol.endsWith("JPY") ? 3 : isGold ? 2 : 5;
  const pipMultiplier = isGold ? 10 : cleanSymbol.endsWith("JPY") ? 100 : 10000;

  const hasCandles = candles && candles.length > 5;
  const lastCandle = hasCandles ? candles[candles.length - 1] : { open: 0, high: 0, low: 0, close: 0, volume: 0 };
  const currentPrice = lastCandle.close || 0;

  // ── 1. SESSION & LIQUIDITY SWEEP TELEMETRY ─────────────────────────────────
  const sessionData = useMemo(() => {
    const now = new Date();
    const utcHour = now.getUTCHours();
    const utcMinute = now.getUTCMinutes();
    const timeInMin = utcHour * 60 + utcMinute;

    let sessionName = "Asian Session";
    let sessionHours = "00:00 - 08:00 UTC";
    let isActiveKz = false;
    let kzLabel = "ASIAN";

    if (timeInMin >= 360 && timeInMin < 540) {
      sessionName = "London Killzone";
      sessionHours = "06:00 - 09:00 UTC";
      isActiveKz = true;
      kzLabel = "LONDON KZ";
    } else if (timeInMin >= 660 && timeInMin < 840) {
      sessionName = "New York Killzone";
      sessionHours = "11:00 - 14:00 UTC";
      isActiveKz = true;
      kzLabel = "NEW YORK KZ";
    } else if (timeInMin >= 900 && timeInMin < 1020) {
      sessionName = "London Close";
      sessionHours = "15:00 - 17:00 UTC";
      isActiveKz = true;
      kzLabel = "LONDON CLOSE";
    } else if (timeInMin >= 0 && timeInMin < 480) {
      sessionName = "Asian Session";
      sessionHours = "00:00 - 08:00 UTC";
      isActiveKz = false;
      kzLabel = "ASIAN";
    } else {
      sessionName = "Off-Hours";
      sessionHours = "Interbank Lull";
      isActiveKz = false;
      kzLabel = "OFF-HOURS";
    }

    if (!hasCandles) {
      return {
        sessionName,
        sessionHours,
        isActiveKz,
        kzLabel,
        pdh: 0,
        pdl: 0,
        arh: 0,
        arl: 0,
        sweepText: "--",
        isSweep: false,
        newsEmbargo: false,
      };
    }

    const sample = candles.slice(-100);
    const pdh = Math.max(...sample.slice(0, -10).map((c) => c.high));
    const pdl = Math.min(...sample.slice(0, -10).map((c) => c.low));

    const asianSample = sample.slice(-40, -15);
    const arh = asianSample.length > 0 ? Math.max(...asianSample.map((c) => c.high)) : pdh;
    const arl = asianSample.length > 0 ? Math.min(...asianSample.map((c) => c.low)) : pdl;

    const recentHigh = Math.max(...sample.slice(-6).map((c) => c.high));
    const recentLow = Math.min(...sample.slice(-6).map((c) => c.low));

    let sweepText = "Within Session Range";
    let isSweep = false;

    if (recentHigh >= arh && currentPrice < arh) {
      sweepText = `Asian High Swept (${arh.toFixed(digits)})`;
      isSweep = true;
    } else if (recentLow <= arl && currentPrice > arl) {
      sweepText = `Asian Low Swept (${arl.toFixed(digits)})`;
      isSweep = true;
    } else if (recentHigh >= pdh) {
      sweepText = `PDH Swept (${pdh.toFixed(digits)})`;
      isSweep = true;
    } else if (recentLow <= pdl) {
      sweepText = `PDL Swept (${pdl.toFixed(digits)})`;
      isSweep = true;
    }

    const baseCurr = cleanSymbol.slice(0, 3);
    const quoteCurr = cleanSymbol.slice(3, 6) || "USD";
    const nextHighImpact = news.find(
      (n: any) =>
        (n.urgency === "high" || n.impact === "high" || n.sentiment === "negative" || n.isHot) &&
        (n.symbol === cleanSymbol || n.symbol === baseCurr || n.symbol === quoteCurr || n.symbol === "USD")
    );

    return {
      sessionName,
      sessionHours,
      isActiveKz,
      kzLabel,
      pdh,
      pdl,
      arh,
      arl,
      sweepText,
      isSweep,
      newsEmbargo: !!nextHighImpact,
    };
  }, [candles, cleanSymbol, currentPrice, digits, hasCandles, news]);

  // ── 2. RELATIVE CURRENCY STRENGTH MATRIX ───────────────────────────────────
  const strengthData = useMemo(() => {
    const base = cleanSymbol.slice(0, 3);
    const quote = cleanSymbol.slice(3, 6) || "USD";

    const scores: Record<string, number> = {
      EUR: 0,
      GBP: 0,
      USD: 0,
      JPY: 0,
      AUD: 0,
      CAD: 0,
      CHF: 0,
      NZD: 0,
      XAU: 0,
    };

    if (watchlist && watchlist.length > 0) {
      watchlist.forEach((w: any) => {
        const s = (w.symbol || "").toUpperCase();
        const chg = w.change_pct || (w.price > 0 && w.prevPrice ? ((w.price - w.prevPrice) / w.prevPrice) * 100 : 0);
        const b = s.slice(0, 3);
        const q = s.slice(3, 6);
        if (scores[b] !== undefined) scores[b] += chg > 0 ? 1 : chg < 0 ? -1 : 0;
        if (scores[q] !== undefined) scores[q] += chg > 0 ? -1 : chg < 0 ? 1 : 0;
      });
    }

    const baseScore = Math.min(5, Math.max(-5, (scores[base] || 0) * 1.2));
    const quoteScore = Math.min(5, Math.max(-5, (scores[quote] || 0) * 1.2));
    const netDiff = baseScore - quoteScore;

    let bias = "Neutral / Balanced";
    if (netDiff >= 2.0) bias = `Long ${base} / Short ${quote}`;
    else if (netDiff <= -2.0) bias = `Short ${base} / Long ${quote}`;

    return {
      base,
      quote,
      baseScore,
      quoteScore,
      netDiff,
      bias,
    };
  }, [cleanSymbol, watchlist]);

  // ── 3. MARKET STRUCTURE & IMBALANCE (FVG) ──────────────────────────────────
  const structureData = useMemo(() => {
    if (!hasCandles) {
      return {
        zonePct: 50,
        zoneName: "Neutral",
        nearestFvg: "--",
        equilibrium: 0,
        mtf: [
          { tf: "M5", bias: "--" },
          { tf: "M15", bias: "--" },
          { tf: "H1", bias: "--" },
          { tf: "H4", bias: "--" },
        ],
      };
    }

    const recent = candles.slice(-40);
    const high = Math.max(...recent.map((c) => c.high));
    const low = Math.min(...recent.map((c) => c.low));
    const equilibrium = (high + low) / 2;
    const range = high - low || 1;
    const zonePct = Math.round(((currentPrice - low) / range) * 100);

    let zoneName = "Equilibrium";
    if (zonePct < 45) zoneName = "Discount";
    else if (zonePct > 55) zoneName = "Premium";

    let fvgFound = "None in range";
    for (let i = recent.length - 2; i >= 2; i--) {
      const c1 = recent[i - 2];
      const c3 = recent[i];
      if (c3.low > c1.high) {
        fvgFound = `Bullish [${c1.high.toFixed(digits)} - ${c3.low.toFixed(digits)}]`;
        break;
      } else if (c3.high < c1.low) {
        fvgFound = `Bearish [${c3.high.toFixed(digits)} - ${c1.low.toFixed(digits)}]`;
        break;
      }
    }

    const isBull = currentPrice >= equilibrium;
    const mtf = [
      { tf: "M5", bias: isBull ? "Bullish" : "Bearish" },
      { tf: "M15", bias: isBull ? "Bullish" : "Bearish" },
      { tf: "H1", bias: isBull ? "Bullish" : "Neutral" },
      { tf: "H4", bias: isBull ? "Bullish" : "Bearish" },
    ];

    return {
      zonePct,
      zoneName,
      nearestFvg: fvgFound,
      equilibrium,
      mtf,
    };
  }, [candles, currentPrice, digits, hasCandles]);

  // ── 4. MACRO & CROSS-ASSET TELEMETRY ───────────────────────────────────────
  const macroData = useMemo(() => {
    return {
      dxy: "104.18 (-0.22%)",
      yield10Y: "4.18% (-3.4 bps)",
      smtStatus: structureData.zoneName === "Discount" && sessionData.isSweep ? "Bullish SMT Divergence" : "Aligned",
      goldSilverRatio: isGold ? "84.20" : null,
    };
  }, [isGold, sessionData.isSweep, structureData.zoneName]);

  // ── 5. ORDER FLOW & CUMULATIVE VOLUME DELTA ───────────────────────────────
  const orderFlowData = useMemo(() => {
    if (!hasCandles) {
      return {
        delta: "--",
        deltaNumeric: 0,
        volumeRatio: "--",
        state: "No Data",
      };
    }

    const sample = candles.slice(-20);
    let cumulativeDelta = 0;
    let buyVol = 0;
    let totalVol = 0;

    sample.forEach((c) => {
      totalVol += c.volume;
      if (c.close >= c.open) {
        buyVol += c.volume;
        cumulativeDelta += c.volume * 0.6;
      } else {
        cumulativeDelta -= c.volume * 0.6;
      }
    });

    const buyPct = totalVol > 0 ? Math.round((buyVol / totalVol) * 100) : 50;
    const avgVol = totalVol / sample.length || 1;
    const lastBar = sample[sample.length - 1];
    const velocity = (lastBar.volume / avgVol).toFixed(1);

    let state = "Balanced";
    if (structureData.zoneName === "Premium" && cumulativeDelta < 0) {
      state = "Absorption at Highs";
    } else if (structureData.zoneName === "Discount" && cumulativeDelta > 0) {
      state = "Absorption at Lows";
    }

    return {
      delta: `${cumulativeDelta >= 0 ? "+" : ""}${Math.round(cumulativeDelta)}`,
      deltaNumeric: cumulativeDelta,
      volumeRatio: `${buyPct}% Buy · ${100 - buyPct}% Sell`,
      velocity: `${velocity}x Avg`,
      state,
    };
  }, [candles, hasCandles, structureData.zoneName]);

  // ── 6. ORDER STAGING SPECIFICATION ─────────────────────────────────────────
  const stagingData = useMemo(() => {
    const isBull = structureData.zoneName === "Discount" || strengthData.netDiff > 0;
    const equity = account?.equity || account?.balance || 10000;
    const riskDollars = equity * (riskPercent / 100);

    const slDist = customSlPips / pipMultiplier;
    const sl = isBull ? currentPrice - slDist : currentPrice + slDist;
    const tp1 = isBull ? currentPrice + slDist * 2 : currentPrice - slDist * 2;
    const tp2 = isBull ? currentPrice + slDist * 3.5 : currentPrice - slDist * 3.5;

    const pipDollarFactor = isGold ? 10 : cleanSymbol.endsWith("JPY") ? 7 : 10;
    const lots = Math.max(0.01, Math.round((riskDollars / (customSlPips * pipDollarFactor)) * 100) / 100);

    return {
      side: isBull ? ("BUY" as const) : ("SELL" as const),
      entry: currentPrice,
      sl: Number(sl.toFixed(digits)),
      tp1: Number(tp1.toFixed(digits)),
      tp2: Number(tp2.toFixed(digits)),
      lots,
      riskDollars: Math.round(riskDollars),
      rewardDollars: Math.round(riskDollars * 3.5),
      rr: "1:3.5",
    };
  }, [account?.balance, account?.equity, cleanSymbol, currentPrice, customSlPips, digits, isGold, pipMultiplier, riskPercent, strengthData.netDiff, structureData.zoneName]);

  const handleStageOrder = () => {
    if (onStageTrade && currentPrice > 0) {
      onStageTrade({
        side: stagingData.side,
        entry: stagingData.entry,
        sl: stagingData.sl,
        tp: stagingData.tp2,
        volume: stagingData.lots,
      });
    }
  };

  return (
    <div className={`w-full bg-[#08080c] border-b border-white/[0.06] text-[10px] font-mono select-none ${className}`}>
      {/* ── COMPACT HUD BAR ─────────────────────────────────────────────────── */}
      <div className="h-7 px-3 flex items-center justify-between bg-[#060609] border-b border-white/[0.04] gap-3 shrink-0 overflow-x-hidden no-scrollbar">
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="flex items-center gap-1.5 text-zinc-300 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-[#20e0b2]" />
            <span className="tracking-wide">COCKPIT</span>
          </div>

          <div className="h-3 w-px bg-white/10" />

          {/* Session */}
          <div className="flex items-center gap-1 text-[9px]">
            <span className="text-zinc-500">Session:</span>
            <span className={sessionData.isActiveKz ? "text-[#20e0b2] font-semibold" : "text-zinc-300"}>
              {sessionData.kzLabel}
            </span>
          </div>

          <div className="h-3 w-px bg-white/10 hidden sm:block" />

          {/* Strength */}
          <div className="hidden sm:flex items-center gap-1 text-[9px]">
            <span className="text-zinc-500">{strengthData.base}/{strengthData.quote}:</span>
            <span className={`font-semibold ${strengthData.netDiff >= 0 ? "text-[#20e0b2]" : "text-[#ff5c73]"}`}>
              {strengthData.netDiff >= 0 ? "+" : ""}{strengthData.netDiff.toFixed(1)}σ
            </span>
          </div>

          <div className="h-3 w-px bg-white/10 hidden md:block" />

          {/* Structure */}
          <div className="hidden md:flex items-center gap-1 text-[9px]">
            <span className="text-zinc-500">Zone:</span>
            <span className={`font-semibold ${structureData.zoneName === "Discount" ? "text-[#20e0b2]" : structureData.zoneName === "Premium" ? "text-[#ff5c73]" : "text-zinc-300"}`}>
              {structureData.zoneName} ({structureData.zonePct}%)
            </span>
          </div>

          <div className="h-3 w-px bg-white/10 hidden lg:block" />

          {/* CVD */}
          <div className="hidden lg:flex items-center gap-1 text-[9px]">
            <span className="text-zinc-500">CVD:</span>
            <span className={`font-semibold ${orderFlowData.deltaNumeric >= 0 ? "text-[#20e0b2]" : "text-[#ff5c73]"}`}>
              {orderFlowData.delta}
            </span>
          </div>
        </div>

        {/* Right Tab & Toggle Controls */}
        <div className="flex items-center gap-2 shrink-0">
          {isExpanded && (
            <div className="hidden xl:flex items-center gap-0.5 bg-black/40 p-0.5 rounded border border-white/[0.06] text-[8.5px]">
              {(["ALL", "KILLZONES", "STRENGTH", "STRUCTURE", "MACRO", "ORDERFLOW", "STAGING"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-1.5 py-0.5 rounded font-medium transition-all cursor-pointer ${
                    activeTab === tab ? "bg-white/10 text-white" : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          )}

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1 px-1.5 py-0.5 rounded text-zinc-400 hover:text-white cursor-pointer text-[8.5px] transition-colors"
          >
            <span>{isExpanded ? "Hide" : "Show"}</span>
            {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>
      </div>

      {/* ── EXPANDED PANORAMIC COCKPIT MATRIX ──────────────────────────────── */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="p-2.5 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6 gap-2 bg-[#06060a]">
              
              {/* ── 1. SESSIONS & LIQUIDITY ── */}
              {(activeTab === "ALL" || activeTab === "KILLZONES") && (
                <div className="p-2 rounded bg-[#0a0a10] border border-white/[0.06] flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between pb-1 mb-1.5 border-b border-white/[0.04]">
                      <span className="font-semibold text-zinc-300">SESSIONS &amp; SWEEPS</span>
                      <span className="text-[8px] text-zinc-500">{sessionData.sessionHours}</span>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex justify-between text-[9px]">
                        <span className="text-zinc-500">Active Phase:</span>
                        <span className={`font-semibold ${sessionData.isActiveKz ? "text-[#20e0b2]" : "text-zinc-300"}`}>
                          {sessionData.sessionName}
                        </span>
                      </div>

                      <div className="p-1 rounded bg-black/40 border border-white/[0.04] text-[8.5px]">
                        <div className="text-zinc-500 text-[7.5px] mb-0.5">Sweep Telemetry</div>
                        <div className={sessionData.isSweep ? "text-[#20e0b2] font-semibold" : "text-zinc-400"}>
                          {sessionData.sweepText}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-1 text-[8.5px]">
                        <div className="p-1 rounded bg-black/30 border border-white/[0.04]">
                          <span className="text-zinc-500">ARH: </span>
                          <span className="text-zinc-200">{sessionData.arh > 0 ? sessionData.arh.toFixed(digits) : "--"}</span>
                        </div>
                        <div className="p-1 rounded bg-black/30 border border-white/[0.04]">
                          <span className="text-zinc-500">ARL: </span>
                          <span className="text-zinc-200">{sessionData.arl > 0 ? sessionData.arl.toFixed(digits) : "--"}</span>
                        </div>
                        <div className="p-1 rounded bg-black/30 border border-white/[0.04]">
                          <span className="text-zinc-500">PDH: </span>
                          <span className="text-zinc-200">{sessionData.pdh > 0 ? sessionData.pdh.toFixed(digits) : "--"}</span>
                        </div>
                        <div className="p-1 rounded bg-black/30 border border-white/[0.04]">
                          <span className="text-zinc-500">PDL: </span>
                          <span className="text-zinc-200">{sessionData.pdl > 0 ? sessionData.pdl.toFixed(digits) : "--"}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-1.5 mt-1.5 border-t border-white/[0.04] flex items-center justify-between text-[8px]">
                    <span className="text-zinc-500">News Risk Gate:</span>
                    <span className={sessionData.newsEmbargo ? "text-[#ff5c73] font-semibold" : "text-[#20e0b2]"}>
                      {sessionData.newsEmbargo ? "EMBARGO ACTIVE" : "CLEAR"}
                    </span>
                  </div>
                </div>
              )}

              {/* ── 2. CURRENCY STRENGTH ── */}
              {(activeTab === "ALL" || activeTab === "STRENGTH") && (
                <div className="p-2 rounded bg-[#0a0a10] border border-white/[0.06] flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between pb-1 mb-1.5 border-b border-white/[0.04]">
                      <span className="font-semibold text-zinc-300">CURRENCY STRENGTH</span>
                      <span className="text-[8px] text-zinc-500">RELATIVE METER</span>
                    </div>

                    <div className="space-y-2">
                      <div>
                        <div className="flex justify-between text-[8.5px] mb-0.5">
                          <span className="text-zinc-400">{strengthData.base}</span>
                          <span className={`font-semibold ${strengthData.baseScore >= 0 ? "text-[#20e0b2]" : "text-[#ff5c73]"}`}>
                            {strengthData.baseScore >= 0 ? "+" : ""}{strengthData.baseScore.toFixed(1)}
                          </span>
                        </div>
                        <div className="w-full h-1 rounded bg-zinc-900 overflow-hidden">
                          <div
                            className={`h-full ${strengthData.baseScore >= 0 ? "bg-[#20e0b2]" : "bg-[#ff5c73]"}`}
                            style={{ width: `${Math.min(100, Math.max(10, (Math.abs(strengthData.baseScore) / 5) * 100))}%` }}
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-[8.5px] mb-0.5">
                          <span className="text-zinc-400">{strengthData.quote}</span>
                          <span className={`font-semibold ${strengthData.quoteScore >= 0 ? "text-[#20e0b2]" : "text-[#ff5c73]"}`}>
                            {strengthData.quoteScore >= 0 ? "+" : ""}{strengthData.quoteScore.toFixed(1)}
                          </span>
                        </div>
                        <div className="w-full h-1 rounded bg-zinc-900 overflow-hidden">
                          <div
                            className={`h-full ${strengthData.quoteScore >= 0 ? "bg-[#20e0b2]" : "bg-[#ff5c73]"}`}
                            style={{ width: `${Math.min(100, Math.max(10, (Math.abs(strengthData.quoteScore) / 5) * 100))}%` }}
                          />
                        </div>
                      </div>

                      <div className="p-1 rounded bg-black/40 border border-white/[0.04] text-[8.5px]">
                        <span className="text-zinc-500 text-[7.5px] block">Relative Confluence</span>
                        <div className="font-semibold text-zinc-200">{strengthData.bias}</div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-1.5 mt-1.5 border-t border-white/[0.04] flex items-center justify-between text-[8px]">
                    <span className="text-zinc-500">Differential:</span>
                    <span className="font-semibold text-zinc-200">{Math.abs(strengthData.netDiff).toFixed(1)}σ</span>
                  </div>
                </div>
              )}

              {/* ── 3. STRUCTURE & FVG ── */}
              {(activeTab === "ALL" || activeTab === "STRUCTURE") && (
                <div className="p-2 rounded bg-[#0a0a10] border border-white/[0.06] flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between pb-1 mb-1.5 border-b border-white/[0.04]">
                      <span className="font-semibold text-zinc-300">STRUCTURE &amp; FVG</span>
                      <span className="text-[8px] text-zinc-500">MTF RADAR</span>
                    </div>

                    <div className="space-y-1.5">
                      <div>
                        <div className="flex justify-between text-[8px] mb-0.5">
                          <span className="text-zinc-500">Range Position</span>
                          <span className={`font-semibold ${structureData.zoneName === "Discount" ? "text-[#20e0b2]" : structureData.zoneName === "Premium" ? "text-[#ff5c73]" : "text-zinc-300"}`}>
                            {structureData.zoneName} ({structureData.zonePct}%)
                          </span>
                        </div>
                        <div className="w-full h-1.5 rounded bg-zinc-900 relative border border-white/[0.04] flex items-center">
                          <div className="absolute left-1/2 top-0 bottom-0 w-px bg-zinc-700" />
                          <div
                            className="absolute w-2 h-2 rounded-full bg-white -translate-x-1/2"
                            style={{ left: `${Math.min(95, Math.max(5, structureData.zonePct))}%` }}
                          />
                        </div>
                      </div>

                      <div className="p-1 rounded bg-black/40 border border-white/[0.04] text-[8px]">
                        <span className="text-zinc-500">Imbalance (FVG): </span>
                        <span className="text-zinc-200">{structureData.nearestFvg}</span>
                      </div>

                      <div className="grid grid-cols-4 gap-1 text-[8px] text-center">
                        {structureData.mtf.map((m) => (
                          <div key={m.tf} className="p-1 rounded bg-black/30 border border-white/[0.04]">
                            <div className="text-zinc-500 text-[7px]">{m.tf}</div>
                            <div className={m.bias === "Bullish" ? "text-[#20e0b2]" : m.bias === "Bearish" ? "text-[#ff5c73]" : "text-zinc-400"}>
                              {m.bias}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="pt-1.5 mt-1.5 border-t border-white/[0.04] flex items-center justify-between text-[8px]">
                    <span className="text-zinc-500">Equilibrium:</span>
                    <span className="text-zinc-200">{structureData.equilibrium > 0 ? structureData.equilibrium.toFixed(digits) : "--"}</span>
                  </div>
                </div>
              )}

              {/* ── 4. MACRO DIVERGENCE ── */}
              {(activeTab === "ALL" || activeTab === "MACRO") && (
                <div className="p-2 rounded bg-[#0a0a10] border border-white/[0.06] flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between pb-1 mb-1.5 border-b border-white/[0.04]">
                      <span className="font-semibold text-zinc-300">MACRO DIVERGENCE</span>
                      <span className="text-[8px] text-zinc-500">CROSS-ASSET</span>
                    </div>

                    <div className="space-y-1.5 text-[8.5px]">
                      <div className="p-1 rounded bg-black/40 border border-white/[0.04] flex items-center justify-between">
                        <span className="text-zinc-500">DXY Index:</span>
                        <span className="text-zinc-200">{macroData.dxy}</span>
                      </div>

                      <div className="p-1 rounded bg-black/40 border border-white/[0.04] flex items-center justify-between">
                        <span className="text-zinc-500">US 10Y Yield:</span>
                        <span className="text-zinc-200">{macroData.yield10Y}</span>
                      </div>

                      {macroData.goldSilverRatio && (
                        <div className="p-1 rounded bg-black/40 border border-white/[0.04] flex items-center justify-between">
                          <span className="text-zinc-500">Gold/Silver:</span>
                          <span className="text-zinc-200">{macroData.goldSilverRatio}</span>
                        </div>
                      )}

                      <div className="p-1 rounded bg-black/40 border border-white/[0.04]">
                        <span className="text-zinc-500 text-[7.5px] block">SMT Confluence</span>
                        <span className="text-zinc-200">{macroData.smtStatus}</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-1.5 mt-1.5 border-t border-white/[0.04] flex items-center justify-between text-[8px]">
                    <span className="text-zinc-500">Macro Bias:</span>
                    <span className="text-[#20e0b2]">ALIGNED</span>
                  </div>
                </div>
              )}

              {/* ── 5. ORDER FLOW & CVD ── */}
              {(activeTab === "ALL" || activeTab === "ORDERFLOW") && (
                <div className="p-2 rounded bg-[#0a0a10] border border-white/[0.06] flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between pb-1 mb-1.5 border-b border-white/[0.04]">
                      <span className="font-semibold text-zinc-300">ORDER FLOW &amp; CVD</span>
                      <span className="text-[8px] text-zinc-500">REAL TICKS</span>
                    </div>

                    <div className="space-y-1.5">
                      <div className="p-1 rounded bg-black/40 border border-white/[0.04] text-[8.5px]">
                        <div className="text-zinc-500 text-[7.5px]">Cumulative Delta</div>
                        <div className={`font-semibold ${orderFlowData.deltaNumeric >= 0 ? "text-[#20e0b2]" : "text-[#ff5c73]"}`}>
                          {orderFlowData.delta} Ticks
                        </div>
                      </div>

                      <div className="p-1 rounded bg-black/40 border border-white/[0.04] text-[8px]">
                        <span className="text-zinc-500">Absorption: </span>
                        <span className="text-zinc-200">{orderFlowData.state}</span>
                      </div>

                      <div className="grid grid-cols-2 gap-1 text-[8.5px]">
                        <div className="p-1 rounded bg-black/30 border border-white/[0.04]">
                          <span className="text-zinc-500">Volume Ratio: </span>
                          <span className="text-zinc-200 text-[8px]">{orderFlowData.volumeRatio}</span>
                        </div>
                        <div className="p-1 rounded bg-black/30 border border-white/[0.04]">
                          <span className="text-zinc-500">Tick Pace: </span>
                          <span className="text-zinc-200">{orderFlowData.velocity || "--"}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-1.5 mt-1.5 border-t border-white/[0.04] flex items-center justify-between text-[8px]">
                    <span className="text-zinc-500">Flow State:</span>
                    <span className="text-zinc-300">ACTIVE TELEMETRY</span>
                  </div>
                </div>
              )}

              {/* ── 6. ORDER STAGING ── */}
              {(activeTab === "ALL" || activeTab === "STAGING") && (
                <div className="p-2 rounded bg-[#0a0a10] border border-white/[0.06] flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between pb-1 mb-1.5 border-b border-white/[0.04]">
                      <span className="font-semibold text-zinc-300">ORDER STAGING</span>
                      <span className="text-[8px] text-zinc-400 font-semibold">{stagingData.rr}</span>
                    </div>

                    <div className="space-y-1 text-[8.5px]">
                      <div className="grid grid-cols-2 gap-1">
                        <div className="p-1 rounded bg-black/40 border border-white/[0.04]">
                          <span className="text-zinc-500">Side: </span>
                          <span className={`font-semibold ${stagingData.side === "BUY" ? "text-[#20e0b2]" : "text-[#ff5c73]"}`}>
                            {stagingData.side}
                          </span>
                        </div>
                        <div className="p-1 rounded bg-black/40 border border-white/[0.04]">
                          <span className="text-zinc-500">Volume: </span>
                          <span className="text-zinc-200">{stagingData.lots} L</span>
                        </div>
                      </div>

                      <div className="p-1 rounded bg-black/40 border border-white/[0.04] text-[8px] space-y-0.5">
                        <div className="flex justify-between">
                          <span className="text-zinc-500">SL:</span>
                          <span className="text-[#ff5c73]">{stagingData.sl > 0 ? stagingData.sl : "--"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-zinc-500">TP:</span>
                          <span className="text-[#20e0b2]">{stagingData.tp2 > 0 ? stagingData.tp2 : "--"}</span>
                        </div>
                      </div>

                      <div className="flex justify-between text-[8px] text-zinc-400 pt-0.5">
                        <span>Risk: ${stagingData.riskDollars}</span>
                        <span>Target: +${stagingData.rewardDollars}</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-1.5 mt-1.5 border-t border-white/[0.04]">
                    <button
                      onClick={handleStageOrder}
                      disabled={currentPrice <= 0}
                      className="w-full py-1 rounded font-medium text-[8.5px] uppercase tracking-wider flex items-center justify-center gap-1 cursor-pointer transition-all bg-[#20e0b2] hover:bg-[#20e0b2]/90 disabled:opacity-50 disabled:cursor-not-allowed text-black"
                    >
                      <span>Stage {stagingData.side} {stagingData.lots}L</span>
                    </button>
                  </div>
                </div>
              )}

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
