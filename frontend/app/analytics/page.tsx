"use client";

import { useCsvTrades } from "@/hooks/useCsvTrades";
import type { TradeData } from "@/hooks/useCsvTrades";
import { useMemo, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, AreaChart, Area, ScatterChart, Scatter, ZAxis, CartesianGrid
} from "recharts";
import { motion, AnimatePresence } from "framer-motion";
import { CalendarHeatmap } from "@/components/widgets/CalendarHeatmap";
import { RiskRewardMatrix } from "@/components/widgets/RiskRewardMatrix";
import { RetailSentimentGauge } from "@/components/widgets/RetailSentimentGauge";
import { MistakeCostAnalyzer } from "@/components/widgets/MistakeCostAnalyzer";
import { CapitalFlow } from "@/components/ui/CapitalFlow";
import { TradeDurationScatterPlot } from "@/components/widgets/TradeDurationScatterPlot";
import { MonthlyPerformanceGrid } from "@/components/dashboard/widgets/MonthlyPerformanceGrid";
import { SessionPerformanceGrid } from "@/components/dashboard/widgets/SessionPerformanceGrid";
import { useEffect } from "react";
import { getBackendUrl, fetchWithAuth } from "@/lib/utils";

const TOOLTIP_STYLE = {
  contentStyle: {
    background: "rgba(17, 17, 24, 0.95)",
    border: "1px solid rgba(63, 63, 70, 0.4)",
    borderRadius: 8,
    fontSize: 10,
    color: "#fff",
    fontFamily: "monospace",
    boxShadow: "0 8px 32px rgba(0,0,0,0.6)"
  },
};

function SectionCard({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`relative rounded-xl border border-[rgba(255,255,255,0.07)] bg-[#101014] p-5 overflow-hidden transition-all duration-300 ${className}`}>
      <div className="text-[9px] font-bold uppercase tracking-widest mb-4 relative z-10 text-zinc-500 font-mono">
        {title}
      </div>
      <div className="relative z-10 h-full flex flex-col">
        {children}
      </div>
    </div>
  );
}

