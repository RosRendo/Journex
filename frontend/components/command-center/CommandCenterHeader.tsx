"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { 
  SlidersHorizontal, 
  FlaskConical, 
  LayoutGrid, 
  BookOpen, 
  ExternalLink,
  ChevronDown,
  Sparkles
} from "lucide-react";
import { StrategyProfile } from "./types";

interface Props {
  activeSymbol: string;
  onSymbolChange: (sym: string) => void;
  timeframe: string;
  onTimeframeChange: (tf: string) => void;
  activeStrategy: StrategyProfile;
  strategies: StrategyProfile[];
  onStrategyChange: (strat: StrategyProfile) => void;
  activeWorkspace: "SCALPING" | "SWING" | "NEWS";
  onWorkspaceChange: (ws: "SCALPING" | "SWING" | "NEWS") => void;
  onOpenStrategyBuilder: () => void;
  onOpenSignalLab: () => void;
  onOpenLayoutConfig: () => void;
}

const PAIRS = [
  { symbol: "XAUUSD", name: "Gold / USD", dot: "bg-amber-400" },
  { symbol: "EURUSD", name: "Euro / USD", dot: "bg-emerald-400" },
  { symbol: "GBPUSD", name: "Pound / USD", dot: "bg-cyan-400" },
  { symbol: "USDJPY", name: "USD / Yen", dot: "bg-emerald-400" },
  { symbol: "NAS100", name: "Nasdaq 100", dot: "bg-purple-400" },
  { symbol: "BTCUSD", name: "Bitcoin", dot: "bg-amber-500" },
];

const TIMEFRAMES = ["M1", "M5", "M15", "H1", "H4", "D1"];

