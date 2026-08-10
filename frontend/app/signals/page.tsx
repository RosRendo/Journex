"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/terminalApi";
import {
  Radar,
  TrendingUp,
  TrendingDown,
  Activity,
  Crosshair,
  AlertTriangle,
  Clock,
  ShieldCheck,
  Zap,
  Bell,
  BellOff
} from "lucide-react";
import OrderTicket from "@/components/terminal/OrderTicket";
import { toast } from "sonner";

interface Signal {
  id: string;
  symbol: string;
  type: "BUY" | "SELL" | "NO_TRADE";
  entry_price: number;
  entry_zone?: {
    entry_low: number;
    entry_high: number;
    preferred: number;
    reason: string;
  };
  sl: number;
  sl_reason?: string;
  tp: number;
  confidence: number;
  grade?: string;
  reason: string;
  timestamp: string;
  timeframe?: string;
  rsi?: number;
  adx?: number;
  regime?: string;
  volatility?: string;
  confluence_matrix?: Record<string, { status: string; points: number; max: number }>;
  weights_used?: Record<string, number>;
  invalidation?: number;
  reasoning?: { summary: string; pros: string[]; cons: string[] };
  tp1?: { price: number; rr: number; reason: string };
  tp2?: { price: number; rr: number; reason: string };
  tp3?: { price: number; rr: number; reason: string };
  alignment?: Record<string, { type: "BUY" | "SELL" | "NO_TRADE"; score: number }>;
  overall_alignment?: string;
  conflict?: { detected?: boolean; conflict?: boolean; message: string; alignment_count?: number; total_count?: number };
}