function Sparkline({ data, color }: { data: number[]; color: string }) {
  if (data.length < 2) return null;
  const safeId = color.replace(/[^a-zA-Z0-9]/g, "_");
  const chartData = data.map((v, i) => ({ val: v, index: i }));
  return (
    <div className="absolute bottom-0 left-0 right-0 h-1/2 opacity-20 pointer-events-none">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={`spark-${safeId}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={1} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area type="monotone" dataKey="val" stroke={color} strokeWidth={1} fill={`url(#spark-${safeId})`} isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function Analytics() {
  const [dbAccounts, setDbAccounts] = useState<any[]>([]);
  const [selectedAccountNumber, setSelectedAccountNumber] = useState<string>("all");
  const { trades: allTrades, analytics: allAnalytics, loading, error } = useCsvTrades(
    selectedAccountNumber === "all" ? undefined : selectedAccountNumber
  );
  const [timeFilter, setTimeFilter] = useState<"1W" | "1M" | "3M" | "YTD" | "ALL">("ALL");
  const [dashboardStats, setDashboardStats] = useState<{
    capitalFlow: { label: string, value: number }[];
  } | null>(null);

  useEffect(() => {
    const fetchDashboardStats = async () => {
      try {
        const res = await fetchWithAuth(`${getBackendUrl()}/api/dashboard/stats`);
        if (res.ok) {
          const data = await res.json();
          setDashboardStats(data);
        }
      } catch (e) {
        console.error("Failed to fetch dashboard stats", e);
      }
    };
    fetchDashboardStats();

    fetchWithAuth(`${getBackendUrl()}/api/accounts`)
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data) {
          setDbAccounts(data.data);
        }
      })
      .catch(console.error);
  }, []);

  const trades = useMemo(() => {
    if (timeFilter === "ALL") return allTrades;
    
    const now = new Date().getTime();
    const msPerDay = 24 * 60 * 60 * 1000;
    
    let cutoff = 0;
    if (timeFilter === "1W") cutoff = now - (7 * msPerDay);
    else if (timeFilter === "1M") cutoff = now - (30 * msPerDay);
    else if (timeFilter === "3M") cutoff = now - (90 * msPerDay);
    else if (timeFilter === "YTD") {
      const startOfYear = new Date(new Date().getFullYear(), 0, 1).getTime();
      cutoff = startOfYear;
    }
    
    return allTrades.filter(t => new Date(t.date).getTime() >= cutoff);
  }, [allTrades, timeFilter]);

  const analytics = useMemo(() => {
    if (timeFilter === "ALL") return allAnalytics;
    if (trades.length === 0) return null;
    
    const wins = trades.filter((t: TradeData) => t.profit > 0);
    const losses = trades.filter((t: TradeData) => t.profit < 0);
    const totalProfit = trades.reduce((s: number, t: TradeData) => s + t.profit, 0);
    const totalWins = wins.reduce((s: number, t: TradeData) => s + t.profit, 0);
    const totalLosses = Math.abs(losses.reduce((s: number, t: TradeData) => s + t.profit, 0));
    
    return {
      totalTrades: trades.length,
      winRate: (wins.length / trades.length) * 100,
      totalProfit,
      profitFactor: totalLosses > 0 ? totalWins / totalLosses : 0,
      avgWin: wins.length > 0 ? totalWins / wins.length : 0,
      avgLoss: losses.length > 0 ? -totalLosses / losses.length : 0,
    };
  }, [trades, allAnalytics, timeFilter]);

  const { cumPnl, drawdownData, pnlHistory } = useMemo(() => {
    let cum = 0;
    let hwm = 0;
    const cpArr: { date: string; cumPnl: number }[] = [];
    const ddArr: { date: string; drawdown: number; maxDrawdown: number }[] = [];
    const pnlHist: number[] = [];
    
    [...trades].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .forEach((t: TradeData) => { 
        cum += t.profit; 
        pnlHist.push(cum);
        if (cum > hwm) hwm = cum;
        const dd = cum - hwm;
        const dateStr = new Date(t.date).toLocaleDateString("en-US", { month: "short", day: "numeric" });
        cpArr.push({ date: dateStr, cumPnl: Math.round(cum * 100) / 100 });
        ddArr.push({ date: dateStr, drawdown: Math.round(dd * 100) / 100, maxDrawdown: 0 });
      });
      
    let absoluteMaxDd = 0;
    ddArr.forEach(d => { if (d.drawdown < absoluteMaxDd) absoluteMaxDd = d.drawdown; });
    ddArr.forEach(d => { d.maxDrawdown = absoluteMaxDd; });
      
    return { cumPnl: cpArr.slice(-60), drawdownData: ddArr.slice(-60), pnlHistory: pnlHist.slice(-20) };
  }, [trades]);

  const sharpeRatio = useMemo(() => {
    if (trades.length < 2) return 0;
    const profits = trades.map((t: TradeData) => t.profit);
    const mean = profits.reduce((a, b) => a + b, 0) / profits.length;
    const variance = profits.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (profits.length - 1);
    const stdev = Math.sqrt(variance);
    return stdev === 0 ? 0 : (mean / stdev) * Math.sqrt(100);
  }, [trades]);

  const dailyPnl = useMemo(() => {
    const map = new Map<string, number>();
    trades.forEach((t: TradeData) => { const d = new Date(t.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }); map.set(d, (map.get(d) || 0) + t.profit); });
    return Array.from(map.entries()).map(([date, pnl]) => ({ date, pnl: Math.round(pnl * 100) / 100 })).slice(-30);
  }, [trades]);

  const expectancy = useMemo(() => {
    if(!analytics) return 0;
    const wr = analytics.winRate / 100;
    const lr = 1 - wr;
    return (wr * (analytics.avgWin || 0)) + (lr * (analytics.avgLoss || 0));
  }, [analytics]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border border-[rgba(255,255,255,0.07)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || allTrades.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-4 text-center">
        <div className="text-zinc-650 text-3xl font-bold font-mono">📉 Awaiting Data</div>
        <h2 className="text-xs uppercase tracking-widest font-black text-zinc-400 font-mono">No Trades Found</h2>
        <p className="text-[10px] text-zinc-550 max-w-[300px] leading-relaxed font-mono">
          {error ? <span className="text-red-405">{error}</span> : "Synchronize your MT5 bridge account to download and construct analytical matrix reports."}
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-[#09090b] text-[#f4f4f5] flex flex-col pb-12 font-sans">
      
      {/* ── TOPBAR ── */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-[rgba(255,255,255,0.07)] sticky top-0 z-20 bg-[#09090b]">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-sm font-bold tracking-tight text-[#f4f4f5]">Analytics Engine</h1>
            <p className="text-[9px] font-bold uppercase tracking-widest font-mono text-[#71717a] mt-0.5">
              {allTrades.length} lifetime trades imported <span className="mx-1 opacity-30">|</span> Live performance breakdown
            </p>
          </div>

          <div className="flex bg-[#101014] border border-[rgba(255,255,255,0.07)] px-2.5 py-1 rounded">
            <select
              value={selectedAccountNumber}
              onChange={(e) => setSelectedAccountNumber(e.target.value)}
              className="bg-transparent border-none text-[10px] font-bold text-[#f4f4f5] focus:outline-none cursor-pointer uppercase tracking-wider font-mono"
            >
              <option value="all" className="bg-[#101014] text-white">Account: All</option>
              {dbAccounts.map((acc) => (
                <option key={acc.id} value={acc.accountNumber} className="bg-[#101014] text-white">
                  {acc.brokerName || acc.mt5Server} #{acc.accountNumber}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Filters Group */}
        <div className="flex gap-0 border-l border-[rgba(255,255,255,0.07)]">
          {["1W", "1M", "3M", "YTD", "ALL"].map((opt) => (
            <button
              key={opt}
              onClick={() => setTimeFilter(opt as any)}
              className={`py-3 px-4 text-[9px] uppercase tracking-widest font-bold font-mono transition-all border-b-2 whitespace-nowrap ${
                timeFilter === opt ? "border-[#20e0b2] text-[#20e0b2]" : "border-transparent text-[#71717a] hover:text-[#a1a1aa]"
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>

      {/* Main container */}
      <div className="flex-1 w-full p-6 space-y-4">

      <AnimatePresence mode="wait">
        <motion.div 
          key={timeFilter}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3 }}
          className="space-y-4"
        >
          {/* Top KPI strip */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 font-mono text-[10px]">
            {[
              { label: "Win Rate", value: `${(analytics?.winRate || 0).toFixed(1)}%`, isProfit: (analytics?.winRate || 0) >= 50 },
              { label: "Sharpe Ratio", value: `${sharpeRatio.toFixed(2)}`, isProfit: sharpeRatio >= 1 },
              { label: "Profit Factor", value: `${(analytics?.profitFactor || 0).toFixed(2)}`, isProfit: (analytics?.profitFactor || 0) >= 1 },
              { label: "Total Trades", value: `${analytics?.totalTrades || 0}`, isNeutral: true },
              { label: "Avg Win", value: `$${(analytics?.avgWin || 0).toFixed(2)}`, isProfit: true },
              { label: "Avg Loss", value: `-$${Math.abs(analytics?.avgLoss || 0).toFixed(2)}`, isProfit: false },
              { label: "Expectancy", value: `$${expectancy.toFixed(2)}`, isProfit: expectancy >= 0 },
              { label: "Net P&L", value: `$${((analytics?.totalProfit || 0)).toFixed(2)}`, isProfit: (analytics?.totalProfit || 0) >= 0, sparklineData: pnlHistory },
            ].map((kpi, i) => {
              const bgStyle = "bg-[#101014] border border-[rgba(255,255,255,0.07)]";
              const textColor = kpi.isNeutral 
                ? "text-zinc-200" 
                : kpi.isProfit 
                  ? "text-[#20e0b2]" 
                  : "text-[#ff5c73]";

              const colorHex = kpi.isNeutral ? "#ffffff" : kpi.isProfit ? "#20e0b2" : "#ff5c73";

              return (
                <div 
                  key={kpi.label} 
                  className={`relative overflow-hidden rounded-lg p-4 flex flex-col justify-center min-h-[90px] ${bgStyle}`} 
                >
                  <div className="text-[8px] font-black uppercase tracking-widest mb-1.5 text-zinc-500">{kpi.label}</div>
                  <div className={`text-sm font-bold whitespace-nowrap tracking-tight ${textColor}`}>{kpi.value}</div>
                  {kpi.sparklineData && (
                     <Sparkline data={kpi.sparklineData} color={colorHex} />
                  )}
                </div>
              );
            })}
          </div>

          {/* Heatmap & Retail Sentiment Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <SectionCard title="P&L Calendar Matrix (YTD)">
                 <CalendarHeatmap trades={allTrades} />
              </SectionCard>
            </div>
            <div className="lg:col-span-1">
              <RetailSentimentGauge />
            </div>
          </div>

          {/* Equity curve + Matrix */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 space-y-4">
              <SectionCard title="Equity Curve (Cumulative P&L)">
                <ResponsiveContainer width="100%" height={240}>
                  <AreaChart data={cumPnl} syncId="analyticsCharts" margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="equityGradBull" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#20e0b2" stopOpacity={0.2} />
                        <stop offset="100%" stopColor="#20e0b2" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="equityGradBear" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#ff5c73" stopOpacity={0.2} />
                        <stop offset="100%" stopColor="#ff5c73" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 8, fill: "#71717a", fontFamily: 'monospace' }} tickLine={false} axisLine={false} minTickGap={30} />
                    <YAxis tick={{ fontSize: 9, fill: "#71717a", fontFamily: 'monospace' }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} width={60} />
                    <Tooltip {...TOOLTIP_STYLE} cursor={{ stroke: 'rgba(255,255,255,0.05)', strokeWidth: 1 }} formatter={(v: number) => [`$${v.toFixed(2)}`, "Equity"]} />
                    {(() => {
                      const finalPnl = cumPnl.length > 0 ? cumPnl[cumPnl.length - 1].cumPnl : 0;
                      const isProfit = finalPnl >= 0;
                      return (
                        <Area 
                          type="monotone" 
                          dataKey="cumPnl" 
                          stroke={isProfit ? "#20e0b2" : "#ff5c73"} 
                          strokeWidth={1.5} 
                          fill={isProfit ? "url(#equityGradBull)" : "url(#equityGradBear)"} 
                          activeDot={{ r: 4, strokeWidth: 0, fill: '#fff' }}
                        />
                      )
                    })()}
                  </AreaChart>
                </ResponsiveContainer>
              </SectionCard>
              
              <SectionCard title="Drawdown Curve">
                <ResponsiveContainer width="100%" height={160}>
                  <AreaChart data={drawdownData} syncId="analyticsCharts" margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="ddGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#ff5c73" stopOpacity={0.2} />
                        <stop offset="100%" stopColor="#ff5c73" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                    <XAxis dataKey="date" hide />
                    <YAxis reversed={true} tick={{ fontSize: 9, fill: "#71717a", fontFamily: 'monospace' }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} width={60} />
                    <Tooltip {...TOOLTIP_STYLE} cursor={{ stroke: 'rgba(239,68,68,0.2)', strokeWidth: 1 }} formatter={(v: number) => [`$${v.toFixed(2)}`, "Drawdown"]} />
                    <Area 
                      type="monotone" 
                      dataKey="drawdown" 
                      stroke="#ff5c73" 
                      strokeWidth={1.5} 
                      fill="url(#ddGrad)" 
                      activeDot={{ r: 4, strokeWidth: 0, fill: '#fff' }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </SectionCard>
            </div>

            <SectionCard title="Pair Efficiency Matrix (Win Rate vs R:R)" className="h-full">
               <RiskRewardMatrix trades={trades} />
            </SectionCard>
          </div>

          {/* Daily P&L bars */}
          <SectionCard title="Daily P&L (Last 30 Days)">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={dailyPnl}>
                <XAxis dataKey="date" tick={{ fontSize: 8, fill: "#71717a" }} tickLine={false} axisLine={false} minTickGap={20} />
                <YAxis tick={{ fontSize: 9, fill: "#71717a" }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} width={60} />
                <Tooltip {...TOOLTIP_STYLE} formatter={(v: number) => [`$${v.toFixed(2)}`, "P&L"]} />
                <Bar dataKey="pnl" radius={[2, 2, 0, 0]}>
                  {dailyPnl.map((d, i) => <Cell key={i} fill={d.pnl >= 0 ? "#20e0b2" : "#ff5c73"} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </SectionCard>

          {/* Deep Dive Widgets */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
             <div className="h-[400px]">
                <TradeDurationScatterPlot trades={trades} />
             </div>
             <div className="h-[400px]">
                <MistakeCostAnalyzer />
             </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
             <div className="lg:col-span-8">
                <SessionPerformanceGrid trades={trades} />
             </div>
             <div className="lg:col-span-4 h-[450px]">
                <CapitalFlow data={dashboardStats?.capitalFlow || []} loading={!dashboardStats} />
             </div>
          </div>

          <MonthlyPerformanceGrid trades={trades} />

         </motion.div>
       </AnimatePresence>
     </div>
   </div>
   );
 }
