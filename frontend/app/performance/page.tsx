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
    <div className="min-h-screen w-full bg-[#05050a] text-text-primary px-4 md:px-6 py-4 flex flex-col gap-4 animate-fade-in pb-16">
      
      {/* ── 1. HEADER & SCORE ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-[#111118]/80 p-4 border border-zinc-800/40 rounded-2xl backdrop-blur-xl mt-4">
        <div>
          <h1 className="text-lg font-black tracking-tight text-white font-display flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-400" />
            Performance Hub
          </h1>
          <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest font-mono flex items-center gap-1 mt-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
            Track Record & Performance Ledger
          </p>
        </div>
        <div className="flex items-center gap-3 font-mono text-[10px]">
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg px-3 py-1.5 text-blue-400 font-bold">
            OVERALL SCORE: {score}/100
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Win Rate", value: `${(analytics?.winRate || 72).toFixed(1)}%`, color: "text-emerald-400" },
          { label: "Profit Factor", value: (analytics?.profitFactor || 2.7).toFixed(2), color: "text-white" },
          { label: "Discipline Score", value: "98%", color: "text-emerald-400" },
          { label: "Top Strategy", value: "London Breakout", color: "text-white" },
        ].map((kpi, idx) => (
          <div key={idx} className="bg-[#111118] border border-zinc-800/40 p-4 rounded-xl shadow-md">
            <div className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest mb-1 font-mono">{kpi.label}</div>
            <div className={`text-base font-black font-mono tracking-tight ${kpi.color}`}>{kpi.value}</div>
          </div>
        ))}
      </div>

      {/* ── 2. AI REPORT ── */}
      <SectionHeader title="AI Performance Report" />
      <div className="bg-[#111118] border border-zinc-800/40 rounded-xl p-5 shadow-xl">
        <div className="flex items-center gap-2 mb-3">
          <BrainCircuit className="w-4 h-4 text-blue-400" />
          <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-300 font-mono">Weekly Insights</h2>
        </div>
        <p className="text-xs text-zinc-400 leading-relaxed font-sans max-w-3xl">
          Your winrate is stable, but you have a slight tendency to cut winners early. Try trailing your stop loss instead of hard-closing positions when you see 1:1 RR. You avoided trading during NFP, which saved your discipline score. Keep it up.
        </p>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-[11px]">
          <div className="p-3.5 rounded-lg border border-red-500/20 bg-red-500/[0.01]">
            <h3 className="text-[9px] font-bold text-red-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
              <TrendingDown className="w-3.5 h-3.5" /> Top Mistake
            </h3>
            <p className="text-zinc-450 leading-relaxed">Over-leveraging on Fridays. Your average lot size is 40% higher on Friday sessions.</p>
          </div>
          <div className="p-3.5 rounded-lg border border-emerald-500/20 bg-emerald-500/[0.01]">
            <h3 className="text-[9px] font-bold text-emerald-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
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
      <div className="bg-[#111118] border border-zinc-800/40 rounded-xl overflow-hidden shadow-xl p-4">
        <RecentTradesTable />
      </div>

    </div>
  );
}
