"use client";

import { useMemo } from "react";
import { Activity, Target, BrainCircuit, TrendingUp, TrendingDown, BookOpen } from "lucide-react";
import { EquityCurveChart } from "@/components/dashboard/widgets/EquityCurveChart";
import { RecentTradesTable } from "@/components/dashboard/widgets/RecentTradesTable";
import DisciplineScoreWidget from "@/components/ui/DisciplineScoreWidget";
import { useCsvTrades } from "@/hooks/useCsvTrades";

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center justify-between mb-3.5 mt-8 font-mono">
      <h2 className="text-[10px] font-bold tracking-widest uppercase text-zinc-550">
        {title}
      </h2>
      <div className="h-px bg-zinc-800/40 flex-1 ml-4" />
    </div>
  );
}

export default function PerformanceHubPage() {
  const { analytics } = useCsvTrades();

  const score = 95; // Mock score

  return (
    <div className="min-h-screen w-full bg-[#09090b] text-[#f4f4f5] flex flex-col pb-12 font-sans">
      
      {/* ── TOPBAR ── */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-[rgba(255,255,255,0.07)] sticky top-0 z-20 bg-[#09090b]">
        <div>
          <h1 className="text-sm font-bold tracking-tight text-[#f4f4f5]">Performance Hub</h1>
          <p className="text-[9px] font-bold uppercase tracking-widest font-mono text-[#71717a] mt-0.5">Track Record &amp; Performance Ledger</p>
        </div>
        <div className="flex gap-2">
          <div className="bg-[rgba(32,224,178,0.08)] border border-[rgba(32,224,178,0.2)] rounded px-3 py-1.5 text-[#20e0b2] text-[9px] font-bold font-mono tracking-widest uppercase">
            OVERALL SCORE: {score}/100
          </div>
        </div>
      </div>

      {/* Main container */}
      <div className="flex-1 w-full p-6 space-y-4">

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Win Rate", value: `${(analytics?.winRate || 72).toFixed(1)}%`, color: "text-[#20e0b2]" },
          { label: "Profit Factor", value: (analytics?.profitFactor || 2.7).toFixed(2), color: "text-white" },
          { label: "Discipline Score", value: "98%", color: "text-[#20e0b2]" },
          { label: "Top Strategy", value: "London Breakout", color: "text-white" },
        ].map((kpi, idx) => (
          <div key={idx} className="bg-[#101014] border border-[rgba(255,255,255,0.07)] p-4 rounded-xl shadow-md">
            <div className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest mb-1 font-mono">{kpi.label}</div>
            <div className={`text-base font-black font-mono tracking-tight ${kpi.color}`}>{kpi.value}</div>
          </div>
        ))}
      </div>

      {/* ── 2. AI REPORT ── */}
      <SectionHeader title="AI Performance Report" />
      <div className="bg-[#101014] border border-[rgba(255,255,255,0.07)] rounded-xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <BrainCircuit className="w-4 h-4 text-[#20e0b2]" />
          <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-300 font-mono">Weekly Insights</h2>
        </div>
        <p className="text-xs text-zinc-400 leading-relaxed font-sans max-w-3xl">
          Your winrate is stable, but you have a slight tendency to cut winners early. Try trailing your stop loss instead of hard-closing positions when you see 1:1 RR. You avoided trading during NFP, which saved your discipline score. Keep it up.
        </p>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-[11px]">
          <div className="p-3.5 rounded-lg border border-[rgba(255,92,115,0.2)] bg-red-500/[0.01]">
            <h3 className="text-[9px] font-bold text-[#ff5c73] uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
              <TrendingDown className="w-3.5 h-3.5" /> Top Mistake
            </h3>
            <p className="text-zinc-450 leading-relaxed">Over-leveraging on Fridays. Your average lot size is 40% higher on Friday sessions.</p>
          </div>
          <div className="p-3.5 rounded-lg border border-[rgba(32,224,178,0.3)]/20 bg-[#20e0b2]/[0.01]">
            <h3 className="text-[9px] font-bold text-[#20e0b2] uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5" /> Improvement Recommendation
            </h3>
            <p className="text-zinc-450 leading-relaxed">Stick to fixed fractional risk (1% per trade) regardless of the day of the week.</p>
          </div>
        </div>
      </div>

      {/* ── 3. EQUITY CURVE ── */}
      <SectionHeader title="Equity Curve Metrics" />
      <div className="h-[400px]">
        <EquityCurveChart />
      </div>

      {/* ── 4. DISCIPLINE & METRICS ── */}
      <SectionHeader title="Discipline & Consistency" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="h-[300px]">
          <DisciplineScoreWidget />
        </div>
      </div>

      {/* ── 5. RECENT TRADES ── */}
      <SectionHeader title="Performance Trade Log" />
      <div className="bg-[#101014] border border-[rgba(255,255,255,0.07)] rounded-xl overflow-hidden p-4">
        <RecentTradesTable />
      </div>
    </div>
  </div>
  );
}
