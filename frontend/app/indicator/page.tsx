"use client";
import React, { useState } from "react";
import { Sliders } from "lucide-react";

interface IndicatorRow {
  category: string;
  core: string;
  variants: string;
  defaultOn: boolean;
}

const indicatorRows: IndicatorRow[] = [
  { category: "Trend", core: "EMA, SuperTrend", variants: "Ichimoku, MACD, ADX", defaultOn: true },
  { category: "Momentum", core: "RSI", variants: "Stochastic, MACD, Williams %R", defaultOn: true },
  { category: "Volatility", core: "ATR, Bollinger Bands", variants: "Keltner, Donchian", defaultOn: true },
  { category: "Volume", core: "VWAP", variants: "OBV, Volume Profile", defaultOn: true },
  { category: "Price Action", core: "Support/Resistance", variants: "Order Blocks, BOS, FVG", defaultOn: false },
  { category: "Time/Session", core: "Session High/Low", variants: "Opening Range Breakout", defaultOn: false },
  { category: "Confirmation", core: "Divergence", variants: "Liquidity Sweep, Institutional Bias", defaultOn: false },
  { category: "Bonus", core: "Volatility, Trend, Volume Meter", variants: "SMC Dashboard", defaultOn: false },
  { category: "Risk/Reward", core: "RR Meter", variants: "Position Sizer", defaultOn: true },
];

const categoryColors: Record<string, string> = {
  Trend: "text-emerald-400",
  Momentum: "text-sky-400",
  Volatility: "text-amber-400",
  Volume: "text-violet-400",
  "Price Action": "text-red-400",
  "Time/Session": "text-cyan-400",
  Confirmation: "text-pink-400",
  Bonus: "text-orange-400",
  "Risk/Reward": "text-green-400",
};

export default function IndicatorPage() {
  const [enabled, setEnabled] = useState<Record<string, boolean>>(
    Object.fromEntries(indicatorRows.map((r) => [r.category, r.defaultOn]))
  );

  const toggle = (cat: string) => setEnabled((prev) => ({ ...prev, [cat]: !prev[cat] }));

  const activeCount = Object.values(enabled).filter(Boolean).length;

  return (
          <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Sliders className="text-violet-500" size={24} />
              Indicators & Tools
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Manage your preferred technical indicators per category
            </p>
          </div>
          <div className="px-3 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-sm font-semibold">
            {activeCount} / {indicatorRows.length} active
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Category</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Core Indicator(s)</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Optional Variants</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wide">Enable</th>
                </tr>
              </thead>
              <tbody>
                {indicatorRows.map((row, i) => (
                  <tr
                    key={row.category}
                    className={`border-b border-border/50 hover:bg-muted/20 transition-colors ${enabled[row.category] ? "" : "opacity-50"
                      }`}
                  >
                    <td className={`px-4 py-3 font-bold ${categoryColors[row.category] || "text-foreground"}`}>
                      {row.category}
                    </td>
                    <td className="px-4 py-3 font-medium text-foreground text-sm">{row.core}</td>
                    <td className="px-4 py-3 text-muted-foreground text-sm">{row.variants}</td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => toggle(row.category)}
                        className={`relative w-10 h-5 rounded-full transition-colors duration-300 ${enabled[row.category] ? "bg-violet-500" : "bg-muted-foreground/30"
                          }`}
                      >
                        <div
                          className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform duration-300 ${enabled[row.category] ? "translate-x-5" : ""
                            }`}
                        />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Active Indicators Summary */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-sm font-semibold text-foreground mb-3">Active Indicators</h3>
          <div className="flex flex-wrap gap-2">
            {indicatorRows
              .filter((r) => enabled[r.category])
              .map((r) => (
                <span
                  key={r.category}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border bg-muted/30 text-xs font-medium text-foreground"
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${(categoryColors[r.category] || "text-violet-400").replace("text-", "bg-")}`} />
                  {r.category}
                </span>
              ))}
            {activeCount === 0 && (
              <span className="text-sm text-muted-foreground">No indicators enabled</span>
            )}
          </div>
        </div>
      </div>
  );
}