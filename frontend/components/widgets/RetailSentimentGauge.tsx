"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Users,
  Loader2,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  RefreshCw,
  Flame,
  ShieldAlert,
} from "lucide-react";
import { motion } from "framer-motion";
import { getBackendUrl, fetchWithAuth } from "@/lib/utils";

const PAIRS = ["XAUUSD", "EURUSD", "GBPUSD", "USDJPY", "US30", "BTCUSD"];

interface PairSentiment {
  symbol: string;
  long_pct: number;
  short_pct: number;
  source: string;
}

export function RetailSentimentGauge() {
  const [selectedSymbol, setSelectedSymbol] = useState("XAUUSD");
  const [allSentiments, setAllSentiments] = useState<Record<string, PairSentiment>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAllSentiments = useCallback(async () => {
    try {
      const results: Record<string, PairSentiment> = {};
      await Promise.all(
        PAIRS.map(async (sym) => {
          try {
            const res = await fetchWithAuth(
              `${getBackendUrl()}/api/bridge/api/sentiment?symbol=${sym}`
            );
            if (res.ok) {
              const data = await res.json();
              if (data.success) {
                const long = Number(data.long_pct || 50);
                results[sym] = {
                  symbol: sym,
                  long_pct: long,
                  short_pct: Number((100 - long).toFixed(1)),
                  source: data.source || "Broker Order Book",
                };
              }
            }
          } catch (_) {}
        })
      );

      if (Object.keys(results).length > 0) {
        setAllSentiments(results);
      }
    } catch (e) {
      console.error("Sentiment fetch error:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAllSentiments();
    const timer = setInterval(fetchAllSentiments, 30000); // 30 sec auto-refresh
    return () => clearInterval(timer);
  }, [fetchAllSentiments]);

  const activeData = allSentiments[selectedSymbol] || {
    symbol: selectedSymbol,
    long_pct: 50,
    short_pct: 50,
    source: "Connecting to broker...",
  };

  const longPct = activeData.long_pct;
  const shortPct = activeData.short_pct;
  const isExtremeLong = longPct >= 70;
  const isExtremeShort = shortPct >= 70;
  const isExtreme = isExtremeLong || isExtremeShort;

  return (
    <div className="rounded-xl border border-white/[0.08] bg-[#101015] p-5 flex flex-col font-mono relative overflow-hidden space-y-5">
      {/* ── Top Header ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Retail Sentiment Ratios
            </h3>
            <p className="text-[8.5px] uppercase tracking-wider text-zinc-500">
              Live Order Book Positioning
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            setRefreshing(true);
            fetchAllSentiments();
          }}
          disabled={refreshing}
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-white/10 hover:border-white/20 text-[9px] text-zinc-400 hover:text-white transition-all disabled:opacity-40"
        >
          <RefreshCw className={`w-3 h-3 ${refreshing ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      {/* ── Pair Selector Chips ── */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
        {PAIRS.map((sym) => {
          const symData = allSentiments[sym];
          const isSelected = sym === selectedSymbol;
          const isCrowded =
            symData && (symData.long_pct >= 70 || symData.short_pct >= 70);

          return (
            <button
              key={sym}
              onClick={() => setSelectedSymbol(sym)}
              className={`p-2 rounded-lg border text-left transition-all relative ${
                isSelected
                  ? "bg-white/15 border-white/30 text-white shadow-sm"
                  : "bg-black/30 border-white/[0.06] text-zinc-400 hover:text-white hover:border-white/15"
              }`}
            >
              <div className="flex items-center justify-between text-[10px] font-bold">
                <span>{sym}</span>
                {isCrowded && (
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                )}
              </div>
              <div className="text-[8.5px] mt-1 text-zinc-500 tabular-nums">
                {symData ? (
                  <span className={symData.long_pct > 50 ? "text-[#20e0b2]" : "text-[#ff5c73]"}>
                    {symData.long_pct}% L
                  </span>
                ) : (
                  "..."
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* ── Active Symbol Main Gauge ── */}
      <div className="rounded-xl border border-white/[0.06] bg-black/40 p-4 space-y-4 relative">
        {loading && (
          <div className="absolute inset-0 z-20 flex justify-center items-center rounded-xl backdrop-blur-sm bg-black/40">
            <Loader2 className="w-5 h-5 animate-spin text-[#20e0b2]" />
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-black text-white">{selectedSymbol}</span>
            <span className="text-[9px] px-2 py-0.5 rounded bg-white/10 text-zinc-300 font-bold uppercase">
              {activeData.source}
            </span>
          </div>

          {/* Extreme Warning Badge */}
          {isExtreme && (
            <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 text-amber-400 text-[8.5px] font-black uppercase tracking-wider animate-pulse">
              <AlertTriangle className="w-2.5 h-2.5" />
              <span>Extreme Crowding ({isExtremeLong ? "Long" : "Short"})</span>
            </div>
          )}
        </div>

        {/* Big Percentage Counters */}
        <div className="flex justify-between items-end">
          <div>
            <div className="text-[9px] font-bold uppercase tracking-widest text-[#20e0b2]">
              Retail Buyers
            </div>
            <div className="text-2xl font-black text-[#20e0b2] tabular-nums mt-0.5">
              {longPct.toFixed(1)}%
            </div>
          </div>
          <div className="text-right">
            <div className="text-[9px] font-bold uppercase tracking-widest text-[#ff5c73]">
              Retail Sellers
            </div>
            <div className="text-2xl font-black text-[#ff5c73] tabular-nums mt-0.5">
              {shortPct.toFixed(1)}%
            </div>
          </div>
        </div>

        {/* Bi-Directional Animated Bar */}
        <div className="h-3.5 w-full rounded-full flex overflow-hidden border border-white/10 bg-black">
          <motion.div
            initial={{ width: "50%" }}
            animate={{ width: `${longPct}%` }}
            transition={{ type: "spring", stiffness: 60 }}
            className="h-full bg-[#20e0b2] relative"
          />
          <motion.div
            initial={{ width: "50%" }}
            animate={{ width: `${shortPct}%` }}
            transition={{ type: "spring", stiffness: 60 }}
            className="h-full bg-[#ff5c73] relative"
          />
        </div>

        {/* Contrarian Signal Output */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pt-2 border-t border-white/[0.05] text-[9.5px] gap-2">
          <div>
            <span className="text-zinc-500 uppercase tracking-wider">Institutional Bias: </span>
            <span
              className={`font-black uppercase tracking-wider ${
                longPct > 55
                  ? "text-rose-400"
                  : shortPct > 55
                  ? "text-emerald-400"
                  : "text-zinc-300"
              }`}
            >
              {longPct >= 70
                ? "⚡ High Liquidity Fade: Look for Short Sweeps"
                : shortPct >= 70
                ? "⚡ High Liquidity Fade: Look for Long Bounces"
                : longPct > 55
                ? "Slight Bearish Fade Bias"
                : shortPct > 55
                ? "Slight Bullish Fade Bias"
                : "Balanced / Neutral Positioning"}
            </span>
          </div>
          <span className="text-[8px] text-zinc-600">Updated: Real-Time Stream</span>
        </div>
      </div>
    </div>
  );
}
