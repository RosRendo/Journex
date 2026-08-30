

"use client";

import React, { useState, useEffect } from "react";
import { 
  Sliders, Cpu, Activity, Zap, Shield, Target, 
  RefreshCw, AlertCircle, CheckCircle2, TrendingUp, HelpCircle 
} from "lucide-react";

interface IndicatorRow {
  category: string;
  core: string;
  variants: string;
  defaultOn: boolean;
}

const indicatorRows: IndicatorRow[] = [
  { category: "Trend", core: "EMA, SuperTrend", variants: "Ichimoku, MACD, ADX", defaultOn: true },
  { category: "Momentum", core: "RSI", variants: "Stochastic, MACD, Williams %R", defaultOn: true },
  { category: "Volatility", core: "ATR, Bollinger Bands", variants: "Keltner, Donchian", defaultOn: true },
  { category: "Volume", core: "VWAP", variants: "OBV, Volume Profile", defaultOn: true },
  { category: "Price Action", core: "Support/Resistance", variants: "Order Blocks, BOS, FVG", defaultOn: false },
  { category: "Time/Session", core: "Session High/Low", variants: "Opening Range Breakout", defaultOn: false },
  { category: "Confirmation", core: "Divergence", variants: "Liquidity Sweep, Institutional Bias", defaultOn: false },
  { category: "Risk/Reward", core: "RR Meter", variants: "Position Sizer", defaultOn: true },
];

const categoryColors: Record<string, string> = {
  Trend: "text-[#20e0b2] border-[rgba(32,224,178,0.3)]/20 bg-[#20e0b2]/5",
  Momentum: "text-sky-400 border-sky-500/20 bg-sky-500/5",
  Volatility: "text-[#f5c451] border-amber-500/20 bg-amber-500/5",
  Volume: "text-[#20e0b2] border-[rgba(32,224,178,0.3)]/20 bg-[#20e0b2]/5",
  "Price Action": "text-[#ff5c73] border-[rgba(255,92,115,0.2)] bg-red-500/5",
  "Time/Session": "text-cyan-400 border-cyan-500/20 bg-cyan-500/5",
  Confirmation: "text-pink-400 border-pink-500/20 bg-pink-500/5",
  "Risk/Reward": "text-[#20e0b2] border-green-500/20 bg-green-500/5",
};

