"use client";

import { useMemo, useState, useEffect } from "react";
import { Sparkles, TrendingUp, TrendingDown, Target, Zap, RotateCcw, AlertTriangle, ArrowRight } from "lucide-react";
import { useCsvTrades } from "@/hooks/useCsvTrades";
import { useNews } from "@/hooks/useNews";
import { getBackendUrl, fetchWithAuth } from "@/lib/utils";
import { usePositions } from "@/hooks/usePositions";
import { useBridgeUrl } from "@/hooks/useBridgeUrl";

import { SessionTimeline } from "@/components/ui/SessionTimeline";
import { MarketHeatmapWidget } from "@/components/widgets/MarketHeatmapWidget";
import { AIMacroDeskSection } from "@/components/ui/MacroDeskCard";
import { EconomicNewsTicker } from "@/components/dashboard/widgets/EconomicNewsTicker";
import { DailyRiskWidget } from "@/components/dashboard/widgets/DailyRiskWidget";
import { TiltMonitorWidget } from "@/components/widgets/TiltMonitorWidget";
import DisciplineScoreWidget from "@/components/ui/DisciplineScoreWidget";
import { OpenPositionsList } from "@/components/dashboard/widgets/OpenPositionsList";
import { RecentTradesTable } from "@/components/dashboard/widgets/RecentTradesTable";
import { EquityCurveChart } from "@/components/dashboard/widgets/EquityCurveChart";
import { StrategyPerformance } from "@/components/dashboard/widgets/StrategyPerformance";
import { DailyBiasWidget } from "@/components/widgets/DailyBiasWidget";
import Link from "next/link";
import { motion } from "framer-motion";

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

export default function DashboardOS() {
  const { bridgeUrl } = useBridgeUrl();
  const { trades, refresh } = useCsvTrades();
  const { positions } = usePositions();
  
  const [mt5Data, setMt5Data] = useState<{
    balance: number;
    equity: number;
    profit: number;
    margin_level: number | null;
  }>({ balance: 0, equity: 0, profit: 0, margin_level: null });

  useEffect(() => {
    const fetchMt5Account = async () => {
      try {
        const res = await fetchWithAuth(`${bridgeUrl}/api/account`);
        if (res.ok) {
          const data = await res.json();
          setMt5Data({
            balance: data.balance ?? 0,
            equity: data.equity ?? data.balance ?? 0,
            profit: data.profit ?? 0,
            margin_level: data.margin_level > 0 ? data.margin_level : null
          });
        }
      } catch (e) {}
    };
    fetchMt5Account();
    const int = setInterval(fetchMt5Account, 5000);
    return () => clearInterval(int);
  }, [bridgeUrl]);

  // Dynamic greeting based on time of day
  const currentHour = new Date().getHours();
  let greeting = "GOOD EVENING";
  if (currentHour < 12) greeting = "GOOD MORNING";
  else if (currentHour < 18) greeting = "GOOD AFTERNOON";

  return (
    <div className="space-y-6 animate-fade-in pb-32 max-w-[1200px] mx-auto">
      
      {/* ── 1. MORNING BRIEF ── */}
      <div className="bg-[#050505] border border-[--border] rounded-3xl p-8 backdrop-blur-xl shadow-2xl relative overflow-hidden group">
        
        {/* Dynamic Background Glow */}
        <div className="absolute -top-[100px] -right-[100px] w-[400px] h-[400px] bg-[--bull]/5 blur-[120px] rounded-full pointer-events-none group-hover:bg-[--bull]/10 transition-colors duration-1000" />
        <div className="absolute -bottom-[100px] -left-[100px] w-[300px] h-[300px] bg-blue-500/5 blur-[100px] rounded-full pointer-events-none" />

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10 relative z-10">
          <div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-gray-100 to-gray-500 font-display">
              {greeting}, ROS.
            </h1>
            <p className="text-gray-400 text-sm mt-2 flex items-center gap-2 font-medium">
              <Sparkles className="w-4 h-4 text-[--bull] animate-pulse" />
              System loaded. Here is your trading outlook for today.
            </p>
          </div>
          <div className="w-full md:w-auto min-w-[300px]">
            <SessionTimeline />
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-zinc-900/50 p-4 rounded-xl border border-zinc-800">
            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-1">Top Signal</p>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold">XAUUSD</span>
              <span className="text-emerald-400 font-bold bg-emerald-400/10 px-2 py-0.5 rounded text-sm">BUY 95%</span>
            </div>
          </div>
          <div className="bg-zinc-900/50 p-4 rounded-xl border border-zinc-800">
            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-1">Today's Risk</p>
            <div className="flex items-center gap-2">
              <ShieldIcon className="w-4 h-4 text-emerald-400" />
              <span className="text-lg font-bold text-emerald-400">LOW</span>
            </div>
          </div>
          <div className="bg-zinc-900/50 p-4 rounded-xl border border-zinc-800">
            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-1">AI Recommendation</p>
            <div className="text-sm font-medium text-zinc-300">
              Maximum 3 trades today
            </div>
          </div>
          <div className="bg-zinc-900/50 p-4 rounded-xl border border-zinc-800">
            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-1">Best Setup</p>
            <div className="text-sm font-medium text-zinc-300">
              Gold Pullback
            </div>
          </div>
        </div>
      </div>

      {/* ── 2. TODAY'S MARKET ── */}
      <SectionHeader title="Today's Market" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <MarketHeatmapWidget />
          <EconomicNewsTicker />
        </div>
        <div className="space-y-6">
          <DailyBiasWidget />
        </div>
      </div>

      {/* ── 3. YOUR ACCOUNT ── */}
      <SectionHeader title="Your Account" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard label="Balance" value={`$${mt5Data.balance.toFixed(2)}`} />
        <StatCard label="Today's PnL" value={`$${mt5Data.profit.toFixed(2)}`} isProfit={mt5Data.profit >= 0} />
        <StatCard label="Drawdown" value="0.0%" />
        <StatCard label="Margin Level" value={mt5Data.margin_level ? `${mt5Data.margin_level.toFixed(1)}%` : "N/A"} />
        <div className="col-span-1 lg:col-span-1">
           <DisciplineScoreWidget compact />
        </div>
      </div>

      {/* ── 4. ACTIVE TRADES ── */}
      <SectionHeader title="Active Trades" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <OpenPositionsList positions={positions || []} />
        </div>
        <div>
          <TiltMonitorWidget trades={trades || []} />
        </div>
      </div>

      {/* ── 4b. RISK MONITOR ── */}
      <DailyRiskWidget trades={trades || []} balance={mt5Data.balance} equity={mt5Data.equity} />

      {/* ── 5. TODAY'S PERFORMANCE ── */}
      <SectionHeader title="Today's Performance" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <EquityCurveChart />
        </div>
        <div>
          <StrategyPerformance />
        </div>
      </div>

      {/* ── 6. QUICK ACTIONS ── */}
      <SectionHeader title="Quick Actions" />
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <ActionBtn icon={<RotateCcw />} label="Sync MT5" onClick={refresh} />
        <ActionBtn icon={<Zap />} label="Execute Trade" href="/terminal" />
        <ActionBtn icon={<Target />} label="Open Scanner" href="/signals" />
        <ActionBtn icon={<AlertTriangle />} label="Calculate Risk" href="/risk-hub" />
        <ActionBtn icon={<TrendingUp />} label="Focus Mode" onClick={() => {}} />
        <ActionBtn icon={<Sparkles />} label="AI Desk" href="/ai-desk" highlight />
      </div>
    </div>
  );
}

