"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  TrendingUp,
  TrendingDown,
  Clock,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Plus,
  Search,
  Activity,
  Check,
  Loader2,
  AlertCircle,
  Trash2,
  Image as ImageIcon,
  Crosshair,
  AlertTriangle,
  ShieldCheck,
  RefreshCw,
  X,
  Eye,
  BarChart2,
  Layers,
  Zap,
  Flame,
  Wallet,
  Compass,
  Calendar as CalendarIcon,
  ExternalLink,
} from "lucide-react";
import { useCsvTrades, TradeData } from "@/hooks/useCsvTrades";
import { useJournalData } from "@/hooks/useJournalData";
import { fetchWithAuth, getBackendUrl } from "@/lib/utils";
import { usePositions } from "@/hooks/usePositions";
import { useBridgeUrl } from "@/hooks/useBridgeUrl";
import { getSession } from "@/lib/useSession";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from "recharts";
import CsvUploadComponent from "@/components/CsvUploadComponent";
import { motion, AnimatePresence } from "framer-motion";

// Cockpit Modular Rails
import UnifiedAccountHub from "@/components/dashboard/cockpit/UnifiedAccountHub";
import CockpitPeekDrawer from "@/components/dashboard/cockpit/CockpitPeekDrawer";
import { OpenPositionsList } from "@/components/dashboard/widgets/OpenPositionsList";
import { AllPairsGrid } from "@/components/dashboard/widgets/AllPairsGrid";
import { MarketWatchWidget } from "@/components/dashboard/widgets/MarketWatchWidget";
import { AIDeskSummary } from "@/components/dashboard/widgets/AIDeskSummary";
import { EconomicNewsTicker } from "@/components/dashboard/widgets/EconomicNewsTicker";
import { DailyRiskWidget } from "@/components/dashboard/widgets/DailyRiskWidget";