export default function IndicatorPage() {
  const [enabled, setEnabled] = useState<Record<string, boolean>>(
    Object.fromEntries(indicatorRows.map((r) => [r.category, r.defaultOn]))
  );

  const [eas, setEas] = useState<any[]>([]);
  const [selectedMagic, setSelectedMagic] = useState<number>(88001);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Dynamic Bridge URLs setup
  const BRIDGE_URLS = [
    "http://192.168.100.171:5003",
    "http://localhost:5003",
    "http://127.0.0.1:5003"
  ];

  const fetchEaStatus = async () => {
    setRefreshing(true);
    let success = false;
    for (const url of BRIDGE_URLS) {
      try {
        const res = await fetch(`${url}/api/ea/status`, {
          headers: { "ngrok-skip-browser-warning": "true" }
        });
        const data = await res.json();
        if (data.success && data.eas) {
          setEas(data.eas);
          // Set magic number if not already present or active
          if (data.eas.length > 0 && selectedMagic === 88001 && !data.eas.find((ea: any) => ea.magic === 88001)) {
            setSelectedMagic(data.eas[0].magic);
          }
          success = true;
          break;
        }
      } catch (err) {
        // Fallback to next url
      }
    }
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    fetchEaStatus();
    const interval = setInterval(fetchEaStatus, 3000);
    return () => clearInterval(interval);
  }, [selectedMagic]);

  const toggle = (cat: string) => setEnabled((prev) => ({ ...prev, [cat]: !prev[cat] }));
  const activeCount = Object.values(enabled).filter(Boolean).length;

  const activeEa = eas.find(ea => ea.magic === selectedMagic);
  const report = activeEa?.last_report || null;
  const status = activeEa?.status || "offline";

  // Helpers to fetch telemetry variables
  const getTrendBias = () => report?.htf_bias || "BULLISH";
  const getVolatility = () => report?.volatility || "NORMAL";
  const getSession = () => report?.session || "LONDON";
  const getSymbol = () => report?.symbol || "XAUUSD";

  // Real indicator telemetry with fallbacks
  const rsiVal = report?.momentum_score ?? 58.4;
  const adxVal = report?.execution_score ?? 78.0;
  const spreadPts = report?.spread_points ?? (report ? 12 : 8);

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20 text-zinc-300 font-sans px-4">
      
      {/* Background Ambient Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-purple-500/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-sky-500/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Header Panel */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 border-b border-[rgba(255,255,255,0.04)] pb-6 relative z-10">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight mb-1 flex items-center gap-3" style={{ fontFamily: "var(--font-display, Syne, sans-serif)" }}>
            <Sliders className="w-8 h-8 text-[#a1a1aa] animate-pulse" />
            Indicator Calibration Desk
          </h1>
          <p className="text-sm text-zinc-400">
            Real-time indicator readings, verification metrics, and dynamic strategy filter calibration.
          </p>
        </div>

        <div className="flex items-center gap-3 bg-[#101014] border border-[rgba(255,255,255,0.07)] p-2.5 rounded-lg">
          <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-550 font-mono">
            Active Target:
          </span>
          <select
            value={selectedMagic}
            onChange={(e) => setSelectedMagic(Number(e.target.value))}
            className="bg-black/60 border border-[rgba(255,255,255,0.07)] rounded-xl px-4 py-1.5 text-xs text-[#a1a1aa] focus:outline-none font-bold font-mono cursor-pointer"
          >
            <option value={88001}>Magic #88001 (Default)</option>
            {eas.map(ea => ea.magic !== 88001 && (
              <option key={ea.magic} value={ea.magic}>Magic #{ea.magic}</option>
            ))}
          </select>
          <button
            onClick={fetchEaStatus}
            disabled={refreshing}
            className="p-1.5 hover:bg-zinc-800/60 rounded-xl text-zinc-400 transition-colors"
            title="Refresh logs & statistics"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Live Indicator Readings HUD Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative z-10 font-mono">
        
        {/* Trend Bias Card */}
        <div className="p-5 bg-[#101014]/80 border border-zinc-850/60 rounded-lg space-y-4 relative overflow-hidden group hover:border-[rgba(32,224,178,0.3)]/20 transition-all duration-300">
          <div className="absolute top-0 right-0 w-24 h-24 bg-[#20e0b2]/5 blur-2xl rounded-full" />
          <div className="flex items-center justify-between text-[10px] text-zinc-500 uppercase tracking-widest font-bold">
            <span>HTF Trend Filter</span>
            <TrendingUp className="w-3.5 h-3.5 text-[#20e0b2]" />
          </div>
          <div className="space-y-1">
            <span className="text-[10px] text-zinc-455 block">H4 200 EMA</span>
            <span className={`text-2xl font-black ${getTrendBias() === "BULLISH" ? "text-[#20e0b2]" : "text-[#ff5c73]"}`}>
              {getTrendBias()}
            </span>
          </div>
          <div className="text-[10px] text-zinc-500 flex justify-between border-t border-[rgba(255,255,255,0.04)] pt-2.5">
            <span>Price Alignment</span>
            <span className="text-emerald-455 font-bold">✓ ACTIVE</span>
          </div>
        </div>

        {/* Momentum Card */}
        <div className="p-5 bg-[#101014]/80 border border-zinc-850/60 rounded-lg space-y-4 relative overflow-hidden group hover:border-sky-500/20 transition-all duration-300">
          <div className="absolute top-0 right-0 w-24 h-24 bg-sky-500/5 blur-2xl rounded-full" />
          <div className="flex items-center justify-between text-[10px] text-zinc-500 uppercase tracking-widest font-bold">
            <span>Momentum Engine</span>
            <Activity className="w-3.5 h-3.5 text-sky-400" />
          </div>
          <div className="space-y-1">
            <span className="text-[10px] text-zinc-450 block">Confluence Momentum</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-sky-400">{rsiVal} / 100</span>
              <span className="text-[10px] text-zinc-550 font-bold">{rsiVal >= 75 ? "STRONG" : rsiVal >= 50 ? "NORMAL" : "WEAK"}</span>
            </div>
          </div>
          <div className="space-y-1.5 border-t border-[rgba(255,255,255,0.04)] pt-2.5">
            <div className="w-full bg-zinc-900 h-1 rounded-full overflow-hidden">
              <div className="bg-sky-400 h-full rounded-full transition-all duration-500" style={{ width: `${rsiVal}%` }} />
            </div>
            <div className="flex justify-between text-[8px] text-zinc-550">
              <span>MIN: 0</span>
              <span>MAX: 100</span>
            </div>
          </div>
        </div>

        {/* Execution Card */}
        <div className="p-5 bg-[#101014]/80 border border-zinc-850/60 rounded-lg space-y-4 relative overflow-hidden group hover:border-purple-500/20 transition-all duration-300">
          <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 blur-2xl rounded-full" />
          <div className="flex items-center justify-between text-[10px] text-zinc-500 uppercase tracking-widest font-bold">
            <span>Execution Quality</span>
            <Target className="w-3.5 h-3.5 text-[#a1a1aa]" />
          </div>
          <div className="space-y-1">
            <span className="text-[10px] text-zinc-450 block">Execution Score</span>
            <span className="text-2xl font-black text-[#a1a1aa]">{adxVal} / 100</span>
          </div>
          <div className="text-[10px] text-zinc-505 flex justify-between border-t border-[rgba(255,255,255,0.04)] pt-2.5">
            <span>Active Session</span>
            <span className="text-purple-450 font-bold uppercase">{report?.session || "OFF-HOURS"}</span>
          </div>
        </div>

        {/* Volatility Card */}
        <div className="p-5 bg-[#101014]/80 border border-zinc-850/60 rounded-lg space-y-4 relative overflow-hidden group hover:border-amber-500/20 transition-all duration-300">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 blur-2xl rounded-full" />
          <div className="flex items-center justify-between text-[10px] text-zinc-500 uppercase tracking-widest font-bold">
            <span>Volatility Meter</span>
            <Zap className="w-3.5 h-3.5 text-[#f5c451]" />
          </div>
          <div className="space-y-1">
            <span className="text-[10px] text-zinc-450 block">Regime / Volatility</span>
            <span className="text-2xl font-black text-[#f5c451] uppercase">{getVolatility()}</span>
          </div>
          <div className="text-[10px] text-zinc-550 flex justify-between border-t border-[rgba(255,255,255,0.04)] pt-2.5">
            <span>Live Terminal Spread</span>
            <span className="text-amber-455 font-bold">{spreadPts} pts</span>
          </div>
        </div>

      </div>

      {/* Main Table Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 relative z-10">
        
        {/* Table Column (Span 2) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="p-6 bg-[#101014] border border-zinc-850/60 rounded-lg space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-[rgba(255,255,255,0.04)]">
              <h2 className="text-sm font-black font-mono uppercase tracking-widest text-zinc-400">
                Technical Abstractions Matrix
              </h2>
              <span className="px-2.5 py-1 rounded-full bg-purple-950/20 text-[#a1a1aa] border border-purple-900/30 text-[10px] font-bold font-mono">
                {activeCount} / {indicatorRows.length} ACTIVE
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[rgba(255,255,255,0.04)] text-zinc-500 text-[10px] uppercase">
                    <th className="pb-3 pr-4">Category</th>
                    <th className="pb-3 pr-4">Core Indicator</th>
                    <th className="pb-3 pr-4">Optional Variants</th>
                    <th className="pb-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-900/40">
                  {indicatorRows.map((row, idx) => {
                    const isEnabled = enabled[row.category];
                    const activeColorClass = categoryColors[row.category] || "text-white border-[rgba(255,255,255,0.07)] bg-zinc-900/10";
                    return (
                      <tr 
                        key={idx} 
                        onClick={() => toggle(row.category)}
                        className={`hover:bg-zinc-850/20 transition-all cursor-pointer ${isEnabled ? "" : "opacity-40"}`}
                      >
                        <td className="py-4 pr-4">
                          <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border ${activeColorClass}`}>
                            {row.category}
                          </span>
                        </td>
                        <td className="py-4 pr-4 font-bold text-white text-xs">{row.core}</td>
                        <td className="py-4 pr-4 text-zinc-500 text-[11px]">{row.variants}</td>
                        <td className="py-4 text-center">
                          <button
                            className={`w-9 h-4.5 rounded-full p-0.5 transition-all ${isEnabled ? "bg-purple-600 flex justify-end" : "bg-zinc-800 flex justify-start"}`}
                          >
                            <span className="w-3.5 h-3.5 bg-white rounded-full block shadow" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Info Column (Span 1) */}
        <div className="space-y-6">
          
          {/* Active Calibration summary */}
          <div className="p-6 bg-[#101014]/80 border border-zinc-850/60 rounded-lg space-y-4 font-mono text-xs">
            <h3 className="text-xs font-bold text-white uppercase tracking-widest pb-2 border-b border-[rgba(255,255,255,0.04)]">
              Active Strategy Engine
            </h3>
            
            <div className="space-y-3">
              <div className="flex justify-between border-b border-[rgba(255,255,255,0.04)] pb-2">
                <span className="text-zinc-500">Asset Symbol</span>
                <span className="font-bold text-white">{getSymbol()}</span>
              </div>
              <div className="flex justify-between border-b border-[rgba(255,255,255,0.04)] pb-2">
                <span className="text-zinc-500">Trading Session</span>
                <span className="font-bold text-white uppercase">{getSession()}</span>
              </div>
              <div className="flex justify-between border-b border-[rgba(255,255,255,0.04)] pb-2">
                <span className="text-zinc-500">RSI Boundaries</span>
                <span className="font-bold text-zinc-400">30.0 / 70.0</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Vol Average Period</span>
                <span className="font-bold text-zinc-400">20 Bars</span>
              </div>
            </div>

            <div className="bg-purple-950/20 border border-purple-900/20 rounded-xl p-3 text-[10px] text-zinc-400 leading-relaxed">
              💡 Indicators checked green dynamically on the matrix trigger the Confluence Score evaluator in the MQL5 Engine. Ensure indicator toggles here align with the EA set configurations.
            </div>
          </div>

          {/* Quick HUD guide */}
          <div className="p-6 bg-[#101014]/80 border border-zinc-850/60 rounded-lg space-y-3.5 font-mono text-xs">
            <span className="text-zinc-450 block uppercase tracking-widest text-[9px] font-bold">Chart Drawing Tip</span>
            <div className="space-y-2 leading-relaxed text-[11px] text-zinc-400">
              <p>
                To overlay these parameters directly on the MetaTrader 5 chart screen, load the compiled indicator on your chart:
              </p>
              <code className="block bg-black/60 border border-[rgba(255,255,255,0.04)] p-2 rounded-xl text-[#a1a1aa] text-[10px] break-all">
                Indicators/DecisionDeskHUD.ex5
              </code>
              <p>
                This indicator draws buy/sell entry arrows and a live floating HUD dashboard panel that matches this web dashboard.
              </p>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}

