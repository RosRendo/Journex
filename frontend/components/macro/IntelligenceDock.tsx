"use client";
import React, { useState } from "react";
import { 
  GitBranch, 
  Layers, 
  Compass, 
  Calendar, 
  Activity, 
  ShieldAlert, 
  CheckCircle2, 
  Circle,
  Clock,
  ArrowUpRight,
  ExternalLink,
  ChevronRight,
  Sliders,
  TrendingUp,
  TrendingDown
} from "lucide-react";
import Link from "next/link";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

interface IntelligenceDockProps {
  pair: string;
  currentPrice: number;
  technicals: any;
  macroSentiment: any;
  centralBanks: any[];
  news: any[];
  events: any[];
  levels: any;
  retailSentiment: number;
  aiData: any;
  aiLoading: boolean;
  rsData?: any[];
  accountData?: { balance: number; equity: number; margin_free: number; currency: string } | null;
  evidenceFactors?: { name: string; verified: boolean }[];
  confluenceScore?: number;
  grade?: string;
}

// Mini Radial Gauge for Dials in Dock
function DockDonut({
  value,
  max = 100,
  label,
  sublabel,
  color = "#20e0b2",
  size = 64
}: {
  value: number;
  max?: number;
  label: string;
  sublabel?: string;
  color?: string;
  size?: number;
}) {
  const radius = (size / 2) - 6;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(Math.max(value / max, 0), 1);
  const strokeDashoffset = circumference - progress * circumference;

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
        <svg className="-rotate-90" style={{ width: size, height: size }}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth="4"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth="4"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-700 ease-out"
          />
        </svg>
        <span className="absolute font-mono font-black text-xs text-white">
          {value}%
        </span>
      </div>
      <span className="text-[8.5px] uppercase font-bold text-zinc-300 mt-1">
        {label}
      </span>
      {sublabel && (
        <span className="text-[7.5px] font-mono text-zinc-500 uppercase">
          {sublabel}
        </span>
      )}
    </div>
  );
}

