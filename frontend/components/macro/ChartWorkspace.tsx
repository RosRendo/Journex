"use client";
import React, { useState, useEffect } from "react";
import { 
  Layers, 
  Activity, 
  RotateCcw, 
  Clock, 
  CheckCircle2, 
  Circle,
  ExternalLink,
  Zap,
  TrendingUp,
  TrendingDown
} from "lucide-react";
import Link from "next/link";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import TradingViewWidget from "@/components/ui/TradingViewWidget";

interface WatchlistPair {
  symbol: string;
  score: number;
  bias: string;
  grade?: string;
  price?: number;
  change?: string;
}

interface ChartWorkspaceProps {
  pair: string;
  currentPrice: number;
  changePct: number;
  isBullish: boolean;
  chartMode: "tradingview" | "mt5";
  setChartMode: (mode: "tradingview" | "mt5") => void;
  tvInterval: "15" | "60" | "240" | "D";
  setTvInterval: (interval: "15" | "60" | "240" | "D") => void;
  timeframe: string;
  setTimeframe: (tf: string) => void;
  chartData: any[];
  chartLoading: boolean;
  watchlist: WatchlistPair[];
  confluenceScore?: number;
  rsiValue?: number;
  volatilityScore?: number;
}

// Cockpit Radial/Donut Gauge Component
function CockpitGauge({
  value,
  max = 100,
  label,
  subtext,
  color = "#20e0b2",
  dots
}: {
  value: number | string;
  max?: number;
  label: string;
  subtext: string;
  color?: string;
  dots?: boolean[];
}) {
  const numVal = typeof value === "number" ? value : parseFloat(value) || 50;
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(Math.max(numVal / max, 0), 1);
  const strokeDashoffset = circumference - progress * circumference;

  return (
    <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-[#121217] border border-white/8 hover:border-white/15 transition-all">
      {/* Donut Ring */}
      <div className="relative flex items-center justify-center w-20 h-20">
        <svg className="w-20 h-20 -rotate-90">
          <circle
            cx="40"
            cy="40"
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth="5"
          />
          <circle
            cx="40"
            cy="40"
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth="5"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-700 ease-out"
          />
        </svg>
        <div className="absolute flex flex-col items-center justify-center text-center">
          <span className="font-mono font-black text-sm text-white tracking-tight">
            {value}
            {typeof value === "number" && "%"}
          </span>
        </div>
      </div>

      {/* Label */}
      <span className="text-[10px] font-black uppercase tracking-wider text-zinc-100 mt-1">
        {label}
      </span>
      <span className="text-[8.5px] font-mono text-zinc-400 uppercase">
        {subtext}
      </span>

      {/* Optional Visual Dots / Checkmarks (e.g. for Confluence) */}
      {dots && (
        <div className="flex items-center gap-1 mt-2">
          {dots.map((d, i) => (
            <span
              key={i}
              className={`w-1.5 h-1.5 rounded-full ${d ? "bg-emerald-400" : "bg-zinc-700"}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function ChartWorkspace({
  pair,
  currentPrice,
  changePct,
  isBullish,
  chartMode,
  setChartMode,
  tvInterval,
  setTvInterval,
  timeframe,
  setTimeframe,
  chartData,
  chartLoading,
  watchlist,
  confluenceScore = 84,
  rsiValue = 61,
  volatilityScore = 32
}: ChartWorkspaceProps) {
  const chartColor = isBullish ? "#20e0b2" : "#ff5c73";

  return (
    <div className="w-full rounded-xl border border-white/10 bg-[#0c0c0f] overflow-hidden shadow-2xl font-mono text-[11px]">
      
      {/* ── TOOLBAR STRIP ── */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/5 bg-[#101014] flex-wrap gap-2">
        <div className="flex items-center gap-2">
          {/* Dual-Engine Mode Switcher */}
          <div className="flex items-center bg-black/40 p-0.5 rounded border border-white/10">
            <button
              onClick={() => setChartMode("tradingview")}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[9px] font-bold uppercase tracking-wider transition-all ${
                chartMode === "tradingview"
                  ? "bg-white/15 text-white shadow-sm"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              <Layers className="w-3 h-3 text-zinc-300" />
              TradingView Studio
            </button>
            <button
              onClick={() => setChartMode("mt5")}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[9px] font-bold uppercase tracking-wider transition-all ${
                chartMode === "mt5"
                  ? "bg-white/15 text-white shadow-sm"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              <Activity className="w-3 h-3 text-zinc-300" />
              MT5 Tick Curve
            </button>
          </div>

          <Link
            href="/trade-replay"
            className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 text-[9px] font-bold uppercase transition-colors"
          >
            <RotateCcw className="w-2.5 h-2.5 text-zinc-400" />
            Replay
          </Link>
        </div>

        {/* Watchlist Quick Switcher Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {watchlist.map((w) => {
            const active = w.symbol.toUpperCase() === pair.toUpperCase();
            return (
              <Link
                key={w.symbol}
                href={`/macro/${w.symbol}`}
                className={`px-2 py-0.5 rounded text-[9px] font-bold border transition-all ${
                  active
                    ? "bg-white/15 border-white/25 text-white"
                    : "bg-black/20 border-white/5 text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {w.symbol}
              </Link>
            );
          })}
        </div>
      </div>

      {/* ── 2-ZONE MIDDLE WORKSPACE: HUGE CHART (70%) + VISUAL COCKPIT (30%) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[500px]">
        
        {/* ② HUGE CHART ZONE (~70% of screen) */}
        <div className="lg:col-span-8 xl:col-span-9 w-full h-[500px] relative bg-[#09090c] border-b lg:border-b-0 lg:border-r border-white/5">
          {chartMode === "tradingview" ? (
            <div className="w-full h-full">
              <TradingViewWidget symbol={pair} interval={tvInterval} height={500} />
            </div>
          ) : (
            <div className="w-full h-full p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between text-[10px] text-zinc-400 border-b border-white/5 pb-2">
                <span>Broker Historical Curve &bull; {pair}</span>
                <span className="font-bold font-mono text-zinc-100">
                  {currentPrice > 0 ? (currentPrice < 500 ? currentPrice.toFixed(5) : currentPrice.toFixed(2)) : "---"}
                </span>
              </div>
              <div className="flex-1 w-full min-h-[420px] relative mt-2">
                {chartLoading ? (
                  <div className="absolute inset-0 flex items-center justify-center text-zinc-500">
                    Loading MT5 broker rates...
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="cockpitCurveGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={chartColor} stopOpacity={0.25} />
                          <stop offset="100%" stopColor={chartColor} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="time" hide />
                      <YAxis domain={["auto", "auto"]} hide />
                      <Tooltip
                        contentStyle={{
                          background: "#121217",
                          border: "1px solid rgba(255,255,255,0.1)",
                          borderRadius: "6px",
                          fontSize: "11px",
                          fontFamily: "monospace"
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="price"
                        stroke={chartColor}
                        strokeWidth={2}
                        fill="url(#cockpitCurveGrad)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ③ RIGHT SIDE = VISUAL COCKPIT (~30% of screen) */}
        <div className="lg:col-span-4 xl:col-span-3 bg-[#0d0d10] p-4 flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between border-b border-white/5 pb-2">
            <span className="text-[9px] uppercase font-black tracking-wider text-zinc-400">
              Visual Cockpit
            </span>
            <span className="text-[8px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 font-bold">
              LIVE
            </span>
          </div>

          {/* Vertical Stack of 4 Radial/Donut Gauges */}
          <div className="grid grid-cols-2 lg:grid-cols-1 gap-2.5 flex-1 justify-center">
            {/* GAUGE 1: BIAS */}
            <CockpitGauge
              value={isBullish ? 78 : 28}
              label="BIAS"
              subtext={isBullish ? "BULLISH (HH → HL)" : "BEARISH (LH → LL)"}
              color={isBullish ? "#20e0b2" : "#ff5c73"}
            />

            {/* GAUGE 2: CONFLUENCE */}
            <CockpitGauge
              value={confluenceScore}
              label="CONFLUENCE"
              subtext="6/8 CRITERIA MET"
              color="#20e0b2"
              dots={[true, true, true, true, true, true, false, false]}
            />

            {/* GAUGE 3: MOMENTUM */}
            <CockpitGauge
              value={rsiValue}
              label="MOMENTUM"
              subtext="RSI 14 EXPAN"
              color="#38bdf8"
            />

            {/* GAUGE 4: VOLATILITY */}
            <CockpitGauge
              value={volatilityScore}
              label="VOLATILITY"
              subtext="NORMAL REGIME"
              color="#a78bfa"
            />
          </div>

          <div className="pt-2 border-t border-white/5 text-[8.5px] text-zinc-500 flex justify-between">
            <span>Cockpit Telemetry</span>
            <span className="text-zinc-400 font-mono">1 glance state</span>
          </div>
        </div>
      </div>

      {/* ── MARKET CLOCK STRIP DIRECTLY BELOW CHART ── */}
      <div className="px-4 py-2 border-t border-white/5 bg-[#121217] flex flex-wrap items-center justify-between gap-3 text-[9.5px]">
        <div className="flex items-center gap-2">
          <Clock className="w-3 h-3 text-zinc-400" />
          <span className="text-zinc-400 uppercase font-bold text-[8.5px]">Market Clock:</span>
          <span className="text-white font-bold">London / NY Overlap</span>
          <span className="text-zinc-600">&bull;</span>
          <span className="text-emerald-400 font-bold uppercase text-[8.5px] bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20">
            High Liquidity Window
          </span>
        </div>

        <div className="flex items-center gap-4 text-[8.5px] text-zinc-400">
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" /> Sydney
          </span>
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Tokyo
          </span>
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> London
          </span>
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-500" /> New York
          </span>
        </div>
      </div>
    </div>
  );
}
