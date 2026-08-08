"use client";

import { ShieldAlert, AlertTriangle, TrendingDown, Layers, Calculator, Activity, DollarSign } from "lucide-react";
import { DrawdownVisualization } from "@/components/dashboard/widgets/DrawdownVisualization";
import { VisualPositionSizer } from "@/components/widgets/VisualPositionSizer";

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center justify-between mb-3 mt-6 font-mono">
      <h2 className="text-[10px] font-bold tracking-widest uppercase text-zinc-550">
        {title}
      </h2>
      <div className="h-px bg-zinc-800/40 flex-1 ml-4" />
    </div>
  );
}

export default function RiskHubPage() {
  return (
    <div className="min-h-screen w-full bg-[#05050a] text-text-primary px-4 md:px-6 py-4 flex flex-col gap-4 animate-fade-in pb-16">
      
      {/* ── 1. HEADER ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-[#111118]/80 p-4 border border-zinc-800/40 rounded-2xl backdrop-blur-xl mt-4">
        <div>
          <h1 className="text-lg font-black tracking-tight text-white font-display flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-red-500" />
            Risk Hub & Exposure
          </h1>
          <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest font-mono flex items-center gap-1 mt-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            Exposure Protection Active
          </p>
        </div>
        <div className="flex items-center gap-3 font-mono text-[10px]">
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-2.5 min-w-[120px] text-center">
            <div className="text-[8px] font-bold uppercase tracking-wider text-red-400 mb-0.5">Open Risk</div>
            <div className="text-base font-black text-white">2.0<span className="text-xs text-zinc-500">%</span></div>
          </div>
          <div className="bg-zinc-900/40 border border-zinc-800 rounded-lg p-2.5 min-w-[120px] text-center">
            <div className="text-[8px] font-bold uppercase tracking-wider text-zinc-400 mb-0.5">Remaining</div>
            <div className="text-base font-black text-white">3.0<span className="text-xs text-zinc-500">%</span></div>
          </div>
        </div>
      </div>

      {/* ── 2. PORTFOLIO EXPOSURE ── */}
      <SectionHeader title="Portfolio Exposure & Limits" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-[#111118] border border-zinc-800/40 rounded-xl p-5 shadow-xl col-span-2">
          <div className="flex items-center gap-2 mb-6">
            <Layers className="w-4 h-4 text-red-400" />
            <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-300 font-mono">Asset Distribution</h2>
          </div>
          <div className="space-y-5 font-mono text-[11px]">
            <div>
              <div className="flex justify-between font-bold mb-1.5">
                <span className="text-yellow-500">Gold (#XAU)</span>
                <span className="text-white">34%</span>
              </div>
              <div className="h-1.5 rounded-full bg-black/35 overflow-hidden">
                <div className="h-full bg-yellow-500 w-[34%]" />
              </div>
            </div>
            <div>
              <div className="flex justify-between font-bold mb-1.5">
                <span className="text-blue-400">USD Pairs</span>
                <span className="text-white">21%</span>
              </div>
              <div className="h-1.5 rounded-full bg-black/35 overflow-hidden">
                <div className="h-full bg-blue-400 w-[21%]" />
              </div>
            </div>
            <div>
              <div className="flex justify-between font-bold mb-1.5">
                <span className="text-orange-400">Bitcoin (#BTC)</span>
                <span className="text-white">18%</span>
              </div>
              <div className="h-1.5 rounded-full bg-black/35 overflow-hidden">
                <div className="h-full bg-orange-400 w-[18%]" />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-[#111118] border border-zinc-800/40 rounded-xl p-5 shadow-xl flex flex-col gap-3 font-mono text-[10px]">
          <div className="p-3.5 rounded-lg border border-red-500/20 bg-red-500/[0.01]">
            <h3 className="text-[8px] font-bold text-zinc-550 uppercase tracking-widest mb-1">Correlation Risk</h3>
            <p className="text-lg font-black text-emerald-450">LOW RISK</p>
          </div>
          <div className="p-3.5 rounded-lg border border-zinc-850 bg-black/10">
            <h3 className="text-[8px] font-bold text-zinc-550 uppercase tracking-widest mb-1">AI Recommendation</h3>
            <p className="text-[11px] text-zinc-400 leading-relaxed">Avoid Gold trades to maintain balance.</p>
          </div>
          <div className="p-3.5 rounded-lg border border-zinc-850 bg-black/10">
            <h3 className="text-[8px] font-bold text-zinc-555 uppercase tracking-widest mb-1">Max Allowed Lot</h3>
            <p className="text-sm font-bold text-white">0.25 <span className="text-zinc-500 text-[9px] font-sans">lots</span></p>
          </div>
        </div>
      </div>

      {/* ── 3. DRAWDOWN GUARD ── */}
      <SectionHeader title="Drawdown Guard Metrics" />
      <div className="bg-[#111118] border border-zinc-800/40 rounded-xl p-4 shadow-xl">
         <DrawdownVisualization trades={[]} />
      </div>

      {/* ── 4. RISK CALCULATOR ── */}
      <SectionHeader title="Visual Position Sizer" />
      <div className="bg-[#111118] border border-zinc-800/40 rounded-xl p-4 shadow-xl">
         <VisualPositionSizer balance={10000} />
      </div>

    </div>
  );
}
