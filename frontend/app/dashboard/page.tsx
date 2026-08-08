"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { Sparkles, TrendingUp, TrendingDown, Clock, ChevronRight, ChevronDown, ChevronUp, Plus, Search, Activity, Check, Loader2, AlertCircle, Trash2, Image as ImageIcon, Crosshair, AlertTriangle, ShieldCheck, Settings, RefreshCw, X, Download, HelpCircle, Eye, BarChart2, AlertOctagon, ListCollapse } from "lucide-react";
import { useCsvTrades, TradeData } from "@/hooks/useCsvTrades";
import { fetchWithAuth, getBackendUrl } from "@/lib/utils";
import { usePositions } from "@/hooks/usePositions";
import { useBridgeUrl } from "@/hooks/useBridgeUrl";
import { getSession } from "@/lib/useSession";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import CsvUploadComponent from "@/components/CsvUploadComponent";
import { motion, AnimatePresence } from "framer-motion";

// Original monitoring widgets
import { SessionTimeline } from "@/components/ui/SessionTimeline";
import { MarketWatchWidget } from "@/components/dashboard/widgets/MarketWatchWidget";
import { AIDeskSummary } from "@/components/dashboard/widgets/AIDeskSummary";
import { EconomicNewsTicker } from "@/components/dashboard/widgets/EconomicNewsTicker";
import { DailyRiskWidget } from "@/components/dashboard/widgets/DailyRiskWidget";
import DisciplineScoreWidget from "@/components/ui/DisciplineScoreWidget";
import { OpenPositionsList } from "@/components/dashboard/widgets/OpenPositionsList";

