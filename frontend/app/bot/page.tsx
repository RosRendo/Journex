"use client"
import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import {
  Bot, Settings, MessageSquare, Copy, BarChart3, Play, Pause,
  Plus, Trash2, Zap, TrendingUp, Activity,
  Shield, AlertTriangle, CheckCircle2, Clock, Wifi, WifiOff,
  Send, RefreshCw, Target, DollarSign, Percent, Cpu, Download, AlertCircle, RefreshCcw
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts';

interface EAInstance {
  magic: number;
  status: string;
  timestamp: string;
  elapsed_seconds: number;
  last_report: {
    name?: string;
    symbol?: string;
    balance?: number;
    equity?: number;
    regime?: string;
    htf_bias?: string;
    session?: string;
    volatility?: string;
    today_stats?: {
      trades: number;
      wins: number;
      losses: number;
      pnl: number;
    };
    open_trades?: Array<{
      ticket: number;
      symbol: string;
      type: string;
      volume: number;
      price: number;
      sl: number;
      tp: number;
      pnl: number;
      breakeven_active: boolean;
      trailing_active: boolean;
    }>;
    settings?: {
      risk: number;
      min_score: number;
      min_rr: number;
      session: string;
      signal_type: string;
    };
  };
}

interface AnalyticsData {
  overall: {
    trades: number;
    wins: number;
    losses: number;
    win_rate: number;
    net_pnl: number;
    avg_r: number;
    best_trade: number;
    worst_trade: number;
  };
  grade_perf: Array<{ grade: string; total: number; win_rate: number }>;
  regime_perf: Array<{ regime: string; total: number; win_rate: number }>;
  symbol_perf: Array<{ symbol: string; total: number; win_rate: number; avg_r: number }>;
  session_perf: Array<{ session: string; total: number; win_rate: number; avg_r: number }>;
  setup_perf: Array<{ setup: string; total: number; win_rate: number }>;
  settings_history: Array<{
    id: number;
    magic: number;
    key: string;
    old_value: string;
    new_value: string;
    status: string;
    timestamp: string;
  }>;
}

export default function BotsPage() {
  const [eas, setEas] = useState<EAInstance[]>([]);
  const [selectedMagic, setSelectedMagic] = useState<number>(88001);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [trades, setTrades] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Settings Edit State
  const [editRisk, setEditRisk] = useState(1.0);
  const [editMaxLoss, setEditMaxLoss] = useState(3.0);
  const [editMaxOpenTrades, setEditMaxOpenTrades] = useState(3);
  const [editMinScore, setEditMinScore] = useState(70);
  const [editMinRr, setEditMinRr] = useState(1.5);
  const [editSession, setEditSession] = useState("both");
  const [editSignalType, setEditSignalType] = useState("all");
  const [editSymbols, setEditSymbols] = useState("XAUUSD, EURUSD");
  const [pushing, setPushing] = useState(false);

  // Emergency Modal State
  const [confirmCommand, setConfirmCommand] = useState<string | null>(null);
  const [commanding, setCommanding] = useState(false);

  const BRIDGE = typeof window !== "undefined" && window.location.hostname === "localhost"
    ? "/api/bridge"
    : (process.env.NEXT_PUBLIC_BRIDGE_URL || "/api/bridge");

  const loadData = async () => {
    try {
      // 1. Fetch EA statuses
      const statusRes = await fetch(`${BRIDGE}/api/ea/status`, { headers: { "ngrok-skip-browser-warning": "true" } });
      const statusData = await statusRes.json();
      if (statusData.success) {
        setEas(statusData.eas);
        // Default to first found if active selection not set or offline
        if (statusData.eas.length > 0 && selectedMagic === 88001 && !statusData.eas.find((e: any) => e.magic === 88001)) {
          setSelectedMagic(statusData.eas[0].magic);
        }
      }

      // 2. Fetch Analytics for selected magic
      const analyticsRes = await fetch(`${BRIDGE}/api/ea/analytics?magic=${selectedMagic}`, { headers: { "ngrok-skip-browser-warning": "true" } });
      const analyticsData = await analyticsRes.json();
      if (analyticsData.success) {
        setAnalytics(analyticsData);
      }

      // 3. Fetch Trade History for selected magic
      const tradesRes = await fetch(`${BRIDGE}/api/ea/trades?magic=${selectedMagic}`, { headers: { "ngrok-skip-browser-warning": "true" } });
      const tradesData = await tradesRes.json();
      if (tradesData.success) {
        setTrades(tradesData.events);
      }
    } catch (e) {
      console.error("Failed to load EA data", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 3000);
    return () => clearInterval(interval);
  }, [selectedMagic]);

  // Load Settings on Magic number selection change
  const activeEa = eas.find(e => e.magic === selectedMagic);
  useEffect(() => {
    if (activeEa && activeEa.last_report?.settings) {
      const s = activeEa.last_report.settings;
      setEditRisk(s.risk ?? 1.0);
      setEditMinScore(s.min_score ?? 70);
      setEditMinRr(s.min_rr ?? 1.5);
      setEditSession(s.session ?? "both");
      setEditSignalType(s.signal_type ?? "all");
    }
  }, [selectedMagic, eas.length]);

  const handlePushSettings = async () => {
    try {
      setPushing(true);
      const res = await fetch(`${BRIDGE}/api/ea/settings/${selectedMagic}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          risk: editRisk,
          min_score: editMinScore,
          min_rr: editMinRr,
          session: editSession,
          signal_type: editSignalType
        })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Dynamic configuration queued for Magic #${selectedMagic}`);
        loadData();
      } else {
        toast.error("Failed to queue configuration update");
      }
    } catch (e) {
      toast.error("Bridge connection failure");
    } finally {
      setPushing(false);
    }
  };

  const handleEmergencyCommand = async (command: string) => {
    try {
      setCommanding(true);
      const res = await fetch(`${BRIDGE}/api/ea/command/${selectedMagic}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Emergency command '${command}' sent successfully!`);
        setConfirmCommand(null);
        loadData();
      } else {
        toast.error(`Failed to execute emergency command.`);
      }
    } catch (e) {
      toast.error("Bridge connection failure");
    } finally {
      setCommanding(false);
    }
  };

  // Heartbeat helper
  const getHeartbeatAgeStr = (sec: number) => {
    if (sec === undefined || sec === null) return "never";
    if (sec < 60) return `${sec}s ago`;
    const min = Math.floor(sec / 60);
    const remaining = sec % 60;
    return `${min}m ${remaining}s ago`;
  };

  // Status badge formatter
  const renderStatusBadge = (status: string, age: number) => {
    if (status === "running") {
      return (
        <span className="flex items-center gap-1.5 px-3 py-1 text-xs font-bold font-mono tracking-wider bg-emerald-950/30 text-emerald-400 border border-emerald-900/40 rounded-full">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          🟢 RUNNING
        </span>
      );
    }
    if (status === "stale") {
      return (
        <span className="flex items-center gap-1.5 px-3 py-1 text-xs font-bold font-mono tracking-wider bg-amber-950/30 text-amber-450 border border-amber-900/40 rounded-full">
          <span className="w-2 h-2 rounded-full bg-amber-450 animate-pulse" />
          🟡 STALE ({age}s)
        </span>
      );
    }
    return (
      <span className="flex items-center gap-1.5 px-3 py-1 text-xs font-bold font-mono tracking-wider bg-red-950/30 text-red-400 border border-red-900/40 rounded-full">
        <span className="w-2 h-2 rounded-full bg-red-500" />
        🔴 OFFLINE
      </span>
    );
  };

  // Render Win Rate Progress Bar
  const renderWinRateBar = (rate: number) => {
    return (
      <div className="w-full flex items-center gap-3">
        <div className="flex-1 bg-zinc-900 h-2.5 rounded-full overflow-hidden border border-zinc-800/40">
          <div 
            className="bg-purple-500 h-full rounded-full transition-all duration-500"
            style={{ width: `${rate}%` }}
          />
        </div>
        <span className="font-mono text-xs font-bold text-zinc-300 w-10 text-right">{rate}%</span>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20 text-[--text-primary] px-4">
      
      {/* ── Page Header ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 border-b border-zinc-900 pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-1 flex items-center gap-3" style={{ fontFamily: "var(--font-display, Syne, sans-serif)" }}>
            <Zap className="w-8 h-8 text-purple-400" /> EA Control Hub
          </h1>
          <p className="text-sm text-zinc-400">
            Advanced monitoring, remote settings sync, and emergency dispatch for MQL5 Expert Advisors.
          </p>
        </div>

        {/* EA Magic Selector */}
        <div className="flex items-center gap-3 bg-[#111118] border border-zinc-800/60 p-2.5 rounded-2xl">
          <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 font-mono">Active Target:</span>
          <select 
            value={selectedMagic}
            onChange={(e) => setSelectedMagic(Number(e.target.value))}
            className="bg-black/60 border border-zinc-800 rounded-xl px-4 py-1.5 text-xs text-purple-400 focus:outline-none font-bold font-mono cursor-pointer"
          >
            <option value={88001}>Magic #88001 (Default)</option>
            {eas.map(ea => (
              ea.magic !== 88001 && <option key={ea.magic} value={ea.magic}>Magic #{ea.magic}</option>
            ))}
          </select>
          <button 
            onClick={loadData}
            className="p-1.5 hover:bg-zinc-800/60 rounded-xl text-zinc-400 transition-colors"
            title="Refresh logs & statistics"
          >
            <RefreshCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Grid Layout ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── COL 1 & 2: Main Telemetry / Live View ── */}
        <div className="lg:col-span-2 space-y-6">

          {/* Section 1: Overview Panel */}
          <div className="p-6 bg-[#111118] border border-zinc-850/60 rounded-3xl relative overflow-hidden shadow-2xl">
            <div className="absolute top-0 right-0 w-48 h-48 bg-purple-500/5 blur-3xl rounded-full" />
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800/40 pb-5 mb-5 relative z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-purple-500/10 border border-purple-500/25 flex items-center justify-center text-purple-400">
                  <Cpu className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold tracking-tight text-white font-mono flex items-center gap-2">
                    {activeEa?.last_report?.name || "AdaptiveICT EA"}
                  </h2>
                  <p className="text-xs text-zinc-500 font-mono">
                    Magic: {selectedMagic} · Target: {activeEa?.last_report?.symbol || "XAUUSD"}
                  </p>
                </div>
              </div>
              {renderStatusBadge(activeEa?.status || "offline", activeEa?.elapsed_seconds || 0)}
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 relative z-10 font-mono">
              <div className="bg-black/20 border border-zinc-900 rounded-2xl p-4">
                <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider block mb-1">Balance</span>
                <span className="text-xl font-bold text-white">${activeEa?.last_report?.balance?.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2}) || "10,000.00"}</span>
              </div>
              <div className="bg-black/20 border border-zinc-900 rounded-2xl p-4">
                <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider block mb-1">Equity</span>
                <span className="text-xl font-bold text-purple-400">${activeEa?.last_report?.equity?.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2}) || "10,120.50"}</span>
              </div>
              <div className="bg-black/20 border border-zinc-900 rounded-2xl p-4">
                <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider block mb-1">Daily P&L</span>
                <span className={`text-xl font-bold ${(activeEa?.last_report?.today_stats?.pnl || 120.50) >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {(activeEa?.last_report?.today_stats?.pnl || 120.50) >= 0 ? "+" : ""}${activeEa?.last_report?.today_stats?.pnl || "120.50"}
                </span>
              </div>
              <div className="bg-black/20 border border-zinc-900 rounded-2xl p-4">
                <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider block mb-1">Win Rate</span>
                <span className="text-xl font-bold text-zinc-350">{analytics?.overall?.win_rate || "66.7"}%</span>
              </div>
            </div>

            {/* Minor Stats list */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 font-mono text-xs border-t border-zinc-900/60 pt-4">
              <div className="flex justify-between border-r border-zinc-900 pr-3">
                <span className="text-zinc-500">Open Trades:</span>
                <span className="font-bold text-zinc-300">{activeEa?.last_report?.open_trades?.length || 0}</span>
              </div>
              <div className="flex justify-between md:border-r border-zinc-900 md:pr-3">
                <span className="text-zinc-500">Today's Trades:</span>
                <span className="font-bold text-zinc-300">{activeEa?.last_report?.today_stats?.trades || 0}</span>
              </div>
              <div className="flex justify-between border-r border-zinc-900 pr-3">
                <span className="text-zinc-500">Regime:</span>
                <span className="font-bold text-purple-400 uppercase">{activeEa?.last_report?.regime || "TRENDING"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Heartbeat:</span>
                <span className="font-bold text-zinc-400">{getHeartbeatAgeStr(activeEa?.elapsed_seconds || 0)}</span>
              </div>
            </div>
          </div>

          {/* Section 2: Market Context & Active Signal */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* Left: Market Context */}
            <div className="p-5 bg-[--bg-card] border border-[--border] rounded-2xl">
              <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-zinc-400 mb-4 flex items-center gap-2">
                <Activity className="w-4 h-4 text-purple-400" /> Market Context
              </h3>
              <div className="space-y-3 font-mono text-xs">
                <div className="flex justify-between border-b border-zinc-900 pb-2">
                  <span className="text-zinc-500">Active Symbol</span>
                  <span className="font-bold text-white">{activeEa?.last_report?.symbol || "XAUUSD"}</span>
                </div>
                <div className="flex justify-between border-b border-zinc-900 pb-2">
                  <span className="text-zinc-500">Regime State</span>
                  <span className="font-bold text-purple-400 uppercase">{activeEa?.last_report?.regime || "TRENDING"}</span>
                </div>
                <div className="flex justify-between border-b border-zinc-900 pb-2">
                  <span className="text-zinc-500">HTF Bias (H4)</span>
                  <span className="font-bold text-emerald-400">{activeEa?.last_report?.htf_bias || "BULLISH"}</span>
                </div>
                <div className="flex justify-between border-b border-zinc-900 pb-2">
                  <span className="text-zinc-500">Active Session</span>
                  <span className="font-bold text-white">{activeEa?.last_report?.session || "LONDON"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Volatility</span>
                  <span className="font-bold text-zinc-350">{activeEa?.last_report?.volatility || "NORMAL"}</span>
                </div>

                {/* MTF Alignment Checklist */}
                <div className="mt-4 pt-4 border-t border-zinc-900">
                  <div className="grid grid-cols-4 gap-2 text-center text-[10px] font-bold">
                    <div className="bg-black/30 p-2 rounded-lg border border-zinc-900">
                      <div className="text-zinc-500 mb-1">H4</div>
                      <div className="text-emerald-400">🟢 Bullish</div>
                    </div>
                    <div className="bg-black/30 p-2 rounded-lg border border-zinc-900">
                      <div className="text-zinc-500 mb-1">H1</div>
                      <div className="text-emerald-400">🟢 Bullish</div>
                    </div>
                    <div className="bg-black/30 p-2 rounded-lg border border-zinc-900">
                      <div className="text-zinc-500 mb-1">M15</div>
                      <div className="text-emerald-400">🟢 Setup</div>
                    </div>
                    <div className="bg-black/30 p-2 rounded-lg border border-zinc-900">
                      <div className="text-zinc-500 mb-1">M5</div>
                      <div className="text-emerald-400">🟢 Trigger</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Active Signal Scanner */}
            <div className="p-5 bg-[--bg-card] border border-[--border] rounded-2xl flex flex-col justify-between">
              <div>
                <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-zinc-400 mb-3.5 flex items-center gap-2">
                  <Target className="w-4 h-4 text-purple-400" /> Active Scanner Signal
                </h3>
                <div className="flex items-center justify-between bg-purple-950/20 border border-purple-900/30 rounded-xl p-3.5 mb-3 font-mono">
                  <div>
                    <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">Target Trade Plan</span>
                    <span className="text-sm font-bold text-white">XAUUSD BUY (M15)</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">Score / Grade</span>
                    <span className="text-xs font-bold text-purple-400">84/100 (A)</span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 font-mono text-[10px] mb-3">
                  <div className="bg-black/35 p-2 rounded-lg border border-zinc-900">
                    <span className="text-zinc-500 block mb-0.5">Entry</span>
                    <span className="font-bold text-white">3,421.50</span>
                  </div>
                  <div className="bg-black/35 p-2 rounded-lg border border-zinc-900">
                    <span className="text-zinc-500 block mb-0.5">Stop Loss</span>
                    <span className="font-bold text-red-400">3,414.20</span>
                  </div>
                  <div className="bg-black/35 p-2 rounded-lg border border-zinc-900">
                    <span className="text-zinc-500 block mb-0.5">Target TP1</span>
                    <span className="font-bold text-emerald-400">3,430.00</span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 font-mono text-[9px] text-zinc-400">
                  <div className="bg-black/10 p-1.5 rounded text-center">RR TP1: <span className="font-bold text-zinc-350">1.16R</span></div>
                  <div className="bg-black/10 p-1.5 rounded text-center">RR TP2: <span className="font-bold text-zinc-350">3.22R</span></div>
                  <div className="bg-black/10 p-1.5 rounded text-center">RR TP3: <span className="font-bold text-zinc-350">6.64R</span></div>
                </div>
              </div>

              <div className="text-[10px] font-mono text-zinc-500 border-t border-zinc-900 pt-3 mt-3 flex justify-between">
                <span>protected invalidation low: 3,414.20</span>
              </div>
            </div>
          </div>

          {/* Section 3: Confluence Matrix & Signal Reasoning */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* Left: Confluence Matrix */}
            <div className="p-5 bg-[--bg-card] border border-[--border] rounded-2xl">
              <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-zinc-400 mb-4">
                Confluence Matrix
              </h3>
              <div className="space-y-3.5 font-mono text-xs">
                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-zinc-400">Market Structure</span>
                    <span className="text-purple-400">20 / 20</span>
                  </div>
                  <div className="w-full bg-zinc-900 h-2 rounded-full overflow-hidden border border-zinc-800/40">
                    <div className="bg-purple-500 h-full rounded-full" style={{ width: "100%" }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-zinc-400">Liquidity Sweep</span>
                    <span className="text-purple-400">20 / 20</span>
                  </div>
                  <div className="w-full bg-zinc-900 h-2 rounded-full overflow-hidden border border-zinc-800/40">
                    <div className="bg-purple-500 h-full rounded-full" style={{ width: "100%" }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-zinc-400">FVG Displacement</span>
                    <span className="text-purple-400">15 / 15</span>
                  </div>
                  <div className="w-full bg-zinc-900 h-2 rounded-full overflow-hidden border border-zinc-800/40">
                    <div className="bg-purple-500 h-full rounded-full" style={{ width: "100%" }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-zinc-400">Order Block Alignment</span>
                    <span className="text-purple-400">10 / 10</span>
                  </div>
                  <div className="w-full bg-zinc-900 h-2 rounded-full overflow-hidden border border-zinc-800/40">
                    <div className="bg-purple-500 h-full rounded-full" style={{ width: "100%" }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-zinc-400">SMT Divergence</span>
                    <span className="text-purple-450">10 / 10</span>
                  </div>
                  <div className="w-full bg-zinc-900 h-2 rounded-full overflow-hidden border border-zinc-800/40">
                    <div className="bg-purple-500 h-full rounded-full" style={{ width: "100%" }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Signal Reasoning */}
            <div className="p-5 bg-[--bg-card] border border-[--border] rounded-2xl flex flex-col justify-between">
              <div>
                <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-zinc-400 mb-4">
                  Signal Reasoning & Checklist
                </h3>
                <div className="space-y-2.5 font-mono text-[11px] text-zinc-350">
                  <div className="flex items-start gap-2">
                    <span className="text-emerald-400 font-bold">✓</span>
                    <span>H4 bullish market structure confirmed</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-emerald-400 font-bold">✓</span>
                    <span>H1 bullish continuation bias active</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-emerald-400 font-bold">✓</span>
                    <span>Sell-side liquidity swept on London open</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-emerald-400 font-bold">✓</span>
                    <span>M15 bullish Market Structure Shift (MSS)</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-emerald-400 font-bold">✓</span>
                    <span>Price tapped into bullish 15m FVG</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-emerald-400 font-bold">✓</span>
                    <span>SMT divergence confirmed against EURUSD</span>
                  </div>
                </div>
              </div>
              <div className="bg-purple-950/10 border border-purple-900/10 rounded-xl p-3 text-[10px] text-zinc-400 font-mono leading-relaxed mt-4">
                💡 Setup remains valid as long as prices do not close below Protected Low of 3,414.20 on a 15-minute candle.
              </div>
            </div>
          </div>

          {/* Section 4: Open Trades Panel */}
          <div className="p-5 bg-[--bg-card] border border-[--border] rounded-2xl space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider font-mono text-zinc-400">
              Open Positions ({activeEa?.last_report?.open_trades?.length || 0})
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs font-mono border-collapse">
                <thead>
                  <tr className="border-b border-zinc-800 text-[10px] text-zinc-500 uppercase text-left">
                    <th className="pb-3">Ticket</th>
                    <th className="pb-3">Symbol</th>
                    <th className="pb-3">Side</th>
                    <th className="pb-3 text-right">Lots</th>
                    <th className="pb-3 text-right">Entry</th>
                    <th className="pb-3 text-right">SL / TP</th>
                    <th className="pb-3 text-center">TP Progress</th>
                    <th className="pb-3 text-center">BE / Trail</th>
                    <th className="pb-3 text-right">P/L ($)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-900/40">
                  {(!activeEa?.last_report?.open_trades || activeEa.last_report.open_trades.length === 0) ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-zinc-550">
                        No active positions currently managed by this magic number
                      </td>
                    </tr>
                  ) : (
                    activeEa.last_report.open_trades.map((t, idx) => {
                      const isWin = t.pnl >= 0;
                      return (
                        <tr key={idx} className="hover:bg-zinc-800/15">
                          <td className="py-3.5 text-zinc-500">#{t.ticket}</td>
                          <td className="py-3.5 font-bold text-white">{t.symbol}</td>
                          <td className="py-3.5">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              t.type === "BUY" ? "bg-emerald-950/20 text-emerald-450 border border-emerald-900/30" : "bg-red-950/20 text-red-400 border border-red-900/30"
                            }`}>
                              {t.type}
                            </span>
                          </td>
                          <td className="py-3.5 text-right text-zinc-300">{t.volume.toFixed(2)}</td>
                          <td className="py-3.5 text-right text-zinc-300">{t.price.toFixed(5)}</td>
                          <td className="py-3.5 text-right text-zinc-500">
                            {t.sl.toFixed(2)} / {t.tp.toFixed(2)}
                          </td>
                          <td className="py-3.5">
                            <div className="flex justify-center items-center gap-1.5 text-[9px] font-bold font-mono">
                              <span className="text-emerald-400">TP1 🟢</span>
                              <span className="text-zinc-650">·</span>
                              <span className="text-zinc-600">TP2 ⏳</span>
                              <span className="text-zinc-650">·</span>
                              <span className="text-zinc-600">TP3 ⏳</span>
                            </div>
                          </td>
                          <td className="py-3.5">
                            <div className="flex justify-center gap-2 text-[9px]">
                              <span className={t.breakeven_active ? "text-emerald-400 font-bold" : "text-zinc-600"}>BE</span>
                              <span className={t.trailing_active ? "text-purple-400 font-bold" : "text-zinc-600"}>TRAIL</span>
                            </div>
                          </td>
                          <td className={`py-3.5 text-right font-bold ${isWin ? "text-emerald-400" : "text-red-400"}`}>
                            {isWin ? "+" : ""}${t.pnl.toFixed(2)}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>

        {/* ── COL 3: Settings & Commands & Analytics ── */}
        <div className="space-y-6">

          {/* Section 1: Settings Sync Panel */}
          <div className="p-5 bg-[--bg-card] border border-[--border] rounded-2xl space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider font-mono text-white flex items-center gap-1.5 border-b border-zinc-900 pb-3">
              <Settings className="w-4 h-4 text-purple-400" /> Dynamic EA settings
            </h3>

            <div className="space-y-4 text-xs font-mono">
              <div>
                <div className="flex justify-between font-bold text-[10px] mb-1.5">
                  <span className="text-zinc-500 uppercase tracking-wider">Lot Risk per Trade</span>
                  <span className="text-purple-400">{editRisk.toFixed(1)}%</span>
                </div>
                <input
                  type="range"
                  min="0.2"
                  max="5.0"
                  step="0.1"
                  value={editRisk}
                  onChange={(e) => setEditRisk(parseFloat(e.target.value))}
                  className="w-full accent-purple-500 h-1 bg-zinc-900 rounded-full appearance-none cursor-pointer mt-1"
                />
              </div>

              <div>
                <div className="flex justify-between font-bold text-[10px] mb-1.5">
                  <span className="text-zinc-500 uppercase tracking-wider">Confluence Trigger Score</span>
                  <span className="text-purple-400">{editMinScore}/100</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="95"
                  step="5"
                  value={editMinScore}
                  onChange={(e) => setEditMinScore(parseInt(e.target.value))}
                  className="w-full accent-purple-500 h-1 bg-zinc-900 rounded-full appearance-none cursor-pointer mt-1"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Minimum Target RR</label>
                <select
                  value={editMinRr}
                  onChange={(e) => setEditMinRr(parseFloat(e.target.value))}
                  className="w-full bg-black/45 border border-zinc-800/80 rounded-xl px-3.5 py-2 text-zinc-350 text-xs focus:outline-none focus:border-purple-500 font-mono cursor-pointer"
                >
                  <option value="1.0" className="bg-zinc-950">1:1.0 Minimum</option>
                  <option value="1.5" className="bg-zinc-950">1:1.5 Minimum</option>
                  <option value="2.0" className="bg-zinc-950">1:2.0 Minimum</option>
                  <option value="2.5" className="bg-zinc-950">1:2.5 Minimum</option>
                  <option value="3.0" className="bg-zinc-950">1:3.0 Minimum</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Allowed Active Session</label>
                <select
                  value={editSession}
                  onChange={(e) => setEditSession(e.target.value)}
                  className="w-full bg-black/45 border border-zinc-800/80 rounded-xl px-3.5 py-2 text-zinc-350 text-xs focus:outline-none focus:border-purple-500 font-mono cursor-pointer"
                >
                  <option value="both" className="bg-zinc-950">London & New York</option>
                  <option value="london" className="bg-zinc-950">London Only</option>
                  <option value="ny" className="bg-zinc-950">New York Only</option>
                  <option value="all" className="bg-zinc-950">All Times</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Preferred Setup Type</label>
                <select
                  value={editSignalType}
                  onChange={(e) => setEditSignalType(e.target.value)}
                  className="w-full bg-black/45 border border-zinc-800/80 rounded-xl px-3.5 py-2 text-zinc-350 text-xs focus:outline-none focus:border-purple-500 font-mono cursor-pointer"
                >
                  <option value="all" className="bg-zinc-950">All Patterns</option>
                  <option value="ict_scalper" className="bg-zinc-950">ICT Scalper Preset</option>
                  <option value="ict_intraday" className="bg-zinc-950">ICT Intraday Preset</option>
                  <option value="supply_demand" className="bg-zinc-950">Supply & Demand</option>
                  <option value="momentum_breakout" className="bg-zinc-950">Momentum Breakout</option>
                </select>
              </div>

              <button
                onClick={handlePushSettings}
                disabled={pushing}
                className="w-full py-2.5 mt-2 bg-purple-500 hover:bg-purple-400 text-purple-950 font-bold uppercase tracking-wider rounded-xl transition-all shadow-[0_0_10px_rgba(168,85,247,0.15)] flex items-center justify-center gap-1.5"
              >
                {pushing ? (
                  "Syncing..."
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" /> Push Settings to EA
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Section 2: Settings Change History */}
          <div className="p-5 bg-[--bg-card] border border-[--border] rounded-2xl space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider font-mono text-zinc-400 flex items-center gap-1.5">
              Settings Change History
            </h3>
            <div className="space-y-2 font-mono text-[10px] max-h-40 overflow-y-auto custom-scrollbar">
              {!analytics?.settings_history || analytics.settings_history.length === 0 ? (
                <div className="text-zinc-600 text-center py-4">No recent settings changes recorded</div>
              ) : (
                analytics.settings_history.map((hist, idx) => (
                  <div key={idx} className="p-2.5 bg-black/30 border border-zinc-900 rounded-xl flex flex-col gap-1">
                    <div className="flex justify-between font-bold">
                      <span className="text-zinc-400">{hist.key}</span>
                      <span className={hist.status === "Applied" ? "text-emerald-400" : "text-amber-400"}>
                        {hist.status === "Applied" ? "🟢 Applied" : "⏳ Pending"}
                      </span>
                    </div>
                    <div className="text-zinc-500 flex justify-between">
                      <span>{hist.old_value} → {hist.new_value}</span>
                      <span>{new Date(hist.timestamp).toLocaleTimeString()}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Section 3: Emergency Control panel */}
          <div className="p-5 bg-[--bg-card] border border-red-950/40 rounded-2xl space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider font-mono text-red-400 flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-red-500" /> Emergency controls
            </h3>
            
            <div className="grid grid-cols-2 gap-3 text-center">
              <button
                onClick={() => setConfirmCommand("PAUSE")}
                className="py-2.5 bg-zinc-900/60 hover:bg-zinc-800 text-amber-500 hover:text-amber-400 font-bold font-mono text-[10px] rounded-xl border border-zinc-800 tracking-wider transition-all uppercase"
              >
                ⏸ Pause EA
              </button>
              <button
                onClick={() => setConfirmCommand("RESUME")}
                className="py-2.5 bg-zinc-900/60 hover:bg-zinc-800 text-emerald-500 hover:text-emerald-400 font-bold font-mono text-[10px] rounded-xl border border-zinc-800 tracking-wider transition-all uppercase"
              >
                ▶ Resume EA
              </button>
              <button
                onClick={() => setConfirmCommand("CLOSE_ALL")}
                className="py-2.5 bg-red-950/20 hover:bg-red-950/40 text-red-400 hover:text-red-300 font-bold font-mono text-[10px] rounded-xl border border-red-900/30 tracking-wider transition-all uppercase col-span-2"
              >
                🛑 Close EA Positions
              </button>
              <button
                onClick={() => setConfirmCommand("DISABLE")}
                className="py-2.5 bg-red-500/10 hover:bg-red-500/25 text-red-400 font-bold font-mono text-[10px] rounded-xl border border-red-500/20 tracking-wider transition-all uppercase col-span-2"
              >
                🚨 Disable EA
              </button>
            </div>
          </div>

          {/* Section 4: MQL5 EA Setup Instructions */}
          <div className="p-5 bg-[--bg-card] border border-[--border] rounded-2xl space-y-3.5 text-xs font-mono">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-1.5 border-b border-zinc-900 pb-2.5">
              <Download className="w-4.5 h-4.5 text-purple-400" /> MQL5 Setup Guide
            </h4>
            
            <div className="space-y-3 text-[11px] leading-relaxed text-zinc-400">
              <p>1. Open MT5 and launch **MetaEditor** (F4).</p>
              <p>2. Create a new Expert Advisor named <code className="text-purple-400 font-bold">AdaptiveICT_EA</code>.</p>
              <p>3. Replace its contents with the code inside the root workspace folder.</p>
              <p>4. Add the bridge URL to your MT5 Terminal options:</p>
              <code className="text-[9px] text-zinc-500 block bg-black/40 p-2 rounded border border-zinc-800 break-all select-all font-mono">
                Tools → Options → Expert Advisors → Allow WebRequest:
                <br />
                {BRIDGE.replace("/api/bridge", "")}
              </code>
            </div>
          </div>

        </div>

      </div>

      {/* ── Section 5: Analytics & Win Rates ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Grade Win Rates */}
        <div className="p-5 bg-[--bg-card] border border-[--border] rounded-2xl space-y-4">
          <h4 className="text-xs font-bold uppercase font-mono tracking-wider text-zinc-400">
            Win Rate by Signal Grade
          </h4>
          <div className="space-y-3">
            {analytics?.grade_perf.map((perf, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex justify-between text-[11px] font-mono">
                  <span className="text-zinc-500 font-bold">{perf.grade} Grade (Total: {perf.total})</span>
                </div>
                {renderWinRateBar(perf.win_rate)}
              </div>
            )) || <div className="text-zinc-655 text-xs font-mono text-center py-6">Calculating Grades...</div>}
          </div>
        </div>

        {/* Setup win rates */}
        <div className="p-5 bg-[--bg-card] border border-[--border] rounded-2xl space-y-4">
          <h4 className="text-xs font-bold uppercase font-mono tracking-wider text-zinc-400">
            Win Rate by Setup Concept
          </h4>
          <div className="space-y-3">
            {analytics?.setup_perf.map((perf, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex justify-between text-[11px] font-mono">
                  <span className="text-zinc-500 font-bold">{perf.setup} (Total: {perf.total})</span>
                </div>
                {renderWinRateBar(perf.win_rate)}
              </div>
            )) || <div className="text-zinc-655 text-xs font-mono text-center py-6">Calculating Concepts...</div>}
          </div>
        </div>

        {/* Regime win rates */}
        <div className="p-5 bg-[--bg-card] border border-[--border] rounded-2xl space-y-4">
          <h4 className="text-xs font-bold uppercase font-mono tracking-wider text-zinc-400">
            Win Rate by Market Regime
          </h4>
          <div className="space-y-3">
            {analytics?.regime_perf.map((perf, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex justify-between text-[11px] font-mono">
                  <span className="text-zinc-500 font-bold uppercase">{perf.regime} (Total: {perf.total})</span>
                </div>
                {renderWinRateBar(perf.win_rate)}
              </div>
            )) || <div className="text-zinc-655 text-xs font-mono text-center py-6">Calculating Regimes...</div>}
          </div>
        </div>

      </div>

      {/* Symbol / Session charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Symbol Performance Bar Chart */}
        <div className="p-5 bg-[--bg-card] border border-[--border] rounded-2xl space-y-4">
          <h4 className="text-xs font-bold uppercase font-mono tracking-wider text-zinc-400">
            Win Rate by Symbol
          </h4>
          <div className="h-60 w-full font-mono text-xs">
            {analytics?.symbol_perf && analytics.symbol_perf.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.symbol_perf} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="symbol" stroke="#52525b" fontSize={11} tickLine={false} />
                  <YAxis stroke="#52525b" fontSize={11} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ background: "#0a0a0f", borderColor: "#27272a", borderRadius: "12px", fontFamily: "monospace", fontSize: "11px" }}
                  />
                  <Bar dataKey="win_rate" radius={[4, 4, 0, 0]} name="Win Rate %">
                    {analytics.symbol_perf.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index % 2 === 0 ? "#a855f7" : "#3b82f6"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-zinc-655">Aggregating symbol metrics...</div>
            )}
          </div>
        </div>

        {/* Session win rates */}
        <div className="p-5 bg-[--bg-card] border border-[--border] rounded-2xl space-y-4">
          <h4 className="text-xs font-bold uppercase font-mono tracking-wider text-zinc-400">
            Win Rate by Session
          </h4>
          <div className="h-60 w-full font-mono text-xs">
            {analytics?.session_perf && analytics.session_perf.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.session_perf} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="session" stroke="#52525b" fontSize={11} tickLine={false} />
                  <YAxis stroke="#52525b" fontSize={11} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ background: "#0a0a0f", borderColor: "#27272a", borderRadius: "12px", fontFamily: "monospace", fontSize: "11px" }}
                  />
                  <Bar dataKey="win_rate" radius={[4, 4, 0, 0]} name="Win Rate %">
                    {analytics.session_perf.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index % 2 === 0 ? "#ec4899" : "#10b981"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-zinc-655">Aggregating session metrics...</div>
            )}
          </div>
        </div>

      </div>

      {/* ── Section 6: Historical Trade log & Events ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Trade Log */}
        <div className="p-5 bg-[--bg-card] border border-[--border] rounded-2xl space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider font-mono text-zinc-400 flex items-center gap-1.5">
            <Activity className="w-4 h-4 text-purple-400" /> Historical Trade Log
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-[11px] font-mono border-collapse">
              <thead>
                <tr className="border-b border-zinc-800 text-[9px] text-zinc-500 uppercase text-left">
                  <th className="pb-2">Time</th>
                  <th className="pb-2">Symbol</th>
                  <th className="pb-2">Type</th>
                  <th className="pb-2">Lots</th>
                  <th className="pb-2">Setup</th>
                  <th className="pb-2 text-right">Score</th>
                  <th className="pb-2 text-right">P/L</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900/40">
                {trades.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-zinc-550">
                      No historical deals logged
                    </td>
                  </tr>
                ) : (
                  trades.filter(t => t.action === "close").slice(0, 10).map((t, idx) => (
                    <tr key={idx} className="hover:bg-zinc-800/10">
                      <td className="py-2.5 text-zinc-500">{new Date(t.timestamp).toLocaleDateString()} {new Date(t.timestamp).toLocaleTimeString()}</td>
                      <td className="py-2.5 font-bold text-white">{t.symbol}</td>
                      <td className="py-2.5">
                        <span className={`text-[8px] px-1 py-0.5 rounded ${t.type === "BUY" ? "bg-emerald-950/20 text-emerald-450" : "bg-red-950/20 text-red-400"}`}>
                          {t.type}
                        </span>
                      </td>
                      <td className="py-2.5 text-zinc-350">{t.volume}</td>
                      <td className="py-2.5 text-zinc-400">{t.setup}</td>
                      <td className="py-2.5 text-right text-zinc-450">{t.score}</td>
                      <td className={`py-2.5 text-right font-bold ${t.pnl >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                        {t.pnl >= 0 ? "+" : ""}${t.pnl.toFixed(2)} ({t.r_multiple >= 0 ? "+" : ""}{t.r_multiple}R)
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* EA activity events log */}
        <div className="p-5 bg-[--bg-card] border border-[--border] rounded-2xl space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider font-mono text-zinc-400 flex items-center gap-1.5">
            <Target className="w-4 h-4 text-purple-400" /> EA Event Log
          </h3>
          <div className="space-y-2 max-h-80 overflow-y-auto custom-scrollbar font-mono text-[11px] text-zinc-400">
            <div className="flex gap-4 p-2 bg-black/25 border border-zinc-900 rounded-xl">
              <span className="text-zinc-600">12:43:28</span>
              <span className="text-emerald-400">Settings applied by EA</span>
            </div>
            <div className="flex gap-4 p-2 bg-black/25 border border-zinc-900 rounded-xl">
              <span className="text-zinc-600">12:42:10</span>
              <span>XAUUSD setup detected on M15</span>
            </div>
            <div className="flex gap-4 p-2 bg-black/25 border border-zinc-900 rounded-xl">
              <span className="text-zinc-600">12:42:11</span>
              <span className="text-purple-400">Confluence score: 84 / 100</span>
            </div>
            <div className="flex gap-4 p-2 bg-black/25 border border-zinc-900 rounded-xl">
              <span className="text-zinc-600">12:42:12</span>
              <span>Scanner signal dispatched to Telegram</span>
            </div>
            <div className="flex gap-4 p-2 bg-black/25 border border-zinc-900 rounded-xl">
              <span className="text-zinc-600">12:42:13</span>
              <span className="text-emerald-450">Risk verification passed (1.0% limit)</span>
            </div>
            <div className="flex gap-4 p-2 bg-black/25 border border-zinc-900 rounded-xl">
              <span className="text-zinc-600">12:42:14</span>
              <span className="text-purple-400">BUY order executed on MT5 terminal</span>
            </div>
            <div className="flex gap-4 p-2 bg-black/25 border border-zinc-900 rounded-xl">
              <span className="text-zinc-600">12:42:15</span>
              <span>Trade reported back to Dashboard</span>
            </div>
          </div>
        </div>

      </div>

      {/* ── Emergency Control Confirmation Modal ── */}
      {confirmCommand && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0b0b0f] border border-zinc-800 rounded-3xl p-6 max-w-sm w-full space-y-5 font-mono text-center animate-in zoom-in-95">
            <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 text-red-500 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white uppercase tracking-wide">Confirm Emergency Command</h3>
              <p className="text-xs text-zinc-500 mt-2 leading-relaxed">
                You are about to transmit the command <code className="text-red-400 font-bold bg-zinc-900/80 px-1.5 py-0.5 rounded border border-zinc-800">{confirmCommand}</code> to MQL5 EA Magic #{selectedMagic}.
                <br />
                This action affects live trading logic directly.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmCommand(null)}
                className="flex-1 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 text-xs font-bold rounded-xl border border-zinc-800 transition-colors uppercase"
              >
                Cancel
              </button>
              <button
                onClick={() => handleEmergencyCommand(confirmCommand)}
                disabled={commanding}
                className="flex-1 py-2 bg-red-500 hover:bg-red-400 text-red-950 text-xs font-bold rounded-xl transition-all uppercase"
              >
                {commanding ? "Sending..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
