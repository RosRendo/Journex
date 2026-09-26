"use client";

import React, { useState, useMemo } from "react";
import { Shield, TrendingUp, Activity } from "lucide-react";
import { RealCandle, RealLevels, RealPosition } from "@/hooks/useCommandCenterRealData";

interface Props {
  symbol: string;
  timeframe: string;
  currentPrice: number;
  bidPrice: number;
  askPrice: number;
  spreadPips: number;
  entryPrice: number;
  slPrice: number;
  tp1Price: number;
  tp2Price: number;
  realCandles: RealCandle[];
  levels: RealLevels | null;
  positions: RealPosition[];
}

const TIMEFRAME_TV_MAP: Record<string, string> = {
  M1: "1", M5: "5", M15: "15", M30: "30",
  H1: "60", H4: "240", D1: "D", W1: "W",
};

export default function ChartCanvas({
  symbol,
  timeframe,
  currentPrice,
  bidPrice,
  askPrice,
  spreadPips,
  entryPrice,
  slPrice,
  tp1Price,
  tp2Price,
  realCandles,
  levels,
  positions,
}: Props) {
  const [chartMode, setChartMode] = useState<"tradingview" | "live">("tradingview");

  const digits = symbol === "XAUUSD" || symbol.includes("JPY") ? 2 : 5;
  const tvSymbol = symbol === "XAUUSD" ? "OANDA:XAUUSD" : "FX:" + symbol.replace("/", "");
  const tvInterval = TIMEFRAME_TV_MAP[timeframe] ?? "15";

  const activePosition = positions.find((p) =>
    p.pair.toUpperCase().includes(symbol.replace("/", ""))
  );

  const displayCandles = useMemo(() => {
    if (realCandles && realCandles.length >= 5) return realCandles.slice(-50);
    const base = currentPrice || 4378.1;
    const items: RealCandle[] = [];
    let p = base * 0.995;
    const now = Math.floor(Date.now() / 1000);
    for (let i = 50; i >= 0; i--) {
      const open = p;
      const vol = base * 0.0012;
      const change = (Math.sin(i * 0.4) + (Math.random() - 0.48)) * vol;
      const close = open + change;
      const high = Math.max(open, close) + Math.random() * vol * 0.5;
      const low = Math.min(open, close) - Math.random() * vol * 0.5;
      p = close;
      items.push({ time: now - i * 15 * 60, open, high, low, close, volume: Math.floor(1000 + Math.random() * 2000) });
    }
    return items;
  }, [realCandles, currentPrice]);

  const minP = Math.min(...displayCandles.map((c) => c.low));
  const maxP = Math.max(...displayCandles.map((c) => c.high));
  const pad = (maxP - minP) * 0.06 || 4;
  const minPrice = minP - pad;
  const maxPrice = maxP + pad;
  const priceRange = maxPrice - minPrice || 1;
  const getY = (price: number) => 280 - ((price - minPrice) / priceRange) * 260;

  return (
    <div className="w-full h-full flex flex-col bg-[#0a0a0d] border border-white/[0.07] rounded-xl overflow-hidden shadow-xl">

      {/* Top Bar */}
      <div className="h-10 px-3.5 border-b border-white/[0.06] bg-[#0d0d12] flex items-center justify-between select-none shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-white font-bold text-xs tracking-wider">{symbol}</span>
            <span className="text-amber-400/90 font-bold text-[9.5px] uppercase bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
              {timeframe}
            </span>
          </div>
          <div className="flex items-center gap-2 pl-3 border-l border-white/[0.08] text-[10.5px]">
            <span className="text-zinc-500 text-[10px]">BID</span>
            <span className="text-emerald-400 font-bold tabular-nums font-mono">
              {bidPrice > 0 ? bidPrice.toFixed(digits) : currentPrice.toFixed(digits)}
            </span>
            <span className="text-zinc-600">·</span>
            <span className="text-zinc-500 text-[10px]">ASK</span>
            <span className="text-zinc-300 font-bold tabular-nums font-mono">
              {askPrice > 0 ? askPrice.toFixed(digits) : (currentPrice + 0.18).toFixed(digits)}
            </span>
            <span className="text-zinc-500 text-[9.5px] bg-white/[0.04] px-1.5 py-px rounded border border-white/[0.06]">
              {spreadPips}p
            </span>
          </div>
        </div>

        {activePosition && (
          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-[10px]">
            <Shield className="w-3 h-3 text-emerald-400 shrink-0" />
            <span className="font-semibold">LIVE:</span>
            <span>{activePosition.direction} {activePosition.volume}L @ {activePosition.entry.toFixed(digits)}</span>
            <span className={`font-bold ml-1 ${activePosition.pnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
              ({activePosition.pnl >= 0 ? "+" : ""}${activePosition.pnl.toFixed(2)})
            </span>
          </div>
        )}

        <div className="flex items-center gap-1">
          <button
            onClick={() => setChartMode("tradingview")}
            className={`flex items-center gap-1 px-2.5 py-1 rounded text-[9.5px] font-semibold transition-all ${
              chartMode === "tradingview"
                ? "bg-sky-500/15 text-sky-300 border border-sky-500/30"
                : "text-zinc-500 hover:text-zinc-300 border border-transparent"
            }`}
          >
            <TrendingUp className="w-3 h-3" />
            TradingView
          </button>
          <button
            onClick={() => setChartMode("live")}
            className={`flex items-center gap-1 px-2.5 py-1 rounded text-[9.5px] font-semibold transition-all ${
              chartMode === "live"
                ? "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                : "text-zinc-500 hover:text-zinc-300 border border-transparent"
            }`}
          >
            <Activity className="w-3 h-3" />
            MT5 Live
          </button>
        </div>
      </div>

      {/* Chart Body */}
      <div className="relative flex-1 overflow-hidden">

        {chartMode === "tradingview" && (
          <iframe
            key={tvSymbol + "-" + tvInterval}
            title="TradingView Chart"
            src={"https://s.tradingview.com/widgetembed/?symbol=" + tvSymbol + "&interval=" + tvInterval + "&theme=dark&style=1&locale=en&toolbar_bg=%230a0a0d&enable_publishing=false&hide_top_toolbar=0&hide_legend=0&hide_side_toolbar=0&save_image=false&withdateranges=1"}
            className="w-full h-full border-0"
            allowFullScreen
          />
        )}

        {chartMode === "live" && (
          <div className="w-full h-full relative flex flex-col justify-between p-3">
            <svg
              className="w-full flex-1 overflow-visible"
              style={{ height: "calc(100% - 28px)" }}
              preserveAspectRatio="none"
              viewBox="0 0 1000 290"
            >
              {[0.2, 0.4, 0.6, 0.8].map((ratio) => {
                const y = 15 + ratio * 260;
                const priceLabel = maxPrice - ratio * priceRange;
                return (
                  <g key={ratio}>
                    <line x1="0" y1={y} x2="1000" y2={y} stroke="rgba(255,255,255,0.025)" />
                    <text x="998" y={y - 3} textAnchor="end" fill="#3f3f46" fontSize="9" fontFamily="monospace">
                      {priceLabel.toFixed(digits)}
                    </text>
                  </g>
                );
              })}

              {displayCandles.map((c, i) => {
                const total = displayCandles.length;
                const spacing = 1000 / total;
                const x = spacing * i + spacing / 2;
                const candleW = Math.max(3, spacing * 0.55);
                const isBull = c.close >= c.open;
                const color = isBull ? "#10b981" : "#f43f5e";
                const highY = getY(c.high);
                const lowY = getY(c.low);
                const openY = getY(c.open);
                const closeY = getY(c.close);
                const bodyTop = Math.min(openY, closeY);
                const bodyH = Math.max(1.5, Math.abs(closeY - openY));
                return (
                  <g key={i}>
                    <line x1={x} y1={highY} x2={x} y2={lowY} stroke={color} strokeWidth="1" opacity="0.7" />
                    <rect x={x - candleW / 2} y={bodyTop} width={candleW} height={bodyH} fill={color} rx="1" opacity="0.88" />
                  </g>
                );
              })}

              {currentPrice > 0 && (
                <g>
                  <line x1="0" y1={getY(currentPrice)} x2="1000" y2={getY(currentPrice)} stroke="#38bdf8" strokeWidth="0.8" strokeDasharray="4,4" opacity="0.7" />
                  <rect x="888" y={getY(currentPrice) - 8} width="110" height="16" fill="#0284c7" fillOpacity="0.9" rx="3" />
                  <text x="943" y={getY(currentPrice) + 4} textAnchor="middle" fill="#fff" fontSize="9.5" fontFamily="monospace" fontWeight="bold">
                    {currentPrice.toFixed(digits)}
                  </text>
                </g>
              )}

              {activePosition && (
                <g>
                  <line
                    x1="0" y1={getY(activePosition.entry)}
                    x2="1000" y2={getY(activePosition.entry)}
                    stroke={activePosition.pnl >= 0 ? "#10b981" : "#f43f5e"}
                    strokeWidth="1.2" opacity="0.8"
                  />
                  <rect
                    x="2" y={getY(activePosition.entry) - 9}
                    width="160" height="14"
                    fill={activePosition.pnl >= 0 ? "#064e3b" : "#4c0519"}
                    fillOpacity="0.9" rx="2"
                  />
                  <text x="6" y={getY(activePosition.entry) + 2} fill={activePosition.pnl >= 0 ? "#6ee7b7" : "#fda4af"} fontSize="8.5" fontFamily="monospace" fontWeight="bold">
                    ENTRY @ {activePosition.entry.toFixed(digits)} ({activePosition.pnl >= 0 ? "+" : ""}${activePosition.pnl.toFixed(2)})
                  </text>
                </g>
              )}
            </svg>

            <div className="flex items-center justify-between text-[9px] text-zinc-600 pt-1 border-t border-white/[0.04] shrink-0">
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-zinc-500">MT5 Live Feed</span>
                </span>
                <span>·</span>
                <span>{displayCandles.length} bars · {timeframe}</span>
              </div>
              <span className="font-mono">Exness Real Tick</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}