function ShieldIcon({ className }: { className?: string }) {
  return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2-1 4-2 7-2 2.5 0 4.5 1 6.5 2a1 1 0 0 1 1 1v7z"/></svg>;
}

function StatCard({ label, value, isProfit }: { label: string; value: string; isProfit?: boolean }) {
  // Determine dynamic styling based on profit state
  const isNeutral = isProfit === undefined;
  
  const bgStyle = isProfit 
    ? "bg-gradient-to-br from-[#00dc82]/10 to-transparent border-[#00dc82]/30 shadow-[inset_0_1px_10px_rgba(0,220,130,0.1)]" 
    : isProfit === false 
      ? "bg-gradient-to-br from-[#ef4444]/10 to-transparent border-[#ef4444]/30 shadow-[inset_0_1px_10px_rgba(239,68,68,0.1)]"
      : "bg-[#0c0c0d] border-[--border] hover:border-gray-600 shadow-[inset_0_1px_2px_rgba(255,255,255,0.05)]";

  const textColor = isProfit 
    ? "text-[--bull] drop-shadow-[0_0_8px_rgba(0,220,130,0.4)]" 
    : isProfit === false 
      ? "text-[--bear] drop-shadow-[0_0_8px_rgba(239,68,68,0.4)]"
      : "text-gray-100";

  return (
    <div className={`p-5 rounded-2xl border flex flex-col justify-center min-h-[105px] overflow-hidden relative group transition-all duration-500 hover:-translate-y-1 hover:shadow-xl ${bgStyle}`}>
      <span className="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-1.5 truncate group-hover:text-gray-400 transition-colors">
        {label}
      </span>
      <span className={`text-2xl font-bold font-mono tracking-tight ${textColor}`}>
        {value}
      </span>
      
      {/* Decorative corner glow on hover */}
      <div className="absolute -bottom-4 -right-4 w-12 h-12 bg-white/5 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
    </div>
  );
}

function ActionBtn({ icon, label, href, onClick, highlight }: any) {
  const content = (
    <div className={`flex flex-col items-center justify-center p-6 rounded-2xl border transition-all hover:-translate-y-1 ${highlight ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20' : 'bg-zinc-900/50 border-zinc-800 text-zinc-300 hover:bg-zinc-800/80 hover:text-white'}`}>
      <div className="mb-3">{icon}</div>
      <span className="text-xs font-bold uppercase tracking-wider text-center">{label}</span>
    </div>
  );
  if (href) return <Link href={href}>{content}</Link>;
  return <button onClick={onClick} className="w-full h-full cursor-pointer">{content}</button>;
}