export default function CommandCenterHeader({
  activeSymbol,
  onSymbolChange,
  timeframe,
  onTimeframeChange,
  activeStrategy,
  strategies,
  onStrategyChange,
  activeWorkspace,
  onWorkspaceChange,
  onOpenStrategyBuilder,
  onOpenSignalLab,
  onOpenLayoutConfig,
}: Props) {
  const [timeString, setTimeString] = useState<string>("00:00:00 UTC");
  const [strategyDropdownOpen, setStrategyDropdownOpen] = useState(false);

  useEffect(() => {
    const tick = () => {
      const d = new Date();
      const pad = (n: number) => (n < 10 ? `0${n}` : n);
      setTimeString(`${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())} UTC`);
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/[0.08] bg-[#09090b]/95 backdrop-blur-md px-4 py-2 font-mono text-[11px] select-none">
      <div className="flex flex-wrap items-center justify-between gap-3 max-w-[1720px] mx-auto">
        
        {/* Left: Brand + Market Open + Clock */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.6)] animate-pulse" />
            <span className="font-bold tracking-wider text-white text-xs">RENDO TRADE OS</span>
            <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-amber-500/10 border border-amber-500/30 text-amber-400">
              COMMAND CENTER
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-zinc-400 text-[10px] pl-3 border-l border-white/10">
            <span className="flex items-center gap-1 text-emerald-400 font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              MARKET OPEN
            </span>
            <span className="text-zinc-600">•</span>
            <span className="text-zinc-300 font-mono">{timeString}</span>
          </div>
        </div>

        {/* Center: Instant Pair Switcher Ribbon */}
        <div className="flex items-center gap-1 bg-black/40 p-1 rounded-lg border border-white/10 overflow-x-auto">
          {PAIRS.map((p) => {
            const isActive = activeSymbol.toUpperCase() === p.symbol;
            return (
              <button
                key={p.symbol}
                onClick={() => onSymbolChange(p.symbol)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded transition-all text-[10px] font-bold ${
                  isActive
                    ? "bg-white/15 text-white shadow-sm border border-white/20"
                    : "text-zinc-400 hover:text-zinc-200 hover:bg-white/5 border border-transparent"
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${p.dot} ${isActive ? "shadow-[0_0_6px_currentColor]" : "opacity-60"}`} />
                <span>{p.symbol}</span>
              </button>
            );
          })}
        </div>

        {/* Right Controls: Timeframe, Strategy Selector, Signal Lab, Builder, Layout */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Timeframe selector */}
          <div className="hidden md:flex items-center gap-0.5 bg-black/40 p-0.5 rounded-md border border-white/10">
            {TIMEFRAMES.map((tf) => (
              <button
                key={tf}
                onClick={() => onTimeframeChange(tf)}
                className={`px-1.5 py-0.5 rounded text-[9.5px] font-semibold transition-colors ${
                  timeframe === tf
                    ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                {tf}
              </button>
            ))}
          </div>

          {/* Strategy Profile Selector */}
          <div className="relative">
            <button
              onClick={() => setStrategyDropdownOpen(!strategyDropdownOpen)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-200 text-[10px] font-semibold transition-all"
            >
              <span>{activeStrategy.icon}</span>
              <span className="font-bold">{activeStrategy.name}</span>
              <span className="text-zinc-500 text-[9px]">({activeStrategy.minScore}%+)</span>
              <ChevronDown className="w-3 h-3 text-zinc-400 ml-0.5" />
            </button>

            {strategyDropdownOpen && (
              <div className="absolute right-0 mt-1.5 w-60 rounded-lg bg-[#111115] border border-white/15 shadow-2xl p-1.5 z-50 animate-in fade-in slide-in-from-top-1">
                <div className="text-[9px] uppercase tracking-wider text-zinc-500 px-2 py-1 font-bold">
                  Strategy Profiles
                </div>
                {strategies.map((strat) => (
                  <button
                    key={strat.id}
                    onClick={() => {
                      onStrategyChange(strat);
                      setStrategyDropdownOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-2 py-1.5 rounded text-left transition-colors text-[10px] ${
                      activeStrategy.id === strat.id
                        ? "bg-amber-500/15 text-amber-300 font-bold border border-amber-500/30"
                        : "text-zinc-300 hover:bg-white/5"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span>{strat.icon}</span>
                      <span>{strat.name}</span>
                    </div>
                    <span className="text-[9px] text-zinc-500 font-mono">Min {strat.minScore}%</span>
                  </button>
                ))}
                <div className="border-t border-white/10 mt-1 pt-1">
                  <button
                    onClick={() => {
                      setStrategyDropdownOpen(false);
                      onOpenStrategyBuilder();
                    }}
                    className="w-full flex items-center gap-1.5 px-2 py-1.5 rounded text-amber-400 hover:bg-amber-500/10 text-[10px] font-bold"
                  >
                    <SlidersHorizontal className="w-3 h-3" />
                    <span>Open Strategy Builder...</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Action Modals */}
          <button
            onClick={onOpenSignalLab}
            className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-purple-300 text-[10px] font-bold transition-all shadow-sm"
          >
            <FlaskConical className="w-3 h-3" />
            <span>Signal Lab</span>
          </button>

          <button
            onClick={onOpenStrategyBuilder}
            className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 hover:text-white text-[10px] font-semibold transition-colors"
          >
            <SlidersHorizontal className="w-3 h-3 text-amber-400" />
            <span className="hidden lg:inline">Confluence</span> Builder
          </button>

          {/* Workspace Switcher */}
          <div className="hidden xl:flex items-center gap-1 bg-black/40 p-0.5 rounded-md border border-white/10">
            {(["SCALPING", "SWING", "NEWS"] as const).map((ws) => (
              <button
                key={ws}
                onClick={() => onWorkspaceChange(ws)}
                className={`px-2 py-0.5 rounded text-[9px] font-bold tracking-wider transition-all ${
                  activeWorkspace === ws
                    ? "bg-white/20 text-white shadow-sm"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {ws}
              </button>
            ))}
          </div>

          <button
            onClick={onOpenLayoutConfig}
            className="p-1.5 rounded-md bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-400 hover:text-white transition-colors"
            title="Configure Layout"
          >
            <LayoutGrid className="w-3.5 h-3.5" />
          </button>

          {/* External links */}
          <div className="hidden sm:flex items-center gap-1.5 pl-2 border-l border-white/10">
            <Link
              href="/terminal"
              className="flex items-center gap-1 px-2 py-1 rounded bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-400 hover:text-white text-[9px] font-bold uppercase transition-colors"
            >
              Terminal <ExternalLink className="w-2.5 h-2.5" />
            </Link>
            <Link
              href="/journal"
              className="flex items-center gap-1 px-2 py-1 rounded bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-400 hover:text-white text-[9px] font-bold uppercase transition-colors"
            >
              <BookOpen className="w-2.5 h-2.5" /> Journal
            </Link>
          </div>
        </div>

      </div>
    </header>
  );
}