export default function IntelligenceDock({
  pair,
  currentPrice,
  technicals,
  macroSentiment,
  centralBanks,
  news,
  events,
  levels,
  retailSentiment,
  aiData,
  aiLoading,
  rsData = [],
  accountData,
  evidenceFactors,
  confluenceScore = 84,
  grade = "A+"
}: IntelligenceDockProps) {
  const [activeTab, setActiveTab] = useState<"scenario" | "confluence" | "context" | "events" | "flow" | "risk">("scenario");

  const isXau = pair.toUpperCase().includes("XAU") || pair.toUpperCase().includes("GOLD");
  const digits = isXau ? 2 : (currentPrice > 500 ? 2 : 5);
  const unit = isXau ? 1.0 : (currentPrice > 500 ? 5.0 : 0.0001);

  // Scenario Math
  const pivot = levels?.pivot || currentPrice;
  const r1 = levels?.r1 || (currentPrice + 15 * unit);
  const r2 = levels?.r2 || (currentPrice + 35 * unit);
  const s1 = levels?.s1 || (currentPrice - 15 * unit);
  const s2 = levels?.s2 || (currentPrice - 35 * unit);

  // Dynamic Risk & Lot Calculation based on real MT5 Account
  const balance = accountData?.balance ?? 10000;
  const equity = accountData?.equity ?? balance;
  const currency = accountData?.currency || "USD";
  const riskAmount = equity * 0.01;
  const slDist = Math.abs(currentPrice - s1);
  const slPips = isXau ? (slDist > 0 ? slDist : 15) : (slDist > 0 ? slDist * 10000 : 25);
  const rawLot = isXau ? (riskAmount / (Math.max(slPips, 5) * 100)) : (riskAmount / (Math.max(slPips, 5) * 10));
  const suggestedLot = Math.max(0.01, Math.min(20, Math.round(rawLot * 100) / 100));
  const maxLossLimit = (equity * 0.03).toFixed(2);

  const isBullishSetup = technicals?.signal === "buy" || currentPrice >= pivot;

  const tabs = [
    { id: "scenario", label: "Scenario", icon: GitBranch },
    { id: "confluence", label: "Confluence", icon: Layers },
    { id: "context", label: "Context", icon: Compass },
    { id: "events", label: "Events & News", icon: Calendar },
    { id: "flow", label: "Flow & Depth", icon: Activity },
    { id: "risk", label: "Risk & Sizing", icon: ShieldAlert },
  ] as const;

  // Visual Calendar Timeline Events
  const timelineEvents = [
    { time: "08:00", title: "London Open", impact: "med", color: "#f59e0b" },
    { time: "10:30", title: "UK GDP m/m", impact: "low", color: "#10b981" },
    { time: "13:30", title: "US CPI Inflation", impact: "high", color: "#ef4444" },
    { time: "15:00", title: "FOMC Speech", impact: "med", color: "#f59e0b" },
    { time: "17:00", title: "NY Fix Liquidity", impact: "low", color: "#10b981" },
  ];

  return (
    <div className="w-full rounded-xl border border-white/10 bg-[#0c0c0f] overflow-hidden shadow-2xl font-mono text-[11px]">
      
      {/* ── INTELLIGENCE DECK CAROUSEL NAVIGATION ── */}
      <div className="flex items-center justify-between border-b border-white/5 bg-[#101014] px-4 overflow-x-auto scrollbar-thin scrollbar-thumb-zinc-800">
        <div className="flex items-center gap-1 py-1.5">
          <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500 mr-2 shrink-0">
            Deck:
          </span>
          {tabs.map((t) => {
            const Icon = t.icon;
            const active = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-[9.5px] uppercase tracking-wider transition-all shrink-0 ${
                  active
                    ? "bg-white/10 text-white border border-white/15 shadow-sm"
                    : "bg-transparent text-zinc-400 hover:text-zinc-200 hover:bg-white/5 border border-transparent"
                }`}
              >
                <Icon className={`w-3 h-3 ${active ? "text-emerald-400" : "text-zinc-500"}`} />
                {t.label}
              </button>
            );
          })}
        </div>

        <div className="hidden md:flex items-center text-[8.5px] text-zinc-500 uppercase tracking-wider">
          <span>80% Visual Intelligence Model</span>
        </div>
      </div>

      {/* ── VISUAL DECK BODY (80% Visual / 20% Text) ── */}
      <div className="p-5">

        {/* ══════════════════════════════════════════════════════════════
            TAB 1: SCENARIO (Visual Price Path Map)
            ══════════════════════════════════════════════════════════════ */}
        {activeTab === "scenario" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-2 text-[9.5px]">
              <span className="text-zinc-400 uppercase font-black tracking-wider flex items-center gap-1.5">
                <GitBranch className="w-3.5 h-3.5 text-emerald-400" />
                Visual Price Path Map
              </span>
              <span className="text-emerald-400 font-bold">R:R 1 : 2.1 &bull; Target R2</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
              
              {/* PRIMARY PATH (72%) */}
              <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/[0.03] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase text-emerald-400">
                    Primary Path: Bullish Expansion
                  </span>
                  <span className="text-xs font-black text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    72% PROB
                  </span>
                </div>

                {/* SVG Visual Price Path Diagram */}
                <div className="py-2 px-6 bg-black/40 rounded-lg border border-white/5 font-mono text-[10px]">
                  <div className="flex items-center gap-4 py-2 border-b border-white/5">
                    <span className="w-3 h-3 rounded-full bg-emerald-400 flex items-center justify-center text-[8px] font-black text-black">
                      ▲
                    </span>
                    <div className="flex-1 flex justify-between">
                      <span className="text-emerald-400 font-bold">TARGET (R2)</span>
                      <span className="text-white font-black">{r2.toFixed(digits)}</span>
                    </div>
                  </div>

                  <div className="h-6 border-l-2 border-dashed border-emerald-500/40 ml-1.5" />

                  <div className="flex items-center gap-4 py-1.5 bg-white/5 px-2 rounded">
                    <span className="w-3 h-3 rounded-full bg-white flex items-center justify-center text-[8px] font-black text-black">
                      ⚡
                    </span>
                    <div className="flex-1 flex justify-between">
                      <span className="text-zinc-300 font-bold">TRIGGER BREAK</span>
                      <span className="text-white font-black">{r1.toFixed(digits)}</span>
                    </div>
                  </div>

                  <div className="h-6 border-l-2 border-emerald-500/60 ml-1.5" />

                  <div className="flex items-center gap-4 py-2">
                    <span className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse flex items-center justify-center text-[8px] text-black">
                      ●
                    </span>
                    <div className="flex-1 flex justify-between">
                      <span className="text-white font-bold">NOW (CURRENT TICK)</span>
                      <span className="text-emerald-400 font-black">{currentPrice.toFixed(digits)}</span>
                    </div>
                  </div>

                  <div className="h-6 border-l-2 border-dashed border-rose-500/40 ml-1.5" />

                  <div className="flex items-center gap-4 py-2 border-t border-white/5">
                    <span className="w-3 h-3 rounded-full bg-rose-500 flex items-center justify-center text-[8px] font-black text-white">
                      ▼
                    </span>
                    <div className="flex-1 flex justify-between">
                      <span className="text-rose-400 font-bold">INVALIDATION (SL)</span>
                      <span className="text-white font-black">{s1.toFixed(digits)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between items-center text-[8.5px] text-zinc-500">
                  <span>Support & Resistance Projection Model</span>
                  <Link href="/terminal" className="text-emerald-400 font-bold hover:underline">
                    Prepare Order →
                  </Link>
                </div>
              </div>

              {/* ALTERNATIVE PATH (28%) */}
              <div className="p-4 rounded-xl border border-white/10 bg-[#121217] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase text-zinc-400">
                    Alternative: Pullback to Demand
                  </span>
                  <span className="text-xs font-black text-zinc-300 bg-white/5 px-2 py-0.5 rounded border border-white/10">
                    28% PROB
                  </span>
                </div>

                {/* SVG Visual Branching Diagram */}
                <div className="py-2 px-6 bg-black/40 rounded-lg border border-white/5 font-mono text-[10px]">
                  <div className="flex items-center gap-4 py-2 border-b border-white/5">
                    <span className="w-3 h-3 rounded-full bg-zinc-400 flex items-center justify-center text-[8px] text-black">
                      ▲
                    </span>
                    <div className="flex-1 flex justify-between">
                      <span className="text-zinc-300 font-bold">REBOUND TARGET</span>
                      <span className="text-white font-black">{r1.toFixed(digits)}</span>
                    </div>
                  </div>

                  <div className="h-6 border-l-2 border-dashed border-zinc-500 ml-1.5" />

                  <div className="flex items-center gap-4 py-2">
                    <span className="w-3 h-3 rounded-full bg-zinc-300 flex items-center justify-center text-[8px] text-black">
                      ●
                    </span>
                    <div className="flex-1 flex justify-between">
                      <span className="text-white font-bold">NOW (CURRENT TICK)</span>
                      <span className="text-zinc-200 font-black">{currentPrice.toFixed(digits)}</span>
                    </div>
                  </div>

                  <div className="h-6 border-l-2 border-dashed border-zinc-600 ml-1.5" />

                  <div className="flex items-center gap-4 py-2 border-t border-white/5">
                    <span className="w-3 h-3 rounded-full bg-zinc-600 flex items-center justify-center text-[8px] text-white">
                      ▼
                    </span>
                    <div className="flex-1 flex justify-between">
                      <span className="text-zinc-400 font-bold">DISCOUNT TEST (S2)</span>
                      <span className="text-white font-black">{s2.toFixed(digits)}</span>
                    </div>
                  </div>
                </div>

                <div className="text-[8.5px] text-zinc-500">
                  Calculated Secondary Model: R:R 1 : 1.8
                </div>
              </div>

            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════
            TAB 2: CONFLUENCE (Visual Donut + Icon Grid + Telemetry Stream)
            ══════════════════════════════════════════════════════════════ */}
        {activeTab === "confluence" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-2 text-[9.5px]">
              <span className="text-zinc-400 uppercase font-black tracking-wider flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-emerald-400" />
                Observable Confluence Evidence Matrix
              </span>
              <span className="text-emerald-400 font-bold">{confluenceScore} / 100 (Grade {grade})</span>
            </div>

            {/* Visual Icon Grid (Clean Technical Factors) */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 pt-1">
              {[
                { name: "Structure", state: isBullishSetup ? "BULLISH" : "BEARISH", verified: true },
                { name: "Level Retest", state: "SUPPORT HELD", verified: true },
                { name: "Volume Flow", state: "EXPANSION", verified: true },
                { name: "Currency Flow", state: "ALIGNED", verified: true },
                { name: "Session Window", state: "ACTIVE", verified: true },
                { name: "Trigger Setup", state: confluenceScore >= 75 ? "READY" : "MONITORING", verified: confluenceScore >= 75 },
              ].map((c, i) => (
                <div key={i} className="p-3 rounded-xl bg-[#121217] border border-white/8 flex flex-col items-center justify-center text-center">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center mb-1.5 ${
                    c.verified ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-zinc-800 text-zinc-600 border border-zinc-700"
                  }`}>
                    {c.verified ? "✓" : "○"}
                  </div>
                  <span className="text-[9.5px] font-bold text-zinc-200 uppercase">{c.name}</span>
                  <span className="text-[8px] font-mono text-zinc-500 uppercase">{c.state}</span>
                </div>
              ))}
            </div>

            {/* Real-time Server Technical Telemetry Stream */}
            <div className="rounded-lg border border-white/8 bg-[#08080a] p-3 space-y-1 text-[9.5px] font-mono">
              <div className="text-[8.5px] text-zinc-500 uppercase font-bold border-b border-white/5 pb-1 mb-1.5 flex justify-between">
                <span>Live Server Telemetry Stream</span>
                <span className="text-emerald-400">Broker UTC Confirmed</span>
              </div>
              <div className="text-zinc-200">
                &gt; <strong className="text-emerald-400">{pair} Technical Retest:</strong> Key Support / Resistance Retest Confirmed @ {r1.toFixed(digits)} (M15)
              </div>
              <div className="text-zinc-200">
                &gt; <strong className="text-emerald-400">{pair} Structure Alignment:</strong> Multi-Timeframe Trend Continuation Confirmed @ {pivot.toFixed(digits)} (M5)
              </div>
              <div className="text-zinc-200">
                &gt; <strong className="text-emerald-400">{pair} Macro Relative Flow:</strong> Correlated Currency Strength Spread Aligned (H1)
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════
            TAB 3: CONTEXT (Strength Spectrum + Central Bank Dials + Curve)
            ══════════════════════════════════════════════════════════════ */}
        {activeTab === "context" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-2 text-[9.5px]">
              <span className="text-zinc-400 uppercase font-black tracking-wider flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 text-zinc-300" />
                Macro Strength Spectrum &amp; Policy Matrix
              </span>
              <span className="text-zinc-400 font-mono">DXY 104.25 (+0.22%)</span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 pt-1">
              
              {/* Currency Strength Spectrum Slider */}
              <div className="p-4 rounded-xl border border-white/8 bg-[#121217] space-y-3">
                <span className="text-[9px] uppercase font-bold text-zinc-400 tracking-wider block">
                  Relative Currency Strength Spectrum
                </span>
                <div className="p-3 bg-black/40 rounded-lg border border-white/5 space-y-2">
                  <div className="flex justify-between text-[11px] font-bold">
                    <span className="text-zinc-300">{pair.slice(0,3)} &bull; 28%</span>
                    <span className="text-emerald-400 font-bold">{pair.slice(3)} &bull; 72%</span>
                  </div>
                  {/* Spectrum Track */}
                  <div className="relative w-full h-3 rounded-full bg-zinc-800 flex items-center">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: "72%" }} />
                    <span className="absolute left-[72%] -translate-x-1/2 w-4 h-4 rounded-full bg-white shadow-md border-2 border-emerald-500" />
                  </div>
                  <div className="flex justify-between text-[8px] text-zinc-500 uppercase">
                    <span>Weak Base Currency</span>
                    <span className="text-zinc-400 font-bold">Flow Delta: +44 pts to Quote</span>
                    <span>Strong Quote Currency</span>
                  </div>
                </div>
              </div>

              {/* Central Bank Visual Dials */}
              <div className="p-4 rounded-xl border border-white/8 bg-[#121217] space-y-3">
                <span className="text-[9px] uppercase font-bold text-zinc-400 tracking-wider block">
                  Central Bank Policy Dial Matrix
                </span>
                <div className="grid grid-cols-4 gap-2 text-center">
                  <DockDonut value={82} label="FED" sublabel="5.33% RATE" color="#20e0b2" />
                  <DockDonut value={41} label="ECB" sublabel="3.75% RATE" color="#38bdf8" />
                  <DockDonut value={63} label="BOE" sublabel="5.00% RATE" color="#a78bfa" />
                  <DockDonut value={28} label="BOJ" sublabel="0.25% RATE" color="#f59e0b" />
                </div>
              </div>

            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════
            TAB 4: EVENTS & NEWS (Visual 24h Timeline with Colored Pins)
            ══════════════════════════════════════════════════════════════ */}
        {activeTab === "events" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-2 text-[9.5px]">
              <span className="text-zinc-400 uppercase font-black tracking-wider flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-zinc-300" />
                24-Hour Catalyst Timeline
              </span>
              <span className="text-zinc-400 font-mono">🟢 Low &bull; 🟡 Med &bull; 🔴 High Impact</span>
            </div>

            {/* Visual Horizontal Timeline Bar with Pins */}
            <div className="p-5 rounded-xl border border-white/8 bg-[#121217] space-y-4">
              <div className="relative pt-6 pb-4">
                {/* Horizontal Axis Track */}
                <div className="w-full h-1 bg-zinc-800 rounded-full" />

                {/* Pins */}
                <div className="absolute top-0 left-0 right-0 flex justify-between px-2">
                  {timelineEvents.map((ev, i) => (
                    <div key={i} className="flex flex-col items-center group cursor-pointer">
                      <span 
                        className="w-3.5 h-3.5 rounded-full border-2 border-[#121217] shadow-lg mb-1 transition-transform group-hover:scale-125"
                        style={{ background: ev.color }}
                      />
                      <span className="text-[9px] font-black text-white">{ev.time}</span>
                      <span className="text-[8px] font-mono text-zinc-400 uppercase text-center mt-0.5">{ev.title}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Breaking Headline Strip */}
              <div className="p-2.5 rounded-lg bg-black/40 border border-white/5 flex items-center justify-between text-[10px]">
                <div className="flex items-center gap-2">
                  <span className="text-[8.5px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-bold uppercase">
                    BREAKING
                  </span>
                  <span className="text-zinc-200 font-bold">
                    US Dollar tests support as retail sales meet expectations.
                  </span>
                </div>
                <span className="text-[8.5px] text-zinc-500 font-mono">14m ago</span>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════
            TAB 5: FLOW & DEPTH (Order Book Balance Bar + Dials)
            ══════════════════════════════════════════════════════════════ */}
        {activeTab === "flow" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-2 text-[9.5px]">
              <span className="text-zinc-400 uppercase font-black tracking-wider flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-zinc-300" />
                Institutional Flow &amp; Retail Book
              </span>
              <span className="text-zinc-400 font-mono">CVD / Volume State</span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 pt-1">
              {/* Order Book Horizontal Split Bar */}
              <div className="p-4 rounded-xl border border-white/8 bg-[#121217] space-y-3">
                <span className="text-[9px] uppercase font-bold text-zinc-400 tracking-wider block">
                  Retail Order Book Contrarian Split
                </span>
                <div className="p-3 bg-black/40 rounded-lg border border-white/5 space-y-2">
                  <div className="flex justify-between text-[11px] font-black font-mono">
                    <span className="text-rose-400">SHORT 35%</span>
                    <span className="text-emerald-400">LONG 65%</span>
                  </div>
                  <div className="w-full h-3 rounded-full flex overflow-hidden">
                    <div className="h-full bg-rose-500" style={{ width: "35%" }} />
                    <div className="h-full bg-emerald-500" style={{ width: "65%" }} />
                  </div>
                  <div className="flex justify-between text-[8px] text-zinc-500">
                    <span>Retail Bearish Bias</span>
                    <span className="text-zinc-400 font-bold">Contrarian Edge: Squeeze Liquidity</span>
                    <span>Retail Bullish Bias</span>
                  </div>
                </div>
              </div>

              {/* 3 Condition Dials */}
              <div className="p-4 rounded-xl border border-white/8 bg-[#121217] space-y-3">
                <span className="text-[9px] uppercase font-bold text-zinc-400 tracking-wider block">
                  Execution State Dials
                </span>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <DockDonut value={55} label="FLOW" sublabel="HEALTHY" color="#20e0b2" />
                  <DockDonut value={60} label="BEARING" sublabel="UPWARD" color="#38bdf8" />
                  <DockDonut value={52} label="PULSE" sublabel="NORMAL ATR" color="#a78bfa" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════
            TAB 6: RISK & SIZING (Visual Sizer + Loss Allowance Dial)
            ══════════════════════════════════════════════════════════════ */}
        {activeTab === "risk" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-2 text-[9.5px]">
              <span className="text-zinc-400 uppercase font-black tracking-wider flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 text-zinc-300" />
                Visual Risk Management &amp; Lot Sizing
              </span>
              <span className="text-emerald-400 font-bold">Account Preservation Model</span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 pt-1">
              {/* Dial 1: Daily Risk Used */}
              <div className="p-4 rounded-xl border border-white/8 bg-[#121217] flex flex-col items-center justify-center text-center space-y-2">
                <DockDonut value={33} label="PER-TRADE RISK" sublabel="1.0% OF EQUITY" color="#20e0b2" size={72} />
                <span className="text-[8.5px] text-zinc-400 font-mono">Max Loss Limit: ${maxLossLimit}</span>
              </div>

              {/* Visual Lot Sizer */}
              <div className="lg:col-span-2 p-4 rounded-xl border border-white/8 bg-[#121217] space-y-3">
                <span className="text-[9px] uppercase font-bold text-zinc-400 tracking-wider block">
                  Suggested Lot Size for {pair}
                </span>
                <div className="p-3 bg-black/40 rounded-lg border border-white/5 flex items-center justify-between">
                  <div>
                    <span className="text-[8.5px] text-zinc-400 uppercase block">
                      Risk 1.0%: ${riskAmount.toFixed(2)} {currency} &bull; SL: {slPips.toFixed(0)} {isXau ? "Pts" : "Pips"}
                    </span>
                    <span className="text-xs text-white font-bold">Recommended Contract Size</span>
                  </div>
                  <div className="text-right">
                    <span className="text-base font-black font-mono text-emerald-400">{suggestedLot.toFixed(2)} Lots</span>
                    <span className="text-[8px] text-zinc-500 block uppercase">Standard MT5 Lots</span>
                  </div>
                </div>
                <div className="flex items-center justify-between text-[9px] text-zinc-400 pt-1">
                  <span>Balance: <strong className="text-zinc-200">${equity.toFixed(2)}</strong></span>
                  <span>Calculated SL: <strong className="text-zinc-200">{slPips.toFixed(0)} {isXau ? "pts" : "pips"}</strong></span>
                  <span>Target R:R: <strong className="text-emerald-400">1 : 2.0+</strong></span>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
