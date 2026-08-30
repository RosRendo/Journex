"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { toast } from "sonner";
import {
  RefreshCw,
  Play,
  Square,
  TrendingUp,
  TrendingDown,
  DollarSign,
  AlertCircle,
  Activity,
  Target,
  Zap,
  Clock,
  SlidersHorizontal,
  Coins,
  TrendingUp as TrendingUpIcon,
  Info,
  BarChart3,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  ReferenceLine, CartesianGrid
} from "recharts";
import ServiceError from "@/components/ServiceError";
import {
  fetchWithRetry,
  checkMT5Connection,
  getServiceErrorMessage,
} from "@/utils/serviceStatus";
import { fetchWithAuth } from "@/lib/utils";

// --- PAIR METRICS CONFIG ---
interface CurrencyPair {
  name: string;
  pipValue: number;
}

const pairsList: Record<number, CurrencyPair> = {
  1: { name: "EUR/USD", pipValue: 1 },
  2: { name: "GBP/USD", pipValue: 1 },
  3: { name: "USD/JPY", pipValue: 0.91 },
  4: { name: "AUD/USD", pipValue: 1 },
  5: { name: "USD/CHF", pipValue: 1.87 },
  6: { name: "NZD/USD", pipValue: 1 },
  7: { name: "XAU/USD (Gold)", pipValue: 10 },
  8: { name: "GBP/JPY", pipValue: 0.91 },
  9: { name: "EUR/JPY", pipValue: 0.91 },
  10: { name: "USD/CAD", pipValue: 1 },
};

const pipData = {
  high: {
    XAUUSD: { "1m": 20, "5m": 50, "15m": 120, "30m": 200, "1h": 350, "4h": 800 },
    EURUSD: { "1m": 2, "5m": 5, "15m": 12, "30m": 20, "1h": 35, "4h": 80 },
    GBPUSD: { "1m": 3, "5m": 7, "15m": 15, "30m": 25, "1h": 45, "4h": 100 },
    USDJPY: { "1m": 3, "5m": 6, "15m": 13, "30m": 22, "1h": 40, "4h": 85 },
    AUDUSD: { "1m": 2, "5m": 5, "15m": 11, "30m": 18, "1h": 32, "4h": 75 },
    USDCAD: { "1m": 2, "5m": 5, "15m": 11, "30m": 19, "1h": 33, "4h": 70 },
    NZDUSD: { "1m": 2, "5m": 5, "15m": 10, "30m": 17, "1h": 30, "4h": 70 },
    USDCHF: { "1m": 2, "5m": 5, "15m": 11, "30m": 19, "1h": 33, "4h": 75 },
    EURJPY: { "1m": 3, "5m": 7, "15m": 16, "30m": 27, "1h": 48, "4h": 110 },
    GBPJPY: { "1m": 4, "5m": 9, "15m": 20, "30m": 35, "1h": 60, "4h": 140 },
    EURGBP: { "1m": 1, "5m": 3, "15m": 8, "30m": 14, "1h": 25, "4h": 60 },
  },
  low: {
    XAUUSD: { "1m": 8, "5m": 20, "15m": 50, "30m": 80, "1h": 140, "4h": 350 },
    EURUSD: { "1m": 1, "5m": 2, "15m": 5, "30m": 8, "1h": 15, "4h": 35 },
    GBPUSD: { "1m": 1, "5m": 3, "15m": 6, "30m": 10, "1h": 18, "4h": 45 },
    USDJPY: { "1m": 1, "5m": 3, "15m": 6, "30m": 10, "1h": 17, "4h": 40 },
    AUDUSD: { "1m": 1, "5m": 2, "15m": 5, "30m": 8, "1h": 14, "4h": 32 },
    USDCAD: { "1m": 1, "5m": 2, "15m": 5, "30m": 8, "1h": 14, "4h": 30 },
    NZDUSD: { "1m": 1, "5m": 2, "15m": 4, "30m": 7, "1h": 12, "4h": 30 },
    USDCHF: { "1m": 1, "5m": 2, "15m": 5, "30m": 8, "1h": 14, "4h": 32 },
    EURJPY: { "1m": 1, "5m": 3, "15m": 7, "30m": 11, "1h": 20, "4h": 50 },
    GBPJPY: { "1m": 2, "5m": 4, "15m": 9, "30m": 15, "1h": 25, "4h": 65 },
    EURGBP: { "1m": 1, "5m": 2, "15m": 4, "30m": 6, "1h": 11, "4h": 25 },
  },
} as const;

const tradingStyles = {
  scalping: { timeframes: ["1m", "5m"], typical_tp: "5-15 pips", typical_sl: "5-10 pips", rr_ratio: "1:1 to 1:2", trades_per_day: "10-50+", best_session: "London/NY overlap" },
  day: { timeframes: ["5m", "15m", "30m", "1h"], typical_tp: "20-50 pips", typical_sl: "15-30 pips", rr_ratio: "1:1.5 to 1:3", trades_per_day: "2-8", best_session: "London or NY" },
  swing: { timeframes: ["1h", "4h"], typical_tp: "50-200 pips", typical_sl: "30-80 pips", rr_ratio: "1:2 to 1:4", trades_per_day: "0-2", best_session: "Any (holds overnight)" },
};

