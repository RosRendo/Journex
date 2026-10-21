"use client";

import { useCsvTrades, TradeData } from "@/hooks/useCsvTrades";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useState, useMemo, useEffect } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Play,
  TrendingUp,
  TrendingDown,
  Target,
  ShieldCheck,
  ShieldAlert,
  Award,
  Flame,
  Calendar as CalendarIcon,
  Zap,
  BookOpen,
  Edit3,
  Save,
  CheckCircle2,
  AlertTriangle,
  Smile,
  Meh,
  Frown,
  Activity,
  Layers,
  Sparkles,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
} from "recharts";
import { getPairDigits } from "@/lib/format";
import { TradeReplayModal } from "@/components/journal/TradeReplayModal";
import { toast } from "sonner";

interface DailyJournalState {
  mood: string;
  marketNarrative: string;
  lessons: string;
  mistakes: string[];
  grade: "A+" | "A" | "B" | "C" | "F";
}

const DEFAULT_JOURNAL: DailyJournalState = {
  mood: "Disciplined",
  marketNarrative: "",
  lessons: "",
  mistakes: [],
  grade: "A",
};

const MOODS = [
  { label: "Disciplined", icon: ShieldCheck, color: "#20e0b2" },
  { label: "In The Zone", icon: Flame, color: "#f59e0b" },
  { label: "Calm / Patient", icon: Smile, color: "#38bdf8" },
  { label: "FOMO Tempted", icon: AlertTriangle, color: "#f97316" },
  { label: "Frustrated", icon: Frown, color: "#ef4444" },
];

const MISTAKE_OPTIONS = [
  "No Mistakes (Clean Execution)",
  "Chased Price (FOMO)",
  "Moved Stop Loss",
  "Over-leveraged",
  "Early Exit / Cut Winner",
  "Revenge Traded",
  "Traded Outside Session",
];

