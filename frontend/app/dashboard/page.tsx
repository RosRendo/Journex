"use client";
import { useMemo, useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import {
  TrendingUp,
  TrendingDown,
  Target,
  BarChart3,
  Activity,
  Upload,
  Wifi,
  DollarSign,
  PieChart as PieChartIcon,
  Sparkles,
  ArrowRight,
  Globe,
  AlertTriangle
} from "lucide-react";
import {
  createChart,
  IChartApi,
  ISeriesApi,
  Time
} from "lightweight-charts";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useCsvTrades } from "@/hooks/useCsvTrades";
import { useNews } from "@/hooks/useNews";
import { calculateMetrics, getStrategyStats } from "@/lib/calculations";
import { getBackendUrl, fetchWithAuth } from "@/lib/utils";
import { getPairDigits } from "@/lib/format";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  PieChart,
  Pie
} from "recharts";
import Link from "next/link";
import { SessionTimeline } from "@/components/ui/SessionTimeline";
import { CapitalFlow } from "@/components/ui/CapitalFlow";
import { AIMacroDeskSection } from "@/components/ui/MacroDeskCard";
import { ConditionMeter } from "@/components/ui/ConditionMeter";
import DisciplineScoreWidget from "@/components/ui/DisciplineScoreWidget";
import { RecentTradesTable } from "@/components/dashboard/widgets/RecentTradesTable";
import { AiCoachWidget } from "@/components/dashboard/widgets/AiCoachWidget";
import { EquityCurveChart } from "@/components/dashboard/widgets/EquityCurveChart";
import { StrategyPerformance } from "@/components/dashboard/widgets/StrategyPerformance";
import { OpenPositionsList } from "@/components/dashboard/widgets/OpenPositionsList";
import { EconomicNewsTicker } from "@/components/dashboard/widgets/EconomicNewsTicker";

import { MarketHeatmapWidget } from "@/components/widgets/MarketHeatmapWidget";
import { DailyBiasWidget } from "@/components/widgets/DailyBiasWidget";
import { TradeDurationScatterPlot } from "@/components/widgets/TradeDurationScatterPlot";
import { MistakeCostAnalyzer } from "@/components/widgets/MistakeCostAnalyzer";
import { NewsCountdownWidget } from "@/components/widgets/NewsCountdownWidget";
import { RetailSentimentGauge } from "@/components/widgets/RetailSentimentGauge";
import { TiltMonitorWidget } from "@/components/widgets/TiltMonitorWidget";
import { VisualPositionSizer } from "@/components/widgets/VisualPositionSizer";
import SessionKillzones from "@/components/widgets/SessionKillzones";


import { DailyRiskWidget } from "@/components/dashboard/widgets/DailyRiskWidget";
import { QuickTradeEntry } from "@/components/dashboard/widgets/QuickTradeEntry";
import { AlertsWidget } from "@/components/dashboard/widgets/AlertsWidget";
import { PerformanceSummaryWidget } from "@/components/dashboard/widgets/PerformanceSummaryWidget";
import { DrawdownVisualization } from "@/components/dashboard/widgets/DrawdownVisualization";
import { MonthlyPerformanceGrid } from "@/components/dashboard/widgets/MonthlyPerformanceGrid";
import { SessionPerformanceGrid } from "@/components/dashboard/widgets/SessionPerformanceGrid";
import { usePositions } from "@/hooks/usePositions";
import { useBridgeUrl } from "@/hooks/useBridgeUrl";
import { SetupScorer } from "@/components/ui/SetupScorer";
import { CorrelationMatrix } from "@/components/ui/CorrelationMatrix";
import { PreTradeChecklist } from "@/components/ui/PreTradeChecklist";

