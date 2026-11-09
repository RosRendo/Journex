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
  Calendar, Award, BookOpen, BarChart3, CheckCircle2, BrainCircuit,
  Filter, ChevronRight, Zap
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
import { useIsAdmin } from "@/lib/role";

const APPLE_TOOLTIP_STYLE = {
  contentStyle: {
    background: "rgba(18, 18, 24, 0.85)",
    backdropFilter: "blur(16px)",
    border: "1px solid rgba(255, 255, 255, 0.12)",
    borderRadius: 12,
    fontSize: 11,
    color: "#fff",
    fontFamily: "var(--font-mono, monospace)",
    boxShadow: "0 12px 40px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.1)",
    padding: "8px 12px",
  },
};

// ── APPLE-GRADE COCKPIT RADIAL DIAL ──
function CockpitRadialDial({
  value,
  max = 100,
  label,
  sublabel,
  displayVal,
  color = "#30D158",
  size = 72,
  strokeWidth = 4.5,
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
    <div className="group relative flex flex-col items-center justify-between p-3.5 rounded-2xl bg-white/[0.025] hover:bg-white/[0.045] border border-white/[0.08] hover:border-white/[0.18] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)] transition-all duration-300">
      <div className="relative flex items-center justify-center my-1" style={{ width: size, height: size }}>
        <svg className="-rotate-90" style={{ width: size, height: size }}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.05)"
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
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute flex flex-col items-center justify-center text-center">
          <span className="font-mono font-bold text-sm text-white tracking-tight tabular-nums">
            {displayVal !== undefined ? displayVal : `${Math.round(value)}%`}
          </span>
        </div>
      </div>
      <div className="text-center mt-1">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-300 block">
          {label}
        </span>
        {sublabel && (
          <span className="text-[9px] font-mono text-neutral-500 uppercase tracking-tight block mt-0.5">
            {sublabel}
          </span>
        )}
      </div>
    </div>
  );
}

