"use client";

import { useCsvTrades } from "@/hooks/useCsvTrades";
import type { TradeData } from "@/hooks/useCsvTrades";
import { useMemo, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, AreaChart, Area, ScatterChart, Scatter, ZAxis
} from "recharts";
import { motion, AnimatePresence } from "framer-motion";
import { CalendarHeatmap } from "@/components/widgets/CalendarHeatmap";
import { RiskRewardMatrix } from "@/components/widgets/RiskRewardMatrix";
import { RetailSentimentGauge } from "@/components/widgets/RetailSentimentGauge";

const TOOLTIP_STYLE = {
  contentStyle: {
    background: "rgba(12, 12, 13, 0.9)",
    backdropFilter: "blur(8px)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 12,
    fontSize: 12,
    color: "#e8e8f0",
    boxShadow: "0 8px 32px rgba(0,0,0,0.4)"
  },
};

function SectionCard({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`relative rounded-xl border p-5 overflow-hidden group hover:border-white/20 transition-all duration-300 ${className}`} style={{ background: "rgba(12, 12, 13, 0.6)", backdropFilter: "blur(12px)", borderColor: "rgba(255,255,255,0.05)" }}>
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      <div className="text-[10px] font-bold uppercase tracking-widest mb-4 relative z-10" style={{ color: "var(--text-tertiary)" }}>{title}</div>
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
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <div className="text-[--text-tertiary] text-center max-w-sm">
          <div className="text-[40px] mb-3">{error ? "⚠️" : "📊"}</div>
          <div className="font-bold text-[--text-primary] mb-1">{error ? "Bridge Connection Error" : "No live trade data"}</div>
          <div className="text-[13px]">
            {error ? (
              <span className="text-[--loss]">{error}</span>
            ) : (
              "Live MT5 synchronization is active, but your account has zero closed deals in the last 90 days."
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      {/* Header & Filters */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-bold" style={{ fontFamily: "var(--font-display, Syne, sans-serif)", color: "var(--text-primary)" }}>
            Analytics
          </h1>
          <p className="text-[12px] mt-0.5" style={{ color: "var(--text-tertiary)" }}>
            {allTrades.length} lifetime trades imported · Live performance breakdown
          </p>
        </div>

        {/* Time Horizon Filter */}
        <div className="flex p-1 rounded-xl bg-[#0c0c0d]/80 border border-white/5 backdrop-blur-md shadow-lg w-fit">
          {["1W", "1M", "3M", "YTD", "ALL"].map((opt) => (
            <button
              key={opt}
              onClick={() => setTimeFilter(opt as any)}
              className={`relative px-4 py-1.5 text-xs font-bold rounded-lg transition-colors ${timeFilter === opt ? "text-white" : "text-gray-500 hover:text-gray-300"}`}
            >
              {timeFilter === opt && (
                <motion.div layoutId="activeFilter" className="absolute inset-0 bg-white/10 rounded-lg shadow-[0_0_10px_rgba(255,255,255,0.05)]" />
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
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            {[
              { label: "Win Rate", value: `${(analytics?.winRate || 0).toFixed(1)}%`, color: (analytics?.winRate || 0) >= 50 ? "#00c896" : "#ff4d6a" },
              { label: "Sharpe Ratio", value: `${sharpeRatio.toFixed(2)}`, color: sharpeRatio >= 1 ? "#00c896" : "#ff4d6a" },
              { label: "Profit Factor", value: `${(analytics?.profitFactor || 0).toFixed(2)}`, color: (analytics?.profitFactor || 0) >= 1 ? "#00c896" : "#ff4d6a" },
              { label: "Total Trades", value: `${analytics?.totalTrades || 0}`, color: "#ffffff" },
              { label: "Avg Win", value: `$${(analytics?.avgWin || 0).toFixed(2)}`, color: "#00c896" },
              { label: "Avg Loss", value: `-$${Math.abs(analytics?.avgLoss || 0).toFixed(2)}`, color: "#ff4d6a" },
              { label: "Expectancy", value: `$${expectancy.toFixed(2)}`, color: expectancy >= 0 ? "#00c896" : "#ff4d6a" },
              { label: "Net P&L", value: `$${((analytics?.totalProfit || 0)).toFixed(2)}`, color: (analytics?.totalProfit || 0) >= 0 ? "#00c896" : "#ff4d6a", sparklineData: pnlHistory },
            ].map((kpi, i) => (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
                key={kpi.label} 
                className="relative overflow-hidden rounded-xl border p-4 flex flex-col justify-center" 
                style={{ background: "rgba(12, 12, 13, 0.6)", backdropFilter: "blur(12px)", borderColor: "rgba(255,255,255,0.05)" }}
              >
                <div className="text-[9px] font-bold uppercase tracking-widest mb-1.5 relative z-10" style={{ color: "var(--text-tertiary)" }}>{kpi.label}</div>
                <div className="text-[20px] font-bold font-mono whitespace-nowrap relative z-10" style={{ color: kpi.color }}>{kpi.value}</div>
                
                {/* Sparkline for P&L or others if provided */}
                {kpi.sparklineData && (
                   <Sparkline data={kpi.sparklineData} color={kpi.color} />
                )}
              </motion.div>
            ))}
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
                  <AreaChart data={cumPnl} syncId="analyticsCharts">
                    <defs>
                      <linearGradient id="equityGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#00c896" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="#00c896" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="date" tick={{ fontSize: 9, fill: "#555568" }} tickLine={false} axisLine={false} minTickGap={30} />
                    <YAxis tick={{ fontSize: 10, fill: "#555568" }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} width={60} />
                    <Tooltip {...TOOLTIP_STYLE} formatter={(v: number) => [`$${v.toFixed(2)}`, "Equity"]} />
                    <Area type="monotone" dataKey="cumPnl" stroke="#00c896" strokeWidth={2} fill="url(#equityGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              </SectionCard>
              
              <SectionCard title="Drawdown Curve">
                <ResponsiveContainer width="100%" height={160}>
                  <AreaChart data={drawdownData} syncId="analyticsCharts">
                    <defs>
                      <linearGradient id="ddGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#ff4d6a" stopOpacity={0.4} />
                        <stop offset="100%" stopColor="#ff4d6a" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="date" hide />
                    <YAxis reversed={true} tick={{ fontSize: 10, fill: "#555568" }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} width={60} />
                    <Tooltip {...TOOLTIP_STYLE} formatter={(v: number) => [`$${v.toFixed(2)}`, "Drawdown"]} />
                    <Area type="monotone" dataKey="drawdown" stroke="#ff4d6a" strokeWidth={2} fill="url(#ddGrad)" />
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

        </motion.div>
      </AnimatePresence>
    </div>
  );
}