function StatCard({
  label,
  value,
  icon: Icon,
  variant = "default",
}: {
  label: string;
  value: string;
  icon: React.ElementType;
  variant?: "default" | "profit" | "loss";
}) {
  return (
    <div
      className="rounded-xl border p-4 animate-fade-up"
      style={{
        background: "var(--bg-card)",
        borderColor: "var(--border)",
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] font-bold uppercase tracking-[0.1em]" style={{ color: "var(--text-tertiary)" }}>
          {label}
        </span>
        <Icon className="w-3.5 h-3.5" style={{ color: "var(--text-tertiary)" }} />
      </div>
      <div
        className="text-xl font-bold font-mono"
        style={{
          color: variant === "profit" ? "var(--bull)" : variant === "loss" ? "var(--bear)" : "var(--text-primary)",
          fontFamily: "'Syne', sans-serif"
        }}
      >
        {value}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { bridgeUrl } = useBridgeUrl();
  const { trades, analytics, loading, error, refresh } = useCsvTrades();
  const { positions, loading: rootPosLoading } = usePositions();
  const [mt5Data, setMt5Data] = useState<{
    connected?: boolean;
    balance?: number;
    equity?: number;
    profit?: number;
    margin_level?: number;
  } | null>(null);

  // Fetch MT5 account data
  useEffect(() => {
    const fetchMt5Account = async () => {
      try {
        const res = await fetchWithAuth(`${bridgeUrl}/api/account`);
        if (res.ok) {
          const data = await res.json();
          setMt5Data({
            connected: data.login != null,
            balance: data.balance ?? 0,
            equity: data.equity ?? data.balance ?? 0,
            profit: data.profit ?? 0,
            margin_level: data.margin_level > 0 ? data.margin_level : null
          });
        }
      } catch (e) {
        console.error("Failed to fetch MT5 account:", e);
        setMt5Data({ connected: false });
      }
    };
    fetchMt5Account();
    const int = setInterval(fetchMt5Account, 5000);
    return () => clearInterval(int);
  }, [bridgeUrl]);

  // Dashboard Stats
  const [dashboardStats, setDashboardStats] = useState<{
    winRate: number;
    profitFactor: number;
    maxDrawdown: number;
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

  // Live Chart State
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const [selectedPair, setSelectedPair] = useState("XAUUSD");
  const [selectedTimeframe, setSelectedTimeframe] = useState("H1");
  const [livePrice, setLivePrice] = useState<number | null>(null);
  const [liveCandles, setLiveCandles] = useState<{ time: number; open: number; high: number; low: number; close: number }[]>([]);
  const [technicals, setTechnicals] = useState<{ rsi: number | null; ema50: number | null; atr: number | null; sma50: number | null } | null>(null);
  const [tradeDirection, setTradeDirection] = useState<"buy" | "sell" | null>(null);
  const [rrRatio, setRrRatio] = useState<number | null>(2.0);
  const [slPrice, setSlPrice] = useState<number | null>(null);
  const [tpPrice, setTpPrice] = useState<number | null>(null);
  const [showChecklist, setShowChecklist] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "analytics" | "macro" | "risk">("overview");

  const PAIRS = ["XAUUSD", "XAGUSD", "EURUSD", "GBPUSD", "USDJPY", "USDCHF", "AUDUSD", "USDCAD"];
  const TIMEFRAMES = ["1m", "5m", "15m", "1h", "4h", "D"];

  // Fetch technicals for SetupScorer
  useEffect(() => {
    const fetchTechnicals = async () => {
      try {
        const res = await fetchWithAuth(`${bridgeUrl}/api/technicals?symbol=${selectedPair}`);
        if (res.ok) {
          const data = await res.json();
          setTechnicals({
            rsi: data.rsi ?? null,
            ema50: data.ema50 ?? null,
            atr: data.atr ?? null,
            sma50: data.sma50 ?? null
          });
        }
      } catch (e) {
        console.error("Failed to fetch technicals:", e);
      }
    };
    fetchTechnicals();
    const int = setInterval(fetchTechnicals, 10000);
    return () => clearInterval(int);
  }, [selectedPair, bridgeUrl]);

  // Live candle streaming - poll every 5 seconds
  useEffect(() => {
    const fetchCandles = async () => {
      try {
        const res = await fetchWithAuth(
          `${bridgeUrl}/api/candles?symbol=${selectedPair}&timeframe=${selectedTimeframe}&count=200`
        );
        if (res.ok) {
          const data = await res.json();
          if (data.candles && Array.isArray(data.candles)) {
            setLiveCandles(data.candles);
            if (data.candles.length > 0) {
              const lastClose = data.candles[data.candles.length - 1].close;
              setLivePrice(lastClose);
            }
          }
        }
      } catch (e) {
        console.error("Failed to fetch candles:", e);
      }
    };
    fetchCandles();
    const int = setInterval(fetchCandles, 5000);
    return () => clearInterval(int);
  }, [selectedPair, selectedTimeframe, bridgeUrl]);

  // Initialize and update live candlestick chart
  useEffect(() => {
    if (!chartContainerRef.current) return;
    
    if (!chartRef.current) {
      chartRef.current = createChart(chartContainerRef.current, {
        width: chartContainerRef.current.clientWidth,
        height: 300,
        layout: { background: { type: "solid" as any, color: "transparent" }, textColor: "#8e9196" },
        grid: { vertLines: { color: "rgba(255,255,255,0.03)" }, horzLines: { color: "rgba(255,255,255,0.03)" } },
        timeScale: { timeVisible: true, secondsVisible: false, borderColor: "rgba(255,255,255,0.1)", rightOffset: 15 },
        rightPriceScale: { borderColor: "rgba(255,255,255,0.1)", scaleMargins: { top: 0.1, bottom: 0.1 } },
        crosshair: { mode: 0 },
      });
      candleSeriesRef.current = chartRef.current.addCandlestickSeries({
        upColor: "#00d4a1", downColor: "#ff4d6a", borderVisible: false,
        wickUpColor: "#00d4a1", wickDownColor: "#ff4d6a",
      });
    }

    if (liveCandles.length > 0 && candleSeriesRef.current) {
      candleSeriesRef.current.setData(
        liveCandles.map((c) => ({ time: c.time as unknown as Time, open: c.open, high: c.high, low: c.low, close: c.close }))
      );
      chartRef.current.timeScale().fitContent();
    }

    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({ width: chartContainerRef.current.clientWidth, height: 300 });
      }
    };
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
        candleSeriesRef.current = null;
      }
    };
  }, [liveCandles]);

  const [nextNewsTimeLeft, setNextNewsTimeLeft] = useState<number | null>(null);
  const [nextNewsEventName, setNextNewsEventName] = useState<string | null>(null);

  // Fetch next high-impact news event
  useEffect(() => {
    const fetchNextNews = async () => {
      try {
        const res = await fetchWithAuth(`${getBackendUrl()}/api/bridge/api/news/next-high-impact`);
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            setNextNewsEventName(data.event);
            setNextNewsTimeLeft(Math.floor(data.time_left_seconds));
          } else {
            setNextNewsEventName(null);
            setNextNewsTimeLeft(null);
          }
        }
      } catch (e) {
        console.error("Failed to fetch next high impact news:", e);
      }
    };
    fetchNextNews();
    const int = setInterval(fetchNextNews, 60000); // Poll every minute
    return () => clearInterval(int);
  }, []);

  useEffect(() => {
    if (nextNewsTimeLeft === null || nextNewsTimeLeft <= 0) return;
    const timer = setInterval(() => {
      setNextNewsTimeLeft(prev => (prev && prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [nextNewsTimeLeft]);

  // Calculate minutes until next high-impact news event
  const nextNewsMinutes = useMemo(() => {
    if (nextNewsTimeLeft === null || nextNewsTimeLeft <= 0) return null;
    return Math.round(nextNewsTimeLeft / 60);
  }, [nextNewsTimeLeft]);

  // Save score to localStorage (called when trade is placed)
  const saveSetupScore = useCallback((direction: "buy" | "sell", score: number) => {
    try {
      const existing = JSON.parse(localStorage.getItem("setup_scores") || "[]");
      existing.push({
        pair: selectedPair,
        direction,
        score,
        rrRatio,
        price: livePrice,
        timestamp: new Date().toISOString(),
        timeframe: selectedTimeframe
      });
      localStorage.setItem("setup_scores", JSON.stringify(existing.slice(-500)));
    } catch (e) {
      console.error("Failed to save setup score:", e);
    }
  }, [selectedPair, livePrice, rrRatio, selectedTimeframe]);
  const metrics = useMemo(() => {
    if (analytics) return analytics;
    return {
      totalTrades: 0,
      winningTrades: 0,
      losingTrades: 0,
      breakEvenTrades: 0,
      winRate: 0,
      totalProfit: 0,
      profitFactor: 0,
      avgWin: 0,
      avgLoss: 0,
      bestTrade: 0,
      worstTrade: 0,
    };
  }, [analytics]);

  // Recent 8 trades
  const recentTrades = useMemo(() => {
    return [...trades]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 8);
  }, [trades]);

  // Equity curve from CSV trades
  const equityCurve = useMemo(() => {
    const sorted = [...trades].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );
    let balance = 0;
    return sorted.slice(-30).map((t) => {
      balance += t.profit;
      return {
        date: new Date(t.date).toLocaleDateString(),
        balance: Math.round(balance * 100) / 100,
      };
    });
  }, [trades]);

  // Strategy/symbol stats
  const strategyStats = useMemo(() => {
    const map = new Map<string, { pnl: number; trades: number; wins: number }>();
    for (const t of trades) {
      const key = t.pair;
      if (!map.has(key)) map.set(key, { pnl: 0, trades: 0, wins: 0 });
      const s = map.get(key)!;
      s.pnl += t.profit;
      s.trades++;
      if (t.profit > 0) s.wins++;
    }
    return Array.from(map.entries())
      .map(([name, s]) => ({ name, pnl: s.pnl, trades: s.trades, winRate: (s.wins / s.trades) * 100 }))
      .sort((a, b) => Math.abs(b.pnl) - Math.abs(a.pnl))
      .slice(0, 8);
  }, [trades]);

  // Compute setup score from technicals + news
  const computedSetupScore = useMemo(() => {
    let score = 0, max = 0;
    if (technicals?.rsi != null) { max += 1; score += (technicals.rsi >= 30 && technicals.rsi <= 70) ? 1 : 0; }
    if (nextNewsMinutes != null) { max += 2; score += (nextNewsMinutes > 120) ? 2 : 0; }
    if (livePrice != null && technicals?.ema50 != null) { max += 2; const aligned = tradeDirection === "buy" ? livePrice > technicals.ema50 : livePrice < technicals.ema50; score += aligned ? 2 : 0; }
    const h = new Date().getUTCHours(); const sessionActive = (h >= 8 && h < 17) || (h >= 13 && h < 22);
    if (sessionActive) { max += 2; score += 2; }
    return max > 0 ? Math.round((score / max) * 10) : 5;
  }, [technicals, nextNewsMinutes, livePrice, tradeDirection]);

  return (
    <div className="space-y-8 animate-fade-in pb-20 max-w-[1600px] mx-auto">
      
      {/* ── HEADER / WELCOME ── */}
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight" style={{ fontFamily: "'Syne', sans-serif", color: "var(--accent)" }}>
            {(() => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'; })()}, Trader.
          </h1>
          <p className="text-sm mt-1 flex items-center gap-2" style={{ color: "var(--text-secondary)" }}>
            <Sparkles className="w-4 h-4" style={{ color: "var(--accent)" }} />
            Your personal trading command center
          </p>
        </div>
        
        <div className="flex-1 w-full xl:w-auto xl:max-w-3xl">
          <SessionTimeline />
        </div>
      </div>

      {/* ── TAB NAVIGATION ── */}
      <div className="flex flex-wrap items-center justify-between gap-4 sticky top-4 z-50">
        <div className="flex flex-wrap items-center gap-2 p-1.5 bg-[#0c0c0d]/80 border border-white/5 rounded-xl w-fit backdrop-blur-md shadow-lg">
          {[
            { id: "overview", label: "Overview", icon: Activity },
            { id: "analytics", label: "Analytics", icon: BarChart3 },
            { id: "macro", label: "Macro & AI", icon: Globe },
            { id: "risk", label: "Risk & Execution", icon: Target }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-bold text-sm transition-all duration-300 ${
                  isActive 
                    ? "bg-white/10 text-white shadow-[0_0_15px_rgba(255,255,255,0.05)]" 
                    : "text-gray-400 hover:text-gray-200 hover:bg-white/5"
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
        
        <button 
          onClick={async () => {
            try {
              const res = await fetchWithAuth("/api/trades/sync", { method: "POST" });
              const data = await res.json();
              if (data.success) {
                await refresh();
              } else {
                console.error(`Failed to sync: ${data.error}`);
              }
            } catch (err) {
              console.error("Error syncing trades", err);
            }
          }}
          className="flex items-center gap-2 px-6 py-2.5 rounded-lg font-bold text-sm bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 border border-blue-500/30 transition-all shadow-lg backdrop-blur-md cursor-pointer"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 21v-5h5"/></svg>
          Sync MT5 Trades
        </button>
      </div>

      {/* ── TAB CONTENT ── */}
      <div className="min-h-[800px] relative mt-8">
        
        {nextNewsMinutes !== null && nextNewsMinutes <= 15 && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }} 
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 rounded-xl border flex items-center gap-3 bg-red-950/40 border-red-500/50 text-red-200 shadow-[0_0_20px_rgba(239,68,68,0.1)]"
          >
            <AlertTriangle className="text-red-400 animate-pulse flex-shrink-0" size={20} />
            <div className="flex-1 text-sm font-bold">
              <span className="text-red-400 uppercase tracking-wide mr-1.5 font-extrabold">[NEWS RISK WARNING]</span>
              High impact news event <span className="underline font-extrabold text-white">"{nextNewsEventName}"</span> is releasing in <span className="font-mono text-white text-base bg-red-500/20 px-2 py-0.5 rounded font-black">{nextNewsMinutes} minutes</span>. High slippage/liquidation hazard. Stand aside or protect positions!
            </div>
          </motion.div>
        )}

        {/* OVERVIEW TAB */}
        {activeTab === "overview" && (
          <div className="space-y-8 animate-fade-up">
            <MarketHeatmapWidget />
            {/* Account Pulse */}
            <div>
               <div className="flex items-center gap-3 mb-4">
                  <Target className="w-5 h-5 text-gray-400" />
                  <h2 className="text-lg font-semibold text-gray-200">Account Pulse <span className="text-xs text-gray-500 font-normal block">Live execution metrics</span></h2>
               </div>
               <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                 <div className="p-4 bg-[#0c0c0d]/90 border border-white/5 rounded-xl shadow-lg relative overflow-hidden group hover:border-blue-500/30 transition-colors">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 blur-[20px] rounded-full pointer-events-none"></div>
                    <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider relative z-10 flex items-center justify-between">
                      Balance <span className={`w-2 h-2 rounded-full ${mt5Data?.connected ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)] animate-pulse" : "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]"}`}></span>
                    </div>
                    <div className="relative z-10 mt-3 text-2xl font-bold font-mono text-white">${mt5Data?.connected && mt5Data?.balance != null ? mt5Data.balance.toFixed(2) : "—"}</div>
                 </div>

                 <div className="p-4 bg-[#0c0c0d]/90 border border-white/5 rounded-xl shadow-lg relative overflow-hidden group hover:border-green-500/30 transition-colors">
                     <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider z-10 relative">Floating P&L</div>
                     <div className="mt-3 relative z-10 flex items-baseline gap-2">
                       {mt5Data?.connected ? (
                         <>
                           <span className={`text-2xl font-bold font-mono ${(mt5Data?.profit ?? 0) >= 0 ? 'text-[#00dc82]' : 'text-red-400'}`}>
                             {(mt5Data?.profit ?? 0) >= 0 ? '+' : ''}${(mt5Data?.profit ?? 0).toFixed(2)}
                           </span>
                           {mt5Data?.balance && mt5Data.balance > 0 && (
                             <span className={`text-[11px] font-mono ${(mt5Data?.profit ?? 0) >= 0 ? 'text-[#00dc82]/70' : 'text-red-400/70'}`}>
                               {(((mt5Data.profit ?? 0) / mt5Data.balance) * 100).toFixed(2)}%
                             </span>
                           )}
                         </>
                       ) : (
                         <span className="text-xl font-bold font-mono text-gray-500">—</span>
                       )}
                     </div>
                  </div>

                 <div className="p-4 bg-[#0c0c0d]/90 border border-white/5 rounded-xl shadow-lg group hover:border-yellow-500/30 transition-colors">
                   <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Margin Level</div>
                   <div className="mt-3 text-2xl font-bold font-mono text-white">
                     {mt5Data?.connected && mt5Data?.margin_level != null
                       ? `${mt5Data.margin_level.toFixed(1)}%`
                       : <span className="text-gray-500">—</span>}
                   </div>
                 </div>

                 <div className="p-4 bg-[#0c0c0d]/90 border border-white/5 rounded-xl shadow-lg group hover:border-red-500/30 transition-colors">
                   <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Drawdown (Eq-Bal)</div>
                   <div className="mt-3 flex items-center justify-between font-mono">
                     {mt5Data?.connected && mt5Data?.balance && mt5Data?.equity != null ? (
                       <>
                         <span className={`text-2xl font-bold ${((mt5Data.balance - mt5Data.equity) / mt5Data.balance * 100) > 3 ? 'text-red-400' : 'text-white'}`}>
                           {((mt5Data.balance - mt5Data.equity) / mt5Data.balance * 100).toFixed(2)}%
                         </span>
                         <span className="text-gray-500 text-xs">/ 10%</span>
                       </>
                     ) : (
                       <span className="text-2xl font-bold text-gray-500">—</span>
                     )}
                   </div>
                 </div>

                 <div className="p-4 bg-[#0c0c0d]/90 border border-white/5 rounded-xl flex items-center gap-4 shadow-lg group hover:border-white/20 transition-colors">
                    <div className="w-14 h-14 relative flex-shrink-0">
                      <ResponsiveContainer width="100%" height="100%">
                         <PieChart><Pie data={[{name: 'W', value: metrics.winningTrades || 1, fill: '#00dc82'}, {name: 'L', value: metrics.losingTrades || 0, fill: '#ef4444'}]} dataKey="value" startAngle={90} endAngle={-270} innerRadius="70%" outerRadius="100%" stroke="none"/></PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex flex-col">
                       <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Win Rate</span>
                       <span className="text-xl font-bold font-mono text-white">{metrics.winRate.toFixed(0)}%</span>
                    </div>
                 </div>
               </div>
            </div>

            {/* Live Chart & Playbook */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-9 rounded-xl border p-4 bg-[#0c0c0d]/90 backdrop-blur" style={{ borderColor: "var(--border)" }}>
              <div className="flex flex-wrap gap-4 items-center justify-between mb-4">
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-[#00dc82]" />
                    <span className="text-xs font-bold uppercase tracking-wider text-gray-200">Live Chart</span>
                    <div className={`w-2 h-2 rounded-full ${livePrice !== null ? "bg-[#00dc82] animate-pulse" : "bg-yellow-500"}`} />
                  </div>
                  <select
                    value={selectedPair}
                    onChange={(e) => setSelectedPair(e.target.value)}
                    className="bg-[#18181b] border border-white/10 rounded-lg px-3 py-1.5 text-xs font-bold outline-none text-white focus:border-[#00dc82]/50 transition-colors"
                  >
                    {PAIRS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                  <div className="flex gap-1 p-1 bg-[#18181b] rounded-lg border border-white/5">
                    {TIMEFRAMES.map(tf => (
                      <button
                        key={tf}
                        onClick={() => setSelectedTimeframe(tf)}
                        className={`px-2 py-1 rounded text-[10px] font-bold uppercase transition-colors ${
                          selectedTimeframe === tf
                            ? "bg-[#00dc82] text-black"
                            : "text-gray-400 hover:text-white"
                        }`}
                      >
                        {tf}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 p-1 bg-[#18181b] rounded-lg border border-white/5">
                    <button
                      onClick={() => setTradeDirection("buy")}
                      className={`px-4 py-1 rounded text-xs font-bold uppercase transition-all ${
                        tradeDirection === "buy"
                          ? "bg-[#00dc82] text-black shadow-[0_0_10px_rgba(0,220,130,0.3)]"
                          : "text-gray-400 hover:text-white"
                      }`}
                    >
                      Buy
                    </button>
                    <button
                      onClick={() => setTradeDirection("sell")}
                      className={`px-4 py-1 rounded text-xs font-bold uppercase transition-all ${
                        tradeDirection === "sell"
                          ? "bg-[#ff4d6a] text-white shadow-[0_0_10px_rgba(255,77,106,0.3)]"
                          : "text-gray-400 hover:text-white"
                      }`}
                    >
                      Sell
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {typeof livePrice === 'number' && (
                    <span className="text-xl font-mono font-bold text-white tracking-tight">
                      {livePrice.toFixed(getPairDigits(selectedPair))}
                    </span>
                  )}
                  <button
                    onClick={() => setShowChecklist(true)}
                    disabled={!tradeDirection || !livePrice}
                    className="px-5 py-2 rounded-lg text-xs font-bold uppercase bg-white text-black hover:bg-gray-200 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    Trade
                  </button>
                </div>
              </div>
              <div ref={chartContainerRef} className="h-[400px] w-full" />
              </div>
              <div className="lg:col-span-3 h-full">
                 <DailyBiasWidget />
              </div>
            </div>

            {/* Positions & Recent Trades */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
               <div className="lg:col-span-12 h-[450px]">
                  <OpenPositionsList positions={positions} loading={rootPosLoading} />
               </div>
            </div>
            
            <div className="w-full max-w-full">
              <RecentTradesTable trades={trades} loading={loading} onTradeUpdated={refresh} />
            </div>
          </div>
        )}

        {/* ANALYTICS TAB */}
        {activeTab === "analytics" && (
          <div className="space-y-8 animate-fade-up">
            <PerformanceSummaryWidget trades={trades} />
            
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
               <div className="lg:col-span-8 h-[350px]">
                 <TradeDurationScatterPlot trades={trades} />
               </div>
               <div className="lg:col-span-4 h-[350px]">
                 <AiCoachWidget />
               </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
               <div className="lg:col-span-6 h-[400px]">
                  <EquityCurveChart data={equityCurve} loading={loading} />
               </div>
               <div className="lg:col-span-6 h-[400px]">
                  <StrategyPerformance data={strategyStats} loading={loading} />
               </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
               <div className="lg:col-span-5 h-[320px]">
                  <DrawdownVisualization trades={trades} />
               </div>
               <div className="lg:col-span-7">
                  <SessionPerformanceGrid trades={trades} />
               </div>
            </div>

            <MonthlyPerformanceGrid trades={trades} />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
               <div className="lg:col-span-8 h-[500px]">
                  <RecentTradesTable trades={trades} loading={loading} />
               </div>
               <div className="lg:col-span-4 h-[500px]">
                  <CapitalFlow data={dashboardStats?.capitalFlow || []} loading={!dashboardStats} />
               </div>
            </div>
          </div>
        )}

        {/* MACRO & AI TAB */}
        {activeTab === "macro" && (
          <div className="space-y-8 animate-fade-up">

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
               <div className="lg:col-span-4 h-[240px]">
                  <NewsCountdownWidget />
               </div>
               <div className="lg:col-span-4 h-[240px]">
                  <RetailSentimentGauge />
               </div>
               <div className="lg:col-span-4 h-[240px]">
                  <SessionKillzones trades={trades} />
               </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
               <ConditionMeter type="flow" />
               <ConditionMeter type="bearing" />
               <ConditionMeter type="pulse" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
               <div className="lg:col-span-8 flex flex-col gap-4">
                  <AIMacroDeskSection />
               </div>
               <div className="lg:col-span-4 flex flex-col gap-4">
                  <div className="bg-[#0c0c0d]/90 border border-white/5 rounded-xl p-5 shadow-2xl backdrop-blur">
                     <div className="flex justify-between items-center mb-4">
                       <div className="flex items-center gap-2">
                          <div className="p-1 bg-white/10 rounded"><BarChart3 className="w-4 h-4 text-white"/></div>
                          <span className="font-bold text-white tracking-wide">For You</span>
                       </div>
                       <div className="flex items-center gap-3 text-xs">
                          <span className="text-gray-500 font-mono">{new Date().toLocaleDateString("en-US", { weekday: "short", day: "numeric", month: "short" })}</span>
                       </div>
                     </div>
                     
                     <h3 className="text-sm font-bold text-white leading-snug mb-3">
                       Dollar softens into London as Copper drags the metals complex
                     </h3>
                     <p className="text-xs text-gray-400 leading-relaxed font-medium">
                       The Dollar is seeing some early pressure with a -16 flow score, though Copper is the real outlier this morning, sliding toward a 23rd percentile low (z=-0.42) that signals some underlying nerves. While the London open shows a slight risk appetite for the Dow Jones and Nasdaq 100, our Macro Desk remains cautious.
                     </p>
                     <button className="text-[#00dc82] hover:text-[#00c574] text-xs font-bold mt-2 hover:underline">Read more</button>
                  </div>
               </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
               <div className="lg:col-span-7">
                  <CorrelationMatrix 
                    openPositions={positions.map(p => ({ pair: p.pair, direction: (p.direction === "Long" ? "buy" : "sell") as "buy" | "sell" }))} 
                  />
               </div>
               <div className="lg:col-span-5 h-[450px]">
                  <EconomicNewsTicker />
               </div>
            </div>
          </div>
        )}

        {/* RISK & EXECUTION TAB */}
        {activeTab === "risk" && (
          <div className="space-y-8 animate-fade-up">
            
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-6 h-[250px]">
                 <TiltMonitorWidget trades={trades} />
              </div>
              <div className="lg:col-span-6 h-[250px]">
                 <VisualPositionSizer balance={mt5Data?.balance} />
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-8 h-[560px]">
                 <DailyRiskWidget
                   trades={trades}
                   balance={mt5Data?.balance}
                   equity={mt5Data?.equity}
                   maxDailyDrawdownPct={5}
                   maxTotalDrawdownPct={10}
                 />
              </div>
              <div className="lg:col-span-4 flex flex-col gap-6">
                 <DisciplineScoreWidget trades={trades} />
                 <SetupScorer
                   currentRSI={technicals?.rsi ?? null}
                   currentATR={technicals?.atr ?? null}
                   avgATR={(technicals?.atr ?? 0.001) * 1.2}
                   currentSpread={15}
                   avgSpread={12}
                   rrRatio={rrRatio}
                   nextNewsMinutes={nextNewsMinutes}
                   livePrice={livePrice}
                   sma50={technicals?.sma50 ?? technicals?.ema50 ?? null}
                   tradeDirection={tradeDirection}
                 />
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
               <div className="lg:col-span-6 h-[560px]">
                  <QuickTradeEntry />
               </div>
               <div className="lg:col-span-6 h-[560px]">
                  <AlertsWidget
                    trades={trades}
                    positions={positions}
                    mt5Connected={mt5Data?.connected}
                    balance={mt5Data?.balance}
                    equity={mt5Data?.equity}
                    maxDailyDrawdownPct={5}
                  />
               </div>
            </div>
          </div>
        )}

      </div>

      {/* Pre-Trade Checklist Modal */}
      <PreTradeChecklist
        isOpen={showChecklist}
        onClose={() => setShowChecklist(false)}
        onConfirm={(override) => {
          setShowChecklist(false);
          const score = override ? 3 : computedSetupScore;
          saveSetupScore(tradeDirection || "buy", score);
        }}
        pair={selectedPair}
        direction={tradeDirection || "buy"}
        price={livePrice}
        sl={slPrice}
        tp={tpPrice}
        nextNewsMinutes={nextNewsMinutes}
        setupScore={computedSetupScore}
      />
    </div>
  );
}