export default function SignalsPage() {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  // Scanning Configuration State
  const [tradingStyle, setTradingStyle] = useState<"ict_scalper" | "ict_intraday" | "supply_demand" | "momentum_breakout" | "custom">("custom");
  const [market, setMarket] = useState<string>("all");
  const [timeframe, setTimeframe] = useState<string>("ALL");
  const [direction, setDirection] = useState<string>("both");
  const [minScore, setMinScore] = useState<number>(70);
  const [minRr, setMinRr] = useState<number>(1.5);
  const [session, setSession] = useState<string>("both");
  const [signalType, setSignalType] = useState<string>("all");
  const [maxSignals, setMaxSignals] = useState<number>(15);
  const [cooldown, setCooldown] = useState<number>(30);

  // Order Ticket State
  const [orderOpen, setOrderOpen] = useState(false);
  const [orderSymbol, setOrderSymbol] = useState("XAUUSD");
  const [orderSide, setOrderSide] = useState<"BUY" | "SELL">("BUY");
  const [orderSl, setOrderSl] = useState("");
  const [orderTp, setOrderTp] = useState("");

  // Global Alerts State
  const [alertsPaused, setAlertsPaused] = useState(true);

  const applyPreset = (preset: "ict_scalper" | "ict_intraday" | "supply_demand" | "momentum_breakout" | "custom") => {
    setTradingStyle(preset);
    if (preset === "ict_scalper") {
      setTimeframe("M5");
      setSession("both");
      setMinScore(75);
      setMinRr(1.5);
      setSignalType("continuation");
    } else if (preset === "ict_intraday") {
      setTimeframe("M15");
      setSession("both");
      setMinScore(80);
      setMinRr(2.0);
      setSignalType("reversal");
    } else if (preset === "supply_demand") {
      setTimeframe("H1");
      setSession("all");
      setMinScore(70);
      setMinRr(2.0);
      setSignalType("reversal");
    } else if (preset === "momentum_breakout") {
      setTimeframe("M15");
      setSession("both");
      setMinScore(75);
      setMinRr(2.0);
      setSignalType("breakout");
    }
  };

  const fetchAlertStatus = async () => {
    try {
      const res = await api.get("/terminal/alert-config");
      if (res.data) setAlertsPaused(res.data.alerts_paused);
    } catch (e) {
      console.error("Failed to load alert config", e);
    }
  };

  const toggleAlerts = async () => {
    try {
      const newStatus = !alertsPaused;
      setAlertsPaused(newStatus); // optimistic update
      await api.post("/terminal/alert-config", { alerts_paused: newStatus });
      toast.success(newStatus ? "Alerts paused" : "Alerts activated");
    } catch (e) {
      console.error("Failed to toggle alerts", e);
      setAlertsPaused(!alertsPaused); // revert on failure
      toast.error("Failed to update alert state");
    }
  };

  const fetchSignals = async (customParams?: any) => {
    try {
      const queryParams = new URLSearchParams({
        market: customParams?.market ?? market,
        timeframe: customParams?.timeframe ?? timeframe,
        direction: customParams?.direction ?? direction,
        min_score: (customParams?.minScore ?? minScore).toString(),
        min_rr: (customParams?.minRr ?? minRr).toString(),
        session: customParams?.session ?? session,
        signal_type: customParams?.signalType ?? signalType,
        max_signals: (customParams?.maxSignals ?? maxSignals).toString(),
      });

      const res = await api.get(`/terminal/signals?${queryParams.toString()}`);
      if (res.data && res.data.success) {
        setSignals(res.data.signals);
        setLastUpdated(new Date());
      }
    } catch (e) {
      console.error("Failed to load signals", e);
    } finally {
      setLoading(false);
    }
  };

  const clearHistory = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/terminal/signals?clear=true`);
      if (res.data && res.data.success) {
        setSignals([]);
        toast.success("Scanner history cleared");
      }
    } catch (e) {
      console.error("Failed to clear signals", e);
      toast.error("Failed to clear history");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSignals();
    fetchAlertStatus();
    const interval = setInterval(() => {
      fetchSignals();
    }, 10000); // 10 second polling
    return () => clearInterval(interval);
  }, [market, timeframe, direction, minScore, minRr, session, signalType, maxSignals]);

  const handleExecute = (sig: Signal) => {
    if (sig.type === "NO_TRADE") return;
    setOrderSymbol(sig.symbol);
    setOrderSide(sig.type);
    setOrderSl(sig.sl ? sig.sl.toString() : "");
    setOrderTp(sig.tp ? sig.tp.toString() : "");
    setOrderOpen(true);
  };

  return (
    <div className="min-h-screen w-full bg-[#05050a] text-text-primary px-4 md:px-6 py-4 flex flex-col gap-4 animate-fade-in pb-16">
      
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-[#111118]/80 p-4 border border-zinc-800/40 rounded-2xl backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-lg font-black tracking-tight text-white font-display flex items-center gap-2">
              <Radar className="w-5 h-5 text-purple-400" />
              Global Market Scanner
            </h1>
            <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest font-mono flex items-center gap-1 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Confluence Scanner Active
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={toggleAlerts}
            className={`flex items-center gap-1.5 text-[10px] font-bold font-mono uppercase tracking-wider px-3 py-1.5 rounded-lg border transition-all ${
              alertsPaused 
                ? "bg-black/40 border-zinc-800 text-zinc-500 hover:text-zinc-350"
                : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20"
            }`}
          >
            {alertsPaused ? (
              <><BellOff className="w-3.5 h-3.5" /> Alerts Paused</>
            ) : (
              <><Bell className="w-3.5 h-3.5" /> Alerts Active</>
            )}
          </button>
          
          <div className="flex items-center gap-1.5 text-[10px] font-bold font-mono text-zinc-500 bg-black/40 px-3 py-1.5 rounded-lg border border-zinc-800/40">
            <Clock className="w-3 h-3 text-emerald-500" />
            Scan: {lastUpdated.toLocaleTimeString()}
          </div>
        </div>
      </div>

      {/* Scanner Settings Panel */}
      <div className="p-5 bg-[#111118] border border-zinc-800/40 rounded-xl flex flex-col gap-4 shadow-xl">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-b border-zinc-800/40 pb-3">
          <div>
            <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest font-mono">
              Scanner Strategy Presets
            </h3>
          </div>
          <div className="flex gap-2 flex-wrap font-mono">
            {(["ict_scalper", "ict_intraday", "supply_demand", "momentum_breakout", "custom"] as const).map((style) => {
              const labels: Record<string, string> = {
                ict_scalper: "ICT Scalper",
                ict_intraday: "ICT Intraday",
                supply_demand: "Supply & Demand",
                momentum_breakout: "Momentum/Breakout",
                custom: "Custom Settings"
              };
              return (
                <button
                  key={style}
                  onClick={() => applyPreset(style)}
                  className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase border transition-all ${
                    tradingStyle === style
                      ? "bg-purple-500/20 border-purple-500/40 text-purple-400 shadow-[0_0_10px_rgba(168,85,247,0.15)]"
                      : "bg-black/35 border-zinc-800/50 text-zinc-500 hover:text-zinc-350"
                  }`}
                >
                  {labels[style]}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Market selector */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider font-mono">Market Asset Group</label>
            <select
              value={market}
              onChange={(e) => {
                setMarket(e.target.value);
                setTradingStyle("custom");
              }}
              className="bg-black/35 border border-zinc-800/60 rounded-lg px-2.5 py-1.5 text-zinc-355 text-xs focus:outline-none focus:border-emerald-450 font-mono cursor-pointer"
            >
              <option value="all" className="bg-zinc-950">All Markets</option>
              <option value="forex" className="bg-zinc-950">Forex</option>
              <option value="crypto" className="bg-zinc-950">Crypto</option>
              <option value="commodities" className="bg-zinc-950">Commodities</option>
              <option value="indices" className="bg-zinc-950">Indices</option>
            </select>
          </div>

          {/* Timeframe selector */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider font-mono">Timeframe</label>
            <select
              value={timeframe}
              onChange={(e) => {
                setTimeframe(e.target.value);
                setTradingStyle("custom");
              }}
              className="bg-black/35 border border-zinc-800/60 rounded-lg px-2.5 py-1.5 text-zinc-355 text-xs focus:outline-none focus:border-emerald-450 font-mono cursor-pointer"
            >
              {["M1", "M5", "M15", "H1", "H4", "D1", "ALL"].map((tf) => (
                <option key={tf} value={tf} className="bg-zinc-950">{tf}</option>
              ))}
            </select>
          </div>

          {/* Direction selector */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider font-mono">Direction</label>
            <select
              value={direction}
              onChange={(e) => {
                setDirection(e.target.value);
                setTradingStyle("custom");
              }}
              className="bg-black/35 border border-zinc-800/60 rounded-lg px-2.5 py-1.5 text-zinc-355 text-xs focus:outline-none focus:border-emerald-450 font-mono cursor-pointer"
            >
              <option value="both" className="bg-zinc-950">Buy / Sell (Both)</option>
              <option value="buy" className="bg-zinc-950">Buy Only</option>
              <option value="sell" className="bg-zinc-950">Sell Only</option>
            </select>
          </div>

          {/* Session filter */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider font-mono">Active Session</label>
            <select
              value={session}
              onChange={(e) => {
                setSession(e.target.value);
                setTradingStyle("custom");
              }}
              className="bg-black/35 border border-zinc-800/60 rounded-lg px-2.5 py-1.5 text-zinc-355 text-xs focus:outline-none focus:border-emerald-450 font-mono cursor-pointer"
            >
              <option value="both" className="bg-zinc-950">London & New York</option>
              <option value="london" className="bg-zinc-950">London Only</option>
              <option value="ny" className="bg-zinc-950">New York Only</option>
              <option value="all" className="bg-zinc-950">All Sessions</option>
            </select>
          </div>

          {/* Min Score slider */}
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between items-center font-mono text-[9px] font-bold">
              <span className="text-zinc-500 uppercase tracking-wider">Min Confluence Score</span>
              <span className="text-zinc-350">{minScore}/100</span>
            </div>
            <input
              type="range"
              min="50"
              max="95"
              step="5"
              value={minScore}
              onChange={(e) => {
                setMinScore(Number(e.target.value));
                setTradingStyle("custom");
              }}
              className="w-full accent-purple-500 h-1 bg-zinc-900 rounded-full appearance-none cursor-pointer mt-1"
            />
          </div>

          {/* Min Risk Reward ratio */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider font-mono">Min Risk/Reward Target</label>
            <select
              value={minRr}
              onChange={(e) => {
                setMinRr(Number(e.target.value));
                setTradingStyle("custom");
              }}
              className="bg-black/35 border border-zinc-800/60 rounded-lg px-2.5 py-1.5 text-zinc-355 text-xs focus:outline-none focus:border-emerald-450 font-mono cursor-pointer"
            >
              <option value="1.5" className="bg-zinc-950">1:1.5 Minimum</option>
              <option value="2.0" className="bg-zinc-950">1:2.0 Minimum</option>
              <option value="2.5" className="bg-zinc-950">1:2.5 Minimum</option>
              <option value="3.0" className="bg-zinc-950">1:3.0 Minimum</option>
            </select>
          </div>

          {/* Signal Type */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider font-mono">Signal Setup Type</label>
            <select
              value={signalType}
              onChange={(e) => {
                setSignalType(e.target.value);
                setTradingStyle("custom");
              }}
              className="bg-black/35 border border-zinc-800/60 rounded-lg px-2.5 py-1.5 text-zinc-355 text-xs focus:outline-none focus:border-emerald-450 font-mono cursor-pointer"
            >
              <option value="all" className="bg-zinc-950">All Patterns</option>
              <option value="reversal" className="bg-zinc-950">Reversal Setup</option>
              <option value="continuation" className="bg-zinc-950">Continuation Setup</option>
              <option value="breakout" className="bg-zinc-950">Breakout Setup</option>
            </select>
          </div>

          {/* Max signals / cooldown */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider font-mono">Max Scanned Signals</label>
            <input
              type="number"
              value={maxSignals}
              onChange={(e) => {
                setMaxSignals(Number(e.target.value));
                setTradingStyle("custom");
              }}
              className="bg-black/35 border border-zinc-800/60 rounded-lg px-2.5 py-1.5 text-zinc-200 text-xs focus:outline-none focus:border-emerald-400 font-mono"
              min="1"
              max="15"
            />
          </div>
        </div>

        <div className="flex justify-between items-center mt-1 border-t border-zinc-800/40 pt-3">
          <div className="text-[9px] text-zinc-500 font-mono uppercase tracking-widest flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
            Scanner Engine Active · Cooldown: {cooldown} min
          </div>
          <button
            onClick={clearHistory}
            className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-red-400 hover:text-red-300 font-mono bg-red-950/20 hover:bg-red-950/40 border border-red-900/30 hover:border-red-900/50 px-3.5 py-1.5 rounded-lg transition-all"
          >
            Clear History
          </button>
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex-1 flex flex-col items-center justify-center min-h-[400px]">
          <Radar className="w-10 h-10 text-zinc-700 animate-spin mb-4" />
          <p className="text-zinc-500 font-mono text-xs tracking-widest uppercase animate-pulse">
            Scanning Markets...
          </p>
        </div>
      ) : signals.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center min-h-[400px] border border-dashed border-zinc-800/40 rounded-xl bg-zinc-950/20">
          <Activity className="w-10 h-10 text-zinc-700 mb-3" />
          <h3 className="text-zinc-300 font-bold mb-1 text-sm">No Active Signals</h3>
          <p className="text-zinc-550 text-xs max-w-sm text-center">
            The market scanner is actively monitoring but hasn't found any high-probability setups meeting your criteria right now.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {signals.map((sig) => {
            const isBuy = sig.type === "BUY";
            const isNoTrade = sig.type === "NO_TRADE";
            const score = sig.confidence;
            const backendGrade = sig.grade ?? "";
            const conflict = sig.conflict?.detected || sig.conflict?.conflict;
            const conflictMsg = sig.conflict?.message ?? "";

            let gradeLabel = backendGrade ? `${backendGrade} Setup` : "B Setup";
            let colorBorder = "border-zinc-850/60";
            let colorText = "text-zinc-500";
            let cardBg = "bg-[#111118]";
            let cardFilter = "";

            if (isNoTrade || conflict) {
              gradeLabel = conflict ? "⚠ Conflict Suppressed" : "No Trade Setup";
              colorBorder = conflict ? "border-red-900/40" : "border-zinc-900/60";
              colorText = conflict ? "text-red-400 font-mono" : "text-zinc-600 font-mono";
              cardBg = conflict ? "bg-[#130a0a]/60" : "bg-[#09090c]/50";
              cardFilter = "opacity-80 hover:opacity-95";
            } else if (backendGrade === "A+" || score >= 90) {
              gradeLabel = "A+ Setup";
              colorBorder = "border-emerald-500/25 hover:border-emerald-500/50";
              colorText = "text-emerald-400";
            } else if (backendGrade === "A" || score >= 80) {
              gradeLabel = "A Setup";
              colorBorder = "border-teal-500/25 hover:border-teal-500/50";
              colorText = "text-teal-400";
            } else if (backendGrade === "B" || score >= 70) {
              gradeLabel = "B Setup";
              colorBorder = "border-blue-500/25 hover:border-blue-500/50";
              colorText = "text-blue-400";
            } else if (score >= 60) {
              gradeLabel = "Weak Setup";
              colorBorder = "border-yellow-500/20 hover:border-yellow-500/40";
              colorText = "text-yellow-400";
            }

            const regimeBadge: Record<string, string> = {
              trending:  "bg-blue-500/10  text-blue-400  border-blue-500/20",
              ranging:   "bg-amber-500/10 text-amber-400 border-amber-500/20",
              breakout:  "bg-purple-500/10 text-purple-400 border-purple-500/20",
            };
            const volBadge: Record<string, string> = {
              high:   "bg-red-500/10   text-red-400   border-red-500/20",
              normal: "bg-zinc-800/40  text-zinc-400  border-zinc-700/30",
              low:    "bg-zinc-900/40  text-zinc-500  border-zinc-800/20",
            };


            return (
              <div
                key={sig.id}
                className={`relative flex flex-col border rounded-xl overflow-hidden transition-all duration-300 shadow-xl ${cardBg} ${colorBorder} ${cardFilter}`}
              >
                {/* Card Header */}
                <div className="p-4 border-b border-zinc-800/40 flex justify-between items-start bg-black/20">
                  <div>
                    <h2 className="text-lg font-bold font-mono tracking-tight text-white flex items-center gap-1.5">
                      #{sig.symbol}
                      <span
                        className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded border ${
                          isNoTrade
                            ? "bg-zinc-900 text-zinc-500 border-zinc-850"
                            : isBuy
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                            : "bg-red-500/10 text-red-400 border-red-500/20"
                        }`}
                      >
                        {sig.type}
                      </span>
                    </h2>
                    <span className={`text-[8px] font-mono font-bold uppercase tracking-wider mt-0.5 block ${colorText}`}>
                      {gradeLabel} · {score}/100
                    </span>
                  </div>
                  <div className="text-right flex flex-col items-end gap-1">
                    <div className="text-sm font-bold font-mono text-zinc-300 bg-black/30 px-2 py-0.5 rounded border border-zinc-800/40">
                      {sig.timeframe || "M15"}
                    </div>
                    {sig.regime && (
                      <span className={`text-[7px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded border font-mono ${
                        regimeBadge[sig.regime] ?? "bg-zinc-800/40 text-zinc-400 border-zinc-700/30"
                      }`}>
                        {sig.regime}
                      </span>
                    )}
                    {sig.volatility && sig.volatility !== "normal" && (
                      <span className={`text-[7px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded border font-mono ${
                        volBadge[sig.volatility] ?? ""
                      }`}>
                        Vol:{sig.volatility}
                      </span>
                    )}
                  </div>

                </div>

                {/* Reasons Summary */}
                <div className="p-3 bg-black/10 text-[11px] text-zinc-400 border-b border-zinc-850/40">
                  <div className="flex gap-2 items-start">
                    <Activity className="w-3.5 h-3.5 text-purple-400 shrink-0 mt-0.5" />
                    <span className="font-mono text-zinc-350">{sig.reason}</span>
                  </div>
                </div>

                {/* Conflict Warning Banner */}
                {conflict && (
                  <div className="px-3.5 py-2 bg-red-950/30 border-b border-red-900/40 flex items-start gap-2">
                    <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
                    <span className="text-[9px] text-red-300 font-mono leading-relaxed">{conflictMsg}</span>
                  </div>
                )}

                {/* Card Body - Levels */}
                {!isNoTrade && (
                  <div className="p-3 bg-black/15 border-b border-zinc-850/30">
                    {/* Entry Zone */}
                    {sig.entry_zone ? (
                      <div className="mb-2 p-2 rounded-lg bg-black/20 border border-zinc-800/30">
                        <div className="text-[7px] font-bold text-zinc-500 uppercase tracking-widest font-mono mb-1 flex items-center gap-1">
                          <Crosshair className="w-3 h-3 text-emerald-400" /> Entry Zone
                        </div>
                        <div className="flex items-center justify-between font-mono">
                          <span className="text-[9px] text-zinc-400">{sig.entry_zone.entry_low.toFixed(5)}</span>
                          <div className="flex-1 mx-2 h-px bg-gradient-to-r from-zinc-700 via-emerald-500/60 to-zinc-700 relative">
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          </div>
                          <span className="text-[9px] text-zinc-400">{sig.entry_zone.entry_high.toFixed(5)}</span>
                        </div>
                        <div className="text-center text-[8px] text-emerald-400 font-bold font-mono mt-1">
                          Preferred: {sig.entry_zone.preferred.toFixed(5)}
                        </div>
                        <div className="text-center text-[7px] text-zinc-600 font-mono mt-0.5">{sig.entry_zone.reason}</div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 gap-2 mb-2">
                        <div className="flex flex-col overflow-hidden font-mono text-[10px]">
                          <span className="text-[8px] text-zinc-500 uppercase tracking-widest mb-1 flex items-center gap-1 truncate">
                            <Crosshair className="w-3 h-3 shrink-0 text-emerald-400" /> Entry
                          </span>
                          <span className="text-zinc-300 truncate">{sig.entry_price.toFixed(5)}</span>
                        </div>
                      </div>
                    )}

                    {/* SL & TP row */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex flex-col overflow-hidden font-mono text-[10px]">
                        <span className="text-[8px] text-red-500 uppercase tracking-widest mb-1 flex items-center gap-1 truncate">
                          <AlertTriangle className="w-3 h-3 shrink-0" /> Stop
                        </span>
                        <span className="text-zinc-350 truncate">{sig.sl ? sig.sl.toFixed(5) : "—"}</span>
                        {sig.sl_reason && (
                          <span className="text-[7px] text-zinc-600 font-mono truncate mt-0.5">{sig.sl_reason}</span>
                        )}
                      </div>
                      <div className="flex flex-col overflow-hidden font-mono text-[10px]">
                        <span className="text-[8px] text-emerald-500 uppercase tracking-widest mb-1 flex items-center gap-1 truncate">
                          <ShieldCheck className="w-3 h-3 shrink-0" /> Target
                        </span>
                        <span className="text-zinc-350 truncate">{sig.tp ? sig.tp.toFixed(5) : "—"}</span>
                      </div>
                    </div>
                  </div>
                )}


                {/* Multi-Timeframe Alignment Row */}
                {sig.alignment && (
                  <div className="px-3.5 py-2 border-b border-zinc-850/30 bg-black/25 flex justify-between items-center text-[10px]">
                    <span className="text-[8px] font-bold text-zinc-550 uppercase tracking-widest font-mono">TF Alignment ({sig.overall_alignment})</span>
                    <div className="flex gap-1">
                      {Object.entries(sig.alignment).map(([tfKey, tfDetail]: [string, any]) => {
                        const alignBuy = tfDetail.type === "BUY";
                        const alignSell = tfDetail.type === "SELL";
                        let tagColor = "bg-zinc-900 border-zinc-800 text-zinc-650";
                        if (alignBuy) tagColor = "bg-emerald-950/20 border-emerald-900/30 text-emerald-405 font-bold font-mono";
                        if (alignSell) tagColor = "bg-red-950/20 border-red-900/30 text-red-405 font-bold font-mono";
                        return (
                          <span key={tfKey} className={`text-[8px] px-1 py-0.5 rounded border ${tagColor}`}>
                            {tfKey}:{tfDetail.type === "NO_TRADE" ? "NT" : tfDetail.type.slice(0, 1)}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Confluence Matrix */}
                {sig.confluence_matrix && (
                  <div className="px-3.5 py-2.5 border-b border-zinc-855 bg-black/10">
                    <div className="flex items-center justify-between mb-1.5">
                      <h4 className="text-[8px] font-bold text-zinc-550 uppercase tracking-widest font-mono">Confluence Matrix</h4>
                      {sig.regime && (
                        <span className="text-[7px] font-mono text-zinc-600">
                          weights: {sig.regime}
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[9px] font-mono">
                      {Object.entries(sig.confluence_matrix).map(([factor, detail]: [string, any]) => {
                        const hasPoints = detail.points > 0;
                        const pct = detail.max > 0 ? Math.round((detail.points / detail.max) * 100) : 0;
                        return (
                          <div key={factor} className="flex justify-between items-center py-0.5 border-b border-zinc-900/20">
                            <span className="text-zinc-500 flex items-center gap-1">
                              {factor}
                              <span className="text-[6px] text-zinc-700">/{detail.max}pt</span>
                            </span>
                            <span className={hasPoints ? "text-emerald-450 font-bold" : "text-zinc-650"}>
                              {hasPoints ? `🟢 ${detail.points}` : `⚪ ${detail.status}`}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}


                {/* Logical Targets (TP1, TP2, TP3) */}
                {!isNoTrade && (
                  <div className="p-3 bg-black/20 flex flex-col gap-1.5 border-b border-zinc-850/30">
                    <span className="text-[8px] font-bold text-zinc-550 uppercase tracking-widest font-mono">Validated Targets</span>
                    <div className="flex flex-col gap-1 text-[10px]">
                      {["tp1", "tp2", "tp3"].map((tpKey) => {
                        const tpData = (sig as any)[tpKey];
                        if (!tpData) return null;
                        return (
                          <div key={tpKey} className="flex justify-between items-center border-b border-zinc-900/20 pb-1 last:border-0 last:pb-0 font-mono">
                            <span className="font-bold text-zinc-400 uppercase text-[8px] tracking-wide truncate max-w-[150px]">
                              {tpKey.toUpperCase()} — {tpData.reason}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="text-zinc-350">{tpData.price.toFixed(5)}</span>
                              <span className="text-[8px] text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded">
                                RR {tpData.rr.toFixed(1)}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Reasoning Details (Pros) */}
                {sig.reasoning?.pros && sig.reasoning.pros.length > 0 && (
                  <div className="px-3.5 py-2.5 text-xs flex-1">
                    <span className="text-[8px] font-bold text-zinc-550 uppercase tracking-widest font-mono block">Aligned Confirmations</span>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {sig.reasoning.pros.map((pro: string, i: number) => (
                        <span key={i} className="text-[8px] font-mono px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">
                          {pro.split(":")[0]}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Invalidation Level */}
                {!isNoTrade && (
                  <div className="px-3.5 py-1.5 bg-black/35 text-center text-[8px] text-zinc-650 font-mono uppercase tracking-wider border-t border-zinc-850/40">
                    Invalidation: Price closes below <span className="text-red-400 font-bold">{sig.invalidation ? sig.invalidation.toFixed(5) : "—"}</span>
                  </div>
                )}

                {/* Card Footer - Action */}
                <div className="p-3 pt-0 mt-2 bg-black/10 border-t border-zinc-850/20">
                  {isNoTrade ? (
                    <div className="w-full flex items-center justify-center py-2.5 mt-2.5 rounded-lg font-bold uppercase text-[9px] border border-zinc-800/40 bg-zinc-950/40 text-zinc-600 font-mono">
                      No Setup Detected
                    </div>
                  ) : (
                    <button
                      onClick={() => handleExecute(sig)}
                      className={`w-full flex items-center justify-center gap-1 py-2.5 mt-2.5 rounded-lg font-bold uppercase text-[9px] transition-all font-mono ${
                        isBuy
                          ? "bg-emerald-500 hover:bg-emerald-400 text-emerald-950 shadow-[0_0_10px_rgba(16,185,129,0.15)]"
                          : "bg-red-500 hover:bg-red-400 text-red-950 shadow-[0_0_10px_rgba(239,68,68,0.15)]"
                      }`}
                    >
                      <Zap className="w-3.5 h-3.5" />
                      Review & Execute {sig.type}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Hidden Order Ticket Modal */}
      <OrderTicket
        open={orderOpen}
        onOpenChange={setOrderOpen}
        initialData={{
          symbol: orderSymbol,
          side: orderSide as "BUY" | "SELL",
          sl: Number(orderSl),
          tp: Number(orderTp)
        }}
        onSubmitted={() => {
          // Submitted
        }}
      />
    </div>
  );
}