// ── APPLE TRANSLUCENT SECTION CARD ──
function AppleSectionCard({
  title,
  subtitle,
  badge,
  action,
  children,
  className = "",
}: {
  title: string;
  subtitle?: string;
  badge?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`relative rounded-2xl border border-white/[0.08] bg-[#0c0d12]/70 backdrop-blur-xl p-5 sm:p-6 overflow-hidden shadow-2xl shadow-black/40 transition-all duration-300 ${className}`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3.5 border-b border-white/[0.06] mb-5 gap-2">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-200 flex items-center gap-2">
            {title}
          </h3>
          {subtitle && (
            <p className="text-[10px] text-neutral-400 font-normal mt-0.5">
              {subtitle}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {badge && (
            <span className="text-[9px] font-mono font-medium text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20 uppercase tracking-wider">
              {badge}
            </span>
          )}
          {action}
        </div>
      </div>
      <div className="relative z-10 h-full flex flex-col">{children}</div>
    </div>
  );
}

function AppleSparkline({ data, color }: { data: number[]; color: string }) {
  if (data.length < 2) return null;
  const safeId = color.replace(/[^a-zA-Z0-9]/g, "_");
  const chartData = data.map((v, i) => ({ val: v, index: i }));
  return (
    <div className="absolute bottom-0 left-0 right-0 h-1/2 opacity-25 pointer-events-none">
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
  const isAdmin = useIsAdmin();
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

  const disciplineScore = useMemo(() => {
    if (!trades || trades.length === 0) return null;
    const followed = trades.filter((t) => (t as any).followedPlan !== false).length;
    return Math.round((followed / trades.length) * 100);
  }, [trades]);

  const compositeScore = useMemo(() => {
    if (!analytics || !trades || trades.length === 0 || disciplineScore === null) return null;
    const wr = analytics.winRate || 0;
    const pf = Math.min(analytics.profitFactor || 0, 3.5);
    const disc = disciplineScore;
    return Math.min(99, Math.max(0, Math.round(wr * 0.35 + (pf / 3.5) * 35 + (disc / 100) * 30)));
  }, [analytics, trades, disciplineScore]);

  const aiReport = useMemo(() => {
    if (!trades || trades.length === 0) {
      return {
        headline: "Awaiting trade samples to generate quant performance telemetry.",
        topMistake: "Insufficient trade history.",
        recommendation: "Record trades via CSV import or live broker sync.",
        topSetup: "N/A",
      };
    }

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
        : "Losses are evenly distributed across sessions.";

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

    const deviations = trades.filter((t) => (t as any).followedPlan === false);
    const deviationCost = deviations.reduce((acc, t) => acc + (t.profit < 0 ? Math.abs(t.profit) : 0), 0);
    const topMistake =
      deviationCost > 0
        ? `Plan Deviations: ${deviations.length} trades broke predefined risk rules, leaking $${deviationCost.toFixed(0)} in capital.`
        : worstDayText;

    const recommendation =
      (analytics?.winRate || 0) > 60 && (analytics?.avgWin || 0) < Math.abs(analytics?.avgLoss || 1)
        ? "Win rate is robust, but average profit is capped early. Implement trailing stops on runner positions."
        : deviationCost > 0
        ? "Eliminating plan deviation leaks would increase net expectancy by over 25%."
        : "Session discipline is intact. Continue scaling lot size systematically within safe risk thresholds.";

    return {
      headline: compositeScore !== null
        ? `Quant Efficiency Index is rated ${compositeScore}/100 with ${(analytics?.winRate || 0).toFixed(1)}% win rate across ${trades.length} executed trades.`
        : "Awaiting trade executions to compute quant performance index.",
      topMistake,
      recommendation,
      topSetup: topSetupText,
    };
  }, [trades, analytics, compositeScore]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] gap-3 font-mono text-neutral-400">
        <div className="w-7 h-7 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
        <span className="text-[11px] uppercase tracking-wider text-neutral-400">Loading Quant Analytics...</span>
      </div>
    );
  }

  if (error || allTrades.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] gap-4 px-4 text-center">
        <div className="w-14 h-14 rounded-2xl bg-white/[0.04] border border-white/[0.1] flex items-center justify-center text-2xl shadow-xl">
          📊
        </div>
        <h2 className="text-base font-semibold text-white tracking-tight">
          No Trading Data Found
        </h2>
        <p className="text-xs text-neutral-400 max-w-[360px] leading-relaxed">
          {error ? error : "Import your trade journal or link an MT5 broker account to synthesize quant analytics."}
        </p>
        <Link
          href="/journal"
          className="mt-2 px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 text-white font-medium text-xs transition-all active:scale-[0.98]"
        >
          Open Journal &amp; Import Trades →
        </Link>
      </div>
    );
  }

  const winRate = analytics?.winRate || 0;
  const profitFactor = analytics?.profitFactor || 0;
  const netPnl = analytics?.totalProfit || 0;
  const isNetProfit = netPnl >= 0;

  return (
    <div className="min-h-screen w-full bg-[#08080a] text-[#f4f4f5] flex flex-col font-sans pb-20 selection:bg-emerald-500/20">
      
      {/* ── 1. APPLE FROSTED GLASS HEADER ── */}
      <header className="sticky top-0 z-30 flex items-center justify-between px-6 py-3.5 backdrop-blur-2xl bg-[#08080a]/80 border-b border-white/[0.08] transition-all">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.08] text-xs font-medium text-neutral-300 transition-all active:scale-[0.97]"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Dashboard
          </Link>
          <span className="text-neutral-600">/</span>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold tracking-tight text-white">
              Quant Analytics
            </span>
            <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-md bg-white/[0.06] text-neutral-300 border border-white/[0.08]">
              COCKPIT
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Composite Score Pill */}
          <div className="px-3 py-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-xs font-mono font-medium flex items-center gap-2 shadow-[0_0_15px_rgba(48,209,88,0.15)]">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>SCORE {compositeScore !== null ? `${compositeScore}/100` : "--/100"}</span>
          </div>

          {/* Account Selector */}
          <div className="flex items-center px-3 py-1.5 rounded-xl border border-white/[0.08] bg-white/[0.03] hover:border-white/[0.15] transition-all">
            <select
              value={selectedAccountNumber}
              onChange={(e) => setSelectedAccountNumber(e.target.value)}
              className="bg-transparent border-none text-xs font-medium text-neutral-200 focus:outline-none cursor-pointer tracking-tight font-mono"
            >
              <option value="all" className="bg-[#121217] text-white">All Accounts ({allTrades.length} Trades)</option>
              {dbAccounts.map((acc) => (
                <option key={acc.id} value={acc.accountNumber} className="bg-[#121217] text-white">
                  {acc.brokerName || acc.mt5Server} #{acc.accountNumber}
                </option>
              ))}
            </select>
          </div>

          <Link
            href={isAdmin ? "/terminal" : "/practice"}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.08] text-xs font-medium text-neutral-300 transition-all active:scale-[0.97]"
          >
            {isAdmin ? "Terminal" : "Practice Lab"} <ExternalLink className="w-3 h-3 text-neutral-400" />
          </Link>
        </div>
      </header>

      {/* ── 2. MAIN COCKPIT WORKSPACE ── */}
      <main className="flex-1 w-full max-w-[1600px] mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        
        {/* ── APPLE SEGMENTED CONTROL BAR (LENSES & TIMEFRAMES) ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-2 rounded-2xl border border-white/[0.08] bg-white/[0.02] backdrop-blur-xl">
          {/* Lenses Switcher */}
          <div className="flex items-center gap-1 overflow-x-auto p-1">
            {[
              { id: "growth", label: "Performance & Growth", icon: TrendingUp },
              { id: "edge", label: "Asset Edge & Symbols", icon: Layers },
              { id: "behavior", label: "Session & Psychology", icon: Clock },
              { id: "all", label: "Unified View", icon: SlidersHorizontal },
            ].map((lens) => {
              const Icon = lens.icon;
              const active = activeLens === lens.id;
              return (
                <button
                  key={lens.id}
                  onClick={() => setActiveLens(lens.id as any)}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all shrink-0 active:scale-[0.98] ${
                    active
                      ? "bg-white/[0.1] text-white border border-white/[0.14] shadow-sm"
                      : "text-neutral-400 hover:text-neutral-200 hover:bg-white/[0.04] border border-transparent"
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${active ? "text-emerald-400" : "text-neutral-500"}`} />
                  {lens.label}
                </button>
              );
            })}
          </div>

          {/* Timeframe Filter Pills */}
          <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/[0.08] shrink-0 self-end sm:self-auto">
            {["1W", "1M", "3M", "YTD", "ALL"].map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeFilter(tf as any)}
                className={`px-3 py-1 rounded-lg text-xs font-mono font-medium transition-all active:scale-[0.95] ${
                  timeFilter === tf
                    ? "bg-white/[0.15] text-white shadow-sm border border-white/[0.1]"
                    : "text-neutral-400 hover:text-neutral-200"
                }`}
              >
                {tf}
              </button>
            ))}
          </div>
        </div>

        {/* ── 3. THE 6 APPLE BENTO RADIAL DIALS ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5 sm:gap-4">
          
          <CockpitRadialDial
            value={winRate}
            label="WIN RATE"
            sublabel={`${analytics?.winningTrades || 0}W / ${analytics?.losingTrades || 0}L`}
            color={winRate >= 50 ? "#30D158" : "#FF453A"}
            displayVal={`${winRate.toFixed(1)}%`}
          />

          <CockpitRadialDial
            value={Math.min(profitFactor, 3.0)}
            max={3.0}
            label="PROFIT FACTOR"
            sublabel={profitFactor >= 1.5 ? "STRONG EDGE" : "BASELINE"}
            color={profitFactor >= 1.2 ? "#30D158" : "#FF453A"}
            displayVal={profitFactor >= 99 ? "99.0+" : profitFactor.toFixed(2)}
          />

          <CockpitRadialDial
            value={disciplineScore ?? 0}
            label="DISCIPLINE"
            sublabel={disciplineScore === null ? "NO TRADES" : disciplineScore >= 90 ? "SUPERIOR" : disciplineScore >= 75 ? "SOLID" : "LEAKY"}
            color={disciplineScore && disciplineScore >= 80 ? "#30D158" : "#FF9F0A"}
            displayVal={disciplineScore !== null ? `${disciplineScore}%` : "--"}
          />

          <CockpitRadialDial
            value={Math.max(0, Math.min(sharpeRatio, 3.0))}
            max={3.0}
            label="SHARPE RATIO"
            sublabel={sharpeRatio >= 1.5 ? "SUPERIOR" : sharpeRatio >= 1 ? "STABLE" : "VOLATILE"}
            color="#0A84FF"
            displayVal={sharpeRatio.toFixed(2)}
          />

          <CockpitRadialDial
            value={Math.max(0, Math.min(expectancy, 100))}
            max={100}
            label="EXPECTANCY"
            sublabel={`${trades.length} TRADES`}
            color="#BF5AF2"
            displayVal={`$${expectancy.toFixed(0)}`}
          />

          {/* REALIZED NET PNL HERO CARD */}
          <div className="col-span-2 sm:col-span-1 p-4 rounded-2xl bg-white/[0.03] hover:bg-white/[0.045] border border-white/[0.08] hover:border-white/[0.18] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)] flex flex-col justify-between relative overflow-hidden transition-all duration-300">
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-300">
                REALIZED P&amp;L
              </span>
              <span className={`text-[9px] font-mono font-medium px-2 py-0.5 rounded-full border ${
                isNetProfit ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" : "text-rose-400 bg-rose-500/10 border-rose-500/20"
              }`}>
                {isNetProfit ? "PROFIT" : "DRAWDOWN"}
              </span>
            </div>

            <div className="my-2">
              <div className={`text-2xl font-bold font-mono tracking-tight tabular-nums ${isNetProfit ? "text-emerald-400" : "text-rose-400"}`}>
                {isNetProfit ? "+" : ""}${netPnl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="text-[9px] text-neutral-400 font-mono mt-0.5">
                Avg Win: <span className="text-emerald-400 font-semibold">${(analytics?.avgWin || 0).toFixed(0)}</span> &bull; Loss: <span className="text-rose-400 font-semibold">-${Math.abs(analytics?.avgLoss || 0).toFixed(0)}</span>
              </div>
            </div>

            <div className="w-full h-1 bg-white/[0.06] rounded-full overflow-hidden">
              <div
                className={`h-full ${isNetProfit ? "bg-emerald-400" : "bg-rose-500"}`}
                style={{ width: `${Math.min(100, Math.max(10, winRate))}%` }}
              />
            </div>
            <AppleSparkline data={pnlHistory} color={isNetProfit ? "#30D158" : "#FF453A"} />
          </div>

        </div>

        {/* ── 4. DYNAMIC WORKSPACE LENSES ── */}
        <AnimatePresence mode="wait">
          
          {/* LENS 1: PERFORMANCE & GROWTH */}
          {(activeLens === "growth" || activeLens === "all") && (
            <motion.div
              key="growth-lens"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
              className="space-y-6"
            >
              {/* APPLE INTELLIGENCE PERFORMANCE BRIEF */}
              <div className="rounded-2xl border border-white/[0.08] p-5 sm:p-6 bg-[#0c0d12]/70 backdrop-blur-xl shadow-2xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 border-b border-white/[0.06] pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                      <BrainCircuit className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-sm font-semibold text-white tracking-tight flex items-center gap-2">
                        Quant Strategy &amp; Performance Audit
                      </h2>
                      <p className="text-[11px] text-neutral-400">
                        Statistical edge verification &amp; behavioral discipline analysis
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    <span className="text-xs font-mono font-medium text-emerald-400 px-3 py-1 rounded-full border border-emerald-500/20 bg-emerald-500/10">
                      RATING: {compositeScore !== null ? `${compositeScore}/100` : "--/100"}
                    </span>
                    <span className="text-xs font-mono text-neutral-400">
                      Top Setup: <strong className="text-white">{aiReport.topSetup}</strong>
                    </span>
                  </div>
                </div>

                <p className="text-xs text-neutral-300 leading-relaxed mb-5">
                  {aiReport.headline}
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl border border-rose-500/20 bg-rose-500/[0.04]">
                    <div className="flex items-center gap-2 text-rose-400 font-semibold text-xs uppercase tracking-wider mb-1.5">
                      <TrendingDown className="w-4 h-4" />
                      Critical Friction / Capital Leak
                    </div>
                    <p className="text-xs text-neutral-300 leading-relaxed">
                      {aiReport.topMistake}
                    </p>
                  </div>

                  <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.04]">
                    <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs uppercase tracking-wider mb-1.5">
                      <TrendingUp className="w-4 h-4" />
                      Execution Recommendation
                    </div>
                    <p className="text-xs text-neutral-300 leading-relaxed">
                      {aiReport.recommendation}
                    </p>
                  </div>
                </div>
              </div>

              {/* HERO CUMULATIVE EQUITY CURVE */}
              <AppleSectionCard
                title="Cumulative Equity & Growth Trajectory"
                subtitle="Closed trades profit curve across recorded trading sessions"
                badge={`Max Drawdown: -$${maxDrawdownVal.toFixed(0)}`}
                action={
                  <button
                    onClick={() => setShowDrawdownCurve(!showDrawdownCurve)}
                    className="px-3 py-1 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.1] text-neutral-300 hover:text-white transition-all text-xs font-medium active:scale-[0.97]"
                  >
                    {showDrawdownCurve ? "Hide Drawdown Underlay" : "Show Drawdown Underlay"}
                  </button>
                }
              >
                <div className="w-full h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={cumPnl} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                      <defs>
                        <linearGradient id="appleGrowthGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={isNetProfit ? "#30D158" : "#FF453A"} stopOpacity={0.25} />
                          <stop offset="100%" stopColor={isNetProfit ? "#30D158" : "#FF453A"} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                      <XAxis dataKey="date" tick={{ fontSize: 9, fill: "#71717a", fontFamily: "var(--font-mono, monospace)" }} tickLine={false} axisLine={false} minTickGap={30} />
                      <YAxis tick={{ fontSize: 9, fill: "#71717a", fontFamily: "var(--font-mono, monospace)" }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} width={55} />
                      <Tooltip {...APPLE_TOOLTIP_STYLE} formatter={(v: number) => [`$${v.toFixed(2)}`, "Cumulative P&L"]} />
                      <Area
                        type="monotone"
                        dataKey="cumPnl"
                        stroke={isNetProfit ? "#30D158" : "#FF453A"}
                        strokeWidth={2}
                        fill="url(#appleGrowthGrad)"
                        activeDot={{ r: 4, strokeWidth: 0, fill: "#fff" }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                {/* Optional Drawdown Graph Below */}
                {showDrawdownCurve && (
                  <div className="w-full h-[140px] pt-4 mt-2 border-t border-white/[0.06]">
                    <span className="text-[10px] font-semibold uppercase text-rose-400 font-mono block mb-1">
                      Historical Drawdown (%)
                    </span>
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={drawdownData} margin={{ top: 5, right: 10, left: -15, bottom: 0 }}>
                        <defs>
                          <linearGradient id="appleDrawdownGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#FF453A" stopOpacity={0.25} />
                            <stop offset="100%" stopColor="#FF453A" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="date" hide />
                        <YAxis reversed={true} tick={{ fontSize: 8, fill: "#71717a", fontFamily: "var(--font-mono, monospace)" }} tickLine={false} axisLine={false} tickFormatter={(v) => `-$${Math.abs(v)}`} width={55} />
                        <Tooltip {...APPLE_TOOLTIP_STYLE} formatter={(v: number) => [`-$${Math.abs(v).toFixed(2)}`, "Drawdown"]} />
                        <Area type="monotone" dataKey="drawdown" stroke="#FF453A" strokeWidth={1.5} fill="url(#appleDrawdownGrad)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </AppleSectionCard>

              {/* MONTHLY PERFORMANCE & HEATMAP GRID */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                <div className="lg:col-span-8">
                  <AppleSectionCard title="P&L Calendar Day Matrix" subtitle="Day-by-day distribution of profitable and losing sessions">
                    <CalendarHeatmap trades={trades} />
                  </AppleSectionCard>
                </div>
                <div className="lg:col-span-4">
                  <MonthlyPerformanceGrid trades={trades} />
                </div>
              </div>
            </motion.div>
          )}

          {/* LENS 2: ASSET EDGE & SYMBOLS */}
          {(activeLens === "edge" || activeLens === "all") && (
            <motion.div
              key="edge-lens"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
              className="space-y-6"
            >
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                
                {/* Real Symbol Performance Cards */}
                <div className="lg:col-span-8">
                  <AppleSectionCard
                    title="Asset &amp; Symbol Profitability"
                    subtitle="Verified P&L distribution by traded instrument"
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
                            className="p-4 rounded-xl bg-white/[0.025] hover:bg-white/[0.045] border border-white/[0.08] hover:border-white/[0.18] flex flex-col justify-between gap-3 font-mono transition-all"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2.5">
                                <span className="w-7 h-7 rounded-lg bg-white/[0.06] border border-white/[0.1] flex items-center justify-center font-bold text-xs text-white">
                                  {item.name.slice(0, 3)}
                                </span>
                                <div>
                                  <span className="text-xs font-semibold text-white tracking-tight">{item.name}</span>
                                  <span className="text-[9px] text-neutral-400 block font-normal">
                                    {item.count} trades &bull; {item.winRate}% Win Rate
                                  </span>
                                </div>
                              </div>

                              <span className={`text-sm font-semibold tabular-nums ${isWin ? "text-emerald-400" : "text-rose-400"}`}>
                                {isWin ? "+" : ""}${item.profit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            </div>

                            <div className="w-full h-1.5 bg-black/40 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${isWin ? "bg-emerald-400" : "bg-rose-500"}`}
                                style={{ width: `${ratio}%` }}
                              />
                            </div>

                            <div className="flex justify-between text-[9px] text-neutral-400 uppercase tracking-tight">
                              <span>Volume: {item.volume} Lots</span>
                              <span className={isWin ? "text-emerald-400 font-semibold" : "text-rose-400 font-semibold"}>
                                {isWin ? "Net Edge" : "Drawdown Drag"}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </AppleSectionCard>
                </div>

                {/* Long vs Short Directional Ratio */}
                <div className="lg:col-span-4 space-y-5">
                  <AppleSectionCard title="Directional Edge (Long vs Short)" subtitle="Profitability by order direction">
                    <div className="space-y-3.5 font-mono">
                      {/* BUY / LONG */}
                      <div className="p-3.5 rounded-xl bg-white/[0.025] border border-white/[0.08] space-y-2">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-emerald-400 font-medium flex items-center gap-1.5">
                            <TrendingUp className="w-4 h-4" /> Long / Buy
                          </span>
                          <span className={`font-semibold tabular-nums ${directionalEdge.longPnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                            {directionalEdge.longPnl >= 0 ? "+" : ""}${directionalEdge.longPnl.toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between text-[9px] text-neutral-400">
                          <span>{directionalEdge.longCount} Trades Executed</span>
                          <span>{directionalEdge.longWr}% Win Rate</span>
                        </div>
                      </div>

                      {/* SELL / SHORT */}
                      <div className="p-3.5 rounded-xl bg-white/[0.025] border border-white/[0.08] space-y-2">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-rose-400 font-medium flex items-center gap-1.5">
                            <TrendingDown className="w-4 h-4" /> Short / Sell
                          </span>
                          <span className={`font-semibold tabular-nums ${directionalEdge.shortPnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                            {directionalEdge.shortPnl >= 0 ? "+" : ""}${directionalEdge.shortPnl.toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between text-[9px] text-neutral-400">
                          <span>{directionalEdge.shortCount} Trades Executed</span>
                          <span>{directionalEdge.shortWr}% Win Rate</span>
                        </div>
                      </div>
                    </div>
                  </AppleSectionCard>

                  <CapitalFlow data={dashboardStats?.capitalFlow || []} loading={!dashboardStats} />
                </div>

              </div>

              {/* PAIR EFFICIENCY MATRIX & DAILY BARS */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                <div className="lg:col-span-6">
                  <AppleSectionCard title="Pair Efficiency Matrix (Win Rate vs R:R)" subtitle="Payoff asymmetry analysis across traded assets">
                    <RiskRewardMatrix trades={trades} />
                  </AppleSectionCard>
                </div>

                <div className="lg:col-span-6">
                  <AppleSectionCard title="Daily P&amp;L Distribution (Last 30 Sessions)" subtitle="Histogram of daily trading session returns">
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart data={dailyPnl}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                        <XAxis dataKey="date" tick={{ fontSize: 8, fill: "#71717a", fontFamily: "var(--font-mono, monospace)" }} tickLine={false} axisLine={false} minTickGap={20} />
                        <YAxis tick={{ fontSize: 9, fill: "#71717a", fontFamily: "var(--font-mono, monospace)" }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} width={55} />
                        <Tooltip {...APPLE_TOOLTIP_STYLE} formatter={(v: number) => [`$${v.toFixed(2)}`, "Daily P&L"]} />
                        <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>
                          {dailyPnl.map((d, i) => (
                            <Cell key={i} fill={d.pnl >= 0 ? "#30D158" : "#FF453A"} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </AppleSectionCard>
                </div>
              </div>
            </motion.div>
          )}

          {/* LENS 3: BEHAVIOR & TIMING */}
          {(activeLens === "behavior" || activeLens === "all") && (
            <motion.div
              key="behavior-lens"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
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

        {/* ── 5. BOTTOM COCKPIT DOCK ── */}
        <div className="rounded-2xl border border-white/[0.08] bg-[#0c0d12]/70 backdrop-blur-xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-white font-medium">Quant Analytics Synchronized</span>
            <span className="text-neutral-500 font-mono text-[11px] hidden md:inline">
              &bull; {trades.length} trades evaluated &bull; Scope: {timeFilter}
            </span>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <Link
              href={isAdmin ? "/terminal" : "/practice"}
              className="px-4 py-2 rounded-xl bg-white/[0.1] hover:bg-white/[0.16] border border-white/[0.15] text-white font-medium text-xs transition-all flex items-center gap-2 shadow-sm active:scale-[0.97]"
            >
              {isAdmin ? "Live Terminal" : "Practice Lab"} <ExternalLink className="w-3 h-3 text-neutral-400" />
            </Link>
            <Link
              href="/journal"
              className="px-4 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-neutral-300 font-medium text-xs transition-all flex items-center gap-2 active:scale-[0.97]"
            >
              <BookOpen className="w-3.5 h-3.5" /> Trade Journal
            </Link>
          </div>
        </div>

      </main>
    </div>
  );
}
