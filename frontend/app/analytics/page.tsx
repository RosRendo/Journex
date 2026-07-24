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
    background: "rgba(5, 5, 5, 0.9)",
    backdropFilter: "blur(12px)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 12,
    fontSize: 12,
    color: "#e8e8f0",
    boxShadow: "0 8px 32px rgba(0,0,0,0.6)"
  },
};

function SectionCard({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`relative rounded-2xl border border-[--border] bg-[#050505] p-5 overflow-hidden group shadow-2xl transition-all duration-300 hover:border-white/10 ${className}`}>
      {/* Subtle ambient glow */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none" />
      <div className="absolute -top-[50px] -right-[50px] w-[150px] h-[150px] bg-white/[0.02] blur-[50px] rounded-full pointer-events-none group-hover:bg-white/[0.04] transition-colors" />
      
      <div className="text-[10px] font-bold uppercase tracking-widest mb-4 relative z-10 text-gray-400 group-hover:text-gray-300 transition-colors">
        {title}
      </div>
      <div className="relative z-10 h-full flex flex-col">
        {children}
      </div>
    </div>
  );
}

// Minimal sparkline component for KPI cards
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
          <Area type="monotone" dataKey="val" stroke={color} strokeWidth={1.5} fill={`url(#spark-${safeId})`} isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function Analytics() {
  const { trades: allTrades, analytics: allAnalytics, loading, error } = useCsvTrades();
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
  }, []);

  // Filter trades based on time horizon
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

  // Recalculate basic analytics for filtered trades
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

  const winLossData = useMemo(() => [
    { name: "Wins", value: trades.filter((t: TradeData) => t.profit > 0).length },
    { name: "Losses", value: trades.filter((t: TradeData) => t.profit < 0).length },
    { name: "B/E", value: trades.filter((t: TradeData) => t.profit === 0).length },
  ].filter((d) => d.value > 0), [trades]);

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

  const symbolPerf = useMemo(() => {
    const map = new Map<string, { pnl: number; trades: number; wins: number }>();
    trades.forEach((t: TradeData) => {
      if (!map.has(t.pair)) map.set(t.pair, { pnl: 0, trades: 0, wins: 0 });
      const s = map.get(t.pair)!; s.pnl += t.profit; s.trades++; if (t.profit > 0) s.wins++;
    });
    return Array.from(map.entries()).map(([symbol, s]) => ({ symbol, pnl: s.pnl, trades: s.trades, winRate: (s.wins / s.trades) * 100 })).sort((a, b) => b.pnl - a.pnl);
  }, [trades]);

  const expectancy = useMemo(() => {
    if(!analytics) return 0;
    const wr = analytics.winRate / 100;
    const lr = 1 - wr;
    return (wr * (analytics.avgWin || 0)) + (lr * (analytics.avgLoss || 0));
  }, [analytics]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-2 border-[--accent] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || allTrades.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-4 text-center">
        {/* Premium Wireframe Empty State */}
        <div className="w-full max-w-[300px] mb-6 relative">
          <div className="absolute inset-0 bg-gradient-to-t from-[#050505] to-transparent z-10" />
          <div className="absolute inset-0 flex items-end justify-center pb-4 pointer-events-none opacity-[0.05]">
             <svg viewBox="0 0 100 50" className="w-[100%] h-[80%] preserve-3d" preserveAspectRatio="none">
               <path d="M0,50 Q20,40 40,30 T80,20 T100,5" fill="none" stroke="white" strokeWidth="2" />
               <path d="M0,50 Q20,40 40,30 T80,20 T100,5 L100,50 L0,50 Z" fill="white" opacity="0.5" />
             </svg>
          </div>
        </div>
        <div className="text-gray-500 mb-2">
          {error ? (
            <span className="text-4xl">⚠️</span>
          ) : (
            <span className="text-4xl opacity-50">📉</span>
          )}
        </div>
        <h2 className="text-sm uppercase tracking-widest font-bold text-gray-200">
          {error ? "Bridge Connection Error" : "Awaiting Trade Data"}
        </h2>
        <p className="text-[11px] text-gray-500 max-w-[300px] leading-relaxed">
          {error ? (
            <span className="text-[--bear]">{error}</span>
          ) : (
            "Live MT5 synchronization is active. Execute trades in the terminal or wait for your algorithm to log deals to see analytics."
          )}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      {/* Header & Filters */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
        <div>
          <h1 className="text-4xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-gray-100 to-gray-500 font-display">
            ANALYTICS
          </h1>
          <p className="text-[12px] mt-2 font-medium text-gray-400">
            {allTrades.length} lifetime trades imported <span className="mx-2 opacity-30">|</span> Live performance breakdown
          </p>
        </div>

        {/* Time Horizon Filter */}
        <div className="flex p-1 rounded-xl bg-[#050505] border border-white/10 shadow-[inset_0_2px_10px_rgba(255,255,255,0.02)] w-fit backdrop-blur-xl">
          {["1W", "1M", "3M", "YTD", "ALL"].map((opt) => (
            <button
              key={opt}
              onClick={() => setTimeFilter(opt as any)}
              className={`relative px-5 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-colors ${timeFilter === opt ? "text-white" : "text-gray-500 hover:text-gray-300"}`}
            >
              {timeFilter === opt && (
                <motion.div layoutId="activeFilter" className="absolute inset-0 bg-white/10 rounded-lg shadow-[0_0_15px_rgba(255,255,255,0.05)] border border-white/10" />
              )}
              <span className="relative z-10">{opt}</span>
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div 
          key={timeFilter}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3 }}
          className="space-y-6"
        >
          {/* Top KPI strip */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
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
              const bgStyle = kpi.isNeutral 
                ? "bg-[#050505] border-[--border]" 
                : kpi.isProfit 
                  ? "bg-gradient-to-br from-[#00dc82]/10 to-transparent border-[#00dc82]/30 shadow-[inset_0_1px_10px_rgba(0,220,130,0.1)]" 
                  : "bg-gradient-to-br from-[#ef4444]/10 to-transparent border-[#ef4444]/30 shadow-[inset_0_1px_10px_rgba(239,68,68,0.1)]";
              
              const textColor = kpi.isNeutral 
                ? "text-gray-100" 
                : kpi.isProfit 
                  ? "text-[--bull] drop-shadow-[0_0_8px_rgba(0,220,130,0.4)]" 
                  : "text-[--bear] drop-shadow-[0_0_8px_rgba(239,68,68,0.4)]";

              const colorHex = kpi.isNeutral ? "#ffffff" : kpi.isProfit ? "#00dc82" : "#ef4444";

              return (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.05 }}
                  key={kpi.label} 
                  className={`relative overflow-hidden rounded-2xl border p-4 flex flex-col justify-center min-h-[90px] group transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl ${bgStyle}`} 
                >
                  <div className="text-[9px] font-black uppercase tracking-widest mb-1.5 relative z-10 text-gray-500 group-hover:text-gray-400 transition-colors">{kpi.label}</div>
                  <div className={`text-lg font-bold font-mono whitespace-nowrap relative z-10 tracking-tight ${textColor}`}>{kpi.value}</div>
                  
                  {/* Decorative corner glow */}
                  <div className="absolute -bottom-4 -right-4 w-10 h-10 bg-white/5 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

                  {/* Sparkline for P&L or others if provided */}
                  {kpi.sparklineData && (
                     <Sparkline data={kpi.sparklineData} color={colorHex} />
                  )}
                </motion.div>
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

            {/* 2-col: Equity curve + Matrix */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 space-y-4">
              <SectionCard title="Equity Curve (Cumulative P&L)">
                <ResponsiveContainer width="100%" height={240}>
                  <AreaChart data={cumPnl} syncId="analyticsCharts" margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="equityGradBull" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#00dc82" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="#00dc82" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="equityGradBear" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#ef4444" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 9, fill: "#6b7280", fontFamily: 'monospace' }} tickLine={false} axisLine={false} minTickGap={30} />
                    <YAxis tick={{ fontSize: 10, fill: "#6b7280", fontFamily: 'monospace' }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} width={60} />
                    <Tooltip {...TOOLTIP_STYLE} cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1, strokeDasharray: '4 4' }} formatter={(v: number) => [`$${v.toFixed(2)}`, "Equity"]} />
                    {(() => {
                      const finalPnl = cumPnl.length > 0 ? cumPnl[cumPnl.length - 1].cumPnl : 0;
                      const isProfit = finalPnl >= 0;
                      return (
                        <Area 
                          type="monotone" 
                          dataKey="cumPnl" 
                          stroke={isProfit ? "#00dc82" : "#ef4444"} 
                          strokeWidth={2} 
                          fill={isProfit ? "url(#equityGradBull)" : "url(#equityGradBear)"} 
                          activeDot={{ r: 5, strokeWidth: 0, fill: '#fff', style: { filter: `drop-shadow(0 0 8px ${isProfit ? '#00dc82' : '#ef4444'})` } }}
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
                        <stop offset="0%" stopColor="#ef4444" stopOpacity={0.4} />
                        <stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                    <XAxis dataKey="date" hide />
                    <YAxis reversed={true} tick={{ fontSize: 10, fill: "#6b7280", fontFamily: 'monospace' }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} width={60} />
                    <Tooltip {...TOOLTIP_STYLE} cursor={{ stroke: 'rgba(239,68,68,0.3)', strokeWidth: 1, strokeDasharray: '4 4' }} formatter={(v: number) => [`$${v.toFixed(2)}`, "Drawdown"]} />
                    <Area 
                      type="monotone" 
                      dataKey="drawdown" 
                      stroke="#ef4444" 
                      strokeWidth={2} 
                      fill="url(#ddGrad)" 
                      activeDot={{ r: 5, strokeWidth: 0, fill: '#fff', style: { filter: 'drop-shadow(0 0 8px #ef4444)' } }}
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
                <XAxis dataKey="date" tick={{ fontSize: 9, fill: "#555568" }} tickLine={false} axisLine={false} minTickGap={20} />
                <YAxis tick={{ fontSize: 10, fill: "#555568" }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} width={60} />
                <Tooltip {...TOOLTIP_STYLE} formatter={(v: number) => [`$${v.toFixed(2)}`, "P&L"]} />
                <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>
                  {dailyPnl.map((d, i) => <Cell key={i} fill={d.pnl >= 0 ? "#00c896" : "#ff4d6a"} />)}
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
  );
}
