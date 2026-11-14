"use client";

import React, { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { useCsvTrades, type TradeData } from "@/hooks/useCsvTrades";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  AreaChart, Area, CartesianGrid, Line, ComposedChart
} from "recharts";
import { motion, AnimatePresence } from "framer-motion";
import {
  TrendingUp, TrendingDown, ArrowLeft, ExternalLink, Activity,
  Layers, Clock, Compass, ShieldAlert, Sparkles, SlidersHorizontal,
  Calendar, Award, BookOpen, BarChart3, CheckCircle2, BrainCircuit,
  Filter, ChevronRight, Zap, Target, Flame, AlertTriangle, Percent,
  DollarSign, Split, Table as TableIcon, LayoutGrid, X
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

// ── APPLE FROSTED TOOLTIP ──
const APPLE_TOOLTIP_STYLE = {
  contentStyle: {
    background: "rgba(14, 15, 20, 0.92)",
    backdropFilter: "blur(20px)",
    border: "1px solid rgba(255, 255, 255, 0.12)",
    borderRadius: 14,
    fontSize: 11,
    color: "#fff",
    fontFamily: "var(--font-mono, monospace)",
    boxShadow: "0 16px 40px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.12)",
    padding: "10px 14px",
  },
};

// ── APPLE PRO METRIC CARD (ZERO-CLIPPING BENTO) ──
function AppleMetricCard({
  label,
  sublabel,
  value,
  badge,
  badgeVariant = "neutral",
  progress, // 0 to 1
  color = "#30D158",
  sparklineData,
  onClick,
}: {
  label: string;
  sublabel?: string;
  value: string | number;
  badge?: string;
  badgeVariant?: "emerald" | "rose" | "amber" | "blue" | "purple" | "neutral";
  progress?: number;
  color?: string;
  sparklineData?: number[];
  onClick?: () => void;
}) {
  const badgeStyles = {
    emerald: "text-emerald-400 bg-emerald-500/10 border-emerald-500/25",
    rose: "text-rose-400 bg-rose-500/10 border-rose-500/25",
    amber: "text-amber-400 bg-amber-500/10 border-amber-500/25",
    blue: "text-blue-400 bg-blue-500/10 border-blue-500/25",
    purple: "text-purple-400 bg-purple-500/10 border-purple-500/25",
    neutral: "text-neutral-400 bg-white/[0.05] border-white/[0.1]",
  }[badgeVariant];

  return (
    <div
      onClick={onClick}
      className={`group relative flex flex-col justify-between p-4 rounded-2xl bg-[#0c0d12]/80 hover:bg-[#101118] border border-white/[0.08] hover:border-white/[0.18] shadow-[0_4px_24px_rgba(0,0,0,0.4),inset_0_1px_0_0_rgba(255,255,255,0.06)] transition-all duration-300 overflow-hidden ${
        onClick ? "cursor-pointer active:scale-[0.98]" : ""
      }`}
    >
      {/* Top Header */}
      <div className="flex items-center justify-between gap-2 z-10">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 group-hover:text-neutral-300 transition-colors">
          {label}
        </span>
        {badge && (
          <span className={`text-[9px] font-mono font-medium px-2 py-0.5 rounded-full border uppercase tracking-wider ${badgeStyles}`}>
            {badge}
          </span>
        )}
      </div>

      {/* Main Metric Value */}
      <div className="my-2.5 z-10">
        <div className="text-2xl font-bold font-mono tracking-tight text-white tabular-nums flex items-baseline gap-1">
          {value}
        </div>
        {sublabel && (
          <div className="text-[10px] text-neutral-400 font-mono mt-0.5 truncate tracking-tight">
            {sublabel}
          </div>
        )}
      </div>

      {/* Linear Micro-Gauge Track */}
      {progress !== undefined && (
        <div className="w-full h-1.5 bg-white/[0.06] rounded-full overflow-hidden z-10 my-1">
          <div
            className="h-full rounded-full transition-all duration-700 ease-out"
            style={{
              width: `${Math.min(100, Math.max(0, progress * 100))}%`,
              backgroundColor: color,
            }}
          />
        </div>
      )}

      {/* Background Sparkline if provided */}
      {sparklineData && sparklineData.length > 1 && (
        <AppleSparkline data={sparklineData} color={color} />
      )}
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
    <div className={`relative rounded-2xl border border-white/[0.08] bg-[#0c0d12]/75 backdrop-blur-xl p-5 sm:p-6 overflow-hidden shadow-2xl shadow-black/40 transition-all duration-300 flex flex-col ${className}`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3.5 border-b border-white/[0.06] mb-5 gap-2 shrink-0">
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
      <div className="relative z-10 flex-1 flex flex-col">{children}</div>
    </div>
  );
}

function AppleSparkline({ data, color }: { data: number[]; color: string }) {
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
  const isAdmin = useIsAdmin();
  const [dbAccounts, setDbAccounts] = useState<any[]>([]);
  const [selectedAccountNumber, setSelectedAccountNumber] = useState<string>("all");
  const { trades: allTrades, analytics: allAnalytics, loading, error } = useCsvTrades(
    selectedAccountNumber === "all" ? undefined : selectedAccountNumber
  );
  const [timeFilter, setTimeFilter] = useState<"1W" | "1M" | "3M" | "YTD" | "ALL">("ALL");
  const [activeLens, setActiveLens] = useState<"growth" | "edge" | "behavior" | "all">("growth");
  const [symbolViewMode, setSymbolViewMode] = useState<"cards" | "table">("cards");
  const [chartMode, setChartMode] = useState<"split" | "overlay">("split");
  const [selectedSessionDate, setSelectedSessionDate] = useState<string | null>(null);
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

  // ── INTEGRATED HIGH-WATER MARK & UNDERWATER DRAWDOWN ──
  const { cumPnl, drawdownData, pnlHistory, maxDrawdownVal, maxDrawdownPct } = useMemo(() => {
    let cum = 0;
    let hwm = 0;
    let maxDd = 0;
    let maxDdP = 0;
    const cpArr: { date: string; cumPnl: number; hwm: number; drawdown: number; drawdownPct: number }[] = [];
    const ddArr: { date: string; drawdown: number; drawdownPct: number }[] = [];
    const pnlHist: number[] = [];

    const sorted = [...trades].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    sorted.forEach((t: TradeData) => {
      cum += t.profit;
      pnlHist.push(cum);
      if (cum > hwm) hwm = cum;
      const dd = cum - hwm;
      if (dd < maxDd) maxDd = dd;

      const ddPct = hwm > 0 ? (dd / hwm) * 100 : 0;
      if (ddPct < maxDdP) maxDdP = ddPct;

      const dateStr = new Date(t.date).toLocaleDateString("en-US", { month: "short", day: "numeric" });
      const item = {
        date: dateStr,
        cumPnl: Math.round(cum * 100) / 100,
        hwm: Math.round(hwm * 100) / 100,
        drawdown: Math.round(dd * 100) / 100,
        drawdownPct: Math.round(ddPct * 10) / 10,
      };
      cpArr.push(item);
      ddArr.push({ date: dateStr, drawdown: item.drawdown, drawdownPct: item.drawdownPct });
    });

    return {
      cumPnl: cpArr.slice(-90),
      drawdownData: ddArr.slice(-90),
      pnlHistory: pnlHist.slice(-25),
      maxDrawdownVal: Math.abs(maxDd),
      maxDrawdownPct: Math.abs(maxDdP),
    };
  }, [trades]);

  // ── INSTITUTIONAL QUANT RATIOS ──
  const sharpeRatio = useMemo(() => {
    if (trades.length < 2) return 0;
    const profits = trades.map((t: TradeData) => t.profit);
    const mean = profits.reduce((a, b) => a + b, 0) / profits.length;
    const variance = profits.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (profits.length - 1);
    const stdev = Math.sqrt(variance);
    return stdev === 0 ? 0 : (mean / stdev) * Math.sqrt(100);
  }, [trades]);

  const recoveryFactor = useMemo(() => {
    if (!analytics || maxDrawdownVal === 0) return 0;
    return Math.max(0, analytics.totalProfit / maxDrawdownVal);
  }, [analytics, maxDrawdownVal]);

  const calmarRatio = useMemo(() => {
    if (!analytics || maxDrawdownVal === 0 || trades.length < 2) return 0;
    const sorted = [...trades].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const firstDate = new Date(sorted[0].date).getTime();
    const lastDate = new Date(sorted[sorted.length - 1].date).getTime();
    const days = Math.max(1, (lastDate - firstDate) / (1000 * 60 * 60 * 24));
    const annualizedProfit = (analytics.totalProfit / days) * 365;
    return Math.max(0, annualizedProfit / maxDrawdownVal);
  }, [analytics, maxDrawdownVal, trades]);

  const quantStreaks = useMemo(() => {
    let maxWin = 0;
    let maxLoss = 0;
    let currWin = 0;
    let currLoss = 0;

    const sorted = [...trades].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    sorted.forEach((t) => {
      if (t.profit > 0) {
        currWin++;
        currLoss = 0;
        if (currWin > maxWin) maxWin = currWin;
      } else if (t.profit < 0) {
        currLoss++;
        currWin = 0;
        if (currLoss > maxLoss) maxLoss = currLoss;
      }
    });

    return { maxWinStreak: maxWin, maxLossStreak: maxLoss };
  }, [trades]);

  const dailyPnl = useMemo(() => {
    const map = new Map<string, { pnl: number; count: number; trades: TradeData[] }>();
    trades.forEach((t: TradeData) => {
      const d = new Date(t.date).toLocaleDateString("en-US", { month: "short", day: "numeric" });
      const existing = map.get(d) || { pnl: 0, count: 0, trades: [] };
      existing.pnl += t.profit;
      existing.count += 1;
      existing.trades.push(t);
      map.set(d, existing);
    });
    return Array.from(map.entries())
      .map(([date, data]) => ({
        date,
        pnl: Math.round(data.pnl * 100) / 100,
        count: data.count,
        trades: data.trades,
      }))
      .slice(-30);
  }, [trades]);

  const expectancy = useMemo(() => {
    if (!analytics) return 0;
    const wr = analytics.winRate / 100;
    const lr = 1 - wr;
    return wr * (analytics.avgWin || 0) + lr * (analytics.avgLoss || 0);
  }, [analytics]);

  const symbolStats = useMemo(() => {
    const map: Record<string, { profit: number; count: number; wins: number; volume: number; winLoss: number }> = {};
    trades.forEach((t) => {
      const sym = (t.pair || "XAUUSD").toUpperCase().replace("/", "").trim();
      if (!map[sym]) {
        map[sym] = { profit: 0, count: 0, wins: 0, volume: 0, winLoss: 0 };
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
        profitFactor: d.count > 0 ? (d.profit > 0 ? (d.wins / Math.max(1, d.count - d.wins)).toFixed(2) : "0.00") : "0.00",
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

  // ── HIGH-SIGNAL AI QUANT LEAK BRIEF ──
  const aiReport = useMemo(() => {
    if (!trades || trades.length === 0) {
      return {
        headline: "Awaiting trade samples to generate quant performance telemetry.",
        leakTitle: "Insufficient trade history.",
        leakCost: 0,
        leakDesc: "Record trades via CSV import or live broker sync.",
        edgeTitle: "Setup Profiling",
        edgeGain: 0,
        edgeDesc: "Awaiting model samples.",
        directive: "Import at least 15 closed trade records to compute institutional edge metrics.",
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

    const setupStats: Record<string, { pnl: number; count: number; wins: number }> = {};
    trades.forEach((t) => {
      const tag = t.notes?.split(" ")[0] || (t as any).setup || "ICT Core Model";
      if (!setupStats[tag]) setupStats[tag] = { pnl: 0, count: 0, wins: 0 };
      setupStats[tag].pnl += t.profit;
      setupStats[tag].count++;
      if (t.profit > 0) setupStats[tag].wins++;
    });
    const bestSetup = Object.entries(setupStats).sort((a, b) => b[1].pnl - a[1].pnl)[0];

    const deviations = trades.filter((t) => (t as any).followedPlan === false);
    const deviationCost = deviations.reduce((acc, t) => acc + (t.profit < 0 ? Math.abs(t.profit) : 0), 0);

    const leakTitle = deviationCost > 0 ? "Rule Deviations / Overtrading" : `${worstDay?.[0] || "Session"} Friction`;
    const leakCost = deviationCost > 0 ? deviationCost : worstDay ? worstDay[1].loss : 0;
    const leakDesc = deviationCost > 0
      ? `${deviations.length} trades bypassed trading plan rules, creating an unforced capital bleed.`
      : `${worstDay?.[0]} accounts for the highest loss concentration across ${worstDay?.[1].count} executions.`;

    const edgeTitle = bestSetup ? bestSetup[0] : "Session Edge";
    const edgeGain = bestSetup ? bestSetup[1].pnl : 0;
    const edgeDesc = bestSetup
      ? `Maintains a ${Math.round((bestSetup[1].wins / bestSetup[1].count) * 100)}% Win Rate across ${bestSetup[1].count} executions.`
      : "Positive expectancy established in high-liquidity windows.";

    const directive =
      (analytics?.winRate || 0) > 60 && (analytics?.avgWin || 0) < Math.abs(analytics?.avgLoss || 1)
        ? "Win rate is high but avg winner is prematurely clipped. Implement trailing stops on +2R runners."
        : deviationCost > 0
        ? `Eliminating plan deviation leaks would instantly elevate net expectancy by +$${deviationCost.toFixed(0)}.`
        : "Session discipline is intact. Continue systematic sizing within established risk limits.";

    return {
      headline: compositeScore !== null
        ? `Quant Efficiency Index is rated ${compositeScore}/100 with ${(analytics?.winRate || 0).toFixed(1)}% win rate across ${trades.length} executed trades.`
        : "Awaiting trade executions to compute quant performance index.",
      leakTitle,
      leakCost,
      leakDesc,
      edgeTitle,
      edgeGain,
      edgeDesc,
      directive,
    };
  }, [trades, analytics, compositeScore]);

  // Selected session trades for drawer inspector
  const sessionDetailTrades = useMemo(() => {
    if (!selectedSessionDate) return [];
    return trades.filter(
      (t) => new Date(t.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }) === selectedSessionDate
    );
  }, [trades, selectedSessionDate]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] gap-3 font-mono text-neutral-400">
        <div className="w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
        <span className="text-[11px] uppercase tracking-wider text-neutral-300">Synthesizing Quant Cockpit Telemetry...</span>
      </div>
    );
  }

  if (error || allTrades.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] gap-4 px-4 text-center">
        <div className="w-16 h-16 rounded-2xl bg-white/[0.04] border border-white/[0.1] flex items-center justify-center text-3xl shadow-xl">
          📊
        </div>
        <h2 className="text-lg font-semibold text-white tracking-tight">
          No Trading Data Found
        </h2>
        <p className="text-xs text-neutral-400 max-w-[380px] leading-relaxed">
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
    <div className="min-h-screen w-full bg-[#08080a] text-[#f4f4f5] flex flex-col font-sans pb-24 selection:bg-emerald-500/20">
      
      {/* ── 1. APPLE FROSTED GLASS HEADER ── */}
      <header className="sticky top-0 z-30 flex items-center justify-between px-6 py-3.5 backdrop-blur-2xl bg-[#08080a]/85 border-b border-white/[0.08] transition-all">
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
            <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              PRO COCKPIT
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Composite Score Pill */}
          <div className="px-3 py-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-xs font-mono font-medium flex items-center gap-2 shadow-[0_0_20px_rgba(48,209,88,0.18)]">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>EFFICIENCY {compositeScore !== null ? `${compositeScore}/100` : "--/100"}</span>
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
          <div className="flex items-center gap-1.5 overflow-x-auto p-1">
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
                      ? "bg-white/[0.12] text-white border border-white/[0.16] shadow-sm font-semibold"
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
                    ? "bg-white/[0.15] text-white shadow-sm border border-white/[0.1] font-bold"
                    : "text-neutral-400 hover:text-neutral-200"
                }`}
              >
                {tf}
              </button>
            ))}
          </div>
        </div>

        {/* ── 3. THE 6 APPLE BENTO KPI METRIC CARDS ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5 sm:gap-4">
          
          <AppleMetricCard
            label="WIN RATE"
            value={`${winRate.toFixed(1)}%`}
            sublabel={`${analytics?.winningTrades || 0}W / ${analytics?.losingTrades || 0}L`}
            badge={winRate >= 50 ? "EDGE" : "CHALLENGED"}
            badgeVariant={winRate >= 50 ? "emerald" : "rose"}
            progress={winRate / 100}
            color={winRate >= 50 ? "#30D158" : "#FF453A"}
          />

          <AppleMetricCard
            label="PROFIT FACTOR"
            value={profitFactor >= 99 ? "99.0+" : profitFactor.toFixed(2)}
            sublabel={profitFactor >= 1.75 ? "SUPERIOR (>1.75)" : profitFactor >= 1.2 ? "STABLE EDGE" : "SUB-OPTIMAL"}
            badge={profitFactor >= 1.5 ? "ALPHA" : "BASELINE"}
            badgeVariant={profitFactor >= 1.5 ? "emerald" : "amber"}
            progress={Math.min(profitFactor / 3.0, 1)}
            color={profitFactor >= 1.2 ? "#30D158" : "#FF9F0A"}
          />

          <AppleMetricCard
            label="DISCIPLINE INDEX"
            value={disciplineScore !== null ? `${disciplineScore}%` : "--"}
            sublabel={disciplineScore === null ? "NO TRADES" : disciplineScore >= 85 ? "RULE COMPLIANT" : "LEAKS DETECTED"}
            badge={disciplineScore && disciplineScore >= 80 ? "STRONG" : "LEAKY"}
            badgeVariant={disciplineScore && disciplineScore >= 80 ? "emerald" : "amber"}
            progress={disciplineScore ? disciplineScore / 100 : 0}
            color={disciplineScore && disciplineScore >= 80 ? "#30D158" : "#FF9F0A"}
          />

          <AppleMetricCard
            label="SHARPE (ANNUAL)"
            value={sharpeRatio.toFixed(2)}
            sublabel={sharpeRatio >= 1.5 ? "INSTITUTIONAL" : sharpeRatio >= 1.0 ? "CONSISTENT" : "VOLATILE"}
            badge={sharpeRatio >= 1.5 ? "EXCELLENT" : "MODERATE"}
            badgeVariant="blue"
            progress={Math.min(Math.max(sharpeRatio, 0) / 3.0, 1)}
            color="#0A84FF"
          />

          <AppleMetricCard
            label="EXPECTANCY / TRADE"
            value={`$${expectancy.toFixed(0)}`}
            sublabel={`Payoff across ${trades.length} trades`}
            badge={expectancy >= 0 ? "+PAYOFF" : "-DRAG"}
            badgeVariant={expectancy >= 0 ? "purple" : "rose"}
            progress={Math.min(Math.max(expectancy, 0) / 100, 1)}
            color="#BF5AF2"
          />

          {/* REALIZED NET PNL HERO CARD */}
          <div className="col-span-2 sm:col-span-1 p-4 rounded-2xl bg-[#0c0d12]/80 hover:bg-[#101118] border border-white/[0.08] hover:border-white/[0.18] shadow-[0_4px_24px_rgba(0,0,0,0.4),inset_0_1px_0_0_rgba(255,255,255,0.06)] flex flex-col justify-between relative overflow-hidden transition-all duration-300">
            <div className="flex justify-between items-start z-10">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
                REALIZED NET P&amp;L
              </span>
              <span className={`text-[9px] font-mono font-medium px-2 py-0.5 rounded-full border ${
                isNetProfit ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" : "text-rose-400 bg-rose-500/10 border-rose-500/20"
              }`}>
                {isNetProfit ? "PROFIT" : "DRAWDOWN"}
              </span>
            </div>

            <div className="my-2 z-10">
              <div className={`text-2xl font-bold font-mono tracking-tight tabular-nums ${isNetProfit ? "text-emerald-400" : "text-rose-400"}`}>
                {isNetProfit ? "+" : ""}${netPnl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="text-[9px] text-neutral-400 font-mono mt-0.5 truncate">
                Avg Win: <span className="text-emerald-400 font-semibold">${(analytics?.avgWin || 0).toFixed(0)}</span> &bull; Loss: <span className="text-rose-400 font-semibold">-${Math.abs(analytics?.avgLoss || 0).toFixed(0)}</span>
              </div>
            </div>

            <div className="w-full h-1.5 bg-white/[0.06] rounded-full overflow-hidden z-10 my-1">
              <div
                className={`h-full rounded-full ${isNetProfit ? "bg-emerald-400" : "bg-rose-500"}`}
                style={{ width: `${Math.min(100, Math.max(10, winRate))}%` }}
              />
            </div>
            <AppleSparkline data={pnlHistory} color={isNetProfit ? "#30D158" : "#FF453A"} />
          </div>

        </div>

        {/* ── SECONDARY QUANT TELEMETRY STRIP ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-2xl border border-white/[0.06] bg-white/[0.015] backdrop-blur-md">
          <div className="flex items-center justify-between px-3 py-1.5 border-r border-white/[0.06] last:border-none">
            <span className="text-[10px] font-mono uppercase text-neutral-400 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-blue-400" /> Calmar Ratio
            </span>
            <span className="text-xs font-mono font-bold text-white tabular-nums">
              {calmarRatio > 0 ? calmarRatio.toFixed(2) : "0.00"}
            </span>
          </div>

          <div className="flex items-center justify-between px-3 py-1.5 border-r border-white/[0.06] last:border-none">
            <span className="text-[10px] font-mono uppercase text-neutral-400 flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" /> Recovery Factor
            </span>
            <span className="text-xs font-mono font-bold text-white tabular-nums">
              {recoveryFactor > 0 ? `${recoveryFactor.toFixed(2)}x` : "0.00x"}
            </span>
          </div>

          <div className="flex items-center justify-between px-3 py-1.5 border-r border-white/[0.06] last:border-none">
            <span className="text-[10px] font-mono uppercase text-neutral-400 flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-amber-400" /> Max Win Streak
            </span>
            <span className="text-xs font-mono font-bold text-emerald-400 tabular-nums">
              {quantStreaks.maxWinStreak} <span className="text-neutral-500 font-normal">/ {quantStreaks.maxLossStreak}L</span>
            </span>
          </div>

          <div className="flex items-center justify-between px-3 py-1.5">
            <span className="text-[10px] font-mono uppercase text-neutral-400 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400" /> Max DD
            </span>
            <span className="text-xs font-mono font-bold text-rose-400 tabular-nums">
              -${maxDrawdownVal.toFixed(0)} <span className="text-neutral-500 font-normal">(-{maxDrawdownPct.toFixed(1)}%)</span>
            </span>
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
              <div className="rounded-2xl border border-white/[0.08] p-5 sm:p-6 bg-[#0c0d12]/75 backdrop-blur-xl shadow-2xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 border-b border-white/[0.06] pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                      <BrainCircuit className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-sm font-semibold text-white tracking-tight flex items-center gap-2">
                        Quant Strategy &amp; Alpha Audit
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
                      Top Setup: <strong className="text-white">{aiReport.edgeTitle}</strong>
                    </span>
                  </div>
                </div>

                <p className="text-xs text-neutral-300 leading-relaxed mb-5 font-mono">
                  {aiReport.headline}
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Leak Card */}
                  <div className="p-4 rounded-xl border border-rose-500/20 bg-rose-500/[0.04] flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between text-rose-400 font-semibold text-xs uppercase tracking-wider mb-2">
                        <span className="flex items-center gap-1.5">
                          <TrendingDown className="w-4 h-4" /> Capital Leak Detected
                        </span>
                        {aiReport.leakCost > 0 && (
                          <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-rose-500/20 border border-rose-500/30">
                            -${aiReport.leakCost.toFixed(0)}
                          </span>
                        )}
                      </div>
                      <span className="text-xs font-bold text-white block mb-1">{aiReport.leakTitle}</span>
                      <p className="text-[11px] text-neutral-300 leading-relaxed">
                        {aiReport.leakDesc}
                      </p>
                    </div>
                  </div>

                  {/* Edge Card */}
                  <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.04] flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between text-emerald-400 font-semibold text-xs uppercase tracking-wider mb-2">
                        <span className="flex items-center gap-1.5">
                          <Zap className="w-4 h-4" /> Verified Alpha Model
                        </span>
                        {aiReport.edgeGain > 0 && (
                          <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/30">
                            +${aiReport.edgeGain.toFixed(0)}
                          </span>
                        )}
                      </div>
                      <span className="text-xs font-bold text-white block mb-1">{aiReport.edgeTitle}</span>
                      <p className="text-[11px] text-neutral-300 leading-relaxed">
                        {aiReport.edgeDesc}
                      </p>
                    </div>
                  </div>

                  {/* Directive Card */}
                  <div className="p-4 rounded-xl border border-blue-500/20 bg-blue-500/[0.04] flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2 text-blue-400 font-semibold text-xs uppercase tracking-wider mb-2">
                        <Target className="w-4 h-4" /> Tactical Execution Directive
                      </div>
                      <p className="text-xs text-neutral-200 leading-relaxed font-mono">
                        {aiReport.directive}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* SYNCHRONIZED EQUITY & UNDERWATER DRAWDOWN COCKPIT */}
              <AppleSectionCard
                title="Cumulative Equity & Underwater Drawdown"
                subtitle="High-water mark tracking with synchronized dual-pane timeline"
                badge={`Max Drawdown: -$${maxDrawdownVal.toFixed(0)}`}
                action={
                  <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/[0.08]">
                    <button
                      onClick={() => setChartMode("split")}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-mono transition-all ${
                        chartMode === "split" ? "bg-white/[0.15] text-white font-bold" : "text-neutral-400 hover:text-white"
                      }`}
                    >
                      Dual Split
                    </button>
                    <button
                      onClick={() => setChartMode("overlay")}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-mono transition-all ${
                        chartMode === "overlay" ? "bg-white/[0.15] text-white font-bold" : "text-neutral-400 hover:text-white"
                      }`}
                    >
                      Single View
                    </button>
                  </div>
                }
              >
                {/* Upper Pane: Equity Curve with High-Water Mark */}
                <div className="w-full h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={cumPnl} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                      <defs>
                        <linearGradient id="appleGrowthGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={isNetProfit ? "#30D158" : "#FF453A"} stopOpacity={0.25} />
                          <stop offset="100%" stopColor={isNetProfit ? "#30D158" : "#FF453A"} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                      <XAxis dataKey="date" tick={{ fontSize: 9, fill: "#71717a", fontFamily: "var(--font-mono, monospace)" }} tickLine={false} axisLine={false} minTickGap={30} />
                      <YAxis tick={{ fontSize: 9, fill: "#71717a", fontFamily: "var(--font-mono, monospace)" }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} width={55} />
                      <Tooltip
                        {...APPLE_TOOLTIP_STYLE}
                        formatter={(val: any, name: any) => [
                          `$${Number(val || 0).toFixed(2)}`,
                          name === "cumPnl" ? "Cumulative Equity" : name === "hwm" ? "High-Water Mark (Peak)" : "Drawdown",
                        ]}
                      />
                      <Area
                        type="monotone"
                        dataKey="cumPnl"
                        stroke={isNetProfit ? "#30D158" : "#FF453A"}
                        strokeWidth={2}
                        fill="url(#appleGrowthGrad)"
                        activeDot={{ r: 4, strokeWidth: 0, fill: "#fff" }}
                      />
                      <Line
                        type="stepAfter"
                        dataKey="hwm"
                        stroke="#FFD60A"
                        strokeWidth={1.5}
                        strokeDasharray="4 4"
                        dot={false}
                        opacity={0.6}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>

                {/* Lower Pane: Underwater Drawdown (Synchronized in Split Mode) */}
                {chartMode === "split" && (
                  <div className="w-full h-[120px] pt-3 mt-2 border-t border-white/[0.06]">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-semibold uppercase text-rose-400 font-mono">
                        Underwater Drawdown (%)
                      </span>
                      <span className="text-[9px] font-mono text-neutral-400">
                        Peak-to-Trough Capital Dip
                      </span>
                    </div>
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={cumPnl} margin={{ top: 0, right: 10, left: -15, bottom: 0 }}>
                        <defs>
                          <linearGradient id="appleDrawdownGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#FF453A" stopOpacity={0.3} />
                            <stop offset="100%" stopColor="#FF453A" stopOpacity={0.02} />
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="date" hide />
                        <YAxis reversed={true} tick={{ fontSize: 8, fill: "#71717a", fontFamily: "var(--font-mono, monospace)" }} tickLine={false} axisLine={false} tickFormatter={(v) => `-$${Math.abs(v)}`} width={55} />
                        <Tooltip
                          {...APPLE_TOOLTIP_STYLE}
                          formatter={(v: any) => [`-$${Math.abs(Number(v || 0)).toFixed(2)}`, "Drawdown Amount"]}
                        />
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
                <div className="lg:col-span-4 flex flex-col">
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
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
                
                {/* Real Symbol Performance (Left Column - 8 Cols) */}
                <div className="lg:col-span-8 flex flex-col">
                  <AppleSectionCard
                    title="Asset &amp; Symbol Profitability"
                    subtitle="Verified P&L distribution by traded instrument"
                    badge={`${symbolStats.length} Traded Pairs`}
                    action={
                      <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/[0.08]">
                        <button
                          onClick={() => setSymbolViewMode("cards")}
                          className={`p-1 rounded-lg transition-all ${
                            symbolViewMode === "cards" ? "bg-white/[0.15] text-white" : "text-neutral-400 hover:text-white"
                          }`}
                        >
                          <LayoutGrid className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setSymbolViewMode("table")}
                          className={`p-1 rounded-lg transition-all ${
                            symbolViewMode === "table" ? "bg-white/[0.15] text-white" : "text-neutral-400 hover:text-white"
                          }`}
                        >
                          <TableIcon className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    }
                  >
                    {symbolViewMode === "cards" ? (
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
                    ) : (
                      /* Compact Quant Table Mode */
                      <div className="w-full overflow-x-auto">
                        <table className="w-full text-left font-mono text-xs">
                          <thead>
                            <tr className="border-b border-white/[0.08] text-[10px] text-neutral-400 uppercase">
                              <th className="pb-2.5">Instrument</th>
                              <th className="pb-2.5 text-right">Trades</th>
                              <th className="pb-2.5 text-right">Win Rate</th>
                              <th className="pb-2.5 text-right">Volume</th>
                              <th className="pb-2.5 text-right">Net P&amp;L</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/[0.04]">
                            {symbolStats.map((item) => (
                              <tr key={item.name} className="hover:bg-white/[0.02]">
                                <td className="py-2.5 font-bold text-white flex items-center gap-2">
                                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.profit >= 0 ? "#30D158" : "#FF453A" }} />
                                  {item.name}
                                </td>
                                <td className="py-2.5 text-right text-neutral-300">{item.count}</td>
                                <td className="py-2.5 text-right text-neutral-300">{item.winRate}%</td>
                                <td className="py-2.5 text-right text-neutral-400">{item.volume}L</td>
                                <td className={`py-2.5 text-right font-bold ${item.profit >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                                  {item.profit >= 0 ? "+" : ""}${item.profit.toFixed(2)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </AppleSectionCard>
                </div>

                {/* Directional Edge & Capital Flow (Right Column - 4 Cols) */}
                <div className="lg:col-span-4 flex flex-col gap-5">
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
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
                <div className="lg:col-span-6 flex flex-col">
                  <AppleSectionCard title="Pair Efficiency Matrix (Win Rate vs R:R)" subtitle="Payoff asymmetry analysis across traded assets">
                    <RiskRewardMatrix trades={trades} />
                  </AppleSectionCard>
                </div>

                <div className="lg:col-span-6 flex flex-col">
                  <AppleSectionCard
                    title="Daily P&amp;L Distribution (Last 30 Sessions)"
                    subtitle="Click any session bar to inspect trade tickets"
                  >
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart data={dailyPnl}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                        <XAxis dataKey="date" tick={{ fontSize: 8, fill: "#71717a", fontFamily: "var(--font-mono, monospace)" }} tickLine={false} axisLine={false} minTickGap={20} />
                        <YAxis tick={{ fontSize: 9, fill: "#71717a", fontFamily: "var(--font-mono, monospace)" }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} width={55} />
                        <Tooltip
                          {...APPLE_TOOLTIP_STYLE}
                          formatter={(v: any, name: any, item: any) => [
                            `$${Number(v || 0).toFixed(2)} (${item?.payload?.count || 0} trades)`,
                            "Daily P&L",
                          ]}
                        />
                        <Bar
                          dataKey="pnl"
                          radius={[4, 4, 0, 0]}
                          onClick={(entry: any) => setSelectedSessionDate(entry?.payload?.date || entry?.date || null)}
                          className="cursor-pointer"
                        >
                          {dailyPnl.map((d, i) => (
                            <Cell
                              key={i}
                              fill={d.pnl >= 0 ? "#30D158" : "#FF453A"}
                              className="hover:opacity-80 transition-opacity"
                            />
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
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
                <div className="lg:col-span-7 flex flex-col">
                  <SessionPerformanceGrid trades={trades} />
                </div>
                <div className="lg:col-span-5 flex flex-col">
                  <RetailSentimentGauge />
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
                <div className="lg:col-span-7 min-h-[440px] flex flex-col">
                  <TradeDurationScatterPlot trades={trades} />
                </div>
                <div className="lg:col-span-5 min-h-[440px] flex flex-col">
                  <MistakeCostAnalyzer />
                </div>
              </div>
            </motion.div>
          )}

        </AnimatePresence>

        {/* ── 5. BOTTOM COCKPIT DOCK ── */}
        <div className="rounded-2xl border border-white/[0.08] bg-[#0c0d12]/75 backdrop-blur-xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
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

      {/* ── 6. SESSION TRADE INSPECTOR DRAWER ── */}
      <AnimatePresence>
        {selectedSessionDate && (
          <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="w-full max-w-md h-full bg-[#0e0f14] border-l border-white/[0.1] shadow-2xl p-6 flex flex-col"
            >
              <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
                <div>
                  <h3 className="text-sm font-semibold text-white tracking-tight">
                    Session Trade Inspector
                  </h3>
                  <span className="text-xs font-mono text-emerald-400">{selectedSessionDate}</span>
                </div>
                <button
                  onClick={() => setSelectedSessionDate(null)}
                  className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/[0.08] transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto py-4 space-y-3 font-mono">
                {sessionDetailTrades.length === 0 ? (
                  <p className="text-xs text-neutral-500 text-center py-10">No detailed trades found for this session date.</p>
                ) : (
                  sessionDetailTrades.map((t, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.08] space-y-1.5"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-white">{t.pair}</span>
                        <span className={`font-semibold tabular-nums ${t.profit >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                          {t.profit >= 0 ? "+" : ""}${t.profit.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between text-[10px] text-neutral-400">
                        <span>{t.direction} &bull; {t.lotSize || 1} Lot</span>
                        <span>Entry: {t.entry}</span>
                      </div>
                      {t.notes && (
                        <p className="text-[10px] text-neutral-300 font-sans border-t border-white/[0.04] pt-1">
                          {t.notes}
                        </p>
                      )}
                    </div>
                  ))
                )}
              </div>

              <div className="pt-4 border-t border-white/[0.08] flex justify-between items-center text-xs font-mono">
                <span className="text-neutral-400">Total Session P&amp;L:</span>
                <span className={`font-bold tabular-nums ${
                  sessionDetailTrades.reduce((s, t) => s + t.profit, 0) >= 0 ? "text-emerald-400" : "text-rose-400"
                }`}>
                  {sessionDetailTrades.reduce((s, t) => s + t.profit, 0) >= 0 ? "+" : ""}$
                  {sessionDetailTrades.reduce((s, t) => s + t.profit, 0).toFixed(2)}
                </span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
