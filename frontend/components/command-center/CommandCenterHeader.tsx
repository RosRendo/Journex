"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { 
  SlidersHorizontal, 
  FlaskConical, 
  LayoutGrid, 
  BookOpen, 
  ExternalLink,
  ChevronDown,
  Sparkles,
  Wallet
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
  viewMode?: "INSTITUTIONAL" | "TERMINAL" | "RESEARCH" | string;
  onViewModeChange?: (mode: "INSTITUTIONAL" | "TERMINAL" | "RESEARCH" | string) => void;
}

const PAIRS = [
  { symbol: "XAUUSD", name: "Gold / USD", dot: "bg-amber-400" },
  { symbol: "EURUSD", name: "Euro / USD", dot: "bg-emerald-400" },
  { symbol: "GBPUSD", name: "Pound / USD", dot: "bg-cyan-400" },
  { symbol: "USDJPY", name: "USD / Yen", dot: "bg-emerald-400" },
  { symbol: "AUDUSD", name: "Aussie / USD", dot: "bg-emerald-400" },
  { symbol: "USDCAD", name: "USD / CAD", dot: "bg-emerald-400" },
  { symbol: "USDCHF", name: "USD / CHF", dot: "bg-emerald-400" },
  { symbol: "NZDUSD", name: "Kiwi / USD", dot: "bg-emerald-400" },
  { symbol: "NAS100", name: "Nasdaq 100", dot: "bg-purple-400" },
  { symbol: "US30", name: "Dow Jones 30", dot: "bg-blue-400" },
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
  viewMode = "TERMINAL",
  onViewModeChange,
}: Props) {
  const [timeString, setTimeString] = useState<string>("00:00:00");
  const [utcHour, setUtcHour] = useState<number>(0);
  const [strategyDropdownOpen, setStrategyDropdownOpen] = useState(false);
  const [pairDropdownOpen, setPairDropdownOpen] = useState(false);
  const pairDropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (pairDropdownRef.current && !pairDropdownRef.current.contains(e.target as Node)) {
        setPairDropdownOpen(false);
      }
    };
    if (pairDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [pairDropdownOpen]);

  const activePairObj = PAIRS.find((p) => p.symbol.toUpperCase() === activeSymbol.toUpperCase()) || {
    symbol: activeSymbol.toUpperCase(),
    name: "Active Asset",
    dot: "bg-emerald-400",
  };

  useEffect(() => {
    const tick = () => {
      const d = new Date();
      const pad = (n: number) => (n < 10 ? `0${n}` : n);
      setUtcHour(d.getUTCHours());
      setTimeString(`${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`);
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, []);

  const isAsianOpen = utcHour >= 0 && utcHour < 9;
  const isLondonOpen = utcHour >= 8 && utcHour < 17;
  const isNyOpen = utcHour >= 13 && utcHour < 21;

  return (
    <header className="sticky top-0 z-40 w-full h-11 border-b border-white/[0.08] bg-[#09090b]/95 backdrop-blur-md px-3 font-mono text-[11px] select-none shrink-0 flex items-center">
      <div className="flex items-center justify-between gap-3 w-full overflow-x-auto no-scrollbar">
        
        {/* Left: Brand + Global Sessions Ribbon */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-[#20e0b2]/15 border border-[#20e0b2]/30 flex items-center justify-center font-bold text-[#20e0b2] text-[11px]">
              J
            </div>
            <span className="font-bold tracking-wider text-white text-xs">Journex Pro</span>
            <span className="px-1.5 py-0.5 rounded text-[8.5px] font-semibold bg-white/[0.04] border border-white/10 text-zinc-400">
              TRADING OS
            </span>
          </div>

          <Link
            href="/dashboard"
            className="flex items-center gap-1 px-2 py-1 rounded bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 hover:text-white text-[9px] font-bold transition-colors font-mono"
            title="Return to Unified Dashboard"
          >
            ← Dashboard
          </Link>

          {/* Global Market Session Ribbon (Asian · London · New York · UTC) */}
          <div className="hidden lg:flex items-center gap-2.5 text-[9.5px] font-mono pl-3 border-l border-white/10">
            <span className="flex items-center gap-1.5 font-semibold">
              <span className={`w-1.5 h-1.5 rounded-full ${isAsianOpen ? "bg-emerald-400 animate-pulse" : "bg-zinc-600"}`} />
              <span className={isAsianOpen ? "text-emerald-400" : "text-zinc-500"}>Asian</span>
            </span>
            <span className="text-zinc-700">•</span>
            <span className="flex items-center gap-1.5 font-semibold">
              <span className={`w-1.5 h-1.5 rounded-full ${isLondonOpen ? "bg-emerald-400 animate-pulse" : "bg-zinc-600"}`} />
              <span className={isLondonOpen ? "text-emerald-400" : "text-zinc-500"}>London</span>
            </span>
            <span className="text-zinc-700">•</span>
            <span className="flex items-center gap-1.5 font-semibold">
              <span className={`w-1.5 h-1.5 rounded-full ${isNyOpen ? "bg-emerald-400 animate-pulse" : "bg-zinc-600"}`} />
              <span className={isNyOpen ? "text-emerald-400" : "text-zinc-500"}>New York</span>
            </span>
            <span className="text-zinc-700">•</span>
            <span className="text-zinc-300 font-mono text-[9px] bg-white/[0.04] px-1.5 py-0.5 rounded border border-white/10">
              UTC {timeString}
            </span>
          </div>
        </div>

        {/* Center: Instant Pair Switcher Dropdown */}
        <div className="relative shrink-0" ref={pairDropdownRef}>
          <button
            onClick={() => setPairDropdownOpen(!pairDropdownOpen)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black/40 hover:bg-white/[0.08] border border-white/10 text-white font-mono text-[11px] font-bold transition-all hover:border-[#20e0b2]/40 cursor-pointer shadow-sm"
            title="Change Active Pair"
          >
            <span className={`w-2 h-2 rounded-full ${activePairObj.dot}`} />
            <span className="tracking-wider">{activePairObj.symbol}</span>
            <span className="text-zinc-400 text-[9px] font-sans font-normal hidden sm:inline">
              {activePairObj.name}
            </span>
            <ChevronDown
              className={`w-3.5 h-3.5 text-zinc-400 transition-transform duration-200 ${
                pairDropdownOpen ? "rotate-180 text-[#20e0b2]" : ""
              }`}
            />
          </button>

          {pairDropdownOpen && (
            <div className="absolute left-1/2 -translate-x-1/2 top-full mt-1.5 w-52 rounded-xl bg-[#0d0d14] border border-white/15 shadow-2xl py-1.5 z-50 text-[10px] font-mono backdrop-blur-md">
              <div className="px-3 py-1 text-[8px] font-bold text-zinc-500 uppercase tracking-wider border-b border-white/[0.06] flex items-center justify-between">
                <span>Select Market</span>
                <span className="text-[#20e0b2] text-[7.5px]">Live Feed</span>
              </div>
              <div className="max-h-60 overflow-y-auto py-1">
                {PAIRS.map((p) => {
                  const isActive = activeSymbol.toUpperCase() === p.symbol;
                  return (
                    <button
                      key={p.symbol}
                      onClick={() => {
                        onSymbolChange(p.symbol);
                        setPairDropdownOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-1.5 text-left transition-colors cursor-pointer ${
                        isActive
                          ? "bg-[#20e0b2]/15 text-[#20e0b2] font-bold"
                          : "text-zinc-300 hover:bg-white/[0.06] hover:text-white"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className={`w-1.5 h-1.5 rounded-full ${p.dot}`} />
                        <span className="font-bold">{p.symbol}</span>
                        <span className="text-zinc-500 text-[8.5px] font-sans">{p.name}</span>
                      </div>
                      {isActive && <span className="w-1.5 h-1.5 rounded-full bg-[#20e0b2]" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right Controls: Timeframe, Strategy Selector, Signal Lab, Builder, Layout */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Timeframe selector (only on ultra-wide 2xl screens to avoid chart header duplication) */}
          <div className="hidden 2xl:flex items-center gap-0.5 bg-black/40 p-0.5 rounded-md border border-white/10">
            {TIMEFRAMES.map((tf) => (
              <button
                key={tf}
                onClick={() => onTimeframeChange(tf)}
                className={`px-1.5 py-0.5 rounded text-[9.5px] font-semibold transition-colors ${
                  timeframe === tf
                    ? "bg-white/15 text-white border border-white/20"
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
                        ? "bg-white/15 text-white font-bold border border-white/20"
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
                    className="w-full flex items-center gap-1.5 px-2 py-1.5 rounded text-zinc-300 hover:text-white hover:bg-white/10 text-[10px] font-medium"
                  >
                    <SlidersHorizontal className="w-3 h-3 text-zinc-400" />
                    <span>Open Strategy Builder...</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* View Mode Toggle: Macro Desk vs Full Chart Workstation */}
          {onViewModeChange && (
            <div className="flex items-center gap-1 bg-black/40 p-0.5 rounded-md border border-white/10">
              <button
                onClick={() => onViewModeChange("RESEARCH")}
                className={`flex items-center gap-1 px-2.5 py-1 rounded text-[9.5px] font-mono transition-all cursor-pointer ${
                  viewMode === "RESEARCH"
                    ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold shadow-sm"
                    : "text-zinc-400 hover:text-white border border-transparent"
                }`}
                title="Macro Research Desk Overview"
              >
                <span>📑</span>
                <span>Macro Desk</span>
              </button>
              <button
                onClick={() => onViewModeChange("TERMINAL")}
                className={`flex items-center gap-1 px-2.5 py-1 rounded text-[9.5px] font-mono transition-all cursor-pointer ${
                  viewMode === "TERMINAL"
                    ? "bg-white/15 text-white border border-white/20 font-bold"
                    : "text-zinc-400 hover:text-white border border-transparent"
                }`}
                title="Full Chart Workstation"
              >
                <span>🖥️</span>
                <span>Full Chart</span>
              </button>
            </div>
          )}

          {/* Action Modals */}
          <button
            onClick={onOpenSignalLab}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-zinc-300 hover:text-white text-[10px] font-mono transition-all shadow-sm"
          >
            <FlaskConical className="w-3 h-3 text-zinc-400" />
            <span>Signal Lab</span>
          </button>

          <button
            onClick={onOpenStrategyBuilder}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-zinc-300 hover:text-white text-[10px] font-mono transition-colors"
          >
            <SlidersHorizontal className="w-3 h-3 text-zinc-400" />
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
              href="/accounts"
              className="flex items-center gap-1 px-2 py-1 rounded bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-400 hover:text-white text-[9px] font-bold uppercase transition-colors"
              title="Manage Broker Accounts"
            >
              <Wallet className="w-2.5 h-2.5" /> Accounts
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
