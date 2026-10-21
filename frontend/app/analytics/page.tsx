"use client";

import React, { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { useCsvTrades, type TradeData } from "@/hooks/useCsvTrades";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  AreaChart, Area, CartesianGrid
} from "recharts";
import { motion, AnimatePresence } from "framer-motion";
import {
  TrendingUp, TrendingDown, ArrowLeft, ExternalLink, Activity,
  Layers, Clock, Compass, ShieldAlert, Sparkles, SlidersHorizontal,
  Calendar, Award, BookOpen, BarChart3, CheckCircle2, BrainCircuit
} from "lucide-react";

import { CalendarHeatmap } from "@/components/widgets/CalendarHeatmap";
import { RiskRewardMatrix } from "@/components/widgets/RiskRewardMatrix";
import { RetailSentimentGauge } from "@/components/widgets/RetailSentimentGauge";
import { MistakeCostAnalyzer } from "@/components/widgets/MistakeCostAnalyzer";
import { CapitalFlow } from "@/components/ui/CapitalFlow";
import { TradeDurationScatterPlot } from "@/components/widgets/TradeDurationScatterPlot";
import { MonthlyPerformanceGrid } from "@/components/dashboard/widgets/MonthlyPerformanceGrid";
import { SessionPerformanceGrid } from "@/components/dashboard/widgets/SessionPerformanceGrid";
import { getBackendUrl, fetchWithAuth } from "@/lib/utils";

const TOOLTIP_STYLE = {
  contentStyle: {
    background: "#121217",
    border: "1px solid rgba(255, 255, 255, 0.1)",
    borderRadius: 8,
    fontSize: 11,
    color: "#fff",
    fontFamily: "monospace",
    boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
  },
};

