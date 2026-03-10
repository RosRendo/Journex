"use client";
import React, { useState, useEffect, useCallback } from "react";
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
} from "lucide-react";
import ServiceError from "@/components/ServiceError";
import {
  fetchWithRetry,
  checkMT5Connection,
  getServiceErrorMessage,
} from "@/utils/serviceStatus";

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

const MT5_API = "\";

export default function ForexRiskDashboard() {
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
  const [retryCount, setRetryCount] = useState(0);

  // Strategy Config
  const [riskPercent, setRiskPercent] = useState(1.0);
  const [rrRatio, setRrRatio] = useState(2.0);
  const [atrMultiplier, setAtrMultiplier] = useState(1.5);

  const fetchMT5Balance = useCallback(async () => {
    try {
      const response = await fetchWithRetry(`${MT5_API}/health`, {}, 2, 500);
      const accountData = await response.json();
      if (accountData.balance) {
        setData((prev) => ({ ...prev, balance: accountData.balance }));
      }
    } catch (error) {
      console.log("Could not fetch MT5 balance:", error);
    }
  }, []);

  const fetchData = useCallback(async (showSpinner = false) => {
    if (showSpinner) setIsRefreshing(true);
    try {
      const qs = `?risk_percent=${riskPercent}&rr_ratio=${rrRatio}&atr_sl_multiplier=${atrMultiplier}`;
      const response = await fetchWithRetry(
        `${MT5_API}/api/calculations${qs}`,
        {},
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
  }, [riskPercent, rrRatio, atrMultiplier]);

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
      await fetch(`${MT5_API}/api/start`, { method: "POST" });
      setData((prev) => ({ ...prev, is_running: true }));
      await fetchData();
    } catch {
      alert(
        "Error: Make sure the Python bridge is running (mt5_bridge.py on port 5003)",
      );
    }
    setIsLoading(false);
  };

  const stopCalculator = async () => {
    setIsLoading(true);
    try {
      await fetch(`${MT5_API}/api/stop`, { method: "POST" });
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

  const executeTrade = async (symbol: string, direction: "BUY" | "SELL", lot_size: number, sl: number, tp: number, rr_ratio: number) => {
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
      const res = await fetch(`${MT5_API}/api/execute-trade`, {
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
          { duration: 8000, id: toastId }
        );
      } else {
        toast.error(`❌ ${resData.error}`, { duration: 7000, id: toastId });
      }
    } catch (err) {
      toast.error("Network error — is the MT5 bridge running?", { id: toastId });
    }
  };

  const riskAmount = (data.balance * data.risk_percent) / 100;

  if (serviceError) {
    return (
      <ServiceError
        serviceName="Risk Calculator"
        port={5003}
        errorMessage={getServiceErrorMessage(5003, mtConnected)}
        onRetry={() => {
          setServiceError(null);
          setRetryCount((prev) => prev + 1);
          setTimeout(fetchData, 1000);
        }}
        mtConnected={mtConnected}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Activity className="text-violet-500" size={26} />
            Risk Table Calculator
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Real-time position sizing and risk management — powered by live MT5
            data
          </p>
        </div>
        <div
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold border ${data.is_running
            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
            : "bg-muted text-muted-foreground border-border"
            }`}
        >
          <span
            className={`w-2 h-2 rounded-full ${data.is_running
              ? "bg-emerald-400 animate-pulse"
              : "bg-muted-foreground"
              }`}
          />
          {data.is_running ? "Live" : "Stopped"}
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3 flex-wrap p-4 rounded-xl border border-border bg-card">
        <button
          onClick={startCalculator}
          disabled={isLoading || data.is_running}
          className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-foreground transition-all"
        >
          <Play size={16} />
          Start
        </button>
        <button
          onClick={stopCalculator}
          disabled={isLoading || !data.is_running}
          className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold bg-red-600 hover:bg-red-500 disabled:opacity-40 disabled:cursor-not-allowed text-foreground transition-all"
        >
          <Square size={16} />
          Stop
        </button>
        <button
          onClick={() => fetchData(true)}
          disabled={isRefreshing}
          className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold border border-border bg-muted hover:bg-accent text-foreground transition-all"
        >
          <RefreshCw size={16} className={isRefreshing ? "animate-spin" : ""} />
          Refresh
        </button>

        {data.last_update && (
          <div className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock size={13} />
            Last updated: {data.last_update}
          </div>
        )}
      </div>

      {/* Dynamic Strategy UI Settings */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-violet-500" />
          Strategy Parameters
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Risk Percent */}
          <div>
            <div className="flex justify-between text-sm mb-1.5">
              <span className="font-medium text-foreground">Risk per Trade (%)</span>
              <span className="font-bold font-mono text-violet-400">{riskPercent}%</span>
            </div>
            <input
              type="range"
              min="0.1"
              max="10.0"
              step="0.1"
              value={riskPercent}
              onChange={(e) => setRiskPercent(parseFloat(e.target.value))}
              className="w-full accent-violet-500"
            />
          </div>
          {/* Reward Ratio */}
          <div>
            <div className="flex justify-between text-sm mb-1.5">
              <span className="font-medium text-foreground">Target Reward Ratio (1:X)</span>
              <span className="font-bold font-mono text-emerald-400">1:{rrRatio}</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="5.0"
              step="0.1"
              value={rrRatio}
              onChange={(e) => setRrRatio(parseFloat(e.target.value))}
              className="w-full accent-emerald-500"
            />
          </div>
          {/* ATR Multiplier */}
          <div>
            <div className="flex justify-between text-sm mb-1.5">
              <span className="font-medium text-foreground">Volatility TP/SL (ATR x Multiplier)</span>
              <span className="font-bold font-mono text-amber-400">{atrMultiplier}x</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="5.0"
              step="0.1"
              value={atrMultiplier}
              onChange={(e) => setAtrMultiplier(parseFloat(e.target.value))}
              className="w-full accent-amber-500"
            />
            <p className="text-[10px] text-muted-foreground mt-1">
              Higher = Wider SL (more breathing room, smaller lot size)
            </p>
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Balance */}
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 rounded-lg bg-violet-500/10">
              <DollarSign size={16} className="text-violet-400" />
            </div>
            <span className="text-xs text-muted-foreground uppercase font-semibold tracking-wide">
              Balance
            </span>
          </div>
          <div className="text-xl font-bold text-foreground">
            $
            {data.balance.toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </div>
        </div>

        {/* Risk % */}
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 rounded-lg bg-amber-500/10">
              <AlertCircle size={16} className="text-amber-400" />
            </div>
            <span className="text-xs text-muted-foreground uppercase font-semibold tracking-wide">
              Risk/Trade
            </span>
          </div>
          <div className="text-xl font-bold text-foreground">
            {data.risk_percent}%
          </div>
        </div>

        {/* Risk Amount */}
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 rounded-lg bg-red-500/10">
              <TrendingDown size={16} className="text-red-400" />
            </div>
            <span className="text-xs text-muted-foreground uppercase font-semibold tracking-wide">
              Risk Amount
            </span>
          </div>
          <div className="text-xl font-bold text-red-400">
            ${riskAmount.toFixed(2)}
          </div>
        </div>

        {/* Symbols */}
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 rounded-lg bg-sky-500/10">
              <Zap size={16} className="text-sky-400" />
            </div>
            <span className="text-xs text-muted-foreground uppercase font-semibold tracking-wide">
              Symbols
            </span>
          </div>
          <div className="text-xl font-bold text-foreground">
            {data.calculations.length}
          </div>
        </div>
      </div>

      {/* Calculation Cards */}
      {data.calculations.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 rounded-xl border border-dashed border-border bg-card text-muted-foreground">
          <Activity size={48} className="mb-4 opacity-30" />
          <p className="text-lg font-medium">No market data available</p>
          <p className="text-sm mt-1 opacity-70">
            {data.is_running
              ? "Fetching live data from MT5..."
              : 'Click "Start" to begin live market analysis'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {data.calculations.map((calc) => (
            <div
              key={calc.symbol}
              className="rounded-xl border border-border bg-card overflow-hidden hover:border-violet-500/40 transition-colors"
            >
              {/* Card Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-muted/30">
                <h3 className="text-base font-bold text-foreground tracking-wide">
                  {calc.symbol}
                </h3>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground font-mono">
                    {formatNum(calc.current_price, 5)}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-400 text-xs font-bold border border-violet-500/20">
                    {formatNum(calc.lot_size, 2)} lots
                  </span>
                </div>
              </div>

              {/* Card Body */}
              <div className="px-5 py-4 space-y-3 text-sm">
                {/* Row: Spread / ATR */}
                <div className="flex gap-4">
                  <div className="flex-1 flex justify-between">
                    <span className="text-muted-foreground">Spread</span>
                    <span className="font-medium text-foreground">
                      {formatNum(calc.spread ?? 0, 1)} pips
                    </span>
                  </div>
                  <div className="w-px bg-border" />
                  <div className="flex-1 flex justify-between">
                    <span className="text-muted-foreground">ATR</span>
                    <span className="font-medium text-foreground">
                      {formatNum(calc.atr ?? 0, 1)} pips
                    </span>
                  </div>
                </div>

                {/* Row: TP / SL pips */}
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">TP / SL</span>
                  <div className="flex items-center gap-2 font-mono text-xs">
                    <span className="text-emerald-400 font-bold">
                      +{formatNum(calc.tp_pips, 1)}
                    </span>
                    <span className="text-muted-foreground">/</span>
                    <span className="text-red-400 font-bold">
                      -{formatNum(calc.sl_pips, 1)}
                    </span>
                    <span className="text-muted-foreground text-[10px]">
                      pips
                    </span>
                  </div>
                </div>

                {/* R:R Badge */}
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">R:R Ratio</span>
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-bold ${calc.rr_ratio >= 2
                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                      : calc.rr_ratio >= 1
                        ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                        : "bg-red-500/10 text-red-400 border border-red-500/20"
                      }`}
                  >
                    1 : {formatNum(calc.rr_ratio, 2)}
                  </span>
                </div>

                {/* Risk / Profit */}
                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-border">
                  <div className="rounded-lg bg-red-500/5 border border-red-500/15 p-2 text-center">
                    <div className="text-[10px] text-muted-foreground uppercase mb-0.5">
                      Risk
                    </div>
                    <div className="text-sm font-bold text-red-400">
                      ${formatNum(calc.risk_amount, 2)}
                    </div>
                  </div>
                  <div className="rounded-lg bg-emerald-500/5 border border-emerald-500/15 p-2 text-center">
                    <div className="text-[10px] text-muted-foreground uppercase mb-0.5">
                      Profit
                    </div>
                    <div className="text-sm font-bold text-emerald-400">
                      $
                      {formatNum(
                        calc.potential_profit ?? calc.tp_pips * 100,
                        2,
                      )}
                    </div>
                  </div>
                </div>

                {/* BUY / SELL Levels */}
                <div className="grid grid-cols-2 gap-2 pt-1 mt-2">
                  {/* BUY */}
                  <div className="space-y-2 rounded-lg bg-emerald-500/5 border border-emerald-500/15 p-2 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-1 mb-1.5">
                        <TrendingUp size={12} className="text-emerald-400" />
                        <span className="text-[10px] font-bold text-emerald-400 uppercase">
                          Buy Profile
                        </span>
                      </div>
                      <div className="flex justify-between text-[11px] mb-1">
                        <span className="text-muted-foreground">TP</span>
                        <span className="font-mono text-foreground font-semibold">
                          {formatNum(calc.buy?.tp ?? calc.current_price, 5)}
                        </span>
                      </div>
                      <div className="flex justify-between text-[11px]">
                        <span className="text-muted-foreground">SL</span>
                        <span className="font-mono text-foreground font-semibold">
                          {formatNum(calc.buy?.sl ?? calc.current_price, 5)}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => executeTrade(calc.symbol, "BUY", calc.lot_size, calc.buy?.sl ?? 0, calc.buy?.tp ?? 0, calc.rr_ratio)}
                      disabled={!mtConnected}
                      className="w-full py-1.5 mt-2 rounded bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-bold transition-colors shadow-sm shadow-emerald-500/20 disabled:opacity-50"
                    >
                      EXECUTE BUY
                    </button>
                  </div>

                  {/* SELL */}
                  <div className="space-y-2 rounded-lg bg-red-500/5 border border-red-500/15 p-2 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-1 mb-1.5">
                        <TrendingDown size={12} className="text-red-400" />
                        <span className="text-[10px] font-bold text-red-400 uppercase">
                          Sell Profile
                        </span>
                      </div>
                      <div className="flex justify-between text-[11px] mb-1">
                        <span className="text-muted-foreground">TP</span>
                        <span className="font-mono text-foreground font-semibold">
                          {formatNum(calc.sell?.tp ?? calc.current_price, 5)}
                        </span>
                      </div>
                      <div className="flex justify-between text-[11px]">
                        <span className="text-muted-foreground">SL</span>
                        <span className="font-mono text-foreground font-semibold">
                          {formatNum(calc.sell?.sl ?? calc.current_price, 5)}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => executeTrade(calc.symbol, "SELL", calc.lot_size, calc.sell?.sl ?? 0, calc.sell?.tp ?? 0, calc.rr_ratio)}
                      disabled={!mtConnected}
                      className="w-full py-1.5 mt-2 rounded bg-red-500 hover:bg-red-400 text-white text-xs font-bold transition-colors shadow-sm shadow-red-500/20 disabled:opacity-50"
                    >
                      EXECUTE SELL
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Footer note */}
      <p className="text-xs text-muted-foreground text-center pb-2">
        Bridge connected at <span className="font-mono">{MT5_API}</span>
      </p>
    </div>
  );
}