export default function DayReviewPage() {
  const params = useParams();
  const router = useRouter();
  const rawDate = params?.date;
  const dateStr = (Array.isArray(rawDate) ? rawDate[0] : rawDate) || "";

  const { trades, loading } = useCsvTrades();
  const [selectedTrade, setSelectedTrade] = useState<TradeData | null>(null);
  const [replayTradeId, setReplayTradeId] = useState<number | string | null>(null);

  // Daily Journal Form State
  const [journalState, setJournalState] = useState<DailyJournalState>(DEFAULT_JOURNAL);
  const [isSaved, setIsSaved] = useState(false);

  // Load Journal Note from localStorage
  useEffect(() => {
    if (!dateStr) return;
    try {
      const stored = localStorage.getItem(`daily_journal_${dateStr}`);
      if (stored) {
        setJournalState(JSON.parse(stored));
      } else {
        setJournalState(DEFAULT_JOURNAL);
      }
    } catch {
      setJournalState(DEFAULT_JOURNAL);
    }
  }, [dateStr]);

  const saveJournal = () => {
    try {
      localStorage.setItem(`daily_journal_${dateStr}`, JSON.stringify(journalState));
      setIsSaved(true);
      toast.success("Daily reflection journal saved!");
      setTimeout(() => setIsSaved(false), 2500);
    } catch {
      toast.error("Failed to save journal");
    }
  };

  // Previous & Next Day Navigation
  const { prevDateStr, nextDateStr, formattedDateHeader } = useMemo(() => {
    if (!dateStr) return { prevDateStr: "", nextDateStr: "", formattedDateHeader: "" };
    const cur = new Date(dateStr + "T00:00:00");
    const prev = new Date(cur);
    prev.setDate(prev.getDate() - 1);
    const next = new Date(cur);
    next.setDate(next.getDate() + 1);

    const pStr = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, "0")}-${String(prev.getDate()).padStart(2, "0")}`;
    const nStr = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}-${String(next.getDate()).padStart(2, "0")}`;

    const formatted = cur.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    return { prevDateStr: pStr, nextDateStr: nStr, formattedDateHeader: formatted };
  }, [dateStr]);

  // Day Trades
  const dayTrades = useMemo(() => {
    if (!trades) return [];
    return trades
      .filter((t) => {
        if (!t.date) return false;
        const d = new Date(t.date);
        const tDateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        return tDateStr === dateStr;
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [trades, dateStr]);

  // Core Metrics
  const totalProfit = useMemo(() => dayTrades.reduce((sum, t) => sum + t.profit, 0), [dayTrades]);
  const winTrades = useMemo(() => dayTrades.filter((t) => t.profit > 0), [dayTrades]);
  const lossTrades = useMemo(() => dayTrades.filter((t) => t.profit < 0), [dayTrades]);
  const winCount = winTrades.length;
  const lossCount = lossTrades.length;
  const winRate = dayTrades.length > 0 ? (winCount / dayTrades.length) * 100 : 0;

  const grossProfit = winTrades.reduce((sum, t) => sum + t.profit, 0);
  const grossLoss = Math.abs(lossTrades.reduce((sum, t) => sum + t.profit, 0));
  const profitFactor = grossLoss > 0 ? (grossProfit / grossLoss).toFixed(2) : grossProfit > 0 ? "MAX" : "0.00";

  const bestTrade = useMemo(() => {
    if (dayTrades.length === 0) return null;
    return [...dayTrades].sort((a, b) => b.profit - a.profit)[0];
  }, [dayTrades]);

  const worstTrade = useMemo(() => {
    if (dayTrades.length === 0) return null;
    return [...dayTrades].sort((a, b) => a.profit - b.profit)[0];
  }, [dayTrades]);

  // Intraday Cumulative P&L Progression Data
  const intradayPnlData = useMemo(() => {
    if (dayTrades.length === 0) return [];
    let running = 0;
    const points = [
      {
        step: 0,
        label: "Start",
        runningPnl: 0,
        tradeProfit: 0,
        symbol: "Open",
      },
    ];

    dayTrades.forEach((t, idx) => {
      running += t.profit;
      const d = new Date(t.date);
      const timeStr = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      points.push({
        step: idx + 1,
        label: `#${idx + 1} ${t.pair} (${timeStr})`,
        runningPnl: Math.round(running * 100) / 100,
        tradeProfit: t.profit,
        symbol: t.pair,
      });
    });

    return points;
  }, [dayTrades]);

  // Session Breakdown
  const sessionBreakdown = useMemo(() => {
    const sessions = {
      asian: { id: "asian", name: "Asian Session", hours: "00:00 - 08:00 UTC", trades: 0, wins: 0, pnl: 0, color: "#a855f7" },
      london: { id: "london", name: "London Session", hours: "08:00 - 13:00 UTC", trades: 0, wins: 0, pnl: 0, color: "#38bdf8" },
      ny: { id: "ny", name: "New York Session", hours: "13:00 - 21:00 UTC", trades: 0, wins: 0, pnl: 0, color: "#f59e0b" },
      close: { id: "close", name: "Late US / Rollover", hours: "21:00 - 00:00 UTC", trades: 0, wins: 0, pnl: 0, color: "#71717a" },
    };

    dayTrades.forEach((t) => {
      const d = new Date(t.date);
      const h = d.getUTCHours();
      let target = sessions.close;
      if (h >= 0 && h < 8) target = sessions.asian;
      else if (h >= 8 && h < 13) target = sessions.london;
      else if (h >= 13 && h < 21) target = sessions.ny;

      target.trades += 1;
      target.pnl += t.profit;
      if (t.profit > 0) target.wins += 1;
    });

    return Object.values(sessions).filter((s) => s.trades > 0);
  }, [dayTrades]);

  // Discipline Analysis
  const disciplineScore = useMemo(() => {
    if (dayTrades.length === 0) return 100;
    const followed = dayTrades.filter((t) => t.followedPlan !== false).length;
    return Math.round((followed / dayTrades.length) * 100);
  }, [dayTrades]);

  const planDeviationCost = useMemo(() => {
    return dayTrades
      .filter((t) => t.followedPlan === false || t.emotion === "FOMO" || t.emotion === "Revenge")
      .reduce((sum, t) => sum + (t.profit < 0 ? Math.abs(t.profit) : 0), 0);
  }, [dayTrades]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-[#20e0b2] border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-mono text-zinc-500 uppercase tracking-widest">Loading Day Review...</span>
        </div>
      </div>
    );
  }

  const isProfitableDay = totalProfit >= 0;

  return (
    <div className="min-h-screen w-full bg-[#09090b] text-[#f4f4f5] flex flex-col pb-16 font-sans">
      {/* ── TOPBAR & DATE STEPPER ── */}
      <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-3 border-b border-[rgba(255,255,255,0.07)] sticky top-0 z-30 bg-[#09090b]/95 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 text-[10px] font-bold uppercase tracking-wider text-zinc-400 hover:text-white hover:border-white/20 transition-all font-mono"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>Dashboard</span>
          </Link>

          {/* Stepper Navigation */}
          <div className="flex items-center gap-1 bg-[#121217] p-1 rounded-xl border border-white/10">
            <Link
              href={`/journal/day/${prevDateStr}`}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
              title="Previous Day"
            >
              <ChevronLeft className="w-4 h-4" />
            </Link>

            <div className="flex items-center gap-2 px-3 py-0.5">
              <CalendarIcon className="w-3.5 h-3.5 text-[#20e0b2]" />
              <span className="text-xs font-bold font-mono text-white">{dateStr}</span>
            </div>

            <Link
              href={`/journal/day/${nextDateStr}`}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
              title="Next Day"
            >
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          <span className="hidden md:inline-block text-xs text-zinc-400 font-mono">
            {formattedDateHeader}
          </span>
        </div>

        {/* Right Status Pill */}
        <div className="flex items-center gap-3">
          <div
            className={`px-3 py-1 rounded-full border text-[10px] font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 ${
              dayTrades.length === 0
                ? "bg-zinc-800/40 text-zinc-400 border-zinc-700"
                : isProfitableDay
                ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                : "bg-rose-500/15 text-rose-400 border-rose-500/30"
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${isProfitableDay ? "bg-emerald-400" : "bg-rose-400"}`} />
            <span>
              {dayTrades.length === 0
                ? "NO TRADES"
                : isProfitableDay
                ? `NET GAIN (+$${totalProfit.toFixed(2)})`
                : `NET DRAWDOWN (-$${Math.abs(totalProfit).toFixed(2)})`}
            </span>
          </div>

          <div className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-[10px] font-mono font-bold text-zinc-300">
            Grade: <span className="text-[#20e0b2]">{journalState.grade}</span>
          </div>
        </div>
      </div>

      {/* ── MAIN WORKSPACE CONTAINER ── */}
      <div className="flex-1 w-full max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
        {/* 1. EXECUTIVE METRICS KPI ROW */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
          {/* Card 1: Net P&L */}
          <div className="p-4 rounded-2xl border bg-[#121217] border-white/[0.08] flex flex-col justify-between">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-500">Net Realized P&L</span>
            <div className={`text-2xl sm:text-3xl font-black font-mono tracking-tight mt-1 ${isProfitableDay ? "text-[#20e0b2]" : "text-[#ff5c73]"}`}>
              {isProfitableDay ? "+" : ""}${totalProfit.toFixed(2)}
            </div>
            <div className="text-[9px] font-mono text-zinc-500 mt-1">
              Gross: <span className="text-zinc-300">+${grossProfit.toFixed(1)}</span> / <span className="text-rose-400">-${grossLoss.toFixed(1)}</span>
            </div>
          </div>

          {/* Card 2: Win Rate & Trades */}
          <div className="p-4 rounded-2xl border bg-[#121217] border-white/[0.08] flex flex-col justify-between">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-500">Win Rate / Executions</span>
            <div className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-white mt-1">
              {winRate.toFixed(0)}%
            </div>
            <div className="text-[9px] font-mono text-zinc-400 mt-1">
              <strong className="text-emerald-400">{winCount}W</strong> - <strong className="text-rose-400">{lossCount}L</strong> ({dayTrades.length} Total)
            </div>
          </div>

          {/* Card 3: Profit Factor */}
          <div className="p-4 rounded-2xl border bg-[#121217] border-white/[0.08] flex flex-col justify-between">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-500">Profit Factor</span>
            <div className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-[#38bdf8] mt-1">
              {profitFactor}
            </div>
            <div className="text-[9px] font-mono text-zinc-400 mt-1">
              Expectancy: ${(dayTrades.length > 0 ? totalProfit / dayTrades.length : 0).toFixed(2)} / trade
            </div>
          </div>

          {/* Card 4: Discipline Score */}
          <div className="p-4 rounded-2xl border bg-[#121217] border-white/[0.08] flex flex-col justify-between">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-500">Discipline Score</span>
            <div className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-[#f59e0b] mt-1">
              {disciplineScore}%
            </div>
            <div className="text-[9px] font-mono text-zinc-400 mt-1">
              {planDeviationCost > 0 ? (
                <span className="text-rose-400">-${planDeviationCost.toFixed(0)} deviation cost</span>
              ) : (
                <span className="text-emerald-400">100% Plan Adherence</span>
              )}
            </div>
          </div>

          {/* Card 5: Best vs Worst */}
          <div className="p-4 rounded-2xl border bg-[#121217] border-white/[0.08] col-span-2 md:col-span-1 flex flex-col justify-between">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-500">Peak Extremes</span>
            <div className="mt-1 space-y-1">
              <div className="text-xs font-mono font-bold flex justify-between">
                <span className="text-zinc-400">Best:</span>
                <span className="text-emerald-400">{bestTrade ? `+$${bestTrade.profit.toFixed(1)} (${bestTrade.pair})` : "—"}</span>
              </div>
              <div className="text-xs font-mono font-bold flex justify-between">
                <span className="text-zinc-400">Worst:</span>
                <span className="text-rose-400">{worstTrade ? `$${worstTrade.profit.toFixed(1)} (${worstTrade.pair})` : "—"}</span>
              </div>
            </div>
          </div>
        </div>

        {/* 2. INTRADAY P&L PROGRESSION CURVE & SESSION BREAKDOWN */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Intraday Equity Progression Chart */}
          <div className="lg:col-span-2 p-5 rounded-3xl border bg-[#121217] border-white/[0.08] shadow-xl flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-[#20e0b2]/10 border border-[#20e0b2]/30 flex items-center justify-center text-[#20e0b2]">
                  <Activity className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Intraday P&L Progression</h3>
                  <p className="text-[9px] font-mono text-zinc-500 uppercase">Cumulative trade growth throughout the day</p>
                </div>
              </div>
              <span className="text-xs font-mono font-bold text-[#20e0b2]">
                {dayTrades.length} Trade Sequences
              </span>
            </div>

            <div className="h-[220px] w-full mt-2">
              {dayTrades.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={intradayPnlData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="pnlGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={isProfitableDay ? "#20e0b2" : "#ff5c73"} stopOpacity={0.4} />
                        <stop offset="95%" stopColor={isProfitableDay ? "#20e0b2" : "#ff5c73"} stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="step"
                      stroke="#52525b"
                      fontSize={10}
                      fontFamily="monospace"
                      tickLine={false}
                      axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
                    />
                    <YAxis
                      stroke="#52525b"
                      fontSize={10}
                      fontFamily="monospace"
                      tickLine={false}
                      axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
                      tickFormatter={(val) => `$${val}`}
                    />
                    <ReferenceLine y={0} stroke="rgba(255,255,255,0.2)" strokeDasharray="3 3" />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="rounded-xl border border-white/10 bg-[#181c27] p-2.5 shadow-2xl text-[11px] font-mono">
                              <div className="text-zinc-400 font-bold">{data.label}</div>
                              <div className="mt-1 text-white">
                                Cumulative P&L:{" "}
                                <strong className={data.runningPnl >= 0 ? "text-[#20e0b2]" : "text-[#ff5c73]"}>
                                  {data.runningPnl >= 0 ? "+" : ""}${data.runningPnl.toFixed(2)}
                                </strong>
                              </div>
                              {data.step > 0 && (
                                <div className="text-[10px] text-zinc-400">
                                  Trade Result:{" "}
                                  <span className={data.tradeProfit >= 0 ? "text-emerald-400" : "text-rose-400"}>
                                    {data.tradeProfit >= 0 ? "+" : ""}${data.tradeProfit.toFixed(2)}
                                  </span>
                                </div>
                              )}
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="runningPnl"
                      stroke={isProfitableDay ? "#20e0b2" : "#ff5c73"}
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#pnlGrad)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs font-mono text-zinc-500">
                  No trades recorded for {dateStr}
                </div>
              )}
            </div>
          </div>

          {/* Session Breakdown Column */}
          <div className="p-5 rounded-3xl border bg-[#121217] border-white/[0.08] shadow-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-lg bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
                  <Clock className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Session Performance</h3>
                  <p className="text-[9px] font-mono text-zinc-500 uppercase">Intraday liquidity windows</p>
                </div>
              </div>

              <div className="space-y-3">
                {sessionBreakdown.length > 0 ? (
                  sessionBreakdown.map((s) => {
                    const sWinRate = s.trades > 0 ? Math.round((s.wins / s.trades) * 100) : 0;
                    return (
                      <div key={s.id} className="p-3 rounded-xl bg-black/30 border border-white/5 flex items-center justify-between">
                        <div>
                          <div className="text-xs font-bold text-white flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full" style={{ background: s.color }} />
                            <span>{s.name}</span>
                          </div>
                          <div className="text-[9px] font-mono text-zinc-500 mt-0.5">{s.hours}</div>
                        </div>

                        <div className="text-right">
                          <div className={`text-xs font-mono font-bold ${s.pnl >= 0 ? "text-[#20e0b2]" : "text-[#ff5c73]"}`}>
                            {s.pnl >= 0 ? "+" : ""}${s.pnl.toFixed(2)}
                          </div>
                          <div className="text-[9px] font-mono text-zinc-400">
                            {s.trades} trades · {sWinRate}% win
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-xs font-mono text-zinc-500 py-6 text-center">
                    No active trading sessions on this day.
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-white/5 text-[10px] font-mono text-zinc-400 flex items-center justify-between">
              <span>Best Trading Session</span>
              <span className="font-bold text-[#20e0b2]">
                {sessionBreakdown.length > 0
                  ? [...sessionBreakdown].sort((a, b) => b.pnl - a.pnl)[0].name
                  : "N/A"}
              </span>
            </div>
          </div>
        </div>

        {/* 3. DAILY JOURNAL & REFLECTION STUDIO (THE NEW REQUESTED FEATURE) */}
        <div className="p-6 rounded-3xl border bg-gradient-to-b from-[#161a24] to-[#11131a] border-white/10 shadow-2xl">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-5 border-b border-white/10 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.2)]">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white font-display">Daily Reflection & Psychology Journal</h3>
                <p className="text-xs text-zinc-400">Log mindset, market context, mistake tags, and rules to enforce tomorrow</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={saveJournal}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#20e0b2] text-black font-bold text-xs uppercase tracking-wider hover:opacity-90 transition-all shadow-[0_0_15px_rgba(32,224,178,0.3)] font-mono"
              >
                {isSaved ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                <span>{isSaved ? "Saved!" : "Save Reflection"}</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Column 1: Psychology & Grade */}
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400 mb-2">
                  Mental State & Mindset
                </label>
                <div className="grid grid-cols-1 gap-1.5">
                  {MOODS.map((m) => {
                    const isSelected = journalState.mood === m.label;
                    const Icon = m.icon;
                    return (
                      <button
                        key={m.label}
                        type="button"
                        onClick={() => setJournalState((prev) => ({ ...prev, mood: m.label }))}
                        className={`px-3 py-2 rounded-xl text-xs font-mono font-bold border transition-all flex items-center gap-2.5 ${
                          isSelected
                            ? "bg-white/10 text-white border-white/30 shadow-md"
                            : "bg-black/20 text-zinc-400 border-white/5 hover:text-zinc-200 hover:border-white/10"
                        }`}
                      >
                        <Icon className="w-4 h-4" style={{ color: m.color }} />
                        <span>{m.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400 mb-2">
                  Daily Execution Grade
                </label>
                <div className="flex gap-2">
                  {(["A+", "A", "B", "C", "F"] as const).map((grade) => (
                    <button
                      key={grade}
                      type="button"
                      onClick={() => setJournalState((prev) => ({ ...prev, grade }))}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-mono font-bold border transition-all ${
                        journalState.grade === grade
                          ? "bg-[#20e0b2] text-black border-[#20e0b2]"
                          : "bg-black/20 text-zinc-400 border-white/10 hover:text-white"
                      }`}
                    >
                      {grade}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Column 2: Market Narrative & Conditions */}
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400 mb-2">
                  Market Context & Daily Narrative
                </label>
                <textarea
                  rows={4}
                  value={journalState.marketNarrative}
                  onChange={(e) => setJournalState((prev) => ({ ...prev, marketNarrative: e.target.value }))}
                  placeholder="e.g. Gold CPI trend continuation, USD weakness across sessions, Asian range swept cleanly at London open..."
                  className="w-full rounded-xl bg-black/30 border border-white/10 p-3 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-[#20e0b2] transition-colors font-sans"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400 mb-2">
                  Mistake Tags / Friction Points
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {MISTAKE_OPTIONS.map((tag) => {
                    const isSelected = journalState.mistakes.includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => {
                          const next = isSelected
                            ? journalState.mistakes.filter((m) => m !== tag)
                            : [...journalState.mistakes, tag];
                          setJournalState((prev) => ({ ...prev, mistakes: next }));
                        }}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold border transition-all ${
                          isSelected
                            ? "bg-rose-500/20 text-rose-300 border-rose-500/40"
                            : "bg-black/20 text-zinc-500 border-white/5 hover:text-zinc-300"
                        }`}
                      >
                        {tag}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Column 3: Lessons & Rule For Tomorrow */}
            <div className="flex flex-col justify-between">
              <div>
                <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400 mb-2">
                  Actionable Lessons & Rules for Tomorrow
                </label>
                <textarea
                  rows={7}
                  value={journalState.lessons}
                  onChange={(e) => setJournalState((prev) => ({ ...prev, lessons: e.target.value }))}
                  placeholder="1. Wait for candle close before entering on M5 FVG&#10;2. Stick to 1% max risk on London open&#10;3. Lock in partials once 1:1.5 RR is reached..."
                  className="w-full rounded-xl bg-black/30 border border-white/10 p-3 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-[#20e0b2] transition-colors font-sans leading-relaxed"
                />
              </div>

              <div className="mt-3 flex items-center justify-between text-[10px] font-mono text-zinc-500">
                <span>Auto-saved to local browser profile</span>
                <span>{journalState.lessons.length} characters</span>
              </div>
            </div>
          </div>
        </div>

        {/* 4. TRADES EXECUTED LIST & TRADE DETAIL INSPECTOR */}
        <div className="flex flex-col lg:flex-row items-start gap-6">
          {/* Left Column: Trades Table */}
          <div className="flex-1 w-full space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>Trades Executed on {dateStr}</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-zinc-300 font-mono">
                  {dayTrades.length}
                </span>
              </h2>
              <span className="text-[10px] font-mono text-zinc-500">Click any trade to inspect &amp; replay</span>
            </div>

            {dayTrades.length === 0 ? (
              <div className="p-12 rounded-3xl border border-white/10 bg-[#121217] text-center text-zinc-500 font-mono text-xs">
                No trades were taken on this date.
              </div>
            ) : (
              dayTrades.map((trade, idx) => {
                const isWin = trade.profit > 0;
                const isSelected = selectedTrade?.id === trade.id;
                return (
                  <div
                    key={trade.id || idx}
                    onClick={() => setSelectedTrade(trade)}
                    className={`group p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer relative overflow-hidden backdrop-blur-md ${
                      isSelected
                        ? "bg-white/[0.08] border-[#20e0b2] shadow-[0_0_20px_rgba(32,224,178,0.15)]"
                        : "bg-[#121217] border-white/10 hover:border-white/20"
                    }`}
                  >
                    <div className="flex items-center justify-between relative z-10">
                      <div className="flex items-center gap-4">
                        <div
                          className="w-1.5 h-11 rounded-full"
                          style={{ background: isWin ? "#20e0b2" : "#ff5c73" }}
                        />
                        <div>
                          <div className="flex items-center gap-2.5">
                            <span className="font-bold text-base text-white font-mono">{trade.pair}</span>
                            <span
                              className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-wider font-mono ${
                                trade.direction === "Long"
                                  ? "bg-emerald-500/20 text-emerald-300"
                                  : "bg-rose-500/20 text-rose-300"
                              }`}
                            >
                              {trade.direction}
                            </span>
                            {trade.lotSize && (
                              <span className="text-[10px] font-mono text-zinc-400">
                                {trade.lotSize} Lots
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] font-mono mt-1 text-zinc-500 flex items-center gap-2">
                            <Clock className="w-3 h-3 text-zinc-400" />
                            <span>{new Date(trade.date).toLocaleTimeString()}</span>
                            {trade.notes && (
                              <>
                                <span>·</span>
                                <span className="text-zinc-400 truncate max-w-[200px]">{trade.notes}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-6">
                        <div className="hidden sm:block text-right">
                          <div className="text-[9px] font-mono uppercase tracking-wider text-zinc-500 mb-0.5">Entry</div>
                          <div className="font-mono font-bold text-xs text-white">
                            {trade.entry.toFixed(getPairDigits(trade.pair))}
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-[9px] font-mono uppercase tracking-wider text-zinc-500 mb-0.5">Net P&L</div>
                          <div className={`font-mono font-black text-base sm:text-lg tracking-tight ${isWin ? "text-[#20e0b2]" : "text-[#ff5c73]"}`}>
                            {isWin ? "+" : ""}${trade.profit.toFixed(2)}
                          </div>
                        </div>

                        <ChevronRight className="w-4 h-4 text-zinc-500 group-hover:text-white transition-colors group-hover:translate-x-1" />
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Right Column: Selected Trade Detail Card & Replay Launcher */}
          <div className="w-full lg:w-[380px] shrink-0 sticky top-20">
            <AnimatePresence mode="wait">
              {selectedTrade ? (
                <motion.div
                  key={selectedTrade.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="p-6 rounded-3xl border bg-[#141822] border-white/10 shadow-2xl space-y-5"
                >
                  <div className="flex items-center justify-between border-b border-white/10 pb-4">
                    <div>
                      <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-[#20e0b2]">Trade Inspector</span>
                      <h3 className="text-lg font-bold text-white font-mono mt-0.5">{selectedTrade.pair}</h3>
                    </div>
                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase ${
                        selectedTrade.profit >= 0 ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"
                      }`}
                    >
                      {selectedTrade.profit >= 0 ? "WIN" : "LOSS"}
                    </span>
                  </div>

                  <div className="space-y-3 font-mono text-xs">
                    <div className="flex justify-between items-center py-1.5 border-b border-white/5">
                      <span className="text-zinc-400">Direction</span>
                      <span className="font-bold text-white">{selectedTrade.direction}</span>
                    </div>

                    <div className="flex justify-between items-center py-1.5 border-b border-white/5">
                      <span className="text-zinc-400">Entry Price</span>
                      <span className="font-bold text-white">{selectedTrade.entry.toFixed(getPairDigits(selectedTrade.pair))}</span>
                    </div>

                    {selectedTrade.closePrice && (
                      <div className="flex justify-between items-center py-1.5 border-b border-white/5">
                        <span className="text-zinc-400">Close Price</span>
                        <span className="font-bold text-white">{selectedTrade.closePrice.toFixed(getPairDigits(selectedTrade.pair))}</span>
                      </div>
                    )}

                    <div className="flex justify-between items-center py-1.5 border-b border-white/5">
                      <span className="text-zinc-400">Net Return</span>
                      <span className={`font-black text-sm ${selectedTrade.profit >= 0 ? "text-[#20e0b2]" : "text-[#ff5c73]"}`}>
                        {selectedTrade.profit >= 0 ? "+" : ""}${selectedTrade.profit.toFixed(2)}
                      </span>
                    </div>

                    <div className="flex justify-between items-center py-1.5 border-b border-white/5">
                      <span className="text-zinc-400">Execution Time</span>
                      <span className="text-zinc-300">{new Date(selectedTrade.date).toLocaleTimeString()}</span>
                    </div>

                    {selectedTrade.notes && (
                      <div className="pt-2">
                        <span className="text-[10px] uppercase text-zinc-500 font-bold block mb-1">Setup Notes</span>
                        <div className="p-2.5 rounded-xl bg-black/40 text-zinc-300 text-[11px] leading-relaxed">
                          {selectedTrade.notes}
                        </div>
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => setReplayTradeId(selectedTrade.id)}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-500 hover:to-sky-400 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(56,189,248,0.25)] font-mono"
                  >
                    <Play className="w-4 h-4 fill-white" />
                    <span>Replay Trade in Tick Simulator</span>
                  </button>
                </motion.div>
              ) : (
                <div className="p-8 rounded-3xl border border-dashed border-white/10 bg-[#121217] text-center text-zinc-500 font-mono text-xs flex flex-col items-center gap-2">
                  <Activity className="w-6 h-6 text-zinc-600 mb-1" />
                  <span>Select any trade on the left to inspect entry levels and launch tick replay.</span>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* ── INTERACTIVE TRADE REPLAY MODAL ── */}
      <AnimatePresence>
        {replayTradeId !== null && (
          <TradeReplayModal
            tradeId={replayTradeId}
            onClose={() => setReplayTradeId(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
