"use client";

import React from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

export interface NewsImpactHeaderProps {
  headline: string;
  higherTimeframe: "Bullish" | "Bearish" | "Neutral";
  intraday: "Very Bullish" | "Slightly Bullish" | "Ranging" | "Slightly Bearish" | "Very Bearish";
}

export function NewsImpactHeader({ headline, higherTimeframe, intraday }: NewsImpactHeaderProps) {
  const getColors = (bias: string) => {
    if (bias.includes("Bullish")) return { color: "var(--profit)", icon: <TrendingUp className="w-3.5 h-3.5" /> };
    if (bias.includes("Bearish")) return { color: "var(--loss)", icon: <TrendingDown className="w-3.5 h-3.5" /> };
    return { color: "var(--text-tertiary)", icon: <Minus className="w-3.5 h-3.5" /> };
  };

  const htStyle = getColors(higherTimeframe);
  const inStyle = getColors(intraday);

  return (
    <div className="rounded-xl p-5 border" style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
      {/* Title */}
      <h2 className="text-[15px] font-bold tracking-tight mb-5 flex items-center gap-3 leading-snug" style={{ color: "var(--text-primary)" }}>
        <span 
           className="w-5 h-5 rounded flex items-center justify-center shrink-0" 
           style={{ background: "rgba(168,85,247,0.1)", color: "#c084fc", border: "1px solid rgba(168,85,247,0.3)" }}
        >
          ✦
        </span>
        {headline}
      </h2>

      {/* Badges */}
      <div className="flex gap-4">
        {/* HTF Badge */}
        <div 
          className="rounded-lg px-4 py-2 border w-40 flex flex-col gap-1 transition-all"
          style={{ background: "var(--bg-base)", borderColor: "var(--border)" }}
        >
          <span className="text-[9px] font-bold uppercase tracking-widest text-[--text-tertiary]">Higher Timeframe</span>
          <div className="flex items-center justify-between font-bold text-[13px]" style={{ color: htStyle.color }}>
            {higherTimeframe}
            {htStyle.icon}
          </div>
        </div>

        {/* Intraday Badge */}
        <div 
          className="rounded-lg px-4 py-2 border w-40 flex flex-col gap-1 transition-all"
          style={{ background: "var(--bg-base)", borderColor: "var(--border)" }}
        >
          <span className="text-[9px] font-bold uppercase tracking-widest text-[--text-tertiary]">Intraday</span>
          <div className="flex items-center justify-between font-bold text-[13px]" style={{ color: inStyle.color }}>
            {intraday}
            {inStyle.icon}
          </div>
        </div>
      </div>
    </div>
  );
}
