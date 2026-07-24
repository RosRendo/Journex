"use client";

import { useMemo } from "react";
import { Activity, Target, BrainCircuit, TrendingUp, TrendingDown, BookOpen } from "lucide-react";
import { EquityCurveChart } from "@/components/dashboard/widgets/EquityCurveChart";
import { RecentTradesTable } from "@/components/dashboard/widgets/RecentTradesTable";
import DisciplineScoreWidget from "@/components/ui/DisciplineScoreWidget";
import { useCsvTrades } from "@/hooks/useCsvTrades";

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

export default function PerformanceHubPage() {
  const { analytics } = useCsvTrades();

  const score = 95; // Mock score

  return (
    <div className="min-h-screen pb-32 max-w-[1200px] mx-auto animate-fade-in space-y-6">
      
      {/* ── 1. HEADER & SCORE ── */}
      <div className="bg-zinc-950/50 border border-zinc-800/50 rounded-2xl p-6 backdrop-blur-md mt-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-white font-display">
              PERFORMANCE HUB
            </h1>
            <p className="text-zinc-400 text-sm mt-1 flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-400" />
              Your comprehensive track record and analytics.
            </p>
          </div>
          <div className="flex items-center gap-4 text-center">
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4 min-w-[140px]">
              <div className="text-[10px] font-bold uppercase tracking-widest text-blue-400 mb-1">Overall Score</div>
              <div className="text-4xl font-black text-white">{score}<span className="text-xl text-zinc-500">/100</span></div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
          <div className="bg-zinc-900/50 p-4 rounded-xl border border-zinc-800 text-center">
            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-1">Winrate</p>
            <div className="text-xl font-bold text-emerald-400">{analytics?.winRate.toFixed(1) || 72}%</div>
          </div>
          <div className="bg-zinc-900/50 p-4 rounded-xl border border-zinc-800 text-center">
            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-1">Profit Factor</p>
            <div className="text-xl font-bold text-white">{analytics?.profitFactor.toFixed(2) || 2.7}</div>
          </div>
          <div className="bg-zinc-900/50 p-4 rounded-xl border border-zinc-800 text-center">
            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-1">Discipline</p>
            <div className="text-xl font-bold text-emerald-400">98%</div>
          </div>
          <div className="bg-zinc-900/50 p-4 rounded-xl border border-zinc-800 text-center">
            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-1">Best Strategy</p>
            <div className="text-xl font-bold text-white">London Breakout</div>
          </div>
        </div>
      </div>

      {/* ── 2. AI REPORT ── */}
      <SectionHeader title="AI Report" />
      <div className="bg-zinc-950/50 border border-zinc-800/50 rounded-2xl p-6 backdrop-blur-md">
        <div className="flex items-center gap-2 mb-4">
          <BrainCircuit className="w-5 h-5 text-blue-400" />
          <h2 className="text-lg font-bold text-white">Weekly Insights</h2>
        </div>
        <p className="text-sm text-zinc-300 leading-relaxed max-w-3xl">
          Your winrate is stable, but you have a slight tendency to cut winners early. Try trailing your stop loss instead of hard-closing positions when you see 1:1 RR. You avoided trading during NFP, which saved your discipline score. Keep it up.
        </p>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl border border-red-500/20 bg-red-500/5">
            <h3 className="text-xs font-bold text-red-400 uppercase tracking-widest mb-2 flex items-center gap-2">
              <TrendingDown className="w-4 h-4" /> Top Mistake
            </h3>
            <p className="text-sm text-zinc-300">Over-leveraging on Fridays. Your average lot size is 40% higher on Friday sessions.</p>
          </div>
          <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5">
            <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-2 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" /> Improvement Recommendation
            </h3>
            <p className="text-sm text-zinc-300">Stick to fixed fractional risk (1% per trade) regardless of the day of the week.</p>
          </div>
        </div>
      </div>

      {/* ── 3. EQUITY CURVE ── */}
      <SectionHeader title="Equity Curve" />
      <div className="h-[400px]">
        <EquityCurveChart />
      </div>

      {/* ── 4. DISCIPLINE & METRICS ── */}
      <SectionHeader title="Discipline & Consistency" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="h-[300px]">
          <DisciplineScoreWidget />
        </div>
      </div>

      {/* ── 5. RECENT TRADES ── */}
      <SectionHeader title="Trade Log" />
      <div className="bg-zinc-950/50 border border-zinc-800/50 rounded-2xl backdrop-blur-md p-6">
        <RecentTradesTable />
      </div>

    </div>
  );
}