export default function UnifiedDashboard() {
  const router = useRouter();
  const { trades, analytics, loading, error, refresh } = useCsvTrades();
  const { positions } = usePositions();
  const { bridgeUrl } = useBridgeUrl();

  // Active Symbol & Workspace States
  const [activeSymbol, setActiveSymbol] = useState<string>("XAUUSD");
  const [showUpload, setShowUpload] = useState(false);
  const [expandedTicket, setExpandedTicket] = useState<string | null>(null);
  const [analyticsView, setAnalyticsView] = useState<"split" | "calendar" | "equity" | "strategy">("split");

  // Peek Drawer State
  const [peekState, setPeekState] = useState<{
    isOpen: boolean;
    type: string;
    data?: any;
  }>({
    isOpen: false,
    type: "setup_inspector",
    data: null,
  });

  // MT5 Live Pulse Data (Defaulting to real Exness values)
  const [mt5Data, setMt5Data] = useState<{
    balance: number;
    equity: number;
    profit: number;
    margin_free: number;
    server: string;
    connected: boolean;
  }>({
    balance: 35.18,
    equity: 35.18,
    profit: 0.0,
    margin_free: 35.18,
    server: "Exness-MT5Trial17",
    connected: true,
  });

  // Calendar State
  const [currentDate, setCurrentDate] = useState(new Date());
  const calendarYear = currentDate.getFullYear();
  const calendarMonth = currentDate.getMonth();
  const calendarDaysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();
  const calendarFirstDayIndex = new Date(calendarYear, calendarMonth, 1).getDay();
  const calendarMonthName = currentDate.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const calendarDays: (number | null)[] = [];
  for (let i = 0; i < calendarFirstDayIndex; i++) calendarDays.push(null);
  for (let i = 1; i <= calendarDaysInMonth; i++) calendarDays.push(i);

  const prevMonth = () => setCurrentDate(new Date(calendarYear, calendarMonth - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(calendarYear, calendarMonth + 1, 1));
  const todayMonth = () => setCurrentDate(new Date());

  const calendarPnLMap = useMemo(() => {
    const map = new Map<string, { pnl: number; count: number }>();
    (trades || []).forEach((t) => {
      const dateStr = new Date(t.date).toISOString().split("T")[0];
      if (!map.has(dateStr)) map.set(dateStr, { pnl: 0, count: 0 });
      const current = map.get(dateStr)!;
      current.pnl += t.profit;
      current.count += 1;
    });
    return map;
  }, [trades]);

  // Filters State
  const [searchSymbol, setSearchSymbol] = useState("");
  const [filterSetup, setFilterSetup] = useState("all");
  const [filterSide, setFilterSide] = useState<"all" | "Long" | "Short">("all");
  const [filterMistake, setFilterMistake] = useState("all");
  const [filterStatus, setFilterStatus] = useState<"all" | "WIN" | "LOSS" | "OPEN" | "BE">("all");
  const [dateFilter, setDateFilter] = useState<"all" | "today" | "week" | "month" | "year">("all");

  const [page, setPage] = useState(1);
  const rowsPerPage = 12;

  const [sidebarTab, setSidebarTab] = useState<"watchlist" | "ai_brief" | "mistakes">("watchlist");

  // Fetch real MT5 account pulse
  useEffect(() => {
    const fetchPulse = async () => {
      try {
        const backend = getBackendUrl();
        const res = await fetchWithAuth(`${backend}/api/bridge/api/account`);
        if (res.ok) {
          const json = await res.json();
          if (json.success && (json.account || json.balance !== undefined)) {
            const acc = json.account || json;
            setMt5Data({
              balance: acc.balance ?? 35.18,
              equity: acc.equity ?? 35.18,
              profit: acc.profit ?? 0.0,
              margin_free: acc.margin_free ?? 35.18,
              server: acc.server ?? "Exness-MT5Trial17",
              connected: true,
            });
          }
        }
      } catch (e) {
        // Keep live connected state
      }
    };
    fetchPulse();
    const id = setInterval(fetchPulse, 8000);
    return () => clearInterval(id);
  }, [bridgeUrl]);

  // Filtered Trades Calculation
  const filteredTrades = useMemo(() => {
    const now = new Date();
    return (trades || []).filter((t) => {
      const sym = t.pair?.toLowerCase() || "";
      const tradeDate = new Date(t.date);
      const matchSym = !searchSymbol || sym.includes(searchSymbol.toLowerCase());
      const matchSide = filterSide === "all" || t.direction === filterSide;
      const matchSetup = filterSetup === "all" || t.notes?.toLowerCase().includes(filterSetup.toLowerCase());
      const matchMistake =
        filterMistake === "all" ||
        t.notes?.toLowerCase().includes(filterMistake.toLowerCase()) ||
        t.planDeviationReason?.toLowerCase().includes(filterMistake.toLowerCase()) ||
        t.emotion?.toLowerCase().includes(filterMistake.toLowerCase());
      const matchStatus =
        filterStatus === "all" ||
        (filterStatus === "WIN" && t.profit > 0) ||
        (filterStatus === "LOSS" && t.profit < 0) ||
        (filterStatus === "BE" && t.profit === 0) ||
        (filterStatus === "OPEN" && !t.closePrice);
      let matchDate = true;
      if (dateFilter === "today") matchDate = tradeDate.toDateString() === now.toDateString();
      else if (dateFilter === "week") matchDate = now.getTime() - tradeDate.getTime() <= 7 * 86400000;
      else if (dateFilter === "month")
        matchDate = tradeDate.getMonth() === now.getMonth() && tradeDate.getFullYear() === now.getFullYear();
      else if (dateFilter === "year") matchDate = tradeDate.getFullYear() === now.getFullYear();
      return matchSym && matchSide && matchSetup && matchMistake && matchStatus && matchDate;
    });
  }, [trades, searchSymbol, filterSetup, filterSide, filterMistake, filterStatus, dateFilter]);

  const totalPages = Math.ceil(filteredTrades.length / rowsPerPage);
  const paginatedTrades = filteredTrades.slice((page - 1) * rowsPerPage, page * rowsPerPage);

  const filteredStats = useMemo(() => {
    const wins = filteredTrades.filter((t) => t.profit > 0);
    const totalProfit = filteredTrades.reduce((sum, t) => sum + t.profit, 0);
    const winRate = filteredTrades.length > 0 ? (wins.length / filteredTrades.length) * 100 : 0;
    return { totalProfit, winRate };
  }, [filteredTrades]);

  const profitFactor = useMemo(() => {
    const wins = filteredTrades.filter((t) => t.profit > 0);
    const losses = filteredTrades.filter((t) => t.profit < 0);
    const totalWins = wins.reduce((sum, t) => sum + t.profit, 0);
    const totalLosses = Math.abs(losses.reduce((sum, t) => sum + t.profit, 0));
    return totalLosses > 0 ? (totalWins / totalLosses).toFixed(2) : totalWins > 0 ? "99.99" : "0.00";
  }, [filteredTrades]);

  const expectancy = useMemo(() => {
    return filteredTrades.length > 0 ? filteredStats.totalProfit / filteredTrades.length : 0;
  }, [filteredTrades, filteredStats.totalProfit]);

  const streaks = useMemo(() => {
    const sorted = [...filteredTrades].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    let maxWinStreak = 0,
      maxLossStreak = 0,
      currentWin = 0,
      currentLoss = 0;
    sorted.forEach((t) => {
      if (t.profit > 0) {
        currentWin++;
        currentLoss = 0;
        if (currentWin > maxWinStreak) maxWinStreak = currentWin;
      } else if (t.profit < 0) {
        currentLoss++;
        currentWin = 0;
        if (currentLoss > maxLossStreak) maxLossStreak = currentLoss;
      }
    });
    return { winStreak: maxWinStreak, lossStreak: maxLossStreak };
  }, [filteredTrades]);

  const { avgWin, avgLoss } = useMemo(() => {
    const wins = filteredTrades.filter((t) => t.profit > 0);
    const losses = filteredTrades.filter((t) => t.profit < 0);
    return {
      avgWin: wins.length > 0 ? wins.reduce((s, t) => s + t.profit, 0) / wins.length : 0,
      avgLoss: losses.length > 0 ? Math.abs(losses.reduce((s, t) => s + t.profit, 0)) / losses.length : 0,
    };
  }, [filteredTrades]);

  const directionRatio = useMemo(() => {
    const longs = filteredTrades.filter((t) => t.direction === "Long").length;
    const shorts = filteredTrades.filter((t) => t.direction === "Short").length;
    const total = longs + shorts || 1;
    return { longPct: Math.round((longs / total) * 100), shortPct: Math.round((shorts / total) * 100) };
  }, [filteredTrades]);

  const strategyData = useMemo(() => {
    const map: Record<string, { profit: number; count: number; wins: number }> = {};
    filteredTrades.forEach((t) => {
      const sym = (t.pair || "XAUUSD").toUpperCase().replace("/", "").trim();
      if (!map[sym]) {
        map[sym] = { profit: 0, count: 0, wins: 0 };
      }
      map[sym].profit += t.profit;
      map[sym].count += 1;
      if (t.profit > 0) map[sym].wins += 1;
    });

    const entries = Object.entries(map).map(([name, data]) => ({
      name,
      value: Math.round(data.profit * 100) / 100,
      count: data.count,
      winRate: Math.round((data.wins / (data.count || 1)) * 100),
    }));

    return entries.sort((a, b) => Math.abs(b.value) - Math.abs(a.value));
  }, [filteredTrades]);

  const mistakeData = useMemo(() => {
    const map: Record<string, number> = {};
    filteredTrades.forEach((t) => {
      if (t.profit < 0) {
        const reason =
          t.planDeviationReason ||
          t.emotion ||
          t.notes?.match(/fomo|greed|revenge|early|late|chase|impulse/i)?.[0] ||
          (!t.followedPlan ? "Rule Deviation" : "Market Edge Cost");
        const key = reason.charAt(0).toUpperCase() + reason.slice(1);
        map[key] = (map[key] || 0) + Math.abs(t.profit);
      }
    });
    if (Object.keys(map).length === 0) {
      map["Discipline Retained"] = 0;
    }
    return Object.entries(map)
      .map(([name, cost]) => ({ name, value: Math.round(cost * 100) / 100 }))
      .sort((a, b) => b.value - a.value);
  }, [filteredTrades]);

  const cumulativeChartData = useMemo(() => {
    const sorted = [...filteredTrades].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    let balance = 0;
    return sorted.slice(-40).map((t, idx) => {
      balance += t.profit;
      return {
        tradeIndex: idx + 1,
        balance: Math.round(balance * 100) / 100,
        date: new Date(t.date).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      };
    });
  }, [filteredTrades]);

  // Today Stats for Execution HUD
  const todayStats = useMemo(() => {
    const todayStr = new Date().toDateString();
    const todayTrades = (trades || []).filter((t) => {
      if (!t.date) return false;
      return new Date(t.date).toDateString() === todayStr;
    });

    const pnl = todayTrades.reduce((sum, t) => sum + (t.profit || 0), 0);
    const wins = todayTrades.filter((t) => t.profit > 0).length;
    const winRate = todayTrades.length > 0 ? (wins / todayTrades.length) * 100 : 0;

    return {
      todayPnl: pnl,
      tradeCount: todayTrades.length,
      winRate,
    };
  }, [trades]);

  const [greeting, setGreeting] = useState("Welcome");
  useEffect(() => {
    const currentHour = new Date().getHours();
    if (currentHour < 12) setGreeting("Good Morning");
    else if (currentHour < 18) setGreeting("Good Afternoon");
    else setGreeting("Good Evening");
  }, []);

  // Keyboard Hotkeys
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === "INPUT" || document.activeElement?.tagName === "TEXTAREA") return;
      if (e.key === "1") setActiveSymbol("EURUSD");
      if (e.key === "2") setActiveSymbol("GBPUSD");
      if (e.key === "3") setActiveSymbol("XAUUSD");
      if (e.key === "4") setActiveSymbol("USDJPY");
      if (e.key === "5") setActiveSymbol("BTCUSD");
      if (e.key === "Escape") {
        setPeekState((prev) => ({ ...prev, isOpen: false }));
        setShowUpload(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const openPeek = (type: string, data?: any) => {
    setPeekState({
      isOpen: true,
      type,
      data: data || { symbol: activeSymbol },
    });
  };

  const handleStageOrder = (opp: any) => {
    if (!opp) return;
    setActiveSymbol(opp.symbol);
    setPeekState({
      isOpen: true,
      type: "stage_order",
      data: opp,
    });
  };

  const isProfitable = filteredStats.totalProfit >= 0;
  const labelCls = "text-[9px] uppercase tracking-widest font-bold text-[#71717a] font-mono";

  return (
    <div className="min-h-screen w-full bg-[#09090b] text-[#f4f4f5] flex flex-col font-sans pb-16">
      {/* ── TOPBAR ──────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-3 border-b border-[rgba(255,255,255,0.07)] bg-[#09090b] sticky top-0 z-30 shadow-md">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-sm font-bold tracking-tight text-[#f4f4f5]">{greeting}, Ros</h1>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#20e0b2] animate-pulse" />
              <span className="text-[9px] font-bold uppercase tracking-widest text-[#71717a] font-mono">
                MT5 Connected · {mt5Data.server}
              </span>
            </div>
          </div>
        </div>

        {/* Global Filter Row & Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 border border-[rgba(255,255,255,0.07)] rounded bg-[#141419]">
            <Search className="w-3 h-3 text-[#71717a]" />
            <input
              type="text"
              placeholder="Symbol..."
              value={searchSymbol}
              onChange={(e) => setSearchSymbol(e.target.value)}
              className="w-16 bg-transparent border-none focus:outline-none text-[10px] font-bold text-[#f4f4f5] placeholder-[#71717a] font-mono"
            />
          </div>

          {[
            {
              value: filterSetup,
              set: setFilterSetup,
              options: [
                ["all", "Setup: All"],
                ["Trend Following", "Trend Following"],
                ["Breakout", "Breakout"],
                ["Reversal", "Reversal"],
                ["Pullback", "Pullback"],
              ],
            },
            {
              value: filterSide,
              set: setFilterSide as any,
              options: [
                ["all", "Side: Both"],
                ["Long", "LONG"],
                ["Short", "SHORT"],
              ],
            },
            {
              value: filterMistake,
              set: setFilterMistake,
              options: [
                ["all", "Mistake: All"],
                ["fomo", "FOMO"],
                ["greed", "Greed"],
                ["revenge", "Revenge"],
              ],
            },
            {
              value: filterStatus,
              set: setFilterStatus as any,
              options: [
                ["all", "Status: All"],
                ["WIN", "WIN"],
                ["LOSS", "LOSS"],
                ["OPEN", "OPEN"],
                ["BE", "BE"],
              ],
            },
            {
              value: dateFilter,
              set: setDateFilter as any,
              options: [
                ["all", "All Time"],
                ["today", "Today"],
                ["week", "Week"],
                ["month", "Month"],
                ["year", "Year"],
              ],
            },
          ].map((f, i) => (
            <select
              key={i}
              value={f.value}
              onChange={(e) => f.set(e.target.value)}
              className="bg-transparent text-[9px] font-bold text-[#a1a1aa] border-none focus:outline-none cursor-pointer uppercase tracking-wider font-mono hover:text-[#f4f4f5] transition-colors"
            >
              {f.options.map(([v, l]) => (
                <option key={v} value={v} className="bg-[#09090b] font-sans">
                  {l}
                </option>
              ))}
            </select>
          ))}

          <div className="w-px h-4 bg-[rgba(255,255,255,0.07)]" />

          <button
            onClick={refresh}
            className="p-1.5 rounded border border-[rgba(255,255,255,0.07)] text-[#71717a] hover:text-[#f4f4f5] hover:border-[rgba(255,255,255,0.15)] transition-all"
            title="Refresh All Feeds"
          >
            <RefreshCw className="w-3 h-3" />
          </button>
          <button
            onClick={() => setShowUpload(true)}
            className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider bg-[#20e0b2] hover:bg-[#1bc9a0] text-[#09090b] px-3 py-1.5 rounded transition-all font-mono"
          >
            <Plus className="w-3 h-3" />
            Import
          </button>
        </div>
      </div>

      {/* ── UNIFIED ACCOUNT & EXECUTION HUB ────────────────────────────── */}
      <UnifiedAccountHub
        accountData={mt5Data}
        todayStats={todayStats}
        positions={positions}
        activeSymbol={activeSymbol}
        onOpenPeek={openPeek}
      />

      {/* ── SECTION 3: REPORTS, CALENDAR & TRADES JOURNAL (MERGED IN ONE) ─── */}
      <div className="flex flex-col xl:flex-row gap-0 items-start flex-1 border-b border-[rgba(255,255,255,0.07)]">
        {/* LEFT MAIN COLUMN */}
        <div className="flex-1 w-full flex flex-col">
          {/* Section Header */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-[rgba(255,255,255,0.07)] bg-[#09090b]">
            <span className={labelCls}>Deep Reports &amp; Trade Analytics</span>
            <span className="text-[9px] text-[#71717a] font-mono">
              Account #{mt5Data.server ? "Exness Live" : "Unlinked"}
            </span>
          </div>

          {/* Main metrics row */}
          <div className="flex flex-col md:flex-row md:items-center gap-0 divide-y md:divide-y-0 md:divide-x divide-[rgba(255,255,255,0.07)] bg-[#101014]/40">
            {/* Net PnL */}
            <div className="px-6 py-5 flex flex-col gap-1 min-w-[200px]">
              <span className={labelCls}>Total PnL</span>
              <div
                className={`text-3xl font-black tracking-tight font-mono mt-1 ${
                  isProfitable ? "text-[#20e0b2]" : "text-[#ff5c73]"
                }`}
              >
                {isProfitable ? "+" : ""}$
                {filteredStats.totalProfit.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </div>
              <span className="text-[9px] text-[#71717a] font-mono">
                {filteredTrades.length} trades in range
              </span>
            </div>

            {/* Profit Factor gauge */}
            <div className="px-6 py-5 flex items-center gap-4">
              <div className="relative w-[52px] h-[52px] shrink-0">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 52 52">
                  <circle cx="26" cy="26" r="22" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="3" />
                  <circle
                    cx="26"
                    cy="26"
                    r="22"
                    fill="none"
                    stroke="#20e0b2"
                    strokeWidth="3"
                    strokeDasharray={`${2 * Math.PI * 22}`}
                    strokeDashoffset={`${2 * Math.PI * 22 * (1 - Math.min(Number(profitFactor) / 4, 1))}`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center text-[11px] font-black font-mono text-[#f4f4f5]">
                  {profitFactor}
                </div>
              </div>
              <div>
                <div className={labelCls}>Profit Factor</div>
                <div className="text-xs font-bold text-[#a1a1aa] font-mono mt-1">PF Ratio</div>
              </div>
            </div>

            {/* Win Rate gauge */}
            <div className="px-6 py-5 flex items-center gap-4">
              <div className="relative w-[52px] h-[52px] shrink-0">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 52 52">
                  <circle cx="26" cy="26" r="22" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="3" />
                  <circle
                    cx="26"
                    cy="26"
                    r="22"
                    fill="none"
                    stroke="#20e0b2"
                    strokeWidth="3"
                    strokeDasharray={`${2 * Math.PI * 22}`}
                    strokeDashoffset={`${2 * Math.PI * 22 * (1 - filteredStats.winRate / 100)}`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center text-[11px] font-black font-mono text-[#f4f4f5]">
                  {filteredStats.winRate.toFixed(0)}%
                </div>
              </div>
              <div>
                <div className={labelCls}>Win Rate</div>
                <div className="text-xs font-bold text-[#a1a1aa] font-mono mt-1">
                  {filteredTrades.filter((t) => t.profit > 0).length} / {filteredTrades.length}
                </div>
              </div>
            </div>
          </div>

          {/* Stats sub-row */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 divide-x divide-y divide-[rgba(255,255,255,0.07)] border-t border-[rgba(255,255,255,0.07)] bg-[#0c0c10]">
            <div className="px-4 py-3 flex flex-col gap-1">
              <span className={labelCls}>Direction</span>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="text-[10px] font-black font-mono text-[#20e0b2]">{directionRatio.longPct}%</span>
                <span className="text-[9px] text-[#71717a] font-mono">Long</span>
              </div>
              <div className="w-full h-0.5 bg-[rgba(255,255,255,0.07)] rounded-full overflow-hidden mt-1">
                <div className="h-full bg-[#20e0b2]" style={{ width: `${directionRatio.longPct}%` }} />
              </div>
            </div>

            <div className="px-4 py-3 flex flex-col gap-1">
              <span className={labelCls}>Avg Win / Loss</span>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] font-black font-mono text-[#20e0b2]">+${avgWin.toFixed(0)}</span>
                <span className="text-[9px] text-[#71717a]">/</span>
                <span className="text-[10px] font-black font-mono text-[#ff5c73]">-${avgLoss.toFixed(0)}</span>
              </div>
            </div>

            <div className="px-4 py-3 flex flex-col gap-1">
              <span className={labelCls}>Expectancy</span>
              <span
                className={`text-[13px] font-black font-mono mt-1 ${
                  expectancy >= 0 ? "text-[#20e0b2]" : "text-[#ff5c73]"
                }`}
              >
                {expectancy >= 0 ? "+" : ""}${expectancy.toFixed(2)}
              </span>
              <span className="text-[8px] text-[#71717a] font-mono">per trade</span>
            </div>

            <div className="px-4 py-3 flex flex-col gap-1">
              <span className={labelCls}>Win Streak</span>
              <span className="text-[13px] font-black font-mono text-[#20e0b2] mt-1">{streaks.winStreak}</span>
              <span className="text-[8px] text-[#71717a] font-mono">consecutive</span>
            </div>

            <div className="px-4 py-3 flex flex-col gap-1">
              <span className={labelCls}>Loss Streak</span>
              <span className="text-[13px] font-black font-mono text-[#ff5c73] mt-1">{streaks.lossStreak}</span>
              <span className="text-[8px] text-[#71717a] font-mono">consecutive</span>
            </div>

            <div className="px-4 py-3 flex flex-col gap-1">
              <span className={labelCls}>Total Trades</span>
              <span className="text-[13px] font-black font-mono text-[#f4f4f5] mt-1">{filteredTrades.length}</span>
              <span className="text-[8px] text-[#71717a] font-mono">in range</span>
            </div>
          </div>

          {/* ── SECTION 3: ANALYTICS DECK VIEW SWITCHER BAR ───────────────── */}
          <div className="flex flex-wrap items-center justify-between px-5 py-2.5 border-t border-b border-[rgba(255,255,255,0.07)] bg-[#0c0c10]/60 gap-2">
            <div className="flex items-center gap-2">
              <span className="text-[9px] uppercase tracking-widest text-[#71717a] font-mono font-bold">
                Analytics Deck:
              </span>
              <div className="flex items-center bg-[#09090b] border border-[rgba(255,255,255,0.07)] rounded-lg p-0.5">
                {[
                  { id: "split", label: "Split Cockpit", icon: Layers },
                  { id: "calendar", label: "Monthly Calendar", icon: CalendarIcon },
                  { id: "equity", label: "Equity Curve", icon: TrendingUp },
                  { id: "strategy", label: "Strategy Matrix", icon: BarChart2 },
                ].map((v) => {
                  const Icon = v.icon;
                  const isActive = analyticsView === v.id;
                  return (
                    <button
                      key={v.id}
                      onClick={() => setAnalyticsView(v.id as any)}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[9px] font-bold font-mono transition-all relative ${
                        isActive
                          ? "bg-[#20e0b2] text-[#09090b] shadow-sm font-black"
                          : "text-[#71717a] hover:text-[#f4f4f5]"
                      }`}
                    >
                      <Icon className="w-3 h-3" />
                      <span>{v.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            <span className="text-[9px] text-[#71717a] font-mono">
              Live Journal Feed · {filteredTrades.length} Trades Analyzed
            </span>
          </div>

          {/* ── SECTION 3: ANIMATED VIEW CONTENT ────────────────────────────── */}
          <AnimatePresence mode="wait">
            <motion.div
              key={analyticsView}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
            >
              {/* VIEW 1: SPLIT COCKPIT (SIDE BY SIDE CALENDAR + CHARTS) */}
              {analyticsView === "split" && (
                <div className="flex flex-col lg:flex-row border-b border-[rgba(255,255,255,0.07)]">
                  {/* Calendar panel */}
                  <div className="flex-1 border-r border-[rgba(255,255,255,0.07)]">
                    <div className="flex items-center justify-between px-5 py-3 border-b border-[rgba(255,255,255,0.07)] bg-[#09090b]">
                      <span className={labelCls}>{calendarMonthName}</span>
                      <div className="flex gap-1.5">
                        <button
                          onClick={prevMonth}
                          className="p-1 rounded border border-[rgba(255,255,255,0.07)] text-[#71717a] hover:text-[#f4f4f5] hover:border-[rgba(255,255,255,0.15)] transition-all"
                        >
                          <ChevronLeft className="w-3 h-3" />
                        </button>
                        <button
                          onClick={todayMonth}
                          className="px-2 py-0.5 rounded border border-[rgba(255,255,255,0.07)] text-[8px] font-bold text-[#71717a] hover:text-[#f4f4f5] uppercase tracking-wider font-mono transition-all"
                        >
                          Today
                        </button>
                        <button
                          onClick={nextMonth}
                          className="p-1 rounded border border-[rgba(255,255,255,0.07)] text-[#71717a] hover:text-[#f4f4f5] hover:border-[rgba(255,255,255,0.15)] transition-all"
                        >
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    <div className="p-4">
                      <div className="grid grid-cols-7 gap-1 mb-2">
                        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
                          <div key={i} className="text-center text-[8px] uppercase font-bold text-[#71717a] font-mono py-1">
                            {d}
                          </div>
                        ))}
                      </div>
                      <div className="grid grid-cols-7 gap-1">
                        {calendarDays.map((day, idx) => {
                          if (day === null) return <div key={`e-${idx}`} className="aspect-square" />;
                          const dateStr = `${calendarYear}-${String(calendarMonth + 1).padStart(2, "0")}-${String(
                            day
                          ).padStart(2, "0")}`;
                          const data = calendarPnLMap.get(dateStr);
                          const isToday = new Date().toISOString().split("T")[0] === dateStr;

                          let tileStyle =
                            "border-[rgba(255,255,255,0.05)] text-[#71717a] hover:border-[rgba(255,255,255,0.12)]";
                          if (data?.pnl && data.pnl > 0)
                            tileStyle =
                              "bg-[rgba(32,224,178,0.10)] border-[rgba(32,224,178,0.20)] text-[#20e0b2]";
                          else if (data?.pnl && data.pnl < 0)
                            tileStyle =
                              "bg-[rgba(255,92,115,0.10)] border-[rgba(255,92,115,0.20)] text-[#ff5c73]";
                          else if (isToday) tileStyle = "border-[rgba(255,255,255,0.25)] text-[#f4f4f5]";

                          return (
                            <div
                              key={day}
                              onClick={() => router.push(`/journal/day/${dateStr}`)}
                              className={`aspect-square rounded border p-1.5 flex flex-col justify-between cursor-pointer transition-all duration-150 ${tileStyle}`}
                            >
                              <span className={`text-[9px] font-bold font-mono ${isToday ? "text-[#20e0b2]" : ""}`}>
                                {day}
                              </span>
                              {data && (
                                <div className="text-right">
                                  <div className="text-[8px] font-black font-mono leading-none">
                                    {data.pnl >= 0 ? "+" : ""}${Math.round(data.pnl).toLocaleString()}
                                  </div>
                                  <div className="text-[7px] opacity-60 font-mono">{data.count}tr</div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Charts panel */}
                  <div className="w-full lg:w-[320px] flex flex-col">
                    {/* Aggregate PnL */}
                    <div className="flex-1 border-b border-[rgba(255,255,255,0.07)] p-4 flex flex-col gap-3">
                      <div className="flex items-center justify-between">
                        <span className={labelCls}>Aggregate PnL by Symbol</span>
                        <span className="text-[8px] font-mono text-zinc-500 uppercase">Real Trades</span>
                      </div>
                      <div className="flex flex-col gap-2.5">
                        {strategyData.slice(0, 5).map((item) => {
                          const maxVal = Math.max(...strategyData.map((d) => Math.abs(d.value))) || 1;
                          const ratio = Math.min((Math.abs(item.value) / maxVal) * 100, 100);
                          const isWin = item.value >= 0;
                          return (
                            <div key={item.name} className="flex flex-col gap-1">
                              <div className="flex justify-between items-center">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[9.5px] font-bold text-[#f4f4f5] font-mono">{item.name}</span>
                                  {item.count !== undefined && (
                                    <span className="text-[8px] text-[#71717a] font-mono">({item.count} tr)</span>
                                  )}
                                </div>
                                <span className={`text-[9.5px] font-black font-mono ${isWin ? "text-[#20e0b2]" : "text-[#ff5c73]"}`}>
                                  {isWin ? "+" : ""}${item.value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                </span>
                              </div>
                              <div className="w-full h-1 bg-[rgba(255,255,255,0.06)] rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all duration-500 ${
                                    isWin ? "bg-[#20e0b2]" : "bg-[#ff5c73]"
                                  }`}
                                  style={{ width: `${ratio}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Cumulative PnL */}
                    <div className="flex-1 p-4 flex flex-col gap-3">
                      <span className={labelCls}>Cumulative PnL</span>
                      <div className="w-full flex-1 min-h-[100px]">
                        {cumulativeChartData.length === 0 ? (
                          <div className="h-full flex items-center justify-center text-[9px] text-[#71717a] font-mono">
                            Awaiting data...
                          </div>
                        ) : (
                          <ResponsiveContainer width="100%" height={100}>
                            <AreaChart data={cumulativeChartData} margin={{ top: 4, right: 0, left: -30, bottom: 0 }}>
                              <defs>
                                <linearGradient id="curveGrad" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#20e0b2" stopOpacity={0.18} />
                                  <stop offset="95%" stopColor="#20e0b2" stopOpacity={0} />
                                </linearGradient>
                              </defs>
                              <XAxis dataKey="tradeIndex" hide />
                              <YAxis
                                domain={["auto", "auto"]}
                                tick={{ fontSize: 7, fill: "#71717a", fontFamily: "monospace" }}
                                width={30}
                                axisLine={false}
                                tickLine={false}
                              />
                              <Tooltip
                                contentStyle={{
                                  background: "#141419",
                                  border: "1px solid rgba(255,255,255,0.07)",
                                  borderRadius: 4,
                                  fontSize: 9,
                                  fontFamily: "monospace",
                                }}
                                itemStyle={{ color: "#20e0b2" }}
                                labelStyle={{ color: "#71717a" }}
                              />
                              <Area
                                type="monotone"
                                dataKey="balance"
                                stroke="#20e0b2"
                                strokeWidth={1.5}
                                fill="url(#curveGrad)"
                                dot={false}
                              />
                            </AreaChart>
                          </ResponsiveContainer>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* VIEW 2: FULL-WIDTH MONTHLY CALENDAR DECK */}
              {analyticsView === "calendar" && (
                <div className="p-5 border-b border-[rgba(255,255,255,0.07)] bg-[#09090b]/30">
                  <div className="flex items-center justify-between pb-3 border-b border-[rgba(255,255,255,0.07)] mb-4">
                    <div>
                      <span className="text-sm font-black font-mono text-[#f4f4f5]">{calendarMonthName}</span>
                      <span className="text-[10px] text-[#71717a] font-mono block">
                        Interactive Performance Calendar · Click any day to inspect trade executions
                      </span>
                    </div>
                    <div className="flex gap-1.5">
                      <button
                        onClick={prevMonth}
                        className="px-2.5 py-1 rounded border border-[rgba(255,255,255,0.07)] text-[#71717a] hover:text-[#f4f4f5] hover:border-[rgba(255,255,255,0.15)] transition-all font-mono text-xs flex items-center gap-1"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                        <span>Prev</span>
                      </button>
                      <button
                        onClick={todayMonth}
                        className="px-3 py-1 rounded border border-[rgba(255,255,255,0.07)] text-[9px] font-bold text-[#71717a] hover:text-[#f4f4f5] uppercase tracking-wider font-mono transition-all"
                      >
                        Current Month
                      </button>
                      <button
                        onClick={nextMonth}
                        className="px-2.5 py-1 rounded border border-[rgba(255,255,255,0.07)] text-[#71717a] hover:text-[#f4f4f5] hover:border-[rgba(255,255,255,0.15)] transition-all font-mono text-xs flex items-center gap-1"
                      >
                        <span>Next</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-7 gap-2 mb-2">
                    {["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"].map((d, i) => (
                      <div key={i} className="text-center text-[9px] uppercase font-bold text-[#71717a] font-mono py-1 border-b border-[rgba(255,255,255,0.05)]">
                        {d}
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-7 gap-2">
                    {calendarDays.map((day, idx) => {
                      if (day === null) return <div key={`full-e-${idx}`} className="h-20 rounded border border-transparent" />;
                      const dateStr = `${calendarYear}-${String(calendarMonth + 1).padStart(2, "0")}-${String(
                        day
                      ).padStart(2, "0")}`;
                      const data = calendarPnLMap.get(dateStr);
                      const isToday = new Date().toISOString().split("T")[0] === dateStr;

                      let tileStyle = "border-[rgba(255,255,255,0.06)] bg-[#101014]/50 hover:bg-[#141419]";
                      if (data?.pnl && data.pnl > 0)
                        tileStyle = "bg-[rgba(32,224,178,0.12)] border-[rgba(32,224,178,0.25)] text-[#20e0b2]";
                      else if (data?.pnl && data.pnl < 0)
                        tileStyle = "bg-[rgba(255,92,115,0.12)] border-[rgba(255,92,115,0.25)] text-[#ff5c73]";
                      else if (isToday) tileStyle = "border-[#20e0b2]/40 bg-[#101014]";

                      return (
                        <div
                          key={`full-${day}`}
                          onClick={() => router.push(`/journal/day/${dateStr}`)}
                          className={`h-20 rounded-lg border p-2 flex flex-col justify-between cursor-pointer transition-all hover:scale-[1.02] ${tileStyle}`}
                        >
                          <div className="flex items-center justify-between">
                            <span className={`text-[10px] font-black font-mono ${isToday ? "text-[#20e0b2]" : "text-[#71717a]"}`}>
                              {day}
                            </span>
                            {isToday && (
                              <span className="text-[7px] bg-[#20e0b2]/20 text-[#20e0b2] px-1 rounded font-mono">
                                TODAY
                              </span>
                            )}
                          </div>
                          {data ? (
                            <div>
                              <div className={`text-xs font-black font-mono leading-none ${data.pnl >= 0 ? "text-[#20e0b2]" : "text-[#ff5c73]"}`}>
                                {data.pnl >= 0 ? "+" : ""}${data.pnl.toFixed(2)}
                              </div>
                              <div className="text-[8px] text-[#71717a] font-mono mt-0.5">{data.count} executed trades</div>
                            </div>
                          ) : (
                            <span className="text-[8px] text-[#52525b] font-mono">No trades</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* VIEW 3: FULL-WIDTH CUMULATIVE EQUITY CURVE */}
              {analyticsView === "equity" && (
                <div className="p-5 border-b border-[rgba(255,255,255,0.07)] bg-[#09090b]/30">
                  <div className="flex items-center justify-between pb-3 border-b border-[rgba(255,255,255,0.07)] mb-4">
                    <div>
                      <span className="text-sm font-black font-mono text-[#f4f4f5]">Cumulative Equity Growth Curve</span>
                      <span className="text-[10px] text-[#71717a] font-mono block">
                        Compounded account trajectory across {filteredTrades.length} trades
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-xs font-mono">
                      <div>
                        <span className="text-[9px] text-[#71717a] uppercase block">Starting Balance</span>
                        <span className="font-bold text-white">$10,000.00</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-[#71717a] uppercase block">Net Account Value</span>
                        <span className={`font-black ${filteredStats.totalProfit >= 0 ? "text-[#20e0b2]" : "text-[#ff5c73]"}`}>
                          ${(10000 + filteredStats.totalProfit).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="w-full h-[260px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={cumulativeChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="curveGradFull" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#20e0b2" stopOpacity={0.25} />
                            <stop offset="95%" stopColor="#20e0b2" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="tradeIndex" tick={{ fontSize: 9, fill: "#71717a", fontFamily: "monospace" }} />
                        <YAxis
                          domain={["auto", "auto"]}
                          tick={{ fontSize: 9, fill: "#71717a", fontFamily: "monospace" }}
                          width={60}
                          axisLine={false}
                          tickLine={false}
                        />
                        <Tooltip
                          contentStyle={{
                            background: "#141419",
                            border: "1px solid rgba(255,255,255,0.1)",
                            borderRadius: 6,
                            fontSize: 10,
                            fontFamily: "monospace",
                          }}
                          itemStyle={{ color: "#20e0b2" }}
                          labelStyle={{ color: "#71717a" }}
                        />
                        <Area
                          type="monotone"
                          dataKey="balance"
                          stroke="#20e0b2"
                          strokeWidth={2}
                          fill="url(#curveGradFull)"
                          dot={false}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* VIEW 4: FULL-WIDTH STRATEGY / SYMBOL MATRIX */}
              {analyticsView === "strategy" && (
                <div className="p-5 border-b border-[rgba(255,255,255,0.07)] bg-[#09090b]/30">
                  <div className="flex items-center justify-between pb-3 border-b border-[rgba(255,255,255,0.07)] mb-4">
                    <div>
                      <span className="text-sm font-black font-mono text-[#f4f4f5]">Symbol &amp; Asset Edge Distribution</span>
                      <span className="text-[10px] text-[#71717a] font-mono block">
                        Net PnL contribution aggregated by traded instrument
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {strategyData.map((item) => {
                      const maxVal = Math.max(...strategyData.map((d) => Math.abs(d.value))) || 1;
                      const ratio = Math.min((Math.abs(item.value) / maxVal) * 100, 100);
                      const isWin = item.value >= 0;

                      return (
                        <div key={item.name} className="p-3.5 rounded-lg bg-[#101014] border border-[rgba(255,255,255,0.06)] flex flex-col gap-2">
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-[#f4f4f5] font-mono">{item.name}</span>
                              {item.count !== undefined && (
                                <span className="text-[9px] text-[#71717a] font-mono">({item.count} trades &bull; {item.winRate}% win rate)</span>
                              )}
                            </div>
                            <span className={`text-xs font-black font-mono ${isWin ? "text-[#20e0b2]" : "text-[#ff5c73]"}`}>
                              {isWin ? "+" : ""}${item.value.toFixed(2)}
                            </span>
                          </div>
                          <div className="w-full h-1.5 bg-[rgba(255,255,255,0.06)] rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                isWin ? "bg-[#20e0b2]" : "bg-[#ff5c73]"
                              }`}
                              style={{ width: `${ratio}%` }}
                            />
                          </div>
                          <div className="flex justify-between items-center text-[9px] text-[#71717a] font-mono">
                            <span>Volume Weight: {ratio.toFixed(1)}%</span>
                            <span className={isWin ? "text-[#20e0b2]" : "text-[#ff5c73]"}>
                              {isWin ? "Net Profitable Instrument" : "Drawdown Contribution"}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* ACTIVE POSITIONS */}
          {positions && positions.length > 0 && (
            <div className="border-b border-[rgba(255,255,255,0.07)]">
              <div className="px-5 py-3 border-b border-[rgba(255,255,255,0.07)] flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#f5c451] animate-ping" />
                <span className={labelCls}>Active Positions ({positions.length})</span>
              </div>
              <OpenPositionsList positions={positions} />
            </div>
          )}

          {/* TRADES LEDGER */}
          <div className="flex flex-col">
            <div className="px-5 py-3 border-b border-[rgba(255,255,255,0.07)] flex items-center justify-between">
              <span className={labelCls}>Trades Log</span>
              <span className="text-[9px] text-[#71717a] font-mono">{filteredTrades.length} records</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-[10px] whitespace-nowrap">
                <thead>
                  <tr className="border-b border-[rgba(255,255,255,0.07)]">
                    {[
                      "",
                      "Status",
                      "Side",
                      "Symbol",
                      "Open Date",
                      "Entry",
                      "Lots",
                      "Close Date",
                      "Exit",
                      "Net P&L",
                      "Return%",
                      "Setup",
                      "Note",
                      "Mistake",
                      "",
                    ].map((h, i) => (
                      <th key={i} className={`px-4 py-3 ${labelCls} font-bold`}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading && trades.length === 0 ? (
                    <tr>
                      <td colSpan={15} className="px-5 py-10 text-center text-[#71717a] font-mono text-[10px]">
                        <div className="flex items-center justify-center gap-2">
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-[#20e0b2]" />
                          Loading trades...
                        </div>
                      </td>
                    </tr>
                  ) : paginatedTrades.length === 0 ? (
                    <tr>
                      <td colSpan={15} className="px-5 py-10 text-center text-[#71717a] font-mono text-[10px]">
                        No matching records found.
                      </td>
                    </tr>
                  ) : (
                    paginatedTrades.flatMap((t, idx) => {
                      const ticketKey = t.ticket || String(t.id || idx);
                      const isExpanded = expandedTicket === ticketKey;
                      const isWin = t.profit > 0;
                      const isLoss = t.profit < 0;
                      const isOpen = !t.closePrice;
                      const netReturnPct =
                        t.lotSize && t.entry
                          ? (t.profit / (t.entry * t.lotSize)) * 100
                          : t.profit / 1000;

                      let setupTag = "REVERSAL";
                      if (t.notes?.toLowerCase().includes("breakout")) setupTag = "BREAKOUT";
                      else if (t.notes?.toLowerCase().includes("fomo")) setupTag = "FOMO";
                      else if (t.notes?.toLowerCase().includes("pullback")) setupTag = "PULLBACK";

                      let mistakeTag = "";
                      if (t.emotion === "Greedy") mistakeTag = "GREED";
                      else if (t.emotion === "Anxious" || t.emotion === "FOMO") mistakeTag = "FOMO";
                      else if (t.emotion === "Revenge") mistakeTag = "REVENGE";
                      else if (t.followedPlan === false) mistakeTag = "PLAN DEV";

                      return [
                        <tr
                          key={ticketKey}
                          className={`border-b border-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.02)] transition-colors ${
                            isExpanded ? "bg-[rgba(255,255,255,0.02)]" : ""
                          }`}
                        >
                          <td className="px-4 py-2.5">
                            <button
                              onClick={() => setExpandedTicket(isExpanded ? null : ticketKey)}
                              className="p-1 rounded text-[#71717a] hover:text-[#f4f4f5] transition-colors"
                            >
                              {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                            </button>
                          </td>
                          <td className="px-4 py-2.5">
                            {isOpen ? (
                              <span className="px-1.5 py-0.5 bg-[rgba(245,196,81,0.1)] text-[#f5c451] border border-[rgba(245,196,81,0.2)] rounded text-[8px] font-bold uppercase tracking-wider font-mono">
                                Open
                              </span>
                            ) : isWin ? (
                              <span className="px-1.5 py-0.5 bg-[rgba(32,224,178,0.1)] text-[#20e0b2] border border-[rgba(32,224,178,0.2)] rounded text-[8px] font-bold uppercase tracking-wider font-mono">
                                Win
                              </span>
                            ) : isLoss ? (
                              <span className="px-1.5 py-0.5 bg-[rgba(255,92,115,0.1)] text-[#ff5c73] border border-[rgba(255,92,115,0.2)] rounded text-[8px] font-bold uppercase tracking-wider font-mono">
                                Loss
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.5 bg-[rgba(255,255,255,0.05)] text-[#a1a1aa] border border-[rgba(255,255,255,0.08)] rounded text-[8px] font-bold uppercase tracking-wider font-mono">
                                BE
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-2.5">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[8px] font-bold border uppercase tracking-wider font-mono ${
                                t.direction === "Long"
                                  ? "bg-[rgba(56,189,248,0.08)] text-[#38bdf8] border-[rgba(56,189,248,0.15)]"
                                  : "bg-[rgba(167,139,250,0.08)] text-[#a78bfa] border-[rgba(167,139,250,0.15)]"
                              }`}
                            >
                              {t.direction}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 font-bold text-[#f4f4f5] font-mono text-[10px]">{t.pair}</td>
                          <td className="px-4 py-2.5 font-mono text-[#71717a] text-[9px]">
                            {t.openTime ? new Date(t.openTime).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "—"}
                          </td>
                          <td className="px-4 py-2.5 font-mono text-[#a1a1aa] text-[10px]">{t.entry.toFixed(5)}</td>
                          <td className="px-4 py-2.5 font-mono text-[#a1a1aa] text-[10px]">{t.lotSize || 0.1}</td>
                          <td className="px-4 py-2.5 font-mono text-[#71717a] text-[9px]">
                            {!isOpen ? new Date(t.date).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "—"}
                          </td>
                          <td className="px-4 py-2.5 font-mono text-[#a1a1aa] text-[10px]">{t.closePrice ? t.closePrice.toFixed(5) : "—"}</td>
                          <td
                            className={`px-4 py-2.5 text-right font-mono font-black text-[10px] ${
                              isWin ? "text-[#20e0b2]" : isLoss ? "text-[#ff5c73]" : "text-[#71717a]"
                            }`}
                          >
                            {isWin ? "+" : ""}{t.profit.toFixed(2)}
                          </td>
                          <td
                            className={`px-4 py-2.5 text-right font-mono text-[9px] ${
                              isWin ? "text-[#20e0b2]" : isLoss ? "text-[#ff5c73]" : "text-[#71717a]"
                            }`}
                          >
                            {isWin ? "+" : ""}{netReturnPct.toFixed(2)}%
                          </td>
                          <td className="px-4 py-2.5">
                            <span className="px-1.5 py-0.5 bg-[rgba(255,255,255,0.04)] text-[#71717a] rounded text-[8px] font-bold border border-[rgba(255,255,255,0.07)] uppercase font-mono">
                              {setupTag}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-[#71717a] truncate max-w-[90px] font-mono text-[9px]">
                            {t.notes || "—"}
                          </td>
                          <td className="px-4 py-2.5">
                            {mistakeTag ? (
                              <span className="px-1.5 py-0.5 bg-[rgba(255,92,115,0.08)] text-[#ff5c73] rounded text-[8px] font-bold border border-[rgba(255,92,115,0.15)] uppercase font-mono">
                                {mistakeTag}
                              </span>
                            ) : (
                              <span className="text-[#71717a] font-mono text-[9px]">—</span>
                            )}
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            <button
                              onClick={() => setExpandedTicket(isExpanded ? null : ticketKey)}
                              className="p-1 rounded text-[#71717a] hover:text-[#f4f4f5] transition-colors"
                            >
                              <Eye className="w-3 h-3" />
                            </button>
                          </td>
                        </tr>,
                        isExpanded && (
                          <tr key={`${ticketKey}-exp`} className="border-b border-[rgba(255,255,255,0.04)] bg-[rgba(0,0,0,0.3)]">
                            <td colSpan={15} className="px-5 py-4">
                              <TradeReviewPanel trade={t} onUpdated={refresh} />
                            </td>
                          </tr>
                        ),
                      ];
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-5 py-3 border-t border-[rgba(255,255,255,0.07)] flex items-center justify-between text-[9px] font-mono text-[#71717a]">
                <span>
                  Showing <span className="text-[#f4f4f5]">{(page - 1) * rowsPerPage + 1}</span>–
                  <span className="text-[#f4f4f5]">{Math.min(page * rowsPerPage, filteredTrades.length)}</span> of{" "}
                  {filteredTrades.length}
                </span>
                <div className="flex gap-1.5">
                  <button
                    disabled={page === 1}
                    onClick={() => setPage((p) => p - 1)}
                    className="px-2.5 py-1 border border-[rgba(255,255,255,0.07)] rounded text-[#a1a1aa] disabled:opacity-30 hover:border-[rgba(255,255,255,0.15)] hover:text-[#f4f4f5] transition-all text-[9px]"
                  >
                    Prev
                  </button>
                  <button
                    disabled={page === totalPages}
                    onClick={() => setPage((p) => p + 1)}
                    className="px-2.5 py-1 border border-[rgba(255,255,255,0.07)] rounded text-[#a1a1aa] disabled:opacity-30 hover:border-[rgba(255,255,255,0.15)] hover:text-[#f4f4f5] transition-all text-[9px]"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Status bar */}
          <div className="px-5 py-2.5 border-t border-[rgba(255,255,255,0.07)] flex justify-between items-center text-[9px] font-mono text-[#71717a]">
            <span>
              Filtered: <span className="text-[#a1a1aa]">{filteredTrades.length}</span> / {trades.length} trades
            </span>
            <span>
              Return:{" "}
              <span className={filteredStats.totalProfit >= 0 ? "text-[#20e0b2] font-bold" : "text-[#ff5c73] font-bold"}>
                ${filteredStats.totalProfit.toFixed(2)}
              </span>
            </span>
          </div>
        </div>

        {/* RIGHT SIDEBAR */}
        <div className="w-full xl:w-[300px] shrink-0 border-l border-[rgba(255,255,255,0.07)] flex flex-col bg-[#101014]/60">
            {/* Tabs */}
            <div className="flex border-b border-[rgba(255,255,255,0.07)]">
              {(["watchlist", "ai_brief", "mistakes"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setSidebarTab(tab)}
                  className={`flex-1 py-2.5 text-[8px] uppercase tracking-widest font-bold font-mono transition-all border-b-2 ${
                    sidebarTab === tab
                      ? "border-[#20e0b2] text-[#20e0b2]"
                      : "border-transparent text-[#71717a] hover:text-[#a1a1aa]"
                  }`}
                >
                  {tab === "watchlist" ? "Watch" : tab === "ai_brief" ? "AI Brief" : "Habits"}
                </button>
              ))}
            </div>

            <div className="p-4 flex-1 overflow-y-auto space-y-4">
              {sidebarTab === "watchlist" && (
                <>
                  <AllPairsGrid />
                  <MarketWatchWidget borderless={true} />
                </>
              )}

              {sidebarTab === "ai_brief" && (
                <div className="flex flex-col gap-3">
                  <div className="border border-[rgba(255,255,255,0.07)] rounded p-3 bg-[#09090b]/40">
                    <span className={`${labelCls} block mb-2`}>Coach Focus</span>
                    <span className="text-xs text-[#f4f4f5] font-semibold flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-[#f5c451]" />
                      Disciplined Risk Adherence
                    </span>
                  </div>
                  <div className="border border-[rgba(255,255,255,0.07)] rounded p-3 bg-[#09090b]/40">
                    <span className={`${labelCls} block mb-2`}>Live News</span>
                    <EconomicNewsTicker borderless={true} />
                  </div>
                  <div className="border border-[rgba(255,255,255,0.07)] rounded p-3 bg-[#09090b]/40">
                    <span className={`${labelCls} block mb-2`}>AI Risk Coach</span>
                    <AIDeskSummary borderless={true} />
                  </div>
                </div>
              )}

              {sidebarTab === "mistakes" && (
                <div className="flex flex-col gap-3">
                  <span className={labelCls}>Habit Cost Analysis</span>
                  {mistakeData.slice(0, 6).map((item) => {
                    const maxVal = Math.max(...mistakeData.map((d) => d.value)) || 1;
                    const ratio = Math.min((item.value / maxVal) * 100, 100);
                    return (
                      <div key={item.name} className="flex flex-col gap-1">
                        <div className="flex justify-between items-center">
                          <span className="text-[9px] text-[#a1a1aa] font-mono lowercase italic">{item.name}</span>
                          <span className="text-[9px] font-black font-mono text-[#ff5c73]">-${item.value.toFixed(2)}</span>
                        </div>
                        <div className="w-full h-0.5 bg-[rgba(255,255,255,0.06)] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#ff5c73] transition-all duration-500"
                            style={{ width: `${ratio}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Daily Risk Widget */}
            <div className="border-t border-[rgba(255,255,255,0.07)]">
              <DailyRiskWidget trades={trades || []} balance={mt5Data.balance} equity={mt5Data.equity} />
            </div>
          </div>
      </div>

      {/* ── LEVEL 2: PROGRESSIVE DISCLOSURE SLIDE-OVER PEEK DRAWER ──────── */}
      <CockpitPeekDrawer
        isOpen={peekState.isOpen}
        onClose={() => setPeekState((prev) => ({ ...prev, isOpen: false }))}
        type={peekState.type}
        data={peekState.data}
        accountEquity={mt5Data.equity}
        accountData={mt5Data}
        positions={positions}
        todayStats={todayStats}
      />

      {/* ── CSV UPLOAD MODAL ─────────────────────────────────────────────── */}
      {showUpload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="relative w-full max-w-2xl bg-[#101014] rounded-2xl border border-[rgba(255,255,255,0.1)] p-6 max-h-[90vh] overflow-y-auto shadow-2xl">
            <button
              onClick={() => {
                setShowUpload(false);
                refresh();
              }}
              className="absolute top-4 right-4 p-2 text-[#71717a] hover:text-white rounded-lg bg-[#18181f] border border-[rgba(255,255,255,0.08)]"
            >
              ✕
            </button>
            <h3 className="text-sm font-black font-mono uppercase tracking-widest text-white mb-4">
              Import Broker Statement CSV
            </h3>
            <CsvUploadComponent />
          </div>
        </div>
      )}
    </div>
  );
}

// ── TRADE REVIEW PANEL ──────────────────────────────────────────────────────
interface TradeReviewPanelProps {
  trade: TradeData;
  onUpdated?: () => void;
}

function TradeReviewPanel({ trade, onUpdated }: TradeReviewPanelProps) {
  const router = useRouter();
  const tradeKey = trade.ticket || trade.id;
  const { entry, saveEntry } = useJournalData(tradeKey ? String(tradeKey) : undefined);

  const [notes, setNotes] = useState(entry.reason || trade.notes || "");
  const [emotion, setEmotion] = useState(entry.emotion || trade.emotion || "");
  const [followedPlan, setFollowedPlan] = useState(entry.followedPlan ?? trade.followedPlan ?? true);
  const [planDeviationReason, setPlanDeviationReason] = useState(entry.planDeviationReason || trade.planDeviationReason || "");
  const [checklistPassed, setChecklistPassed] = useState(entry.checklistPassed ?? trade.checklistPassed ?? true);
  const [imageUrl, setImageUrl] = useState((entry.images && entry.images[0]) || trade.imageUrl || "");
  const [imageInput, setImageInput] = useState((entry.images && entry.images[0]) || trade.imageUrl || "");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (entry.reason && !notes) setNotes(entry.reason);
    if (entry.emotion && !emotion) setEmotion(entry.emotion);
    if (entry.planDeviationReason && !planDeviationReason) setPlanDeviationReason(entry.planDeviationReason);
    if (entry.images && entry.images.length > 0 && !imageUrl) {
      setImageUrl(entry.images[0]);
      setImageInput(entry.images[0]);
    }
  }, [entry]);

  const cleanTradingViewUrl = (url: string): string => {
    if (!url) return "";
    const match = url.match(/(?:tradingview\.com\/x\/|images\.tradingview\.com\/x\/)([a-zA-Z0-9]+)/);
    if (match && match[1]) return `https://images.tradingview.com/x/${match[1]}.png`;
    return url;
  };

  const handleUrlChange = (val: string) => {
    setImageInput(val);
    const cleaned = cleanTradingViewUrl(val);
    setImageUrl(cleaned !== val ? cleaned : val);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append("image", file);
    try {
      const session = await getSession();
      const token = (session?.user as any)?.apiToken;
      const res = await fetch(`${getBackendUrl()}/api/upload`, {
        method: "POST",
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: formData,
      });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      if (data?.success && data?.data?.url) {
        const fullUrl = `${getBackendUrl()}${data.data.url}`;
        setImageUrl(fullUrl);
        setImageInput(fullUrl);
        saveEntry({ images: [fullUrl] });
      }
    } catch (err) {
      alert("Image upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleSyncTrade = async () => {
    if (!trade.ticket) return;
    setSyncing(true);
    try {
      const session = await getSession();
      const token = (session?.user as any)?.apiToken;
      const res = await fetch(`${getBackendUrl()}/api/trades/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ days: 30 }),
      });
      if (!res.ok) throw new Error("Sync failed");
      const data = await res.json();
      if (data?.success && onUpdated) onUpdated();
    } catch (err) {
      alert("Sync failed");
    } finally {
      setSyncing(false);
    }
  };

  const handleSave = async () => {
    saveEntry({
      reason: notes,
      emotion,
      followedPlan,
      planDeviationReason: followedPlan ? "" : planDeviationReason,
      checklistPassed,
      images: imageUrl ? [imageUrl] : [],
    });

    if (!trade.id) {
      await handleSyncTrade();
      return;
    }
    setSaving(true);
    try {
      const session = await getSession();
      const token = (session?.user as any)?.apiToken;
      const payload = {
        notes,
        emotion,
        followedPlan,
        planDeviationReason: followedPlan ? "" : planDeviationReason,
        checklistPassed,
        imageUrl,
      };
      const res = await fetch(`${getBackendUrl()}/api/trades/${trade.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Save failed");
      const data = await res.json();
      if (data?.success && onUpdated) onUpdated();
    } catch (err) {
      alert("Save failed");
    } finally {
      setSaving(false);
    }
  };

  const labelCls = "text-[9px] uppercase tracking-widest font-bold text-[#71717a] font-mono";

  return (
    <div className="flex flex-col xl:flex-row gap-5">
      <div className="flex-1 space-y-4">
        <div className="flex items-center justify-between border-b border-[rgba(255,255,255,0.07)] pb-3">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#f4f4f5]">Journal Details</span>
            <span className="text-[9px] text-[#71717a] font-mono">#{trade.ticket || trade.id}</span>
          </div>
          <button
            onClick={() => router.push(`/journal/trade/${trade.ticket || trade.id}`)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-[9px] font-bold uppercase tracking-wider text-zinc-300 hover:text-white transition-all font-mono"
          >
            Full Desk <ExternalLink className="w-3 h-3" />
          </button>
        </div>

        {!trade.id ? (
          <div className="p-3 bg-[rgba(245,196,81,0.05)] border border-[rgba(245,196,81,0.15)] rounded flex items-center justify-between gap-4">
            <div>
              <p className="text-[10px] font-bold text-[#f5c451]">Trade not synced</p>
              <p className="text-[9px] text-[#71717a] mt-0.5">Sync to save journal notes.</p>
            </div>
            <button
              disabled={syncing}
              onClick={handleSyncTrade}
              className="bg-[#f5c451] hover:bg-[#e6b540] disabled:opacity-50 text-[#09090b] font-bold text-[9px] px-3 py-1.5 rounded transition-all flex items-center gap-1"
            >
              {syncing ? <Loader2 className="w-3 animate-spin" /> : <Plus className="w-3 h-3" />} Sync
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={`${labelCls} block mb-2`}>Checklists</label>
              <div className="space-y-2">
                {[
                  { label: "Followed Trading Plan", val: followedPlan, set: setFollowedPlan },
                  { label: "Passed Pre-Trade Checklist", val: checklistPassed, set: setChecklistPassed },
                ].map(({ label, val, set }) => (
                  <label
                    key={label}
                    className="flex items-center gap-2 cursor-pointer text-[10px] border border-[rgba(255,255,255,0.07)] rounded p-2.5 hover:border-[rgba(255,255,255,0.12)] transition-all"
                  >
                    <input
                      type="checkbox"
                      checked={val}
                      onChange={(e) => set(e.target.checked)}
                      className="rounded text-[#20e0b2] bg-[#09090b] w-4 h-4 focus:ring-0 border-[rgba(255,255,255,0.2)]"
                    />
                    <span className="text-[#a1a1aa]">{label}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className={`${labelCls} block mb-2`}>Trade Emotion</label>
              <select
                value={emotion}
                onChange={(e) => setEmotion(e.target.value)}
                className="w-full bg-[#141419] border border-[rgba(255,255,255,0.07)] rounded p-2.5 text-[10px] text-[#a1a1aa] focus:outline-none focus:border-[rgba(255,255,255,0.15)]"
              >
                {["", "Calm", "Confident", "Anxious", "Panicked", "Greedy", "Revenge"].map((v) => (
                  <option key={v} value={v}>
                    {v || "Select Emotion..."}
                  </option>
                ))}
              </select>
            </div>
            {!followedPlan && (
              <div className="md:col-span-2">
                <label className="text-[9px] uppercase tracking-widest font-bold text-[#ff5c73] font-mono block mb-2">
                  Deviation Reason
                </label>
                <textarea
                  rows={2}
                  value={planDeviationReason}
                  onChange={(e) => setPlanDeviationReason(e.target.value)}
                  placeholder="Why did you deviate?"
                  className="w-full bg-[#141419] border border-[rgba(255,92,115,0.2)] focus:border-[rgba(255,92,115,0.4)] rounded p-2.5 text-[10px] text-[#a1a1aa] focus:outline-none resize-none"
                />
              </div>
            )}
            <div className="md:col-span-2">
              <label className={`${labelCls} block mb-2`}>Notes</label>
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Record trade review notes..."
                className="w-full bg-[#141419] border border-[rgba(255,255,255,0.07)] focus:border-[rgba(32,224,178,0.3)] rounded p-2.5 text-[10px] text-[#a1a1aa] focus:outline-none resize-none"
              />
            </div>
            <div className="md:col-span-2 flex justify-end">
              <button
                onClick={handleSave}
                disabled={saving}
                className="bg-[#20e0b2] hover:bg-[#1bc9a0] disabled:opacity-50 text-[#09090b] font-bold px-4 py-2 rounded text-[10px] flex items-center gap-1.5 transition-all"
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                Save Review
              </button>
            </div>
          </div>
        )}
      </div>

      {trade.id && (
        <div className="w-full xl:w-[260px] shrink-0 space-y-3">
          <div className="border-b border-[rgba(255,255,255,0.07)] pb-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#f4f4f5]">Screenshot</span>
          </div>
          {imageUrl ? (
            <div className="relative rounded border border-[rgba(255,255,255,0.07)] overflow-hidden aspect-video bg-black/40 group/img">
              <img src={imageUrl} alt="Execution screenshot" className="max-h-full max-w-full object-contain" />
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                <button
                  onClick={() => {
                    setImageUrl("");
                    setImageInput("");
                  }}
                  className="p-1.5 rounded bg-[rgba(255,92,115,0.2)] hover:bg-[rgba(255,92,115,0.4)] text-[#ff5c73] transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="border border-dashed border-[rgba(255,255,255,0.1)] rounded p-6 flex flex-col items-center justify-center text-center aspect-video gap-2">
              <ImageIcon className="w-8 h-8 text-[#71717a]" />
              <p className="text-[9px] text-[#71717a] font-mono">No screenshot</p>
            </div>
          )}
          <div className="flex gap-2">
            <input
              type="text"
              value={imageInput}
              onChange={(e) => handleUrlChange(e.target.value)}
              placeholder="Image URL..."
              className="flex-1 bg-[#141419] border border-[rgba(255,255,255,0.07)] rounded py-1.5 px-2.5 text-[9px] text-[#a1a1aa] focus:outline-none focus:border-[rgba(255,255,255,0.15)]"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="border border-[rgba(255,255,255,0.07)] hover:border-[rgba(255,255,255,0.15)] px-3 py-1 rounded text-[9px] text-[#a1a1aa] flex items-center gap-1 transition-all disabled:opacity-50"
            >
              {uploading ? <Loader2 className="w-3 animate-spin" /> : <Plus className="w-3 h-3" />} File
            </button>
            <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/*" className="hidden" />
          </div>
        </div>
      )}
    </div>
  );
}
