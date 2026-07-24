"use client";

import { useMemo } from "react";
import { ShieldAlert, AlertTriangle, TrendingDown, Layers, Calculator, Activity, DollarSign } from "lucide-react";
import { DrawdownVisualization } from "@/components/dashboard/widgets/DrawdownVisualization";
import { VisualPositionSizer } from "@/components/widgets/VisualPositionSizer";

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center justify-between mb-4 mt-12">
      <div className="h-px bg-zinc-800/50 flex-1" />
      <h2 className="px-6 text-[10px] font-black tracking-[0.2em] uppercase text-zinc-400">
        {title}
      </h2>
      <div className="h-px bg-zinc-800/50 flex-1" />
    </div>
  );
}

export default function RiskHubPage() {
  return (
    <div className="min-h-screen pb-32 max-w-[1200px] mx-auto animate-fade-in space-y-6">
      
      {/* ── 1. HEADER ── */}
      <div className="bg-zinc-950/50 border border-zinc-800/50 rounded-2xl p-6 backdrop-blur-md mt-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-white font-display flex items-center gap-3">
              <ShieldAlert className="w-8 h-8 text-red-500" />
              RISK HUB
            </h1>
            <p className="text-zinc-400 text-sm mt-1">
              Portfolio exposure, drawdown tracking, and capital protection.
            </p>
          </div>
          <div className="flex items-center gap-4 text-center">
            <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 min-w-[140px]">
              <div className="text-[10px] font-bold uppercase tracking-widest text-red-400 mb-1">Open Risk</div>
              <div className="text-3xl font-black text-white">2.0<span className="text-xl text-zinc-500">%</span></div>
            </div>
            <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 min-w-[140px]">
              <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1">Remaining</div>
              <div className="text-3xl font-black text-white">3.0<span className="text-xl text-zinc-500">%</span></div>
            </div>
          </div>
        </div>
      </div>

      {/* ── 2. PORTFOLIO EXPOSURE ── */}
      <SectionHeader title="Portfolio Exposure" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-zinc-950/50 border border-zinc-800/50 rounded-2xl p-6 backdrop-blur-md col-span-2">
          <div className="flex items-center gap-2 mb-6">
            <Layers className="w-5 h-5 text-red-400" />
            <h2 className="text-lg font-bold text-white">Asset Distribution</h2>
          </div>
          <div className="space-y-6">
            <div>
              <div className="flex justify-between text-sm font-bold mb-2">
                <span className="text-yellow-500">Gold (XAU)</span>
                <span className="text-white">34%</span>
              </div>
              <div className="h-2 rounded-full bg-zinc-900 overflow-hidden">
                <div className="h-full bg-yellow-500 w-[34%]" />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm font-bold mb-2">
                <span className="text-blue-400">USD</span>
                <span className="text-white">21%</span>
              </div>
              <div className="h-2 rounded-full bg-zinc-900 overflow-hidden">
                <div className="h-full bg-blue-400 w-[21%]" />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm font-bold mb-2">
                <span className="text-orange-400">Bitcoin (BTC)</span>
                <span className="text-white">18%</span>
              </div>
              <div className="h-2 rounded-full bg-zinc-900 overflow-hidden">
                <div className="h-full bg-orange-400 w-[18%]" />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-zinc-950/50 border border-zinc-800/50 rounded-2xl p-6 backdrop-blur-md space-y-4">
          <div className="p-4 rounded-xl border border-red-500/20 bg-red-500/5">
            <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Correlation Risk</h3>
            <p className="text-2xl font-black text-emerald-400">LOW</p>
          </div>
          <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/50">
            <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">AI Recommendation</h3>
            <p className="text-sm font-medium text-zinc-300">Avoid Gold trades to maintain balance.</p>
          </div>
          <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/50">
            <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Max Allowed Lot</h3>
            <p className="text-lg font-mono font-bold text-white">0.25 <span className="text-zinc-500 text-xs font-sans">lots</span></p>
          </div>
        </div>
      </div>

      {/* ── 3. DRAWDOWN GUARD ── */}
      <SectionHeader title="Drawdown Guard" />
      <div className="bg-zinc-950/50 border border-zinc-800/50 rounded-2xl p-6 backdrop-blur-md">
         <DrawdownVisualization trades={[]} />
      </div>

      {/* ── 4. RISK CALCULATOR ── */}
      <SectionHeader title="Visual Position Sizer" />
      <div className="bg-zinc-950/50 border border-zinc-800/50 rounded-2xl p-6 backdrop-blur-md">
         <VisualPositionSizer balance={10000} />
      </div>

    </div>
  );
}
