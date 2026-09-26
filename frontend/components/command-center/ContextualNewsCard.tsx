"use client";

import React, { useState } from "react";
import { Flame, AlertTriangle, ShieldAlert, Radio } from "lucide-react";

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

function ImpactDot({ impact }: { impact: string }) {
  const level = impact?.toLowerCase();
  const cls = level === "high"
    ? "bg-rose-500 shadow-[0_0_6px_rgba(239,68,68,0.8)]"
    : level === "medium"
    ? "bg-amber-500 shadow-[0_0_4px_rgba(245,158,11,0.6)]"
    : "bg-zinc-600";
  return <span className={`w-1.5 h-1.5 rounded-full shrink-0 mt-px ${cls}`} />;
}

function timeLabel(t: string) {
  try {
    return new Date(t).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return t || "--:--";
  }
}

export default function ContextualNewsCard({ activeSymbol, realNews }: Props) {
  const [highOnly, setHighOnly] = useState(true);
  const filtered = highOnly ? realNews.filter((n) => n.impact?.toLowerCase() === "high") : realNews;
  const top = realNews[0];
  const rest = filtered.slice(1, 5);

  return (
    <div className="bg-[#0b0b0f] border border-white/[0.07] rounded-xl p-3.5 shadow-lg flex flex-col gap-3 font-mono text-[11px]">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Radio className="w-3.5 h-3.5 text-rose-500 animate-pulse" />
          <span className="text-white font-bold text-[11px] uppercase tracking-widest">News Intel</span>
        </div>
        <button
          onClick={() => setHighOnly(!highOnly)}
          className={`px-2 py-0.5 rounded border text-[9px] font-bold transition-all ${
            highOnly
              ? "bg-rose-500/15 border-rose-500/30 text-rose-300"
              : "bg-white/[0.04] border-white/[0.08] text-zinc-400 hover:text-white"
          }`}
        >
          {highOnly ? "HIGH ONLY" : "ALL NEWS"}
        </button>
      </div>

      {/* Top Alert Card */}
      {top ? (
        <div className="bg-rose-500/[0.06] border border-rose-500/20 rounded-xl p-3 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-rose-400 font-bold text-[9.5px]">
              <AlertTriangle className="w-3 h-3" />
              {top.source || "FOREXLIVE"} · {top.impact?.toUpperCase() || "HIGH"}
            </span>
            <span className="text-[9px] bg-rose-500/10 border border-rose-500/20 text-rose-300 px-1.5 py-px rounded font-bold">
              {top.symbol || activeSymbol}
            </span>
          </div>
          <p className="text-zinc-100 font-sans text-[10.5px] leading-snug line-clamp-2">{top.title}</p>
          <div className="flex items-center gap-1.5 text-[9px] text-rose-300 bg-rose-950/30 border border-rose-500/20 rounded-lg px-2 py-1.5">
            <ShieldAlert className="w-3 h-3 shrink-0" />
            <span>Embargo active — avoid entries during spike</span>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-4 gap-1.5 text-zinc-600 text-[9.5px]">
          <Radio className="w-5 h-5 text-zinc-700" />
          <span>No high-impact events detected</span>
          <span className="text-emerald-600 font-semibold">Docket clear</span>
        </div>
      )}

      {/* News List */}
      {rest.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {rest.map((n, i) => (
            <div key={n.id || i} className="flex items-start gap-2 px-2 py-1.5 rounded-lg bg-white/[0.025] border border-white/[0.04] hover:bg-white/[0.04] transition-colors">
              <ImpactDot impact={n.impact} />
              <div className="flex-1 min-w-0">
                <p className="text-zinc-300 font-sans text-[9.5px] leading-snug line-clamp-1">{n.title}</p>
                <span className="text-zinc-600 text-[8.5px]">{n.source} · {timeLabel(n.time)}</span>
              </div>
              <span className={`text-[8px] font-bold px-1.5 py-px rounded shrink-0 ${
                n.impact?.toLowerCase() === "high"
                  ? "bg-rose-500/20 text-rose-300"
                  : "bg-amber-500/15 text-amber-400"
              }`}>
                {n.impact?.toUpperCase()?.charAt(0) || "M"}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between text-[9px] text-zinc-600 pt-1 border-t border-white/[0.05]">
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Live Feed
        </span>
        <span>{filtered.length} events · {activeSymbol}</span>
      </div>
    </div>
  );
}