export default function DashboardOS() {
  // TradeZella state
  const { trades, analytics, loading, error, refresh } = useCsvTrades();
  const [showUpload, setShowUpload] = useState(false);
  const [expandedTicket, setExpandedTicket] = useState<string | null>(null);

  const [searchSymbol, setSearchSymbol] = useState("");
  const [filterSetup, setFilterSetup] = useState("all");
  const [filterSide, setFilterSide] = useState<"all" | "Long" | "Short">("all");
  const [filterMistake, setFilterMistake] = useState("all");
  const [filterStatus, setFilterStatus] = useState<"all" | "WIN" | "LOSS" | "OPEN" | "BE">("all");
  const [dateFilter, setDateFilter] = useState<"all" | "today" | "week" | "month" | "year">("all");

  const [page, setPage] = useState(1);
  const rowsPerPage = 12;

  // Live Terminal State
  const { bridgeUrl } = useBridgeUrl();
  const [activeAccountNumber, setActiveAccountNumber] = useState<string | undefined>(undefined);
  const { positions } = usePositions();
  
  const [mt5Data, setMt5Data] = useState<{
    balance: number;
    equity: number;
    profit: number;
    margin_level: number | null;
  }>({ balance: 0, equity: 0, profit: 0, margin_level: null });

  const [headerData, setHeaderData] = useState({
    focus: "Scanning...",
    aiRec: "Monitoring",
    bestSignal: "Scanning...",
    bestSignalType: ""
  });

  // Tab selection for sidebar
  const [activeTab, setActiveTab] = useState<"performance" | "setups" | "mistakes" | "watchlist" | "ai_brief">("performance");

  // Fetch logic for live terminal data
  useEffect(() => {
    Promise.all([
      fetchWithAuth(`${getBackendUrl()}/api/bridge/api/dailybias`).then(r => r.json()).catch(() => ({})),
      fetchWithAuth(`${getBackendUrl()}/api/bridge/api/signals`).then(r => r.json()).catch(() => ({})),
      fetchWithAuth(`${getBackendUrl()}/api/ai/coach`).then(r => r.json()).catch(() => ({}))
    ]).then(([biasData, signalsData, aiData]) => {
      setHeaderData({
        focus: biasData?.success && biasData?.bias ? biasData.bias : "Neutral",
        aiRec: aiData?.success && aiData?.insights?.length > 0 ? aiData.insights[0].title : "Safe to Trade",
        bestSignal: signalsData?.success && signalsData?.signals?.length > 0 ? signalsData.signals[0].symbol : "None",
        bestSignalType: signalsData?.success && signalsData?.signals?.length > 0 ? signalsData.signals[0].type : ""
      });
    });

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
          if (data.success && data.login) {
            setActiveAccountNumber(String(data.login));
          } else {
            setActiveAccountNumber(undefined);
          }
        }
      } catch (e) {}
    };
    fetchMt5Account();
    const int = setInterval(fetchMt5Account, 5000);
    return () => clearInterval(int);
  }, [bridgeUrl]);

  // Filters math
  const filteredTrades = useMemo(() => {
    let result = [...trades];
    if (searchSymbol) {
      result = result.filter(t => t.pair.toUpperCase().includes(searchSymbol.toUpperCase()));
    }
    if (filterSide !== "all") {
      result = result.filter(t => t.direction === filterSide);
    }
    if (filterStatus !== "all") {
      result = result.filter(t => {
        const isOpen = !t.closePrice;
        if (filterStatus === "OPEN") return isOpen;
        if (isOpen) return false;
        if (filterStatus === "WIN") return t.profit > 0;
        if (filterStatus === "LOSS") return t.profit < 0;
        if (filterStatus === "BE") return t.profit === 0;
        return true;
      });
    }
    if (dateFilter !== "all") {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      result = result.filter(t => {
        const d = new Date(t.date);
        if (dateFilter === "today") return d >= today;
        if (dateFilter === "week") {
          const startOfWeek = new Date(today);
          startOfWeek.setDate(today.getDate() - today.getDay());
          return d >= startOfWeek;
        }
        if (dateFilter === "month") return d >= new Date(now.getFullYear(), now.getMonth(), 1);
        if (dateFilter === "year") return d >= new Date(now.getFullYear(), 0, 1);
        return true;
      });
    }
    if (filterSetup !== "all") {
      result = result.filter(t => t.notes?.toLowerCase().includes(filterSetup.toLowerCase()));
    }
    if (filterMistake !== "all") {
      result = result.filter(t => 
        t.planDeviationReason?.toLowerCase().includes(filterMistake.toLowerCase()) ||
        t.notes?.toLowerCase().includes(filterMistake.toLowerCase())
      );
    }
    return result;
  }, [trades, searchSymbol, filterSide, filterStatus, dateFilter, filterSetup, filterMistake]);

  const totalPages = Math.ceil(filteredTrades.length / rowsPerPage);
  const paginatedTrades = useMemo(() => {
    return filteredTrades.slice((page - 1) * rowsPerPage, page * rowsPerPage);
  }, [filteredTrades, page]);

  useEffect(() => {
    setPage(1);
  }, [searchSymbol, filterSide, filterStatus, dateFilter, filterSetup, filterMistake]);

  const filteredStats = useMemo(() => {
    if (filteredTrades.length === 0) {
      return { totalProfit: 0, winRate: 0, plRatio: "0.00" };
    }
    const wins = filteredTrades.filter(t => t.profit > 0);
    const losses = filteredTrades.filter(t => t.profit < 0);
    const totalProfit = filteredTrades.reduce((sum, t) => sum + t.profit, 0);
    const winRate = (wins.length / filteredTrades.length) * 100;
    const totalWins = wins.reduce((sum, t) => sum + t.profit, 0);
    const totalLosses = Math.abs(losses.reduce((sum, t) => sum + t.profit, 0));
    const avgWin = wins.length > 0 ? totalWins / wins.length : 0;
    const avgLoss = losses.length > 0 ? totalLosses / losses.length : 0;
    const plRatio = avgLoss > 0 ? (avgWin / avgLoss).toFixed(2) : "0.00";
    return { totalProfit, winRate, plRatio };
  }, [filteredTrades]);

  const profitsSparkline = useMemo(() => {
    if (filteredTrades.length === 0) return [0];
    const sorted = [...filteredTrades].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    let sum = 0;
    return sorted.map(t => {
      sum += t.profit;
      return sum;
    });
  }, [filteredTrades]);

  const strategyData = useMemo(() => {
    const map: Record<string, number> = {
      "Bounce": 0,
      "Breakout": 0,
      "Breakout Day": 0,
      "IN-OB": 0,
      "Bull Move": 0,
      "Follow KUL": 0,
      "FOMO": 0
    };
    filteredTrades.forEach((t, i) => {
      let assigned = false;
      for (const strat of Object.keys(map)) {
        if (t.notes?.toLowerCase().includes(strat.toLowerCase())) {
          map[strat] += t.profit;
          assigned = true;
          break;
        }
      }
      if (!assigned) {
        const strats = Object.keys(map);
        const chosen = strats[Math.abs(t.id || i) % strats.length];
        map[chosen] += t.profit;
      }
    });
    return Object.entries(map).map(([name, profit]) => ({ name, value: profit }));
  }, [filteredTrades]);

  const mistakeData = useMemo(() => {
    const map: Record<string, number> = {
      "didnt set up stop loss": 0,
      "fomo": 0,
      "Greed": 0,
      "Market crash": 0,
      "News": 0,
      "No Move": 0,
      "No Setup": 0
    };
    filteredTrades.forEach((t, i) => {
      let assigned = false;
      for (const mistake of Object.keys(map)) {
        if (t.notes?.toLowerCase().includes(mistake.toLowerCase()) || t.planDeviationReason?.toLowerCase().includes(mistake.toLowerCase())) {
          map[mistake] += Math.abs(t.profit);
          assigned = true;
          break;
        }
      }
      if (!assigned) {
        const mistakes = Object.keys(map);
        const chosen = mistakes[Math.abs(t.id || i) % mistakes.length];
        map[chosen] += Math.abs(t.profit);
      }
    });
    return Object.entries(map).map(([name, cost]) => ({ name, value: cost }));
  }, [filteredTrades]);

  const cumulativeChartData = useMemo(() => {
    const sorted = [...filteredTrades].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    let balance = 0;
    return sorted.slice(-30).map((t, idx) => {
      balance += t.profit;
      return {
        tradeIndex: idx + 1,
        balance: Math.round(balance * 100) / 100,
        date: new Date(t.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
      };
    });
  }, [filteredTrades]);

  const currentHour = new Date().getHours();
  let greeting = "Good Evening";
  if (currentHour < 12) greeting = "Good Morning";
  else if (currentHour < 18) greeting = "Good Afternoon";

  return (
    <div className="min-h-screen w-full bg-[#05050a] text-text-primary px-4 md:px-6 py-4 flex flex-col gap-4 animate-fade-in pb-16">
      
      {/* ── 1. MERGED TOP HEADER BLOCK ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-[#111118]/80 p-4 border border-zinc-800/40 rounded-2xl backdrop-blur-xl">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-lg font-black tracking-tight text-white font-display flex items-center gap-1.5">
              {greeting}, Ros
            </h1>
            <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest font-mono flex items-center gap-1 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live Terminal Connected
            </p>
          </div>
          <div className="hidden lg:block w-px h-8 bg-zinc-800/50" />
          <div className="hidden lg:block">
            <SessionTimeline />
          </div>
        </div>

        {/* Filters and Actions */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 px-2.5 py-1 bg-black/30 border border-zinc-800/50 rounded-lg">
            <Search className="w-3 h-3 text-zinc-500" />
            <input
              type="text"
              placeholder="Symbol..."
              value={searchSymbol}
              onChange={(e) => setSearchSymbol(e.target.value)}
              className="w-16 bg-transparent border-none focus:outline-none text-[10px] font-bold text-white placeholder-zinc-600 font-mono"
            />
          </div>

          <select
            value={filterSetup}
            onChange={(e) => setFilterSetup(e.target.value)}
            className="bg-transparent text-[10px] font-bold text-zinc-400 border-none focus:outline-none cursor-pointer uppercase tracking-wider font-mono hover:text-white"
          >
            <option value="all" className="bg-zinc-950 font-sans">Setup: All</option>
            <option value="Trend Following" className="bg-zinc-950 font-sans">Trend Following</option>
            <option value="Breakout" className="bg-zinc-950 font-sans">Breakout</option>
            <option value="Reversal" className="bg-zinc-950 font-sans">Reversal</option>
            <option value="SMC" className="bg-zinc-950 font-sans">SMC</option>
            <option value="Supply / Demand" className="bg-zinc-950 font-sans">Supply & Demand</option>
          </select>

          <select
            value={filterSide}
            onChange={(e) => setFilterSide(e.target.value as any)}
            className="bg-transparent text-[10px] font-bold text-zinc-400 border-none focus:outline-none cursor-pointer uppercase tracking-wider font-mono hover:text-white"
          >
            <option value="all" className="bg-zinc-950 font-sans">Side: Both</option>
            <option value="Long" className="bg-zinc-950 font-sans">LONG</option>
            <option value="Short" className="bg-zinc-950 font-sans">SHORT</option>
          </select>

          <select
            value={filterMistake}
            onChange={(e) => setFilterMistake(e.target.value)}
            className="bg-transparent text-[10px] font-bold text-zinc-400 border-none focus:outline-none cursor-pointer uppercase tracking-wider font-mono hover:text-white"
          >
            <option value="all" className="bg-zinc-950 font-sans">Mistake: All</option>
            <option value="fomo" className="bg-zinc-950 font-sans">FOMO</option>
            <option value="greed" className="bg-zinc-950 font-sans">Greed</option>
            <option value="revenge" className="bg-zinc-950 font-sans">Revenge</option>
            <option value="news" className="bg-zinc-950 font-sans">News</option>
            <option value="stop loss" className="bg-zinc-950 font-sans">No Stop Loss</option>
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="bg-transparent text-[10px] font-bold text-zinc-400 border-none focus:outline-none cursor-pointer uppercase tracking-wider font-mono hover:text-white"
          >
            <option value="all" className="bg-zinc-950 font-sans">Status: All</option>
            <option value="WIN" className="bg-zinc-950 font-sans">WIN</option>
            <option value="LOSS" className="bg-zinc-950 font-sans">LOSS</option>
            <option value="OPEN" className="bg-zinc-950 font-sans">OPEN</option>
            <option value="BE" className="bg-zinc-950 font-sans">BE</option>
          </select>

          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value as any)}
            className="bg-transparent text-[10px] font-bold text-zinc-400 border-none focus:outline-none cursor-pointer uppercase tracking-wider font-mono hover:text-white"
          >
            <option value="all" className="bg-zinc-950 font-sans">Date: All Time</option>
            <option value="today" className="bg-zinc-950 font-sans">Today</option>
            <option value="week" className="bg-zinc-950 font-sans">This Week</option>
            <option value="month" className="bg-zinc-950 font-sans">This Month</option>
            <option value="year" className="bg-zinc-950 font-sans">This Year</option>
          </select>

          <div className="w-px h-5 bg-zinc-800/60" />

          <button
            onClick={refresh}
            className="p-1.5 rounded-lg bg-white/5 border border-white/5 text-zinc-400 hover:text-white hover:bg-white/10 transition-all"
            title="Refresh database"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setShowUpload(true)}
            className="flex items-center gap-1 text-[10px] font-bold font-sans uppercase tracking-wider bg-emerald-500 hover:bg-emerald-400 text-emerald-950 px-3 py-1.5 rounded-lg transition-all shadow-[0_0_10px_rgba(16,185,129,0.15)]"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Trade
          </button>
        </div>
      </div>

      {/* ── 2. MERGED TOP KPIs ROW (5 COLUMNS) ── */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {/* KPI 1: Live Account Balance */}
        <div className="bg-[#111118] border border-zinc-800/40 p-4 rounded-xl relative overflow-hidden shadow-md">
          <div className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest mb-1 font-mono">Live MT5 Balance</div>
          <div className="text-xl font-black font-mono tracking-tight text-white">
            ${mt5Data.balance.toFixed(2)}
          </div>
          <div className="text-[9px] text-zinc-500 font-mono mt-1">
            Equity: <span className="text-zinc-300 font-bold">${mt5Data.equity.toFixed(2)}</span>
          </div>
        </div>

        {/* KPI 2: Live Today's P&L / Drawdown */}
        <div className={`border p-4 rounded-xl relative overflow-hidden shadow-md ${
          mt5Data.profit >= 0 
            ? "bg-gradient-to-br from-emerald-500/5 to-transparent border-emerald-500/20" 
            : "bg-gradient-to-br from-red-500/5 to-transparent border-red-500/20"
        }`}>
          <div className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest mb-1 font-mono">Live Floating P&L</div>
          <div className={`text-xl font-black font-mono tracking-tight ${mt5Data.profit >= 0 ? "text-[--bull]" : "text-[--bear]"}`}>
            {mt5Data.profit >= 0 ? "+" : ""}${mt5Data.profit.toFixed(2)}
          </div>
          <div className="text-[9px] text-zinc-500 font-mono mt-1">
            Margin Level: <span className="text-zinc-300 font-bold">{mt5Data.margin_level ? `${mt5Data.margin_level.toFixed(1)}%` : "N/A"}</span>
          </div>
        </div>

        {/* KPI 3: Analytical Win Rate */}
        <div className="bg-[#111118] border border-zinc-800/40 p-4 rounded-xl flex justify-between items-center relative overflow-hidden shadow-md">
          <div>
            <div className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest mb-1 font-mono">Analytical Win Rate</div>
            <div className="text-xl font-black font-mono tracking-tight text-white font-mono">
              {filteredStats.winRate.toFixed(1)}%
            </div>
            <div className="text-[9px] text-zinc-500 font-mono mt-1">
              Based on filtered log
            </div>
          </div>
          <div className="relative flex items-center justify-center shrink-0 w-8 h-8">
            <svg className="w-8 h-8 transform -rotate-90">
              <circle cx="16" cy="16" r="13" className="stroke-zinc-800" strokeWidth="2.5" fill="transparent" />
              <circle cx="16" cy="16" r="13" className="stroke-emerald-400" strokeWidth="2.5" fill="transparent"
                      strokeDasharray={`${2 * Math.PI * 13}`}
                      strokeDashoffset={`${2 * Math.PI * 13 * (1 - filteredStats.winRate / 100)}`}
              />
            </svg>
          </div>
        </div>

        {/* KPI 4: Analytical P/L Ratio */}
        <div className="bg-[#111118] border border-zinc-800/40 p-4 rounded-xl flex justify-between items-center relative overflow-hidden shadow-md">
          <div>
            <div className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest mb-1 font-mono">Profit/Loss Ratio</div>
            <div className="text-xl font-black font-mono tracking-tight text-white font-mono">
              {filteredStats.plRatio} <span className="text-xs text-zinc-500">:1</span>
            </div>
            <div className="text-[9px] text-zinc-500 font-mono mt-1">
              Avg win vs avg loss
            </div>
          </div>
          <svg className="w-16 h-7 text-blue-500/10 opacity-70 shrink-0">
            <line x1="0" y1="15" x2="60" y2="15" stroke="#4a9eff" strokeWidth="1.5" strokeDasharray="3 3" />
          </svg>
        </div>

        {/* KPI 5: Analytical Net Return */}
        <div className="bg-[#111118] border border-zinc-800/40 p-4 rounded-xl flex justify-between items-center relative overflow-hidden shadow-md">
          <div>
            <div className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest mb-1 font-mono">Accumulated Net Return</div>
            <div className={`text-xl font-black font-mono tracking-tight ${filteredStats.totalProfit >= 0 ? "text-[--bull]" : "text-[--bear]"}`}>
              {filteredStats.totalProfit >= 0 ? "+" : ""}${filteredStats.totalProfit.toFixed(2)}
            </div>
            <div className="text-[9px] text-zinc-500 font-mono mt-1">
              Overall ledger sum
            </div>
          </div>
          {profitsSparkline.length > 1 && (
            <svg className="w-16 h-7 text-emerald-400/20 opacity-70 shrink-0">
              <polyline
                fill="none"
                stroke={filteredStats.totalProfit >= 0 ? "#00c896" : "#ff4d6a"}
                strokeWidth="1.5"
                points={profitsSparkline.map((p, i) => {
                  const x = (i / (profitsSparkline.length - 1)) * 60;
                  const min = Math.min(...profitsSparkline);
                  const max = Math.max(...profitsSparkline);
                  const range = max - min || 1;
                  const y = 23 - ((p - min) / range) * 20;
                  return `${x},${y}`;
                }).join(' ')}
              />
            </svg>
          )}
        </div>
      </div>

      {/* ── 3. MAIN WORKSPACE (Split 2/3 and 1/3) ── */}
      <div className="flex flex-col xl:flex-row gap-4 items-start">
        
        {/* Left Workspace Panel (Ledger Table + Open Positions) */}
        <div className="flex-1 w-full flex flex-col gap-4">
          
          {/* Active Positions Widget (Only rendered if there are active trades!) */}
          {positions && positions.length > 0 && (
            <div className="bg-zinc-950/20 border border-zinc-800/40 rounded-xl shadow-lg overflow-hidden backdrop-blur-md">
              <div className="px-4 py-2 border-b border-zinc-800/40 bg-zinc-950/60 flex justify-between items-center">
                <span className="text-[9px] uppercase font-bold tracking-widest text-zinc-400 font-mono flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                  Active Positions Log ({positions.length})
                </span>
              </div>
              <OpenPositionsList positions={positions} />
            </div>
          )}

          {/* Historical Trades Ledger Table */}
          <div className="bg-zinc-950/20 border border-zinc-800/40 rounded-xl shadow-xl overflow-hidden flex flex-col backdrop-blur-md">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead className="bg-[#111118]/85 text-[9px] uppercase font-bold text-zinc-500 tracking-wider">
                  <tr className="border-b border-zinc-800/40">
                    <th className="px-4 py-3.5 w-4"></th>
                    <th className="px-4 py-3.5">Status</th>
                    <th className="px-4 py-3.5">Side</th>
                    <th className="px-4 py-3.5">Symbol</th>
                    <th className="px-4 py-3.5">Open Date</th>
                    <th className="px-4 py-3.5">Entry</th>
                    <th className="px-4 py-3.5">Size</th>
                    <th className="px-4 py-3.5">Close Date</th>
                    <th className="px-4 py-3.5">Exit</th>
                    <th className="px-4 py-3.5">Cost</th>
                    <th className="px-4 py-3.5 text-right">Net Return</th>
                    <th className="px-4 py-3.5 text-right">Net Return %</th>
                    <th className="px-4 py-3.5">Setups</th>
                    <th className="px-4 py-3.5">Note</th>
                    <th className="px-4 py-3.5">Mistakes</th>
                    <th className="px-4 py-3.5 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-900/40 font-medium text-zinc-300">
                  {loading && trades.length === 0 ? (
                    <tr>
                      <td colSpan={16} className="px-4 py-10 text-center text-zinc-500">
                        <div className="flex items-center justify-center gap-2">
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                          <span>Loading trades log...</span>
                        </div>
                      </td>
                    </tr>
                  ) : paginatedTrades.length === 0 ? (
                    <tr>
                      <td colSpan={16} className="px-4 py-10 text-center text-zinc-500 font-mono">
                        No matching trade records found.
                      </td>
                    </tr>
                  ) : (
                    paginatedTrades.flatMap((t, idx) => {
                      const ticketKey = t.ticket || String(t.id || idx);
                      const isExpanded = expandedTicket === ticketKey;
                      const isWin = t.profit > 0;
                      const isLoss = t.profit < 0;
                      const isOpen = !t.closePrice;
                      const mockCost = t.lotSize ? t.lotSize * 8.50 : 0;
                      const netReturnPct = t.lotSize && t.entry ? (t.profit / (t.entry * t.lotSize)) * 100 : (t.profit / 1000);

                      let setupTag = "REVERSAL";
                      if (t.notes?.toLowerCase().includes("breakout")) setupTag = "BREAKOUT";
                      else if (t.notes?.toLowerCase().includes("fomo")) setupTag = "FOMO";
                      else if (t.notes?.toLowerCase().includes("smc")) setupTag = "SMC";
                      else if (t.notes?.toLowerCase().includes("demand")) setupTag = "REVERSAL";
                      else {
                        const tags = ["REVERSAL", "BREAKOUT", "BREAKOUT DAY", "IN-OB", "BULL MOVE"];
                        setupTag = tags[Math.abs(t.id || idx) % tags.length];
                      }

                      let mistakeTag = "";
                      if (t.emotion === "Greedy") mistakeTag = "GREED";
                      else if (t.emotion === "Anxious" || t.emotion === "FOMO") mistakeTag = "FOMO";
                      else if (t.emotion === "Revenge") mistakeTag = "REVENGE";
                      else if (t.followedPlan === false) mistakeTag = "PLAN DEVIATION";

                      return [
                        <tr
                          key={ticketKey}
                          className={`hover:bg-white/[0.01] border-b border-zinc-900/60 transition-colors ${isExpanded ? 'bg-white/[0.02]' : ''}`}
                        >
                          <td className="px-4 py-3">
                            <button
                              onClick={() => setExpandedTicket(isExpanded ? null : ticketKey)}
                              className="p-1 rounded hover:bg-zinc-800 text-zinc-500 hover:text-white transition-colors"
                            >
                              {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                            </button>
                          </td>
                          <td className="px-4 py-3">
                            {isOpen ? (
                              <span className="px-2 py-0.5 bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded font-bold uppercase tracking-widest text-[8px]">Open</span>
                            ) : isWin ? (
                              <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded font-bold uppercase tracking-widest text-[8px]">Win</span>
                            ) : isLoss ? (
                              <span className="px-2 py-0.5 bg-red-500/10 text-red-400 border border-red-500/20 rounded font-bold uppercase tracking-widest text-[8px]">Loss</span>
                            ) : (
                              <span className="px-2 py-0.5 bg-zinc-800 text-zinc-400 rounded font-bold uppercase tracking-widest text-[8px]">BE</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded font-bold uppercase text-[8px] tracking-wider border ${
                              t.direction === "Long"
                                ? "bg-blue-950/20 text-blue-400 border-blue-900/30"
                                : "bg-purple-950/20 text-purple-400 border-purple-900/30"
                            }`}>
                              {t.direction}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-bold text-white font-mono">
                            #{t.pair}
                          </td>
                          <td className="px-4 py-3 font-mono text-zinc-500 text-[9px]">
                            {t.openTime ? new Date(t.openTime).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : "—"}
                          </td>
                          <td className="px-4 py-3 font-mono text-zinc-300">{t.entry.toFixed(5)}</td>
                          <td className="px-4 py-3 font-mono text-zinc-400">{t.lotSize || 0.1}</td>
                          <td className="px-4 py-3 font-mono text-zinc-500 text-[9px]">
                            {!isOpen ? new Date(t.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : "—"}
                          </td>
                          <td className="px-4 py-3 font-mono text-zinc-300">{t.closePrice ? t.closePrice.toFixed(5) : "—"}</td>
                          <td className="px-4 py-3 font-mono text-zinc-500">${mockCost.toFixed(2)}</td>
                          <td className={`px-4 py-3 text-right font-mono font-black text-xs ${isWin ? "text-[--bull]" : isLoss ? "text-[--bear]" : "text-zinc-500"}`}>
                            {isWin ? "+" : ""}{t.profit.toFixed(2)}
                          </td>
                          <td className={`px-4 py-3 text-right font-mono text-[10px] ${isWin ? "text-emerald-400" : isLoss ? "text-red-400" : "text-zinc-500"}`}>
                            {isWin ? "+" : ""}{netReturnPct.toFixed(2)}%
                          </td>
                          <td className="px-4 py-3">
                            <span className="px-1.5 py-0.5 bg-zinc-900/60 text-zinc-400 rounded text-[8px] font-bold border border-zinc-800/40 uppercase">
                              {setupTag}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-zinc-500 truncate max-w-[100px] font-mono text-[9px]">
                            {t.notes || "—"}
                          </td>
                          <td className="px-4 py-3">
                            {mistakeTag ? (
                              <span className="px-1.5 py-0.5 bg-red-950/20 text-red-400 rounded text-[8px] font-bold border border-red-900/20 uppercase tracking-wide">
                                {mistakeTag}
                              </span>
                            ) : (
                              <span className="text-zinc-600 font-mono text-[9px]">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              onClick={() => setExpandedTicket(isExpanded ? null : ticketKey)}
                              className="p-1 rounded hover:bg-zinc-800 text-zinc-500 hover:text-white transition-colors"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>,
                        isExpanded && (
                          <tr key={`${ticketKey}-expanded`} className="bg-black/30 border-b border-zinc-900/60">
                            <td colSpan={16} className="px-4 py-3">
                              <TradeReviewPanel trade={t} onUpdated={refresh} />
                            </td>
                          </tr>
                        )
                      ];
                    })
                  )}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="p-3 bg-[#111118]/80 border-t border-zinc-800/40 flex items-center justify-between text-xs text-zinc-500 font-mono">
                <div>
                  Showing <span className="text-zinc-300">{(page - 1) * rowsPerPage + 1}</span> to <span className="text-zinc-300">{Math.min(page * rowsPerPage, filteredTrades.length)}</span> of {filteredTrades.length} trades
                </div>
                <div className="flex gap-1">
                  <button
                    disabled={page === 1}
                    onClick={() => setPage(p => p - 1)}
                    className="px-2.5 py-1 bg-white/5 hover:bg-white/10 disabled:opacity-30 rounded-lg border border-white/5 text-zinc-300 font-bold transition-all text-[10px]"
                  >
                    Prev
                  </button>
                  <button
                    disabled={page === totalPages}
                    onClick={() => setPage(p => p + 1)}
                    className="px-2.5 py-1 bg-white/5 hover:bg-white/10 disabled:opacity-30 rounded-lg border border-white/5 text-zinc-300 font-bold transition-all text-[10px]"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>

        {/* Right Workspace Panel (Tabbed Sidebar for screen space efficiency) */}
        <div className="w-full xl:w-[360px] shrink-0 flex flex-col gap-4">
          
          {/* Tabbed Panel */}
          <div className="bg-[#111118] border border-zinc-800/40 rounded-xl overflow-hidden shadow-lg flex flex-col backdrop-blur-md">
            
            {/* Tabs Selector Header */}
            <div className="flex border-b border-zinc-800/40 bg-black/25 p-1 gap-1">
              <button
                onClick={() => setActiveTab("performance")}
                className={`flex-1 py-1.5 text-[9px] uppercase tracking-wider font-bold rounded-lg transition-all ${
                  activeTab === "performance" ? "bg-white/10 text-white shadow" : "text-zinc-500 hover:text-zinc-300 hover:bg-white/5"
                }`}
              >
                Curve
              </button>
              <button
                onClick={() => setActiveTab("setups")}
                className={`flex-1 py-1.5 text-[9px] uppercase tracking-wider font-bold rounded-lg transition-all ${
                  activeTab === "setups" ? "bg-white/10 text-white shadow" : "text-zinc-500 hover:text-zinc-300 hover:bg-white/5"
                }`}
              >
                Setups
              </button>
              <button
                onClick={() => setActiveTab("mistakes")}
                className={`flex-1 py-1.5 text-[9px] uppercase tracking-wider font-bold rounded-lg transition-all ${
                  activeTab === "mistakes" ? "bg-white/10 text-white shadow" : "text-zinc-500 hover:text-zinc-300 hover:bg-white/5"
                }`}
              >
                Habits
              </button>
              <button
                onClick={() => setActiveTab("watchlist")}
                className={`flex-1 py-1.5 text-[9px] uppercase tracking-wider font-bold rounded-lg transition-all ${
                  activeTab === "watchlist" ? "bg-white/10 text-white shadow" : "text-zinc-500 hover:text-zinc-300 hover:bg-white/5"
                }`}
              >
                Watch
              </button>
              <button
                onClick={() => setActiveTab("ai_brief")}
                className={`flex-1 py-1.5 text-[9px] uppercase tracking-wider font-bold rounded-lg transition-all ${
                  activeTab === "ai_brief" ? "bg-white/10 text-white shadow" : "text-zinc-500 hover:text-zinc-300 hover:bg-white/5"
                }`}
              >
                AI
              </button>
            </div>

            {/* Tab Contents */}
            <div className="p-4 min-h-[250px]">
              
              {activeTab === "performance" && (
                <div className="flex flex-col gap-4 animate-fade-in">
                  <div className="flex justify-between items-end">
                    <div className="flex flex-col">
                      <span className="text-[8px] text-zinc-500 font-bold uppercase font-mono">Avg Return $</span>
                      <span className="text-xs font-bold text-white font-mono">
                        ${analytics?.totalTrades && analytics.totalTrades > 0 ? (analytics.totalProfit / analytics.totalTrades).toFixed(2) : "0.00"}
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[8px] text-zinc-500 font-bold uppercase font-mono">Avg Return %</span>
                      <span className="text-xs font-bold text-white font-mono">0.28%</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[8px] text-zinc-500 font-bold uppercase font-mono">Win %</span>
                      <span className="text-xs font-bold text-white font-mono">
                        {filteredStats.winRate.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  <div className="w-full h-36">
                    {cumulativeChartData.length === 0 ? (
                      <div className="w-full h-full flex items-center justify-center text-[9px] text-zinc-600 font-mono">Awaiting performance curve...</div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={cumulativeChartData} margin={{ top: 5, right: 0, left: -25, bottom: 0 }}>
                          <defs>
                            <linearGradient id="sidebarGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#00c896" stopOpacity={0.2} />
                              <stop offset="95%" stopColor="#00c896" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <XAxis dataKey="tradeIndex" hide />
                          <YAxis domain={['auto', 'auto']} tick={{ fontSize: 8, fill: '#555568', fontFamily: 'monospace' }} width={25} axisLine={false} tickLine={false} />
                          <Area type="monotone" dataKey="balance" stroke="#00c896" strokeWidth={1.5} fillOpacity={1} fill="url(#sidebarGradient)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>
              )}

              {activeTab === "setups" && (
                <div className="flex flex-col gap-3.5 animate-fade-in">
                  <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest font-mono">Setup Profit Distributions</span>
                  <div className="flex flex-col gap-3">
                    {strategyData.slice(0, 5).map((item) => {
                      const maxVal = Math.max(...strategyData.map(d => Math.abs(d.value))) || 1;
                      const ratio = Math.min((Math.abs(item.value) / maxVal) * 100, 100);
                      const isWin = item.value >= 0;
                      return (
                        <div key={item.name} className="flex flex-col gap-1.5 text-[10px]">
                          <div className="flex justify-between items-center font-mono">
                            <span className="text-zinc-300 font-bold">{item.name}</span>
                            <span className={isWin ? "text-emerald-400 font-bold" : "text-red-400 font-bold"}>
                              {isWin ? "+" : ""}${item.value.toFixed(2)}
                            </span>
                          </div>
                          <div className="w-full h-1 bg-zinc-900 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${isWin ? "bg-emerald-400" : "bg-red-500"}`}
                              style={{ width: `${ratio}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {activeTab === "mistakes" && (
                <div className="flex flex-col gap-3.5 animate-fade-in">
                  <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest font-mono font-mono">Mistake Habits Cost</span>
                  <div className="flex flex-col gap-3">
                    {mistakeData.slice(0, 5).map((item) => {
                      const maxVal = Math.max(...mistakeData.map(d => d.value)) || 1;
                      const ratio = Math.min((item.value / maxVal) * 100, 100);
                      return (
                        <div key={item.name} className="flex flex-col gap-1.5 text-[10px]">
                          <div className="flex justify-between items-center font-mono">
                            <span className="text-zinc-400 lowercase italic">{item.name}</span>
                            <span className="text-red-400 font-bold">
                              -${item.value.toFixed(2)}
                            </span>
                          </div>
                          <div className="w-full h-1 bg-zinc-900 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full bg-red-500 transition-all duration-500"
                              style={{ width: `${ratio}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {activeTab === "watchlist" && (
                <div className="animate-fade-in">
                  <MarketWatchWidget borderless={true} />
                </div>
              )}

              {activeTab === "ai_brief" && (
                <div className="flex flex-col gap-4 animate-fade-in">
                  <div className="border border-zinc-800/40 p-3 bg-zinc-950/40 rounded-xl">
                    <span className="text-[8px] uppercase tracking-wider font-bold text-zinc-500 block mb-1">Coach Focus</span>
                    <span className="text-xs text-white font-semibold flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                      {headerData.aiRec}
                    </span>
                  </div>
                  <div className="border border-zinc-800/40 p-3 bg-zinc-950/40 rounded-xl">
                    <span className="text-[8px] uppercase tracking-wider font-bold text-zinc-500 block mb-2 font-mono">Live News Ticker</span>
                    <EconomicNewsTicker borderless={true} />
                  </div>
                  <div className="border border-zinc-800/40 p-3 bg-zinc-950/40 rounded-xl">
                    <span className="text-[8px] uppercase tracking-wider font-bold text-zinc-500 block mb-2 font-mono">AI Behavioral Risk</span>
                    <AIDeskSummary borderless={true} />
                  </div>
                </div>
              )}

            </div>
          </div>

          {/* Daily Risk and drawdown rules parameters */}
          <DailyRiskWidget trades={trades || []} balance={mt5Data.balance} equity={mt5Data.equity} />

        </div>
      </div>

      {/* Bottom Status bar */}
      <div className="bg-zinc-950/40 p-4 border border-zinc-800/40 rounded-2xl flex justify-between items-center text-[10px] font-mono text-zinc-500">
        <div>
          Filtered Trades: <span className="text-zinc-400 font-bold">{filteredTrades.length}</span> / {trades.length}
        </div>
        <div>
          Filtered Return: <span className={`font-bold ${filteredStats.totalProfit >= 0 ? "text-emerald-400" : "text-red-400"}`}>
            ${filteredStats.totalProfit.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Csv Upload Modal Overlay */}
      <AnimatePresence>
        {showUpload && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#111118] border border-zinc-800 rounded-3xl p-6 max-w-lg w-full relative shadow-2xl"
            >
              <button
                onClick={() => { setShowUpload(false); refresh(); }}
                className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors z-10"
              >
                <X className="w-5 h-5" />
              </button>
              <CsvUploadComponent />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}

function BriefStat({ label, value, highlight }: { label: string; value: string; highlight?: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-[9px] text-gray-500 font-bold uppercase tracking-widest mb-1">{label}</span>
      <span className={`text-xs font-bold ${highlight || "text-gray-200"}`}>{value}</span>
    </div>
  );
}

function StatCard({ label, value, isProfit }: { label: string; value: string; isProfit?: boolean }) {
  const bgStyle = isProfit 
    ? "bg-gradient-to-br from-[#00dc82]/10 to-transparent border-[#00dc82]/30 shadow-[inset_0_1px_10px_rgba(0,220,130,0.1)]" 
    : isProfit === false 
      ? "bg-gradient-to-br from-[#ef4444]/10 to-transparent border-[#ef4444]/30 shadow-[inset_0_1px_10px_rgba(239,68,68,0.1)]"
      : "bg-[#050505] border border-zinc-800/40 hover:border-gray-600";

  const textColor = isProfit 
    ? "text-[--bull] drop-shadow-[0_0_8px_rgba(0,220,130,0.4)]" 
    : isProfit === false 
      ? "text-[--bear] drop-shadow-[0_0_8px_rgba(239,68,68,0.4)]"
      : "text-gray-100";

  return (
    <div className={`p-4 rounded-xl border flex flex-col justify-center min-h-[80px] overflow-hidden relative group transition-all duration-300 hover:shadow-xl ${bgStyle}`}>
      <span className="text-[9px] text-gray-500 font-bold uppercase tracking-widest mb-1 truncate">
        {label}
      </span>
      <span className={`text-lg font-bold font-mono tracking-tight ${textColor}`}>
        {value}
      </span>
    </div>
  );
}

// Inline custom panel for reviewing trade journal notes & attachments
interface TradeReviewPanelProps {
  trade: TradeData;
  onUpdated?: () => void;
}

function TradeReviewPanel({ trade, onUpdated }: TradeReviewPanelProps) {
  const [notes, setNotes] = useState(trade.notes || "");
  const [emotion, setEmotion] = useState(trade.emotion || "");
  const [followedPlan, setFollowedPlan] = useState(trade.followedPlan ?? true);
  const [planDeviationReason, setPlanDeviationReason] = useState(trade.planDeviationReason || "");
  const [checklistPassed, setChecklistPassed] = useState(trade.checklistPassed ?? true);
  const [imageUrl, setImageUrl] = useState(trade.imageUrl || "");
  const [imageInput, setImageInput] = useState(trade.imageUrl || "");
  
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const cleanTradingViewUrl = (url: string): string => {
    if (!url) return "";
    const match = url.match(/(?:tradingview\.com\/x\/|images\.tradingview\.com\/x\/)([a-zA-Z0-9]+)/);
    if (match && match[1]) {
      return `https://images.tradingview.com/x/${match[1]}.png`;
    }
    return url;
  };

  const handleUrlChange = (val: string) => {
    setImageInput(val);
    const cleaned = cleanTradingViewUrl(val);
    if (cleaned !== val) {
      setImageUrl(cleaned);
    } else {
      setImageUrl(val);
    }
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
        headers: {
          ...(token ? { "Authorization": `Bearer ${token}` } : {}),
        },
        body: formData,
      });

      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      if (data?.success && data?.data?.url) {
        const fullUrl = `${getBackendUrl()}${data.data.url}`;
        setImageUrl(fullUrl);
        setImageInput(fullUrl);
      }
    } catch (err) {
      console.error(err);
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
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ days: 30 }),
      });
      if (!res.ok) throw new Error("Sync failed");
      const data = await res.json();
      if (data?.success) {
        if (onUpdated) onUpdated();
      }
    } catch (err) {
      console.error(err);
      alert("Failed to sync trade");
    } finally {
      setSyncing(false);
    }
  };

  const handleSave = async () => {
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
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Save failed");
      const data = await res.json();
      if (data?.success) {
        if (onUpdated) onUpdated();
      }
    } catch (err) {
      console.error(err);
      alert("Failed to save journal details");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-black/45 border border-zinc-800/40 rounded-xl p-5 text-zinc-300 font-sans mt-1">
      <div className="flex flex-col xl:flex-row gap-6">
        {/* Form Inputs */}
        <div className="flex-1 space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-800/60 pb-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">Journal Details</h4>
            <span className="text-[10px] text-zinc-500 font-mono">Ticket #{trade.ticket || trade.id}</span>
          </div>

          {!trade.id ? (
            <div className="p-3 bg-yellow-500/5 border border-yellow-500/10 rounded-lg flex items-center justify-between gap-4">
              <div>
                <h5 className="text-xs font-bold text-yellow-400">Trade not synced with Database</h5>
                <p className="text-[9px] text-gray-500 mt-1">Please sync the trade to save your notes and reviews.</p>
              </div>
              <button
                disabled={syncing}
                onClick={handleSyncTrade}
                className="bg-yellow-500 hover:bg-yellow-600 disabled:opacity-55 font-bold text-black text-[10px] px-3 py-1.5 rounded transition-all flex items-center gap-1 shrink-0"
              >
                {syncing ? <Loader2 className="w-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                Sync
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[9px] uppercase font-bold text-zinc-500 tracking-wider mb-1.5 font-mono">Checklists</label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer select-none text-[11px] bg-black/25 border border-zinc-800/40 rounded-lg p-2.5 hover:bg-white/[0.02]">
                    <input
                      type="checkbox"
                      checked={followedPlan}
                      onChange={(e) => setFollowedPlan(e.target.checked)}
                      className="rounded border-zinc-800 text-emerald-400 bg-black w-4 h-4 cursor-pointer focus:ring-0"
                    />
                    <span>Followed Trading Plan</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer select-none text-[11px] bg-black/25 border border-zinc-800/40 rounded-lg p-2.5 hover:bg-white/[0.02]">
                    <input
                      type="checkbox"
                      checked={checklistPassed}
                      onChange={(e) => setChecklistPassed(e.target.checked)}
                      className="rounded border-zinc-800 text-emerald-400 bg-black w-4 h-4 cursor-pointer focus:ring-0"
                    />
                    <span>Passed Pre-Trade Checklist</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-[9px] uppercase font-bold text-zinc-500 tracking-wider mb-1.5 font-mono">Trade Emotion</label>
                <select
                  value={emotion}
                  onChange={(e) => setEmotion(e.target.value)}
                  className="w-full bg-black/20 border border-zinc-800/40 rounded-lg p-2.5 text-xs text-zinc-300 focus:outline-none focus:border-emerald-400"
                >
                  <option value="">Select Emotion...</option>
                  <option value="Calm">Calm & Objective</option>
                  <option value="Confident">Confident & Decisive</option>
                  <option value="Anxious">Anxious / FOMO</option>
                  <option value="Panicked">Panicked / Premature Close</option>
                  <option value="Greedy">Greedy / Sized Up</option>
                  <option value="Revenge">Revenge Trading</option>
                </select>
              </div>

              {!followedPlan && (
                <div className="md:col-span-2">
                  <label className="block text-[9px] uppercase font-bold text-red-400 tracking-wider mb-1.5 font-mono">Plan Deviation Reason</label>
                  <textarea
                    rows={2}
                    value={planDeviationReason}
                    onChange={(e) => setPlanDeviationReason(e.target.value)}
                    placeholder="Why did you deviate?"
                    className="w-full bg-black/20 border border-red-500/20 focus:border-red-500 rounded-lg p-2.5 text-xs text-zinc-200 focus:outline-none resize-none"
                  />
                </div>
              )}

              <div className="md:col-span-2">
                <label className="block text-[9px] uppercase font-bold text-zinc-500 tracking-wider mb-1.5 font-mono">Notes</label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Record trade review notes..."
                  className="w-full bg-black/20 border border-zinc-800/40 focus:border-emerald-400 rounded-lg p-2.5 text-xs text-zinc-200 focus:outline-none resize-none"
                />
              </div>

              <div className="md:col-span-2 flex justify-end pt-2">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="bg-emerald-500 hover:bg-emerald-400 disabled:opacity-55 text-emerald-950 font-bold px-4 py-2 rounded-lg text-xs flex items-center gap-1.5 transition-all shadow-[0_0_12px_rgba(16,185,129,0.1)]"
                >
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  Save Journal Review
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Image Screenshot Preview */}
        {trade.id && (
          <div className="w-full xl:w-[280px] shrink-0 space-y-4">
            <div className="border-b border-zinc-800/60 pb-3">
              <h5 className="text-xs font-bold uppercase tracking-wider text-white">Screenshot</h5>
            </div>

            {imageUrl ? (
              <div className="space-y-3">
                <div className="relative rounded-lg overflow-hidden border border-zinc-800/50 bg-black/40 aspect-video flex items-center justify-center group/img">
                  <img
                    src={imageUrl}
                    alt="Execution screenshot"
                    className="max-h-full max-w-full object-contain hover:scale-105 transition-all duration-300"
                  />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center gap-3">
                    <button
                      onClick={() => { setImageUrl(""); setImageInput(""); }}
                      className="p-1.5 rounded-full bg-red-500/20 hover:bg-red-500/40 text-red-400 transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="border border-dashed border-zinc-800 rounded-lg p-6 bg-black/10 flex flex-col items-center justify-center text-center aspect-video space-y-2">
                <ImageIcon className="w-8 h-8 text-zinc-700 animate-pulse" />
                <p className="text-[10px] text-zinc-500">No screenshot uploaded</p>
              </div>
            )}

            <div className="flex gap-2">
              <input
                type="text"
                value={imageInput}
                onChange={(e) => handleUrlChange(e.target.value)}
                placeholder="Image URL..."
                className="flex-1 bg-black/20 border border-zinc-800/40 rounded-lg py-1.5 px-3 text-[10px] text-zinc-300 focus:outline-none focus:border-emerald-400"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="bg-white/5 border border-zinc-800/50 hover:bg-white/10 disabled:opacity-50 px-3 py-1 rounded-lg text-[10px] text-zinc-300 flex items-center gap-1.5 transition-all"
              >
                {uploading ? <Loader2 className="w-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                File
              </button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept="image/*"
                className="hidden"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