// ── COCKPIT RADIAL RING DIAL (80% Visual) ──
function CockpitRadialDial({
  value,
  max = 100,
  label,
  sublabel,
  displayVal,
  color = "#20e0b2",
  size = 76,
  strokeWidth = 5,
}: {
  value: number;
  max?: number;
  label: string;
  sublabel?: string;
  displayVal?: string | number;
  color?: string;
  size?: number;
  strokeWidth?: number;
}) {
  const radius = (size / 2) - strokeWidth - 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(Math.max(value / max, 0), 1);
  const strokeDashoffset = circumference - progress * circumference;

  return (
    <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-[#0e0e12] border border-white/8 hover:border-white/15 transition-all">
      <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
        <svg className="-rotate-90" style={{ width: size, height: size }}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth={strokeWidth}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-700 ease-out"
          />
        </svg>
        <div className="absolute flex flex-col items-center justify-center text-center">
          <span className="font-mono font-black text-sm text-white tracking-tight">
            {displayVal !== undefined ? displayVal : `${Math.round(value)}%`}
          </span>
        </div>
      </div>
      <span className="text-[9px] font-black uppercase tracking-wider text-zinc-300 mt-1.5">
        {label}
      </span>
      {sublabel && (
        <span className="text-[8px] font-mono text-zinc-500 uppercase mt-0.5">
          {sublabel}
        </span>
      )}
    </div>
  );
}

function SectionCard({
  title,
  subtitle,
  badge,
  children,
  className = "",
}: {
  title: string;
  subtitle?: string;
  badge?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`relative rounded-xl border border-white/8 bg-[#0d0d11] p-4 sm:p-5 overflow-hidden transition-all duration-300 ${className}`}>
      <div className="flex items-center justify-between pb-3 border-b border-white/5 mb-4">
        <div>
          <span className="text-[10px] font-black uppercase tracking-wider text-zinc-300 font-mono flex items-center gap-2">
            {title}
          </span>
          {subtitle && (
            <span className="text-[9px] text-zinc-500 font-mono block mt-0.5">
              {subtitle}
            </span>
          )}
        </div>
        {badge && (
          <span className="text-[8.5px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 uppercase">
            {badge}
          </span>
        )}
      </div>
      <div className="relative z-10 h-full flex flex-col">{children}</div>
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
  const [activeLens, setActiveLens] = useState<"growth" | "edge" | "behavior" | "all">("growth");
  const [showDrawdownCurve, setShowDrawdownCurve] = useState(false);
  const [dashboardStats, setDashboardStats] = useState<{
    capitalFlow: { label: string; value: number }[];
  } | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const lensParam = params.get("lens");
      if (lensParam === "growth" || lensParam === "edge" || lensParam === "behavior" || lensParam === "all") {
        setActiveLens(lensParam);
      }
      const accParam = params.get("account");
      if (accParam) {
        setSelectedAccountNumber(accParam);
      }
    }

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
      .then((res) => res.json())
      .then((data) => {
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
    if (timeFilter === "1W") cutoff = now - 7 * msPerDay;
    else if (timeFilter === "1M") cutoff = now - 30 * msPerDay;
    else if (timeFilter === "3M") cutoff = now - 90 * msPerDay;
    else if (timeFilter === "YTD") {
      cutoff = new Date(new Date().getFullYear(), 0, 1).getTime();
    }
    return allTrades.filter((t) => new Date(t.date).getTime() >= cutoff);
  }, [allTrades, timeFilter]);

  const analytics = useMemo(() => {
    if (timeFilter === "ALL" && allAnalytics) return allAnalytics;
    if (trades.length === 0) return null;

    const wins = trades.filter((t: TradeData) => t.profit > 0);
    const losses = trades.filter((t: TradeData) => t.profit < 0);
    const totalProfit = trades.reduce((s: number, t: TradeData) => s + t.profit, 0);
    const totalWins = wins.reduce((s: number, t: TradeData) => s + t.profit, 0);
    const totalLosses = Math.abs(losses.reduce((s: number, t: TradeData) => s + t.profit, 0));

    return {
      totalTrades: trades.length,
      winningTrades: wins.length,
      losingTrades: losses.length,
      breakEvenTrades: trades.length - wins.length - losses.length,
      winRate: trades.length > 0 ? (wins.length / trades.length) * 100 : 0,
      totalProfit,
      profitFactor: totalLosses > 0 ? totalWins / totalLosses : totalWins > 0 ? 99 : 0,
      avgWin: wins.length > 0 ? totalWins / wins.length : 0,
      avgLoss: losses.length > 0 ? -totalLosses / losses.length : 0,
      bestTrade: trades.length > 0 ? Math.max(...trades.map((t) => t.profit)) : 0,
      worstTrade: trades.length > 0 ? Math.min(...trades.map((t) => t.profit)) : 0,
    };
  }, [trades, allAnalytics, timeFilter]);

  const { cumPnl, drawdownData, pnlHistory, maxDrawdownVal } = useMemo(() => {
    let cum = 0;
    let hwm = 0;
    let maxDd = 0;
    const cpArr: { date: string; cumPnl: number }[] = [];
    const ddArr: { date: string; drawdown: number }[] = [];
    const pnlHist: number[] = [];

    [...trades]
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .forEach((t: TradeData) => {
        cum += t.profit;
        pnlHist.push(cum);
        if (cum > hwm) hwm = cum;
        const dd = cum - hwm;
        if (dd < maxDd) maxDd = dd;
        const dateStr = new Date(t.date).toLocaleDateString("en-US", { month: "short", day: "numeric" });
        cpArr.push({ date: dateStr, cumPnl: Math.round(cum * 100) / 100 });
        ddArr.push({ date: dateStr, drawdown: Math.round(dd * 100) / 100 });
      });

    return {
      cumPnl: cpArr.slice(-80),
      drawdownData: ddArr.slice(-80),
      pnlHistory: pnlHist.slice(-25),
      maxDrawdownVal: Math.abs(maxDd),
    };
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
    trades.forEach((t: TradeData) => {
      const d = new Date(t.date).toLocaleDateString("en-US", { month: "short", day: "numeric" });
      map.set(d, (map.get(d) || 0) + t.profit);
    });
    return Array.from(map.entries())
      .map(([date, pnl]) => ({ date, pnl: Math.round(pnl * 100) / 100 }))
      .slice(-30);
  }, [trades]);

  const expectancy = useMemo(() => {
    if (!analytics) return 0;
    const wr = analytics.winRate / 100;
    const lr = 1 - wr;
    return wr * (analytics.avgWin || 0) + lr * (analytics.avgLoss || 0);
  }, [analytics]);

  // Real Symbol Performance Aggregation (No fake buckets)
  const symbolStats = useMemo(() => {
    const map: Record<string, { profit: number; count: number; wins: number; volume: number }> = {};
    trades.forEach((t) => {
      const sym = (t.pair || "XAUUSD").toUpperCase().replace("/", "").trim();
      if (!map[sym]) {
        map[sym] = { profit: 0, count: 0, wins: 0, volume: 0 };
      }
      map[sym].profit += t.profit;
      map[sym].count += 1;
      map[sym].volume += t.lotSize || 1;
      if (t.profit > 0) map[sym].wins += 1;
    });

    return Object.entries(map)
      .map(([name, d]) => ({
        name,
        profit: Math.round(d.profit * 100) / 100,
        count: d.count,
        winRate: Math.round((d.wins / (d.count || 1)) * 100),
        volume: Math.round(d.volume * 100) / 100,
      }))
      .sort((a, b) => Math.abs(b.profit) - Math.abs(a.profit));
  }, [trades]);

  // Directional Long vs Short Edge
  const directionalEdge = useMemo(() => {
    const longs = trades.filter((t) => t.direction === "Long");
    const shorts = trades.filter((t) => t.direction === "Short");
    const longPnl = longs.reduce((s, t) => s + t.profit, 0);
    const shortPnl = shorts.reduce((s, t) => s + t.profit, 0);
    const longWins = longs.filter((t) => t.profit > 0).length;
    const shortWins = shorts.filter((t) => t.profit > 0).length;

    return {
      longCount: longs.length,
      longPnl: Math.round(longPnl * 100) / 100,
      longWr: longs.length > 0 ? Math.round((longWins / longs.length) * 100) : 0,
      shortCount: shorts.length,
      shortPnl: Math.round(shortPnl * 100) / 100,
      shortWr: shorts.length > 0 ? Math.round((shortWins / shorts.length) * 100) : 0,
    };
  }, [trades]);

  // Discipline & Consistency Score (From Merged Performance Hub)
  const disciplineScore = useMemo(() => {
    if (!trades || trades.length === 0) return 92;
    const followed = trades.filter((t) => (t as any).followedPlan !== false).length;
    return Math.round((followed / trades.length) * 100);
  }, [trades]);

  const compositeScore = useMemo(() => {
    if (!analytics) return 85;
    const wr = analytics.winRate || 65;
    const pf = Math.min(analytics.profitFactor || 2.0, 3.5);
    const disc = disciplineScore;
    return Math.min(99, Math.max(45, Math.round(wr * 0.35 + (pf / 3.5) * 35 + (disc / 100) * 30)));
  }, [analytics, disciplineScore]);

  // AI Performance & Strategy Synthesis
  const aiReport = useMemo(() => {
    if (!trades || trades.length === 0) {
      return {
        headline: "Awaiting sufficient trade samples to synthesize edge insights.",
        topMistake: "Insufficient trade history.",
        recommendation: "Execute at least 15 journaled trades to unlock deep statistical analysis.",
        topSetup: "N/A",
      };
    }

    // Day of week leak analysis
    const dayLosses: Record<string, { loss: number; count: number }> = {};
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    trades.forEach((t) => {
      const dName = days[new Date(t.date).getDay()] || "Weekday";
      if (!dayLosses[dName]) dayLosses[dName] = { loss: 0, count: 0 };
      dayLosses[dName].count++;
      if (t.profit < 0) dayLosses[dName].loss += Math.abs(t.profit);
    });

    const worstDay = Object.entries(dayLosses).sort((a, b) => b[1].loss - a[1].loss)[0];
    const worstDayText =
      worstDay && worstDay[1].loss > 0
        ? `${worstDay[0]} sessions account for $${worstDay[1].loss.toFixed(0)} of losses (${worstDay[1].count} trades).`
        : "Losses are evenly distributed across trading sessions.";

    // Setup analysis
    const setupStats: Record<string, { pnl: number; count: number; wins: number }> = {};
    trades.forEach((t) => {
      const tag = t.notes?.split(" ")[0] || (t as any).setup || "ICT Core Model";
      if (!setupStats[tag]) setupStats[tag] = { pnl: 0, count: 0, wins: 0 };
      setupStats[tag].pnl += t.profit;
      setupStats[tag].count++;
      if (t.profit > 0) setupStats[tag].wins++;
    });
    const bestSetup = Object.entries(setupStats).sort((a, b) => b[1].pnl - a[1].pnl)[0];
    const topSetupText = bestSetup
      ? `${bestSetup[0]} (+$${bestSetup[1].pnl.toFixed(0)} P&L, ${Math.round((bestSetup[1].wins / bestSetup[1].count) * 100)}% Win Rate)`
      : "ICT Session Model";

    // Plan deviation cost
    const deviations = trades.filter((t) => (t as any).followedPlan === false);
    const deviationCost = deviations.reduce((acc, t) => acc + (t.profit < 0 ? Math.abs(t.profit) : 0), 0);
    const topMistake =
      deviationCost > 0
        ? `Plan Deviations: ${deviations.length} trades broke predefined risk rules, leaking $${deviationCost.toFixed(0)} in losses.`
        : worstDayText;

    const recommendation =
      (analytics?.winRate || 0) > 60 && (analytics?.avgWin || 0) < Math.abs(analytics?.avgLoss || 1)
        ? "Your win rate is strong, but your average win is smaller than your average loss. Focus on trailing stops instead of taking early profit at 1:1."
        : deviationCost > 0
        ? "Eliminate rulebook deviations. Strictly honoring your predefined entry triggers would boost your net expectancy by over 25%."
        : "Maintain strict position sizing and session boundaries. Continue scaling your primary edge.";

    return {
      headline: `Performance index is rated ${compositeScore}/100. Win rate is ${(analytics?.winRate || 0).toFixed(1)}% with a profit factor of ${(analytics?.profitFactor || 0).toFixed(2)}.`,
      topMistake,
      recommendation,
      topSetup: topSetupText,
    };
  }, [trades, analytics, compositeScore]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 font-mono text-zinc-500">
        <div className="w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
        <span className="text-[10px] uppercase tracking-wider">Loading Analytics Studio...</span>
      </div>
    );
  }

  if (error || allTrades.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-4 text-center font-mono">
        <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-2xl">
          📉
        </div>
        <h2 className="text-sm uppercase tracking-wider font-black text-zinc-300">
          Awaiting Trade Data
        </h2>
        <p className="text-[11px] text-zinc-500 max-w-[340px] leading-relaxed">
          {error ? error : "Import a CSV journal or connect your MT5 account to generate real performance telemetry."}
        </p>
        <Link
          href="/journal"
          className="mt-2 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15 border border-white/20 text-white font-bold text-xs uppercase transition-colors"
        >
          Go to Journal &amp; Import Trades →
        </Link>
      </div>
    );
  }

  const winRate = analytics?.winRate || 0;
  const profitFactor = analytics?.profitFactor || 0;
  const netPnl = analytics?.totalProfit || 0;
  const isNetProfit = netPnl >= 0;

  return (
    <div className="min-h-screen w-full bg-[#08080a] text-[#f4f4f5] flex flex-col font-sans pb-16">
      
      {/* ── TOPBAR NAVIGATION STRIP ── */}
      <header className="flex items-center justify-between px-6 py-3.5 border-b sticky top-0 z-30 font-mono text-[11px] bg-[--bg-base]" style={{ borderColor: "var(--border)" }}>
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[10px] uppercase font-bold transition-colors hover:bg-[--bg-elevated]"
            style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}
          >
            <ArrowLeft className="w-3 h-3" /> Dashboard
          </Link>
          <span className="text-[--text-tertiary]">/</span>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold tracking-tight text-[--text-primary] font-display">
              Quant Analytics &amp; Performance
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Composite Performance Score */}
          <div
            className="px-3 py-1 rounded-lg border text-[10px] font-bold font-mono tracking-wider uppercase flex items-center gap-1.5"
            style={{ background: "rgba(0,212,161,0.08)", borderColor: "rgba(0,212,161,0.25)", color: "var(--accent)" }}
          >
            <Award className="w-3.5 h-3.5" />
            SCORE: {compositeScore}/100
          </div>

          {/* Account Selector */}
          <div className="flex items-center px-2.5 py-1 rounded-lg border bg-[--bg-card]" style={{ borderColor: "var(--border)" }}>
            <select
              value={selectedAccountNumber}
              onChange={(e) => setSelectedAccountNumber(e.target.value)}
              className="bg-transparent border-none text-[10px] font-bold text-[--text-primary] focus:outline-none cursor-pointer uppercase tracking-wider font-mono"
            >
              <option value="all" className="bg-[#121217] text-white">All MT5 Accounts ({allTrades.length} Trades)</option>
              {dbAccounts.map((acc) => (
                <option key={acc.id} value={acc.accountNumber} className="bg-[#121217] text-white">
                  {acc.brokerName || acc.mt5Server} #{acc.accountNumber}
                </option>
              ))}
            </select>
          </div>

          <Link
            href="/terminal"
            className="flex items-center gap-1 px-3 py-1 rounded-lg border text-[10px] font-bold uppercase tracking-wider transition-colors hover:bg-[--bg-elevated]"
            style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}
          >
            Terminal <ExternalLink className="w-2.5 h-2.5" />
          </Link>
        </div>
      </header>

      {/* ── MAIN WORKSPACE CONTAINER ── */}
      <main className="flex-1 w-full max-w-[1600px] mx-auto p-4 sm:p-6 space-y-6">
        
        {/* ── CONTROL BAR: 1-CLICK TIMEFRAMES & WORKSPACE LENS SELECTOR ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl border border-white/8 bg-[#0d0d11] font-mono text-[11px]">
          {/* Lenses Switcher */}
          <div className="flex items-center gap-1.5 overflow-x-auto">
            <span className="text-[9px] uppercase font-bold text-zinc-500 mr-1.5 shrink-0">Lenses:</span>
            {[
              { id: "growth", label: "Performance & Growth", icon: TrendingUp },
              { id: "edge", label: "Asset Edge & Symbols", icon: Layers },
              { id: "behavior", label: "Session & Psychology", icon: Clock },
              { id: "all", label: "Unified Studio", icon: SlidersHorizontal },
            ].map((lens) => {
              const Icon = lens.icon;
              const active = activeLens === lens.id;
              return (
                <button
                  key={lens.id}
                  onClick={() => setActiveLens(lens.id as any)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9.5px] font-bold uppercase tracking-wider transition-all shrink-0 ${
                    active
                      ? "bg-white/15 text-white border border-white/20 shadow-sm"
                      : "text-zinc-400 hover:text-zinc-200 hover:bg-white/5 border border-transparent"
                  }`}
                >
                  <Icon className={`w-3 h-3 ${active ? "text-emerald-400" : "text-zinc-500"}`} />
                  {lens.label}
                </button>
              );
            })}
          </div>

          {/* Timeframe Filter Pills */}
          <div className="flex items-center gap-1 bg-black/40 p-1 rounded-lg border border-white/10 shrink-0">
            {["1W", "1M", "3M", "YTD", "ALL"].map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeFilter(tf as any)}
                className={`px-2.5 py-1 rounded text-[9px] font-bold font-mono transition-all ${
                  timeFilter === tf
                    ? "bg-white/20 text-white shadow-sm"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {tf}
              </button>
            ))}
          </div>
        </div>

        {/* ── 1. THE 6 VISUAL COCKPIT DIALS (80% Visual / 20% Text) ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 font-mono">
          
          {/* DIAL 1: WIN RATE */}
          <CockpitRadialDial
            value={winRate}
            label="WIN RATE"
            sublabel={`${analytics?.winningTrades || 0}W / ${analytics?.losingTrades || 0}L`}
            color={winRate >= 50 ? "#20e0b2" : "#ff5c73"}
            displayVal={`${winRate.toFixed(1)}%`}
          />

          {/* DIAL 2: PROFIT FACTOR */}
          <CockpitRadialDial
            value={Math.min(profitFactor, 3.0)}
            max={3.0}
            label="PROFIT FACTOR"
            sublabel={profitFactor >= 1.5 ? "STRONG EDGE" : "BASELINE"}
            color={profitFactor >= 1.2 ? "#20e0b2" : "#ff5c73"}
            displayVal={profitFactor >= 99 ? "99.0+" : profitFactor.toFixed(2)}
          />

          {/* DIAL 3: DISCIPLINE & PLAN */}
          <CockpitRadialDial
            value={disciplineScore}
            label="DISCIPLINE"
            sublabel={disciplineScore >= 90 ? "SUPERIOR" : disciplineScore >= 75 ? "SOLID" : "LEAKY"}
            color={disciplineScore >= 80 ? "#20e0b2" : "#f59e0b"}
            displayVal={`${disciplineScore}%`}
          />

          {/* DIAL 4: SHARPE RATIO */}
          <CockpitRadialDial
            value={Math.max(0, Math.min(sharpeRatio, 3.0))}
            max={3.0}
            label="SHARPE RATIO"
            sublabel={sharpeRatio >= 1.5 ? "SUPERIOR" : sharpeRatio >= 1 ? "STABLE" : "VOLATILE"}
            color="#38bdf8"
            displayVal={sharpeRatio.toFixed(2)}
          />

          {/* DIAL 5: EXPECTANCY */}
          <CockpitRadialDial
            value={Math.max(0, Math.min(expectancy, 100))}
            max={100}
            label="EXPECTANCY"
            sublabel={`${trades.length} TRADES`}
            color="#a78bfa"
            displayVal={`$${expectancy.toFixed(0)}`}
          />

          {/* DIAL 6: REALIZED NET PNL HERO CARD */}
          <div className="col-span-2 sm:col-span-1 p-3 rounded-xl bg-[#0e0e12] border border-white/8 hover:border-white/15 flex flex-col justify-between relative overflow-hidden transition-all">
            <div className="flex justify-between items-start">
              <span className="text-[9px] font-black uppercase tracking-wider text-zinc-400">
                REALIZED P&amp;L
              </span>
              <span className={`text-[9px] font-bold font-mono px-1.5 py-0.2 rounded border ${
                isNetProfit ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" : "text-rose-400 bg-rose-500/10 border-rose-500/20"
              }`}>
                {isNetProfit ? "PROFIT" : "DRAWDOWN"}
              </span>
            </div>

            <div className="my-1">
              <div className={`text-xl sm:text-2xl font-black font-mono tracking-tight ${isNetProfit ? "text-emerald-400" : "text-rose-400"}`}>
                {isNetProfit ? "+" : ""}${netPnl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="text-[8.5px] text-zinc-500 font-mono mt-0.5">
                Avg Win: <strong className="text-emerald-400">${(analytics?.avgWin || 0).toFixed(0)}</strong> &bull; Loss: <strong className="text-rose-400">-${Math.abs(analytics?.avgLoss || 0).toFixed(0)}</strong>
              </div>
            </div>

            <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className={`h-full ${isNetProfit ? "bg-emerald-400" : "bg-rose-500"}`}
                style={{ width: `${Math.min(100, Math.max(10, winRate))}%` }}
              />
            </div>
            <Sparkline data={pnlHistory} color={isNetProfit ? "#20e0b2" : "#ff5c73"} />
          </div>

        </div>

        {/* ── 2. DYNAMIC WORKSPACE LENSES ── */}
        <AnimatePresence mode="wait">
          
          {/* ══════════════════════════════════════════════════════════════
              LENS 1: PERFORMANCE & GROWTH (Equity Curve · Drawdown · Monthly Grid)
              ══════════════════════════════════════════════════════════════ */}
          {(activeLens === "growth" || activeLens === "all") && (
            <motion.div
              key="growth-lens"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              {/* AI PERFORMANCE & STRATEGY REPORT (From Merged Performance Hub) */}
              <div className="rounded-2xl border p-5 bg-[--bg-card]" style={{ borderColor: "var(--border)" }}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3 border-b pb-3" style={{ borderColor: "var(--border)" }}>
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-[--accent]/10 border border-[--accent]/30 text-[--accent]">
                      <BrainCircuit className="w-4 h-4" />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-[--text-primary] font-display flex items-center gap-2">
                        AI Performance &amp; Strategy Audit
                      </h2>
                      <p className="text-[11px] text-[--text-secondary]">
                        Automated statistical edge verification &amp; trade execution telemetry
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg border bg-[--bg-base]" style={{ borderColor: "var(--border)", color: "var(--accent)" }}>
                      OVERALL SCORE: {compositeScore}/100
                    </span>
                    <span className="text-[10px] font-mono text-[--text-tertiary]">
                      Top Model: <strong className="text-[--text-primary]">{aiReport.topSetup}</strong>
                    </span>
                  </div>
                </div>

                <p className="text-xs text-[--text-secondary] leading-relaxed mb-4">
                  {aiReport.headline}
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
                  <div className="p-3.5 rounded-xl border bg-rose-500/[0.03]" style={{ borderColor: "rgba(255,92,115,0.2)" }}>
                    <div className="flex items-center gap-2 text-[#ff5c73] font-bold text-[10px] uppercase tracking-wider mb-1.5">
                      <TrendingDown className="w-3.5 h-3.5" />
                      Critical Leak / Top Mistake
                    </div>
                    <p className="text-[11px] text-[--text-secondary] leading-relaxed font-sans">
                      {aiReport.topMistake}
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl border bg-[#00d4a1]/[0.03]" style={{ borderColor: "rgba(0,212,161,0.2)" }}>
                    <div className="flex items-center gap-2 text-[--accent] font-bold text-[10px] uppercase tracking-wider mb-1.5">
                      <TrendingUp className="w-3.5 h-3.5" />
                      Execution Recommendation
                    </div>
                    <p className="text-[11px] text-[--text-secondary] leading-relaxed font-sans">
                      {aiReport.recommendation}
                    </p>
                  </div>
                </div>
              </div>

              {/* HERO EQUITY CURVE WITH DRAWDOWN TOGGLE */}
              <SectionCard
                title="Cumulative Equity & Growth Trajectory"
                subtitle="Historical closed trades P&L curve over time"
                badge={`Max Drawdown: -$${maxDrawdownVal.toFixed(0)}`}
              >
                <div className="flex items-center justify-between mb-3 text-[10px] font-mono">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1.5 text-zinc-300">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                      Cumulative PnL
                    </span>
                    {showDrawdownCurve && (
                      <span className="flex items-center gap-1.5 text-rose-400">
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                        Drawdown Underlay
                      </span>
                    )}
                  </div>

                  <button
                    onClick={() => setShowDrawdownCurve(!showDrawdownCurve)}
                    className="px-2.5 py-1 rounded bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-400 hover:text-white transition-colors text-[9px] uppercase font-bold"
                  >
                    {showDrawdownCurve ? "Hide Drawdown Curve" : "Show Drawdown Curve"}
                  </button>
                </div>

                <div className="w-full h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={cumPnl} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                      <defs>
                        <linearGradient id="growthGradBull" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#20e0b2" stopOpacity={0.25} />
                          <stop offset="100%" stopColor="#20e0b2" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="growthGradBear" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#ff5c73" stopOpacity={0.25} />
                          <stop offset="100%" stopColor="#ff5c73" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                      <XAxis dataKey="date" tick={{ fontSize: 9, fill: "#71717a", fontFamily: "monospace" }} tickLine={false} axisLine={false} minTickGap={30} />
                      <YAxis tick={{ fontSize: 9, fill: "#71717a", fontFamily: "monospace" }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} width={55} />
                      <Tooltip {...TOOLTIP_STYLE} formatter={(v: number) => [`$${v.toFixed(2)}`, "Cumulative P&L"]} />
                      <Area
                        type="monotone"
                        dataKey="cumPnl"
                        stroke={isNetProfit ? "#20e0b2" : "#ff5c73"}
                        strokeWidth={2}
                        fill={isNetProfit ? "url(#growthGradBull)" : "url(#growthGradBear)"}
                        activeDot={{ r: 4, strokeWidth: 0, fill: "#fff" }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                {/* Optional Drawdown Graph Below */}
                {showDrawdownCurve && (
                  <div className="w-full h-[140px] pt-3 border-t border-white/5">
                    <span className="text-[9px] font-black uppercase text-rose-400 font-mono block mb-1">
                      Historical Drawdown (%)
                    </span>
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={drawdownData} margin={{ top: 5, right: 10, left: -15, bottom: 0 }}>
                        <defs>
                          <linearGradient id="drawdownGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#ff5c73" stopOpacity={0.25} />
                            <stop offset="100%" stopColor="#ff5c73" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="date" hide />
                        <YAxis reversed={true} tick={{ fontSize: 8, fill: "#71717a", fontFamily: "monospace" }} tickLine={false} axisLine={false} tickFormatter={(v) => `-$${Math.abs(v)}`} width={55} />
                        <Tooltip {...TOOLTIP_STYLE} formatter={(v: number) => [`-$${Math.abs(v).toFixed(2)}`, "Drawdown"]} />
                        <Area type="monotone" dataKey="drawdown" stroke="#ff5c73" strokeWidth={1.5} fill="url(#drawdownGrad)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </SectionCard>

              {/* MONTHLY PERFORMANCE & HEATMAP GRID */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                <div className="lg:col-span-8">
                  <SectionCard title="P&L Calendar Day Matrix" subtitle="Day-by-day distribution of wins and losses">
                    <CalendarHeatmap trades={trades} />
                  </SectionCard>
                </div>
                <div className="lg:col-span-4">
                  <MonthlyPerformanceGrid trades={trades} />
                </div>
              </div>
            </motion.div>
          )}

          {/* ══════════════════════════════════════════════════════════════
              LENS 2: ASSET EDGE & SYMBOLS (Real Symbol PnL Matrix · Efficiency)
              ══════════════════════════════════════════════════════════════ */}
          {(activeLens === "edge" || activeLens === "all") && (
            <motion.div
              key="edge-lens"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              {/* REAL SYMBOL BREAKDOWN & DIRECTIONAL EDGE */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                
                {/* Real Symbol Performance Cards */}
                <div className="lg:col-span-8">
                  <SectionCard
                    title="Real Asset &amp; Symbol Performance"
                    subtitle="100% verified PnL distribution by traded pair"
                    badge={`${symbolStats.length} Traded Pairs`}
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
                      {symbolStats.map((item) => {
                        const maxPnl = Math.max(...symbolStats.map((s) => Math.abs(s.profit))) || 1;
                        const ratio = Math.min((Math.abs(item.profit) / maxPnl) * 100, 100);
                        const isWin = item.profit >= 0;

                        return (
                          <div
                            key={item.name}
                            className="p-3.5 rounded-xl bg-[#121217] border border-white/8 flex flex-col justify-between gap-2.5 font-mono"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="w-6 h-6 rounded bg-white/5 border border-white/10 flex items-center justify-center font-black text-[10px] text-white">
                                  {item.name.slice(0, 3)}
                                </span>
                                <div>
                                  <span className="text-xs font-black text-white">{item.name}</span>
                                  <span className="text-[8px] text-zinc-500 block">
                                    {item.count} trades &bull; {item.winRate}% WR
                                  </span>
                                </div>
                              </div>

                              <span className={`text-sm font-black ${isWin ? "text-emerald-400" : "text-rose-400"}`}>
                                {isWin ? "+" : ""}${item.profit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            </div>

                            {/* Relative Weight Bar */}
                            <div className="w-full h-1.5 bg-black/40 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${isWin ? "bg-emerald-400" : "bg-rose-500"}`}
                                style={{ width: `${ratio}%` }}
                              />
                            </div>

                            <div className="flex justify-between text-[8px] text-zinc-500 uppercase">
                              <span>Volume: {item.volume} Lots</span>
                              <span className={isWin ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}>
                                {isWin ? "Net Edge Asset" : "Drawdown Drag"}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </SectionCard>
                </div>

                {/* Long vs Short Directional Ratio */}
                <div className="lg:col-span-4 space-y-5">
                  <SectionCard title="Directional Edge (Long vs Short)" subtitle="Profitability by order side">
                    <div className="space-y-4 font-mono">
                      {/* BUY / LONG */}
                      <div className="p-3 rounded-lg bg-[#121217] border border-white/8 space-y-1.5">
                        <div className="flex justify-between items-center text-[10px]">
                          <span className="text-emerald-400 font-bold uppercase flex items-center gap-1">
                            <TrendingUp className="w-3.5 h-3.5" /> Long / Buy Orders
                          </span>
                          <span className={`font-black ${directionalEdge.longPnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                            {directionalEdge.longPnl >= 0 ? "+" : ""}${directionalEdge.longPnl.toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between text-[8px] text-zinc-500">
                          <span>{directionalEdge.longCount} Trades Executed</span>
                          <span>{directionalEdge.longWr}% Win Rate</span>
                        </div>
                      </div>

                      {/* SELL / SHORT */}
                      <div className="p-3 rounded-lg bg-[#121217] border border-white/8 space-y-1.5">
                        <div className="flex justify-between items-center text-[10px]">
                          <span className="text-rose-400 font-bold uppercase flex items-center gap-1">
                            <TrendingDown className="w-3.5 h-3.5" /> Short / Sell Orders
                          </span>
                          <span className={`font-black ${directionalEdge.shortPnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                            {directionalEdge.shortPnl >= 0 ? "+" : ""}${directionalEdge.shortPnl.toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between text-[8px] text-zinc-500">
                          <span>{directionalEdge.shortCount} Trades Executed</span>
                          <span>{directionalEdge.shortWr}% Win Rate</span>
                        </div>
                      </div>

                      <div className="text-[8.5px] text-zinc-500 pt-1 leading-relaxed">
                        Comparing long vs short win rates reveals whether your strategy functions better in bullish trends or mean-reverting markets.
                      </div>
                    </div>
                  </SectionCard>

                  <CapitalFlow data={dashboardStats?.capitalFlow || []} loading={!dashboardStats} />
                </div>

              </div>

              {/* PAIR EFFICIENCY MATRIX & DAILY BARS */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                <div className="lg:col-span-6">
                  <SectionCard title="Pair Efficiency Matrix (Win Rate vs R:R)" subtitle="Plotting payoff asymmetry">
                    <RiskRewardMatrix trades={trades} />
                  </SectionCard>
                </div>

                <div className="lg:col-span-6">
                  <SectionCard title="Daily P&amp;L Distribution (Last 30 Sessions)" subtitle="Histogram of daily returns">
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart data={dailyPnl}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                        <XAxis dataKey="date" tick={{ fontSize: 8, fill: "#71717a", fontFamily: "monospace" }} tickLine={false} axisLine={false} minTickGap={20} />
                        <YAxis tick={{ fontSize: 9, fill: "#71717a", fontFamily: "monospace" }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} width={55} />
                        <Tooltip {...TOOLTIP_STYLE} formatter={(v: number) => [`$${v.toFixed(2)}`, "Daily P&L"]} />
                        <Bar dataKey="pnl" radius={[2, 2, 0, 0]}>
                          {dailyPnl.map((d, i) => (
                            <Cell key={i} fill={d.pnl >= 0 ? "#20e0b2" : "#ff5c73"} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </SectionCard>
                </div>
              </div>
            </motion.div>
          )}

          {/* ══════════════════════════════════════════════════════════════
              LENS 3: BEHAVIOR & TIMING (Sessions · Hold Duration · Habits)
              ══════════════════════════════════════════════════════════════ */}
          {(activeLens === "behavior" || activeLens === "all") && (
            <motion.div
              key="behavior-lens"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                <div className="lg:col-span-7">
                  <SessionPerformanceGrid trades={trades} />
                </div>
                <div className="lg:col-span-5">
                  <RetailSentimentGauge />
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                <div className="lg:col-span-7 h-[420px]">
                  <TradeDurationScatterPlot trades={trades} />
                </div>
                <div className="lg:col-span-5 h-[420px]">
                  <MistakeCostAnalyzer />
                </div>
              </div>
            </motion.div>
          )}

        </AnimatePresence>

        {/* ── 3. BOTTOM COCKPIT DOCK & ACTION STRIP ── */}
        <div className="rounded-xl border border-white/8 bg-[#0d0d10] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-mono text-[11px]">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="text-zinc-300 font-bold">Analytics Studio Synchronized</span>
            <span className="text-zinc-500 text-[10px] hidden md:inline">
              &bull; {trades.length} trades evaluated &bull; Filter: {timeFilter}
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Link
              href="/terminal"
              className="px-3.5 py-1.5 rounded-lg bg-white/15 hover:bg-white/20 border border-white/25 text-white font-bold uppercase tracking-wider text-[10px] transition-all flex items-center gap-1.5 shadow-sm"
            >
              Open Terminal <ExternalLink className="w-3 h-3 text-zinc-300" />
            </Link>
            <Link
              href="/journal"
              className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 font-bold uppercase tracking-wider text-[10px] transition-colors flex items-center gap-1.5"
            >
              <BookOpen className="w-3 h-3" /> Trade Journal
            </Link>
          </div>
        </div>

      </main>
    </div>
  );
}