const insights = [
  { icon: Info, color: "text-cyan-400", bg: "bg-cyan-500/10 border-cyan-500/20", title: "TP/SL Setting Guidelines", items: ["Take Profit: Aim for 50-80% of average timeframe movement", "Stop Loss: Set at 100-150% of average movement (wider than TP)", "Risk:Reward: Minimum 1:1.5, ideally 1:2 or better", "Greed Control: Take profit when you hit 60-70% of target if price stalls"] },
  { icon: AlertCircle, color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20", title: "Volatility Considerations", items: ["JPY pairs (USDJPY, EURJPY, GBPJPY): Most volatile, wider stops needed", "GBPJPY: Highest volatility - can move 4+ pips per minute", "EURGBP: Lowest volatility - tighter targets work better", "News releases: Movement can be 3-10x normal, avoid or widen stops"] },
  { icon: Clock, color: "text-[#20e0b2]", bg: "bg-[#20e0b2]/10 border-[#20e0b2]/20", title: "Session-Based Strategy", items: ["London (8:00-12:00 GMT): Best for EUR, GBP pairs", "NY (13:00-17:00 GMT): Best for USD pairs - strong trends", "London/NY Overlap (13:00-16:00 GMT): Highest volume, best for scalping", "Asian (23:00-8:00 GMT): Lower volume, range-bound trading"] },
  { icon: AlertCircle, color: "text-violet-400", bg: "bg-violet-500/10 border-violet-500/20", title: "Avoiding Greed & Reversals", items: ["Scale out: Take 50% profit at 1:1.5 RR, let rest run to full TP", "Move SL to breakeven: Once price moves 50% to TP", "Watch key levels: Previous high/low, round numbers, S/R", "Time-based exit: If trade hasn't moved in 2-3 candles, consider closing"] },
];

const MT5_API = process.env.NEXT_PUBLIC_BRIDGE_URL || "/api/bridge";

export default function CalculatorSuite() {
  const [activeTab, setActiveTab] = useState<"live_risk" | "sizer" | "pip_movement" | "expectancy">("live_risk");

  return (
    <div className="min-h-screen w-full bg-[#09090b] text-[#f4f4f5] flex flex-col pb-12 font-sans">

      {/* ── TOPBAR ── */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-[rgba(255,255,255,0.07)] sticky top-0 z-20 bg-[#09090b]">
        <div>
          <h1 className="text-sm font-bold tracking-tight text-[#f4f4f5]">Calculators Suite</h1>
          <p className="text-[9px] font-bold uppercase tracking-widest font-mono text-[#71717a] mt-0.5">Live risk · Position sizer · Pip movement · Expectancy</p>
        </div>
        <div className="flex gap-0 border-l border-[rgba(255,255,255,0.07)]">
          {(["live_risk", "sizer", "pip_movement", "expectancy"] as const).map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`py-3 px-4 text-[9px] uppercase tracking-widest font-bold font-mono transition-all border-b-2 whitespace-nowrap ${
                activeTab === tab ? "border-[#20e0b2] text-[#20e0b2]" : "border-transparent text-[#71717a] hover:text-[#a1a1aa]"
              }`}>
              {tab === "live_risk" ? "Live Risk" : tab === "sizer" ? "Sizer" : tab === "pip_movement" ? "Pips" : "Expectancy"}
            </button>
          ))}
        </div>
      </div>

      {/* ── WORKSPACE ── */}
      <div className="flex-1 w-full">
        {activeTab === "live_risk" && <LiveRiskTable />}
        {activeTab === "sizer" && <PositionSizer />}
        {activeTab === "pip_movement" && <PipMovement />}
        {activeTab === "expectancy" && <ExpectancySimulator />}
      </div>
    </div>
  );
}

// ── SUB-COMPONENT 1: LIVE RISK TABLE ──
interface Calculation {
  symbol: string;
  current_price: number;
  spread: number;
  atr: number;
  lot_size: number;
  tp_pips: number;
  sl_pips: number;
  rr_ratio: number;
  risk_amount: number;
  potential_profit: number;
  buy: { tp: number; sl: number };
  sell: { tp: number; sl: number };
  timestamp: string;
}

interface DashboardData {
  calculations: Calculation[];
  last_update: string | null;
  balance: number;
  risk_percent: number;
  is_running: boolean;
}

function LiveRiskTable() {
  const [data, setData] = useState<DashboardData>({
    calculations: [],
    last_update: null,
    balance: 10000,
    risk_percent: 1.0,
    is_running: false,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [serviceError, setServiceError] = useState<string | null>(null);
  const [mtConnected, setMtConnected] = useState(true);

  // Strategy Config
  const [riskPercent, setRiskPercent] = useState(1.0);
  const [rrRatio, setRrRatio] = useState(2.0);
  const [atrMultiplier, setAtrMultiplier] = useState(1.5);

  const fetchMT5Balance = useCallback(async () => {
    try {
      const response = await fetchWithRetry(`${MT5_API}/health`, { headers: { "ngrok-skip-browser-warning": "true" } }, 2, 500);
      const accountData = await response.json();
      if (accountData.balance) {
        setData((prev) => ({ ...prev, balance: accountData.balance }));
      }
    } catch (error) {
      console.log("Could not fetch MT5 balance:", error);
    }
  }, []);

  const fetchData = useCallback(
    async (showSpinner = false) => {
      if (showSpinner) setIsRefreshing(true);
      try {
        const qs = `?risk_percent=${riskPercent}&rr_ratio=${rrRatio}&atr_sl_multiplier=${atrMultiplier}`;
        const response = await fetchWithRetry(`${MT5_API}/api/calculations${qs}`,
          { headers: { "ngrok-skip-browser-warning": "true" } },
          2,
          500,
        );
        const jsonData = await response.json();
        setData((prev) => ({
          ...prev,
          calculations: jsonData.calculations || [],
          last_update: jsonData.last_update || null,
          balance: jsonData.account_balance || prev.balance,
          risk_percent: jsonData.risk_percent || 1.0,
          is_running: jsonData.is_running ?? true,
        }));
        setServiceError(null);
      } catch (error) {
        console.error("Error fetching data:", error);
        setServiceError((error as Error).message || "Service unavailable");
      } finally {
        if (showSpinner) setIsRefreshing(false);
      }
    },
    [riskPercent, rrRatio, atrMultiplier],
  );

  useEffect(() => {
    checkMT5Connection().then(setMtConnected);
    fetchMT5Balance();
    fetchData();
  }, []);

  useEffect(() => {
    if (!data.is_running) return;
    const interval = setInterval(() => {
      fetchData();
      fetchMT5Balance();
    }, 5000);
    return () => clearInterval(interval);
  }, [data.is_running, fetchData, fetchMT5Balance]);

  const startCalculator = async () => {
    setIsLoading(true);
    try {
      await fetchWithAuth(`${MT5_API}/api/start`, { method: "POST" });
      setData((prev) => ({ ...prev, is_running: true }));
      await fetchData();
    } catch {
      alert("Error: Make sure the Python bridge is running (mt5_bridge.py on port 5003)");
    }
    setIsLoading(false);
  };

  const stopCalculator = async () => {
    setIsLoading(true);
    try {
      await fetchWithAuth(`${MT5_API}/api/stop`, { method: "POST" });
      setData((prev) => ({ ...prev, is_running: false }));
    } catch {
      alert("Error stopping calculator");
    }
    setIsLoading(false);
  };

  const formatNum = (val: any, decimals: number = 2): string => {
    if (val === undefined || val === null || isNaN(val)) {
      return "0." + "0".repeat(decimals);
    }
    return Number(val).toFixed(decimals);
  };

  const executeTrade = async (
    symbol: string,
    direction: "BUY" | "SELL",
    lot_size: number,
    sl: number,
    tp: number,
    rr_ratio: number,
  ) => {
    if (!mtConnected) {
      toast.error("MT5 not connected!");
      return;
    }
    if (lot_size <= 0 || sl <= 0 || tp <= 0) {
      toast.error("Invalid calculation parameters for execution");
      return;
    }
    const toastId = toast.loading(`Sending ${direction} order for ${symbol}...`);
    try {
      const res = await fetchWithAuth(`${MT5_API}/api/execute-trade`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol,
          direction,
          lot_size: parseFloat(lot_size.toFixed(4)),
          sl: parseFloat(sl.toFixed(5)),
          tp: parseFloat(tp.toFixed(5)),
          comment: `RiskTable ${data.risk_percent}% Risk | 1:${rr_ratio.toFixed(1)} RR`,
        }),
      });
      const resData = await res.json();
      if (resData.success) {
        toast.success(
          `✅ Trade executed! Ticket #${resData.ticket} | ${direction} ${lot_size.toFixed(2)} ${symbol} @ ${resData.price || "market"}`,
          { duration: 8000, id: toastId },
        );
      } else {
        toast.error(`❌ ${resData.error}`, { duration: 7000, id: toastId });
      }
    } catch (err) {
      toast.error("Network error — is the MT5 bridge running?", { id: toastId });
    }
  };

  const calculatedRiskAmount = (data.balance * data.risk_percent) / 100;

  if (serviceError) {
    return (
      <ServiceError
        serviceName="Risk Calculator"
        port={5003}
        errorMessage={getServiceErrorMessage(5003, mtConnected)}
        onRetry={() => {
          setServiceError(null);
          setTimeout(fetchData, 1000);
        }}
        mtConnected={mtConnected}
      />
    );
  }

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <div className="flex items-center gap-3 flex-wrap p-4 rounded-lg border border-[rgba(255,255,255,0.07)] bg-[#101014]/80">
        <button
          onClick={startCalculator}
          disabled={isLoading || data.is_running}
          className="flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-bold uppercase tracking-wider bg-[#20e0b2]/20 hover:bg-[#20e0b2]/30 disabled:opacity-40 disabled:cursor-not-allowed text-[#20e0b2] transition-all"
        >
          <Play size={14} /> Start Live
        </button>
        <button
          onClick={stopCalculator}
          disabled={isLoading || !data.is_running}
          className="flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-bold uppercase tracking-wider bg-[#ff5c73]/10 hover:bg-[#ff5c73]/20 disabled:opacity-40 disabled:cursor-not-allowed text-[#ff5c73] transition-all"
        >
          <Square size={14} /> Stop
        </button>
        <button
          onClick={() => fetchData(true)}
          disabled={isRefreshing}
          className="flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-bold uppercase tracking-wider border border-[rgba(255,255,255,0.07)] bg-zinc-900 hover:bg-zinc-800 text-zinc-300 transition-all"
        >
          <RefreshCw size={14} className={isRefreshing ? "animate-spin" : ""} /> Refresh
        </button>

        {data.last_update && (
          <div className="ml-auto flex items-center gap-1.5 text-xs text-zinc-500 font-mono">
            <Clock size={13} /> Updated: {data.last_update}
          </div>
        )}
      </div>

      <div className="rounded-lg border border-[rgba(255,255,255,0.07)] bg-[#101014] p-6 space-y-6 relative overflow-hidden">
        <h2 className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-[#20e0b2]" /> Strategy Parameters
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <div className="flex justify-between text-xs mb-1.5">
              <span className="font-medium text-zinc-400">Risk per Trade (%)</span>
              <span className="font-bold font-mono text-[#20e0b2]">{riskPercent}%</span>
            </div>
            <input type="range" min="0.1" max="10.0" step="0.1" value={riskPercent}
              onChange={(e) => setRiskPercent(parseFloat(e.target.value))} className="w-full accent-[#20e0b2] bg-zinc-800 h-1 rounded" />
          </div>
          <div>
            <div className="flex justify-between text-xs mb-1.5">
              <span className="font-medium text-zinc-400">Target Reward Ratio (1:X)</span>
              <span className="font-bold font-mono text-[#20e0b2]">1:{rrRatio}</span>
            </div>
            <input type="range" min="0.5" max="5.0" step="0.1" value={rrRatio}
              onChange={(e) => setRrRatio(parseFloat(e.target.value))} className="w-full accent-[#20e0b2] bg-zinc-800 h-1 rounded" />
          </div>
          <div>
            <div className="flex justify-between text-xs mb-1.5">
              <span className="font-medium text-zinc-400">ATR SL Multiplier</span>
              <span className="font-bold font-mono text-amber-400">{atrMultiplier}x</span>
            </div>
            <input type="range" min="0.5" max="5.0" step="0.1" value={atrMultiplier}
              onChange={(e) => setAtrMultiplier(parseFloat(e.target.value))} className="w-full accent-amber-400 bg-zinc-800 h-1 rounded" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#101014] border border-[rgba(255,255,255,0.07)] p-4 rounded-xl">
          <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-1 font-mono">Live MT5 Balance</div>
          <div className="text-lg font-black font-mono tracking-tight text-white">${data.balance.toLocaleString()}</div>
        </div>
        <div className="bg-[#101014] border border-[rgba(255,255,255,0.07)] p-4 rounded-xl">
          <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-1 font-mono">Calculated Risk %</div>
          <div className="text-lg font-black font-mono tracking-tight text-[#20e0b2]">{data.risk_percent}%</div>
        </div>
        <div className="bg-[#101014] border border-[rgba(255,255,255,0.07)] p-4 rounded-xl">
          <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-1 font-mono">Risk Amount</div>
          <div className="text-lg font-black font-mono tracking-tight text-[#ff5c73]">${calculatedRiskAmount.toFixed(2)}</div>
        </div>
        <div className="bg-[#101014] border border-[rgba(255,255,255,0.07)] p-4 rounded-xl">
          <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-1 font-mono">Active Symbols</div>
          <div className="text-lg font-black font-mono tracking-tight text-white">{data.calculations.length}</div>
        </div>
      </div>

      {data.calculations.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 rounded-lg border border-dashed border-[rgba(255,255,255,0.07)] bg-[#101014]/40 text-zinc-500">
          <Activity size={40} className="mb-3 opacity-30 animate-pulse" />
          <p className="text-sm font-bold uppercase tracking-wider font-mono">No Live Market Stream</p>
          <p className="text-xs mt-1 font-mono">{data.is_running ? "Connecting to terminal pipeline..." : "Click Start to open terminal links"}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {data.calculations.map((calc) => (
            <div key={calc.symbol} className="rounded-lg border border-[rgba(255,255,255,0.07)] bg-[#101014] overflow-hidden hover:border-[#20e0b2]/40 transition-colors">
              <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-850 bg-black/10">
                <h3 className="text-xs font-black uppercase tracking-wider text-white font-mono">{calc.symbol}</h3>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-zinc-500 font-mono">{formatNum(calc.current_price, 5)}</span>
                  <span className="px-2 py-0.5 rounded-full bg-[#20e0b2]/10 text-[#20e0b2] text-[9px] font-bold border border-[#20e0b2]/20 font-mono">
                    {formatNum(calc.lot_size, 2)} lots
                  </span>
                </div>
              </div>

              <div className="px-5 py-4 space-y-3.5 text-xs">
                <div className="flex gap-4">
                  <div className="flex-1 flex justify-between font-mono">
                    <span className="text-zinc-500">Spread</span>
                    <span className="font-bold text-white">{formatNum(calc.spread ?? 0, 1)} pips</span>
                  </div>
                  <div className="w-px bg-zinc-800" />
                  <div className="flex-1 flex justify-between font-mono">
                    <span className="text-zinc-500">ATR</span>
                    <span className="font-bold text-white">{formatNum(calc.atr ?? 0, 1)} pips</span>
                  </div>
                </div>

                <div className="flex items-center justify-between font-mono">
                  <span className="text-zinc-500">TP / SL pips</span>
                  <div className="flex items-center gap-1.5 text-[10px]">
                    <span className="text-[#20e0b2] font-bold">+{formatNum(calc.tp_pips, 1)}</span>
                    <span className="text-zinc-600">/</span>
                    <span className="text-[#ff5c73] font-bold">-{formatNum(calc.sl_pips, 1)}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between font-mono">
                  <span className="text-zinc-500">R:R Ratio</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    calc.rr_ratio >= 2 ? "bg-[#20e0b2]/10 text-[#20e0b2] border border-[#20e0b2]/20" : "bg-amber-500/10 text-amber-400"
                  }`}>
                    1 : {formatNum(calc.rr_ratio, 2)}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-850">
                  <div className="rounded-lg bg-[#ff5c73]/5 border border-[#ff5c73]/10 p-2 text-center">
                    <div className="text-[8px] text-zinc-500 uppercase tracking-widest font-mono font-bold">Risk</div>
                    <div className="text-xs font-black font-mono text-[#ff5c73]">${formatNum(calc.risk_amount, 2)}</div>
                  </div>
                  <div className="rounded-lg bg-[#20e0b2]/5 border border-[#20e0b2]/10 p-2 text-center">
                    <div className="text-[8px] text-zinc-500 uppercase tracking-widest font-mono font-bold">Profit</div>
                    <div className="text-xs font-black font-mono text-[#20e0b2]">${formatNum(calc.potential_profit ?? calc.tp_pips * 100, 2)}</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5 pt-2">
                  {/* BUY PROFILE */}
                  <div className="space-y-2 rounded-lg bg-[#20e0b2]/5 border border-[#20e0b2]/10 p-2.5 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-1 mb-1">
                        <TrendingUp size={11} className="text-[#20e0b2]" />
                        <span className="text-[8px] font-black uppercase text-[#20e0b2] tracking-widest font-mono">Buy Target</span>
                      </div>
                      <div className="flex justify-between text-[10px] font-mono"><span className="text-zinc-500">TP</span><span className="text-white font-bold">{formatNum(calc.buy?.tp ?? calc.current_price, 5)}</span></div>
                      <div className="flex justify-between text-[10px] font-mono"><span className="text-zinc-500">SL</span><span className="text-white font-bold">{formatNum(calc.buy?.sl ?? calc.current_price, 5)}</span></div>
                    </div>
                    <button
                      onClick={() => executeTrade(calc.symbol, "BUY", calc.lot_size, calc.buy?.sl ?? 0, calc.buy?.tp ?? 0, calc.rr_ratio)}
                      disabled={!mtConnected}
                      className="w-full py-1.5 mt-2 rounded bg-[#20e0b2] hover:bg-[#20e0b2]/80 text-[#101014] text-[10px] font-bold uppercase tracking-wider transition-all disabled:opacity-50"
                    >
                      Buy Market
                    </button>
                  </div>

                  {/* SELL PROFILE */}
                  <div className="space-y-2 rounded-lg bg-[#ff5c73]/5 border border-[#ff5c73]/10 p-2.5 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-1 mb-1">
                        <TrendingDown size={11} className="text-[#ff5c73]" />
                        <span className="text-[8px] font-black uppercase text-[#ff5c73] tracking-widest font-mono">Sell Target</span>
                      </div>
                      <div className="flex justify-between text-[10px] font-mono"><span className="text-zinc-500">TP</span><span className="text-white font-bold">{formatNum(calc.sell?.tp ?? calc.current_price, 5)}</span></div>
                      <div className="flex justify-between text-[10px] font-mono"><span className="text-zinc-500">SL</span><span className="text-white font-bold">{formatNum(calc.sell?.sl ?? calc.current_price, 5)}</span></div>
                    </div>
                    <button
                      onClick={() => executeTrade(calc.symbol, "SELL", calc.lot_size, calc.sell?.sl ?? 0, calc.sell?.tp ?? 0, calc.rr_ratio)}
                      disabled={!mtConnected}
                      className="w-full py-1.5 mt-2 rounded bg-[#ff5c73] hover:bg-[#ff5c73]/85 text-white text-[10px] font-bold uppercase tracking-wider transition-all disabled:opacity-50"
                    >
                      Sell Market
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── SUB-COMPONENT 2: POSITION SIZER ──
function PositionSizer() {
  const [selectedPair, setSelectedPair] = useState<number | null>(null);
  const [riskAmount, setRiskAmount] = useState<string>("15");
  const [stopLossPips, setStopLossPips] = useState<string>("50");
  const [lotSize, setLotSize] = useState<number | null>(null);
  const [error, setError] = useState<string>("");

  const handleCalculate = () => {
    const risk = parseFloat(riskAmount);
    const sl = parseFloat(stopLossPips);

    if (!selectedPair || !pairsList[selectedPair]) {
      setError("Please select a valid currency pair.");
      return;
    }
    if (isNaN(risk) || risk <= 0) {
      setError("Risk amount must be greater than 0.");
      return;
    }
    if (isNaN(sl) || sl <= 0) {
      setError("Stop loss pips must be greater than 0.");
      return;
    }

    const pipValue = pairsList[selectedPair].pipValue;
    const calculatedLot = risk / (pipValue * sl);
    setLotSize(Number(calculatedLot.toFixed(3)));
    setError("");
  };

  return (
    <div className="grid md:grid-cols-2 gap-6 animate-fade-in">
      <div className="bg-[#101014] border border-[rgba(255,255,255,0.07)] rounded-lg p-6 space-y-4 relative overflow-hidden">
        <h2 className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-2">
          <Coins className="text-[#20e0b2]" size={16} /> Position Size Calculator
        </h2>
        <div className="space-y-4 pt-2">
          <div>
            <label className="block text-[9px] uppercase font-bold text-zinc-500 tracking-wider mb-1.5 font-mono">Risk Amount ($)</label>
            <input
              type="number"
              min="0"
              value={riskAmount}
              onChange={(e) => setRiskAmount(e.target.value)}
              placeholder="Enter risk per trade"
              className="w-full rounded-lg border border-[rgba(255,255,255,0.07)] bg-black/20 px-3 py-2 text-white text-xs font-mono focus:outline-none focus:border-[#20e0b2]"
            />
          </div>

          <div>
            <label className="block text-[9px] uppercase font-bold text-zinc-500 tracking-wider mb-1.5 font-mono">Stop Loss (pips)</label>
            <input
              type="number"
              min="0"
              value={stopLossPips}
              onChange={(e) => setStopLossPips(e.target.value)}
              placeholder="Enter stop loss pips"
              className="w-full rounded-lg border border-[rgba(255,255,255,0.07)] bg-black/20 px-3 py-2 text-white text-xs font-mono focus:outline-none focus:border-[#20e0b2]"
            />
          </div>

          <div>
            <label className="block text-[9px] uppercase font-bold text-zinc-500 tracking-wider mb-1.5 font-mono">Currency Pair</label>
            <select
              value={selectedPair ?? ""}
              onChange={(e) => {
                setSelectedPair(Number(e.target.value));
                setLotSize(null);
                setError("");
              }}
              className="w-full rounded-lg border border-[rgba(255,255,255,0.07)] bg-black/20 px-3 py-2 text-white text-xs font-mono focus:outline-none focus:border-[#20e0b2] cursor-pointer"
            >
              <option value="" disabled className="bg-zinc-950">Select a currency pair...</option>
              {Object.entries(pairsList).map(([key, pair]) => (
                <option key={key} value={key} className="bg-zinc-950">
                  {pair.name} (Pip value: ${pair.pipValue})
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleCalculate}
            disabled={!riskAmount || !stopLossPips || !selectedPair}
            className="w-full py-2.5 rounded-lg bg-[#20e0b2] hover:bg-[#20e0b2]/80 disabled:opacity-40 text-[#101014] text-xs font-black uppercase tracking-wider transition-colors mt-2"
          >
            Calculate Sizing
          </button>
        </div>

        {error && (
          <div className="rounded-lg border border-[#ff5c73]/20 bg-[#ff5c73]/10 px-4 py-3 text-[#ff5c73] text-xs font-mono">
            {error}
          </div>
        )}
      </div>

      <div className="flex flex-col justify-center">
        {lotSize !== null && selectedPair && !error ? (
          <div className="rounded-lg border border-[#20e0b2]/30 bg-[#20e0b2]/5 p-6 space-y-2">
            <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest font-mono">Calculated Execution</span>
            <div className="text-[10px] text-[#20e0b2] font-bold font-mono">
              📊 {pairsList[selectedPair].name}
            </div>
            <div className="text-4xl font-black text-[#20e0b2] font-mono tracking-tight">
              {lotSize} lots
            </div>
            <div className="text-[10px] text-zinc-500 font-mono">
              Based on ${riskAmount} risk parameters with a {stopLossPips} pip stop loss.
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-[rgba(255,255,255,0.07)] bg-[#101014]/20 p-8 text-center text-zinc-500 font-mono text-xs">
            Enter parameters to calculate lot size
          </div>
        )}
      </div>
    </div>
  );
}

// ── SUB-COMPONENT 3: PIP MOVEMENT ──
function PipMovement() {
  const [selectedStyle, setSelectedStyle] = useState("all");
  const [selectedSession, setSelectedSession] = useState("high");

  const data = pipData[selectedSession as keyof typeof pipData];
  const pairs = Object.keys(data);

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <div className="grid md:grid-cols-2 gap-4">
        <div className="rounded-lg border border-[rgba(255,255,255,0.07)] bg-[#101014] p-5">
          <label className="block text-[9px] uppercase font-bold text-zinc-500 tracking-wider mb-2 font-mono">Trading Session</label>
          <select
            value={selectedSession}
            onChange={(e) => setSelectedSession(e.target.value)}
            className="w-full rounded-xl border border-[rgba(255,255,255,0.07)] bg-black/20 px-3 py-2 text-white text-xs font-mono focus:outline-none cursor-pointer"
          >
            <option value="high" className="bg-[#101014]">High Volume (London/NY Overlap)</option>
            <option value="low" className="bg-[#101014]">Low Volume (Asian Session)</option>
          </select>
        </div>
        <div className="rounded-lg border border-[rgba(255,255,255,0.07)] bg-[#101014] p-5">
          <label className="block text-[9px] uppercase font-bold text-zinc-500 tracking-wider mb-2 font-mono">Filter by Style</label>
          <select
            value={selectedStyle}
            onChange={(e) => setSelectedStyle(e.target.value)}
            className="w-full rounded-xl border border-[rgba(255,255,255,0.07)] bg-black/20 px-3 py-2 text-white text-xs font-mono focus:outline-none cursor-pointer"
          >
            <option value="all" className="bg-[#101014]">All Timeframes</option>
            <option value="scalping" className="bg-[#101014]">Scalping (1m, 5m)</option>
            <option value="day" className="bg-[#101014]">Day Trading (5m-1h)</option>
            <option value="swing" className="bg-[#101014]">Swing (1h, 4h)</option>
          </select>
        </div>
      </div>

      <div className="rounded-lg border border-[rgba(255,255,255,0.07)] bg-[#101014] overflow-hidden relative">
        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono">
            <thead>
              <tr className="border-b border-zinc-850 bg-black/10 text-zinc-500">
                <th className="px-5 py-3.5 text-left text-[9px] font-bold uppercase tracking-wider">Pair</th>
                {(selectedStyle === "all" || selectedStyle === "scalping") && (<><th className="px-4 py-3.5 text-center text-[9px] font-bold text-[#ff5c73] uppercase tracking-wider">1m</th><th className="px-4 py-3.5 text-center text-[9px] font-bold text-[#ff5c73] uppercase tracking-wider">5m</th></>)}
                {(selectedStyle === "all" || selectedStyle === "day") && (<><th className="px-4 py-3.5 text-center text-[9px] font-bold text-amber-400 uppercase tracking-wider">15m</th><th className="px-4 py-3.5 text-center text-[9px] font-bold text-amber-400 uppercase tracking-wider">30m</th><th className="px-4 py-3.5 text-center text-[9px] font-bold text-amber-400 uppercase tracking-wider">1h</th></>)}
                {(selectedStyle === "all" || selectedStyle === "swing") && (<th className="px-4 py-3.5 text-center text-[9px] font-bold text-[#20e0b2] uppercase tracking-wider">4h</th>)}
              </tr>
            </thead>
            <tbody>
              {pairs.map((pair, idx) => (
                <tr key={pair} className={`border-b border-zinc-850 hover:bg-white/[0.01] transition-colors ${idx % 2 === 0 ? "bg-black/5" : "bg-transparent"}`}>
                  <td className="px-5 py-4 font-black text-white tracking-wider text-xs">{pair}</td>
                  {(selectedStyle === "all" || selectedStyle === "scalping") && (<><td className="px-4 py-4 text-center text-red-200">{data[pair as keyof typeof data]["1m"]}</td><td className="px-4 py-4 text-center text-red-300 font-bold">{data[pair as keyof typeof data]["5m"]}</td></>)}
                  {(selectedStyle === "all" || selectedStyle === "day") && (<><td className="px-4 py-4 text-center text-amber-200">{data[pair as keyof typeof data]["15m"]}</td><td className="px-4 py-4 text-center text-amber-300">{data[pair as keyof typeof data]["30m"]}</td><td className="px-4 py-4 text-center text-amber-400 font-bold">{data[pair as keyof typeof data]["1h"]}</td></>)}
                  {(selectedStyle === "all" || selectedStyle === "swing") && (<td className="px-4 py-4 text-center text-[#20e0b2] font-bold">{data[pair as keyof typeof data]["4h"]}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-3 text-[9px] uppercase tracking-wider font-bold text-zinc-500 border-t border-zinc-850 bg-black/10 font-mono">
          Values shown in relative pips. XAUUSD values represent pip-equivalent movements.
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {Object.entries(tradingStyles).map(([key, style]) => (
          <div key={key} className="rounded-lg border border-[rgba(255,255,255,0.07)] bg-[#101014] p-6 relative overflow-hidden group">
            <h3 className={`text-xs font-black mb-4 uppercase tracking-widest ${
              key === 'scalping' ? 'text-[#ff5c73]' : key === 'day' ? 'text-amber-400' : 'text-[#20e0b2]'
            }`}>{key} Trading</h3>
            <div className="space-y-2.5 text-[11px] text-zinc-400 font-mono">
              <p className="flex justify-between border-b border-zinc-850 pb-2"><span className="text-zinc-500">Timeframes</span> <span className="text-white font-bold">{style.timeframes.join(", ")}</span></p>
              <p className="flex justify-between border-b border-zinc-850 pb-2"><span className="text-zinc-500">Typical TP</span> <span className="text-white font-bold">{style.typical_tp}</span></p>
              <p className="flex justify-between border-b border-zinc-850 pb-2"><span className="text-zinc-500">Typical SL</span> <span className="text-white font-bold">{style.typical_sl}</span></p>
              <p className="flex justify-between border-b border-zinc-850 pb-2"><span className="text-zinc-500">Target R:R</span> <span className="text-white font-bold">{style.rr_ratio}</span></p>
              <p className="flex justify-between border-b border-zinc-850 pb-2"><span className="text-zinc-500">Trades/Day</span> <span className="text-white font-bold">{style.trades_per_day}</span></p>
              <p className="flex justify-between"><span className="text-zinc-500">Best Session</span> <span className="text-white font-bold text-right">{style.best_session}</span></p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {insights.map(({ icon: Icon, color, bg, title, items }) => (
          <div key={title} className={`rounded-lg border p-5 ${bg}`}>
            <div className="flex items-center gap-2 mb-3 pb-3 border-b border-white/5">
              <Icon size={16} className={color} />
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">{title}</h4>
            </div>
            <ul className="space-y-2 text-[11px] text-zinc-400 leading-relaxed font-mono">
              {items.map((item) => (
                <li key={item} className="flex gap-2">
                  <span className="text-zinc-600 select-none">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── SUB-COMPONENT 4: EXPECTANCY SIMULATOR ──
interface ResultRow {
  wins: number;
  losses: number;
  wr: number;
  net: number;
  status: "profit" | "loss" | "breakeven";
}

function ExpectancySimulator() {
  const [accountBalance, setAccountBalance] = useState(6000);
  const [numTrades, setNumTrades] = useState(10);
  const [riskPct, setRiskPct] = useState(1);
  const [rr, setRR] = useState(2);
  const [mode, setMode] = useState<"simulated" | "real">("simulated");

  const riskAmount = accountBalance * (riskPct / 100);
  const rewardAmount = riskAmount * rr;
  const breakEvenWR = (1 / (1 + rr)) * 100;

  const results = useMemo<ResultRow[]>(() => {
    return Array.from({ length: numTrades + 1 }, (_, wins) => {
      const losses = numTrades - wins;
      const net = wins * rewardAmount - losses * riskAmount;
      const wr = (wins / numTrades) * 100;
      return {
        wins, losses, wr,
        net: Math.round(net * 100) / 100,
        status: net > 0 ? "profit" : net === 0 ? "breakeven" : "loss",
      };
    });
  }, [numTrades, riskAmount, rewardAmount]);

  const scenarios = useMemo(() => results.slice(0, 8).map(r => ({
    name: `${r.wins}W`,
    value: r.net,
  })), [results]);

  const customTooltip = ({ active, payload, label }: any) => {
    if (active && payload?.length) {
      const v = payload[0].value as number;
      return (
        <div className="bg-[#0c0c0d] border border-[rgba(255,255,255,0.07)] rounded-lg p-3 text-xs font-mono">
          <p className="text-zinc-500 mb-1 font-bold">{label}</p>
          <p className={`font-black ${v >= 0 ? "text-[#20e0b2]" : "text-[#ff5c73]"}`}>
            {v >= 0 ? "+" : ""}${v.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in">
      <div className="lg:col-span-4 space-y-6">
        <div className="rounded-lg border border-[rgba(255,255,255,0.07)] bg-[#101014] p-6 space-y-6 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-2">
              <Target className="w-3.5 h-3.5 text-[#20e0b2]" /> Parameters
            </h2>
            <div className="bg-black/30 border border-[rgba(255,255,255,0.07)] rounded-lg p-1 flex gap-1">
              <button 
                onClick={() => setMode("simulated")}
                className={`px-3 py-1 rounded text-[8px] font-bold uppercase transition-all ${mode === "simulated" ? "bg-white/10 text-white shadow" : "text-zinc-500 hover:text-zinc-300"}`}
              >
                Simulated
              </button>
              <button 
                onClick={() => setMode("real")}
                className={`px-3 py-1 rounded text-[8px] font-bold uppercase transition-all ${mode === "real" ? "bg-[#20e0b2]/20 text-[#20e0b2] shadow" : "text-zinc-500 hover:text-zinc-300"}`}
              >
                Real data
              </button>
            </div>
          </div>

          {mode === "real" && (
            <div className="bg-[#20e0b2]/10 border border-[#20e0b2]/20 rounded-lg p-3.5 text-[10px] font-mono text-[#20e0b2] leading-relaxed">
              Using historical logs to calculate empirical Win Rates and R-Multiples.
            </div>
          )}

          <div>
            <div className="flex justify-between mb-1.5 font-mono text-xs">
              <label className="text-[9px] uppercase font-bold text-zinc-500 tracking-wider">Account Balance</label>
              <span className="font-bold text-white">${accountBalance.toLocaleString()}</span>
            </div>
            <input type="range" min={1000} max={100000} step={500} value={accountBalance}
              onChange={e => setAccountBalance(Number(e.target.value))} className="w-full accent-[#20e0b2] bg-zinc-800 h-1 rounded" />
          </div>

          <div>
            <div className="flex justify-between mb-1.5 font-mono text-xs">
              <label className="text-[9px] uppercase font-bold text-zinc-500 tracking-wider">Risk per Trade</label>
              <span className="font-bold text-white">{riskPct}% = <span className="text-[#ff5c73]">${riskAmount.toFixed(0)}</span></span>
            </div>
            <input type="range" min={0.1} max={5} step={0.1} value={riskPct}
              onChange={e => setRiskPct(Number(e.target.value))} className="w-full accent-[#20e0b2] bg-zinc-800 h-1 rounded" />
          </div>

          <div>
            <div className="flex justify-between mb-1.5 font-mono text-xs">
              <label className="text-[9px] uppercase font-bold text-zinc-500 tracking-wider">Risk:Reward Ratio</label>
              <span className="font-bold text-white">1:{rr} = <span className="text-[#20e0b2]">+${rewardAmount.toFixed(0)}</span></span>
            </div>
            <input type="range" min={0.5} max={10} step={0.5} value={rr}
              onChange={e => setRR(Number(e.target.value))} className="w-full accent-[#20e0b2] bg-zinc-800 h-1 rounded" />
          </div>

          <div>
            <div className="flex justify-between mb-1.5 font-mono text-xs">
              <label className="text-[9px] uppercase font-bold text-zinc-500 tracking-wider">Trade Sample</label>
              <span className="font-bold text-white">{numTrades} trades</span>
            </div>
            <input type="range" min={5} max={50} step={1} value={numTrades}
              onChange={e => setNumTrades(Number(e.target.value))} className="w-full accent-[#20e0b2] bg-zinc-800 h-1 rounded" />
          </div>

          <div className="bg-zinc-900/40 border border-[rgba(255,255,255,0.07)] rounded-xl p-4 flex flex-col justify-center">
            <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest font-mono">Break-even Win Rate</span>
            <div className="text-xl font-black font-mono text-[#20e0b2] mt-1">{breakEvenWR.toFixed(1)}%</div>
            <p className="text-[9px] text-zinc-500 font-mono mt-1 leading-relaxed">Minimum win rate required to stay positive at 1:{rr} RR rules.</p>
          </div>
        </div>
      </div>

      <div className="lg:col-span-8 flex flex-col gap-6">
        <div className="rounded-lg border border-[rgba(255,255,255,0.07)] bg-[#101014] p-6 relative overflow-hidden">
          <h2 className="text-xs font-black uppercase tracking-wider text-white mb-5 flex items-center gap-2">
            <TrendingUp className="w-3.5 h-3.5 text-[#20e0b2]" /> Compound Curve Projection
          </h2>
          <div className="w-full h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={scenarios} margin={{ top: 5, right: 0, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="simCurveGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#20e0b2" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#20e0b2" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.02)" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 9, fill: "#555568", fontFamily: "monospace" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 9, fill: "#555568", fontFamily: "monospace" }} tickFormatter={v => `$${v}`} axisLine={false} tickLine={false} />
                <Tooltip content={customTooltip} cursor={{ stroke: "rgba(255,255,255,0.05)", strokeDasharray: "4 4" }} />
                <ReferenceLine y={0} stroke="rgba(255,255,255,0.1)" strokeDasharray="3 3" />
                <Area type="monotone" dataKey="value" stroke="#20e0b2" strokeWidth={1.5}
                  fill="url(#simCurveGrad)" activeDot={{ r: 4, fill: "#fff", strokeWidth: 0 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-lg border border-[rgba(255,255,255,0.07)] bg-[#101014] overflow-hidden">
          <div className="p-4 border-b border-zinc-850 flex items-center justify-between bg-black/5 font-mono">
            <h2 className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Full Probability Table</h2>
            <span className="text-[9px] text-zinc-500 uppercase">Threshold: {breakEvenWR.toFixed(0)}% WR</span>
          </div>
          <div className="overflow-x-auto max-h-[300px] overflow-y-auto custom-scrollbar">
            <table className="w-full text-xs font-mono">
              <thead className="sticky top-0 bg-zinc-950/80">
                <tr className="text-[9px] uppercase font-bold text-zinc-500 tracking-wider border-b border-zinc-850">
                  <th className="px-5 py-3 text-left">Wins</th>
                  <th className="px-5 py-3 text-left">Losses</th>
                  <th className="px-5 py-3 text-left">Win Rate</th>
                  <th className="px-5 py-3 text-right">Net Result</th>
                  <th className="px-5 py-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r, i) => (
                  <tr key={i} className={`border-b border-zinc-850 transition-colors ${
                    r.status === "profit" ? "hover:bg-[#20e0b2]/5" :
                    r.status === "loss" ? "hover:bg-[#ff5c73]/5" :
                    "hover:bg-yellow-500/5"
                  } ${r.wr >= breakEvenWR && results[Math.max(0,i-1)]?.wr < breakEvenWR ? "border-t-2 border-t-[#20e0b2]" : ""}`}>
                    <td className="px-5 py-3 font-bold text-white">{r.wins}</td>
                    <td className="px-5 py-3 text-zinc-400">{r.losses}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1 bg-white/5 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${r.status === "profit" ? "bg-[#20e0b2]" : r.status === "loss" ? "bg-[#ff5c73]" : "bg-yellow-500"}`}
                            style={{ width: `${r.wr}%` }} />
                        </div>
                        <span className={`text-[10px] font-bold ${
                          r.status === "profit" ? "text-[#20e0b2]" : r.status === "loss" ? "text-[#ff5c73]" : "text-yellow-400"
                        }`}>{r.wr.toFixed(0)}%</span>
                      </div>
                    </td>
                    <td className={`px-5 py-3 text-right font-bold ${
                      r.status === "profit" ? "text-[#20e0b2]" : r.status === "loss" ? "text-[#ff5c73]" : "text-yellow-400"
                    }`}>
                      {r.net >= 0 ? "+" : ""}${r.net.toFixed(0)}
                    </td>
                    <td className="px-5 py-3 text-center">
                      <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border ${
                        r.status === "profit" ? "bg-[#20e0b2]/10 border-[#20e0b2]/20 text-[#20e0b2]" :
                        r.status === "loss" ? "bg-[#ff5c73]/10 border-[#ff5c73]/20 text-[#ff5c73]" :
                        "bg-yellow-500/10 border-yellow-500/20 text-yellow-400"
                      }`}>
                        {r.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}


