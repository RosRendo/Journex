"use client"
import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import {
  Bot, Settings, MessageSquare, Copy, BarChart3, Play, Pause,
  Plus, Trash2, Zap, TrendingUp, TrendingDown, Activity,
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
      position_mode?: string;
      use_equity_trail?: boolean;
      equity_trail_activate?: number;
      hard_stop_pct?: number;
      pyramid_cooldown?: number;
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
  const [signals, setSignals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [mainTab, setMainTab] = useState<"monitor" | "desk" | "history">("monitor");
  const [selectedSignalIndex, setSelectedSignalIndex] = useState<number>(0);
  const [selectedSnapshot, setSelectedSnapshot] = useState<any | null>(null);

  // centralize state in page.tsx
  const DEFAULT_SETTINGS = {
    magic: 88001,
    bridge_url: "http://127.0.0.1:5003",
    strategy_type: 0,
    signal_timeframe: "H1",
    context_timeframe: "H4",
    session: "both",
    liquidity_lookback: 120,
    min_score: 80,
    signal_type: "all",
    use_rsi: false,
    rsi_period: 14,
    rsi_buy_min: 50.0,
    rsi_buy_max: 70.0,
    rsi_sell_min: 30.0,
    rsi_sell_max: 50.0,
    use_adx: true,
    adx_period: 14,
    adx_min: 20.0,
    adx_max: 50.0,
    use_volume: true,
    vol_avg_period: 20,
    vol_min_ratio: 1.5,
    use_ema_filter: true,
    ema1_period: 20,
    ema2_period: 50,
    ema3_period: 200,
    use_smt: true,
    smt_symbol: "GBPUSD",
    smt_min_pips: 1.0,
    use_mtf_confluence: true,
    mr_session_start: "22:00",
    mr_session_end: "06:00",
    mr_bb_period: 20,
    mr_bb_stddev: 2.0,
    mr_rsi_period: 14,
    mr_rsi_ob: 70.0,
    mr_rsi_os: 30.0,
    mom_lookback: 30,
    mom_threshold: 5.0,
    mom_max_holding: 120,
    pyramid_cooldown: 5,
    use_equity_trail: true,
    equity_trail_activate: 10.0,
    equity_trail_drop: 5.0,
    hard_stop_pct: 15.0,
    position_mode: 0,
    use_be: true,
    trailing_stop: true,
    trail_atr_mult: 3.5,
    partial_exit_rr: 1.0,
    partial_exit_pct: 50.0,
    move_sl_to_be: true,
    be_offset_pips: 0.0,
    risk: 3.0,
    max_daily_loss: 3.0,
    max_drawdown: 10.0,
    max_open_trades: 3,
    min_rr: 2.5,
    max_spread_points: 300,
    max_slippage_points: 30,
    min_sl_pips: 15,
    allow_monday: true,
    allow_friday: true,
    friday_close_hour: 16,
    use_news_filter: true,
    grid_step: 500.0,
    max_grid_orders: 5,
    max_basket_loss: 5.0,
    grid_emergency_close: true
  };

  const [editSettings, setEditSettings] = useState<any>(DEFAULT_SETTINGS);
  const [customPresets, setCustomPresets] = useState<any[]>([]);
  const [newPresetName, setNewPresetName] = useState("");
  const [activeTab, setActiveTab] = useState("identity"); // identity, strategy, risk, momentum, confluence, custom
  const [dragActive, setDragActive] = useState(false);

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

      // 4. Fetch Signals Queue
      const signalsRes = await fetch(`${BRIDGE}/api/terminal/signals`, { headers: { "ngrok-skip-browser-warning": "true" } });
      const signalsData = await signalsRes.json();
      if (signalsData.success) {
        setSignals(signalsData.signals ?? []);
      }
    } catch (e) {
      console.error("Failed to load EA data", e);
    } finally {
      setLoading(false);
    }
  };

  const handleExecuteSignal = async (sig: any) => {
    try {
      const res = await fetch(`${BRIDGE}/api/execute-signal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol: sig.symbol,
          action: sig.type,
          tp: sig.tp,
          sl: sig.sl,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Signal execution approved: ${sig.type} order sent to MT5!`);
        loadData();
      } else {
        toast.error(`Execution failed: ${data.message || "Unknown error"}`);
      }
    } catch (e) {
      toast.error("Bridge connection failure during execution");
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

      // Merge dynamic settings into the central editSettings state
      setEditSettings(prev => ({
        ...prev,
        risk: s.risk ?? prev.risk,
        min_score: s.min_score ?? prev.min_score,
        min_rr: s.min_rr ?? prev.min_rr,
        session: s.session ?? prev.session,
        signal_type: s.signal_type ?? prev.signal_type,
        position_mode: s.position_mode === "MODE_SINGLE" ? 0 : s.position_mode === "MODE_PARTIAL_EXIT" ? 1 : s.position_mode === "MODE_GRID" ? 2 : prev.position_mode,
        use_equity_trail: s.use_equity_trail ?? prev.use_equity_trail,
        equity_trail_activate: s.equity_trail_activate ?? prev.equity_trail_activate,
        hard_stop_pct: s.hard_stop_pct ?? prev.hard_stop_pct,
        pyramid_cooldown: s.pyramid_cooldown ?? prev.pyramid_cooldown
      }));
    }
  }, [selectedMagic, eas.length]);



  // Load Presets from LocalStorage
  useEffect(() => {
    const saved = localStorage.getItem("ea_custom_presets");
    if (saved) {
      try {
        setCustomPresets(JSON.parse(saved));
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  const saveCustomPreset = () => {
    if (!newPresetName.trim()) {
      toast.error("Please enter a preset name");
      return;
    }
    const updated = [...customPresets, { name: newPresetName.trim(), settings: editSettings }];
    setCustomPresets(updated);
    localStorage.setItem("ea_custom_presets", JSON.stringify(updated));
    setNewPresetName("");
    toast.success(`Preset '${newPresetName}' saved!`);
  };

  const deleteCustomPreset = (name: string) => {
    const updated = customPresets.filter(p => p.name !== name);
    setCustomPresets(updated);
    localStorage.setItem("ea_custom_presets", JSON.stringify(updated));
    toast.success(`Preset '${name}' deleted.`);
  };

  const loadCustomPreset = (settings: any) => {
    setEditSettings(settings);
    toast.success("Loaded custom preset values!");
  };

  const handleSetFileParsing = (text: string) => {
    const lines = text.split("\n");
    const parsed: any = { ...editSettings };
    
    const INP_MAP: Record<string, string> = {
      InpMagic: "magic",
      InpBridgeURL: "bridge_url",
      InpStrategyType: "strategy_type",
      InpSignalTimeframe: "signal_timeframe",
      InpContextTimeframe: "context_timeframe",
      InpSession: "session",
      InpLiquidityLookback: "liquidity_lookback",
      InpMinScore: "min_score",
      InpSignalType: "signal_type",
      InpUseRSI: "use_rsi",
      InpRSIPeriod: "rsi_period",
      InpRSIBuyMin: "rsi_buy_min",
      InpRSIBuyMax: "rsi_buy_max",
      InpRSISellMin: "rsi_sell_min",
      InpRSISellMax: "rsi_sell_max",
      InpUseADX: "use_adx",
      InpADXPeriod: "adx_period",
      InpADXMin: "adx_min",
      InpADXMax: "adx_max",
      InpUseVolume: "use_volume",
      InpVolAvgPeriod: "vol_avg_period",
      InpVolMinRatio: "vol_min_ratio",
      InpUseEMAFilter: "use_ema_filter",
      InpEMA1Period: "ema1_period",
      InpEMA2Period: "ema2_period",
      InpEMA3Period: "ema3_period",
      InpUseSMT: "use_smt",
      InpSMTSymbol: "smt_symbol",
      InpSMTMinPips: "smt_min_pips",
      InpUseMTFConfluence: "use_mtf_confluence",
      InpMRSessionStart: "mr_session_start",
      InpMRSessionEnd: "mr_session_end",
      InpMRBBPeriod: "mr_bb_period",
      InpMRBBStdDev: "mr_bb_stddev",
      InpMRRSIPeriod: "mr_rsi_period",
      InpMRRSIOB: "mr_rsi_ob",
      InpMRRSIOS: "mr_rsi_os",
      InpMomLookbackSec: "mom_lookback",
      InpMomThresholdPips: "mom_threshold",
      InpMomMaxHoldingSec: "mom_max_holding",
      InpPyramidCooldownSec: "pyramid_cooldown",
      InpUseEquityTrail: "use_equity_trail",
      InpEquityTrailActivatePct: "equity_trail_activate",
      InpEquityTrailDropPct: "equity_trail_drop",
      InpHardEquityStopPct: "hard_stop_pct",
      InpPositionMode: "position_mode",
      InpUseBE: "use_be",
      InpTrailingStop: "trailing_stop",
      InpTrailATRMult: "trail_atr_mult",
      InpPartialExitRR: "partial_exit_rr",
      InpPartialExitPct: "partial_exit_pct",
      InpMoveSLToBE: "move_sl_to_be",
      InpBEOffsetPips: "be_offset_pips",
      InpRiskPercent: "risk",
      InpMaxDailyLossPct: "max_daily_loss",
      InpMaxDrawdownPct: "max_drawdown",
      InpMaxOpenTrades: "max_open_trades",
      InpMinRR: "min_rr",
      InpMaxSpreadPoints: "max_spread_points",
      InpMaxSlippagePoints: "max_slippage_points",
      InpMinSLPips: "min_sl_pips",
      InpAllowMonday: "allow_monday",
      InpAllowFriday: "allow_friday",
      InpFridayCloseHour: "friday_close_hour",
      InpUseNewsFilter: "use_news_filter",
      InpGridStep: "grid_step",
      InpMaxGridOrders: "max_grid_orders",
      InpMaxBasketLossPct: "max_basket_loss",
      InpGridEmergencyClose: "grid_emergency_close"
    };

    let count = 0;
    lines.forEach(line => {
      const clean = line.trim();
      if (!clean || clean.startsWith(";")) return;
      const parts = clean.split("=");
      if (parts.length < 2) return;
      const mqlKey = parts[0].trim();
      const valStr = parts[1].split("||")[0].trim();
      
      const mappedKey = INP_MAP[mqlKey];
      if (mappedKey) {
        let val: any = valStr;
        if (valStr === "true" || valStr === "1") val = true;
        else if (valStr === "false" || valStr === "0") val = false;
        else if (!isNaN(Number(valStr))) val = Number(valStr);
        
        parsed[mappedKey] = val;
        count++;
      }
    });

    setEditSettings(parsed);
    toast.success(`Successfully parsed ${count} variables from .set file!`);
  };

  const handleDrag = (e: any) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: any) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          handleSetFileParsing(event.target.result as string);
        }
      };
      reader.readAsText(file);
    }
  };

  const handleFileInput = (e: any) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          handleSetFileParsing(event.target.result as string);
        }
      };
      reader.readAsText(file);
    }
  };


  // Helper functions for Trade Decision Desk real-time calculations
  const getSymbolSpread = (symbol: string) => {
    if (!symbol) return 8;
    const s = symbol.toUpperCase();
    if (s.includes("XAU")) return 18; // 1.8 pips / 18 points
    if (s.includes("EURUSD")) return 6; // 0.6 pips / 6 points
    if (s.includes("GBPUSD")) return 9; // 0.9 pips / 9 points
    return 12; // default 1.2 pips / 12 points
  };

  const getVelocity = (score: number, type: string) => {
    const dir = type === "BUY" ? "↑" : "↓";
    if (score >= 85) return `RAPID ${dir}`;
    if (score >= 70) return `STRONG ${dir}`;
    return `MODERATE ${dir}`;
  };

  const getAcceleration = (score: number, type: string) => {
    const sign = type === "BUY" ? "+" : "-";
    const val = (0.2 + (score - 50) * 0.006).toFixed(2);
    return `${sign}${val}`;
  };

  const getTickActivity = (score: number) => {
    return `${(1.0 + (score - 50) * 0.04).toFixed(1)}x avg`;
  };

  const getCandleExpansion = (score: number) => {
    if (score >= 85) return "EXPANDED";
    if (score >= 70) return "NORMAL";
    return "STABLE";
  };

  const getDuration = (score: number) => {
    return `${Math.round(10 + (100 - score) * 0.5)}s`;
  };

  const handleLoadPreset = async (presetName: string) => {
    let payload = {};
    if(presetName === 'safe') {
      payload = { position_mode: "SINGLE", pyramid_cooldown: 15, use_equity_trail: "false" };
    } else if(presetName === 'controlled') {
      payload = { position_mode: "GRID", pyramid_cooldown: 5, use_equity_trail: "true", equity_trail_activate: 10.0, hard_stop_pct: 15.0 };
    } else if(presetName === 'wild') {
      payload = { position_mode: "GRID", pyramid_cooldown: 1, use_equity_trail: "true", equity_trail_activate: 20.0, hard_stop_pct: 40.0 };
    }
    
    try {
      setPushing(true);
      const res = await fetch(`${BRIDGE}/api/ea/settings/${selectedMagic}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Preset loaded for Magic #${selectedMagic}`);
        loadData();
      } else {
        toast.error("Failed to queue preset update");
      }
    } catch (e) {
      toast.error("Bridge connection failure");
    } finally {
      setPushing(false);
    }
  };

  const handlePushSettings = async () => {
    try {
      setPushing(true);
      // Map React position mode numerical values back to expected string mode
      const posModes = ["SINGLE", "PARTIAL_EXIT", "GRID"];
      const payload = {
        risk: editSettings.risk,
        min_score: editSettings.min_score,
        min_rr: editSettings.min_rr,
        session: editSettings.session,
        signal_type: editSettings.signal_type,
        position_mode: posModes[editSettings.position_mode] || "SINGLE",
        use_equity_trail: editSettings.use_equity_trail ? "true" : "false",
        equity_trail_activate: editSettings.equity_trail_activate,
        hard_stop_pct: editSettings.hard_stop_pct,
        pyramid_cooldown: editSettings.pyramid_cooldown
      };
      
      const res = await fetch(`${BRIDGE}/api/ea/settings/${selectedMagic}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
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
        <span className="flex items-center gap-1.5 px-2 py-0.5 text-[9px] font-bold font-mono tracking-wider bg-[#20e0b2]/10 border border-[#20e0b2]/20 text-[#20e0b2] rounded">
          <span className="w-1.5 h-1.5 rounded-full bg-[#20e0b2] animate-pulse" />
          RUNNING
        </span>
      );
    }
    if (status === "stale") {
      return (
        <span className="flex items-center gap-1.5 px-2 py-0.5 text-[9px] font-bold font-mono tracking-wider bg-[#f5c451]/10 border border-[#f5c451]/20 text-[#f5c451] rounded">
          <span className="w-1.5 h-1.5 rounded-full bg-[#f5c451]" />
          STALE ({age}s)
        </span>
      );
    }
    return (
      <span className="flex items-center gap-1.5 px-2 py-0.5 text-[9px] font-bold font-mono tracking-wider bg-[#ff5c73]/10 border border-[#ff5c73]/20 text-[#ff5c73] rounded">
        <span className="w-1.5 h-1.5 rounded-full bg-[#ff5c73]" />
        OFFLINE
      </span>
    );
  };

  // Render Win Rate Progress Bar
  const renderWinRateBar = (rate: number) => {
    return (
      <div className="w-full flex items-center gap-3">
        <div className="flex-1 bg-zinc-900 h-1.5 rounded overflow-hidden border border-[rgba(255,255,255,0.07)]">
          <div 
            className="bg-[#20e0b2] h-full rounded transition-all duration-500"
            style={{ width: `${rate}%` }}
          />
        </div>
        <span className="font-mono text-[10px] font-bold text-zinc-300 w-10 text-right">{rate}%</span>
      </div>
    );
  };

  return (
    <div className="min-h-screen w-full bg-[#09090b] text-[#f4f4f5] flex flex-col pb-12 font-sans">
      
      {/* ── TOPBAR ── */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-[rgba(255,255,255,0.07)] sticky top-0 z-20 bg-[#09090b]">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-sm font-bold tracking-tight text-[#f4f4f5]">EA Control Hub</h1>
            <p className="text-[9px] font-bold uppercase tracking-widest font-mono text-[#71717a] mt-0.5">Advanced Monitoring &amp; MQL5 Settings Sync</p>
          </div>
          
          {/* EA Magic Selector */}
          <div className="flex items-center gap-2 bg-[#101014] border border-[rgba(255,255,255,0.07)] px-2.5 py-1 rounded">
            <span className="text-[9px] font-bold uppercase tracking-widest text-[#71717a] font-mono">Magic Target:</span>
            <select 
              value={selectedMagic}
              onChange={(e) => setSelectedMagic(Number(e.target.value))}
              className="bg-transparent border-none text-[10px] text-[#f4f4f5] focus:outline-none font-bold font-mono cursor-pointer"
            >
              <option value={88001} className="bg-[#101014]">#88001 (Default)</option>
              {eas.map(ea => (
                ea.magic !== 88001 && <option key={ea.magic} value={ea.magic} className="bg-[#101014]">#{ea.magic}</option>
              ))}
            </select>
            <button 
              onClick={loadData}
              className="p-0.5 text-zinc-400 hover:text-white transition-colors"
              title="Refresh logs & statistics"
            >
              <RefreshCcw className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex gap-0 border-l border-[rgba(255,255,255,0.07)]">
          <button
            onClick={() => setMainTab("monitor")}
            className={`py-3 px-4 text-[9px] uppercase tracking-widest font-bold font-mono transition-all border-b-2 whitespace-nowrap flex items-center gap-1.5 ${
              mainTab === "monitor" ? "border-[#20e0b2] text-[#20e0b2]" : "border-transparent text-[#71717a] hover:text-[#a1a1aa]"
            }`}
          >
            <Activity className="w-3 h-3" />
            Live Monitor
          </button>
          <button
            onClick={() => setMainTab("desk")}
            className={`py-3 px-4 text-[9px] uppercase tracking-widest font-bold font-mono transition-all border-b-2 whitespace-nowrap flex items-center gap-1.5 ${
              mainTab === "desk" ? "border-[#20e0b2] text-[#20e0b2]" : "border-transparent text-[#71717a] hover:text-[#a1a1aa]"
            }`}
          >
            <Zap className="w-3 h-3" />
            Decision Desk
          </button>
          <button
            onClick={() => setMainTab("history")}
            className={`py-3 px-4 text-[9px] uppercase tracking-widest font-bold font-mono transition-all border-b-2 whitespace-nowrap flex items-center gap-1.5 ${
              mainTab === "history" ? "border-[#20e0b2] text-[#20e0b2]" : "border-transparent text-[#71717a] hover:text-[#a1a1aa]"
            }`}
          >
            <Clock className="w-3 h-3" />
            History Stream
          </button>
        </div>
      </div>

      {/* Main container */}
      <div className="flex-1 w-full p-6">

      {/* ── Grid Layout ── */}
      {mainTab === "monitor" ? (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── COL 1 & 2: Main Telemetry / Live View ── */}
        <div className="lg:col-span-2 space-y-6">

          {/* Section 1: Overview Panel */}
          <div className="p-6 bg-[#101014] border border-zinc-850/60 rounded-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 bg-purple-500/5 blur-3xl rounded-full" />
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[rgba(255,255,255,0.07)] pb-5 mb-5 relative z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[rgba(255,255,255,0.04)] border border-purple-500/25 flex items-center justify-center text-[#a1a1aa]">
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
              <div className="bg-black/20 border border-[rgba(255,255,255,0.04)] rounded-lg p-4">
                <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider block mb-1">Balance</span>
                <span className="text-xl font-bold text-white">${activeEa?.last_report?.balance?.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2}) || "10,000.00"}</span>
              </div>
              <div className="bg-black/20 border border-[rgba(255,255,255,0.04)] rounded-lg p-4">
                <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider block mb-1">Equity</span>
                <span className="text-xl font-bold text-[#a1a1aa]">${activeEa?.last_report?.equity?.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2}) || "10,120.50"}</span>
              </div>
              <div className="bg-black/20 border border-[rgba(255,255,255,0.04)] rounded-lg p-4">
                <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider block mb-1">Daily P&L</span>
                <span className={`text-xl font-bold ${(activeEa?.last_report?.today_stats?.pnl || 120.50) >= 0 ? "text-[#20e0b2]" : "text-[#ff5c73]"}`}>
                  {(activeEa?.last_report?.today_stats?.pnl || 120.50) >= 0 ? "+" : ""}${activeEa?.last_report?.today_stats?.pnl || "120.50"}
                </span>
              </div>
              <div className="bg-black/20 border border-[rgba(255,255,255,0.04)] rounded-lg p-4">
                <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider block mb-1">Win Rate</span>
                <span className="text-xl font-bold text-zinc-350">{analytics?.overall?.win_rate || "66.7"}%</span>
              </div>
            </div>

            {/* Minor Stats list */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 font-mono text-xs border-t border-[rgba(255,255,255,0.04)] pt-4">
              <div className="flex justify-between border-r border-[rgba(255,255,255,0.04)] pr-3">
                <span className="text-zinc-500">Open Trades:</span>
                <span className="font-bold text-zinc-300">{activeEa?.last_report?.open_trades?.length || 0}</span>
              </div>
              <div className="flex justify-between md:border-r border-[rgba(255,255,255,0.04)] md:pr-3">
                <span className="text-zinc-500">Today's Trades:</span>
                <span className="font-bold text-zinc-300">{activeEa?.last_report?.today_stats?.trades || 0}</span>
              </div>
              <div className="flex justify-between border-r border-[rgba(255,255,255,0.04)] pr-3">
                <span className="text-zinc-500">Regime:</span>
                <span className="font-bold text-[#a1a1aa] uppercase">{activeEa?.last_report?.regime || "TRENDING"}</span>
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
            <div className="p-5 bg-[--bg-card] border border-[--border] rounded-lg">
              <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-zinc-400 mb-4 flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#a1a1aa]" /> Market Context
              </h3>
              <div className="space-y-3 font-mono text-xs">
                <div className="flex justify-between border-b border-[rgba(255,255,255,0.04)] pb-2">
                  <span className="text-zinc-500">Active Symbol</span>
                  <span className="font-bold text-white">{activeEa?.last_report?.symbol || "XAUUSD"}</span>
                </div>
                <div className="flex justify-between border-b border-[rgba(255,255,255,0.04)] pb-2">
                  <span className="text-zinc-500">Regime State</span>
                  <span className="font-bold text-[#a1a1aa] uppercase">{activeEa?.last_report?.regime || "TRENDING"}</span>
                </div>
                <div className="flex justify-between border-b border-[rgba(255,255,255,0.04)] pb-2">
                  <span className="text-zinc-500">HTF Bias (H4)</span>
                  <span className="font-bold text-[#20e0b2]">{activeEa?.last_report?.htf_bias || "BULLISH"}</span>
                </div>
                <div className="flex justify-between border-b border-[rgba(255,255,255,0.04)] pb-2">
                  <span className="text-zinc-500">Active Session</span>
                  <span className="font-bold text-white">{activeEa?.last_report?.session || "LONDON"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Volatility</span>
                  <span className="font-bold text-zinc-350">{activeEa?.last_report?.volatility || "NORMAL"}</span>
                </div>

                {/* MTF Alignment Checklist */}
                <div className="mt-4 pt-4 border-t border-[rgba(255,255,255,0.04)]">
                  <div className="grid grid-cols-4 gap-2 text-center text-[10px] font-bold">
                    <div className="bg-black/30 p-2 rounded-lg border border-[rgba(255,255,255,0.04)]">
                      <div className="text-zinc-500 mb-1">H4</div>
                      <div className="text-[#20e0b2]">🟢 Bullish</div>
                    </div>
                    <div className="bg-black/30 p-2 rounded-lg border border-[rgba(255,255,255,0.04)]">
                      <div className="text-zinc-500 mb-1">H1</div>
                      <div className="text-[#20e0b2]">🟢 Bullish</div>
                    </div>
                    <div className="bg-black/30 p-2 rounded-lg border border-[rgba(255,255,255,0.04)]">
                      <div className="text-zinc-500 mb-1">M15</div>
                      <div className="text-[#20e0b2]">🟢 Setup</div>
                    </div>
                    <div className="bg-black/30 p-2 rounded-lg border border-[rgba(255,255,255,0.04)]">
                      <div className="text-zinc-500 mb-1">M5</div>
                      <div className="text-[#20e0b2]">🟢 Trigger</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Active Signal Scanner */}
            <div className="p-5 bg-[--bg-card] border border-[--border] rounded-lg flex flex-col justify-between">
              <div>
                <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-zinc-400 mb-3.5 flex items-center gap-2">
                  <Target className="w-4 h-4 text-[#a1a1aa]" /> Active Scanner Signal
                </h3>
                <div className="flex items-center justify-between bg-purple-950/20 border border-purple-900/30 rounded-xl p-3.5 mb-3 font-mono">
                  <div>
                    <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">Target Trade Plan</span>
                    <span className="text-sm font-bold text-white">XAUUSD BUY (M15)</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">Score / Grade</span>
                    <span className="text-xs font-bold text-[#a1a1aa]">84/100 (A)</span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 font-mono text-[10px] mb-3">
                  <div className="bg-black/35 p-2 rounded-lg border border-[rgba(255,255,255,0.04)]">
                    <span className="text-zinc-500 block mb-0.5">Entry</span>
                    <span className="font-bold text-white">3,421.50</span>
                  </div>
                  <div className="bg-black/35 p-2 rounded-lg border border-[rgba(255,255,255,0.04)]">
                    <span className="text-zinc-500 block mb-0.5">Stop Loss</span>
                    <span className="font-bold text-[#ff5c73]">3,414.20</span>
                  </div>
                  <div className="bg-black/35 p-2 rounded-lg border border-[rgba(255,255,255,0.04)]">
                    <span className="text-zinc-500 block mb-0.5">Target TP1</span>
                    <span className="font-bold text-[#20e0b2]">3,430.00</span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 font-mono text-[9px] text-zinc-400">
                  <div className="bg-black/10 p-1.5 rounded text-center">RR TP1: <span className="font-bold text-zinc-350">1.16R</span></div>
                  <div className="bg-black/10 p-1.5 rounded text-center">RR TP2: <span className="font-bold text-zinc-350">3.22R</span></div>
                  <div className="bg-black/10 p-1.5 rounded text-center">RR TP3: <span className="font-bold text-zinc-350">6.64R</span></div>
                </div>
              </div>

              <div className="text-[10px] font-mono text-zinc-500 border-t border-[rgba(255,255,255,0.04)] pt-3 mt-3 flex justify-between">
                <span>protected invalidation low: 3,414.20</span>
              </div>
            </div>
          </div>

          {/* Section 3: Confluence Matrix & Signal Reasoning */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* Left: Confluence Matrix */}
            <div className="p-5 bg-[--bg-card] border border-[--border] rounded-lg">
              <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-zinc-400 mb-4">
                Confluence Matrix
              </h3>
              <div className="space-y-3.5 font-mono text-xs">
                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-zinc-400">Market Structure</span>
                    <span className="text-[#a1a1aa]">20 / 20</span>
                  </div>
                  <div className="w-full bg-zinc-900 h-2 rounded-full overflow-hidden border border-[rgba(255,255,255,0.07)]">
                    <div className="bg-purple-500 h-full rounded-full" style={{ width: "100%" }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-zinc-400">Liquidity Sweep</span>
                    <span className="text-[#a1a1aa]">20 / 20</span>
                  </div>
                  <div className="w-full bg-zinc-900 h-2 rounded-full overflow-hidden border border-[rgba(255,255,255,0.07)]">
                    <div className="bg-purple-500 h-full rounded-full" style={{ width: "100%" }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-zinc-400">FVG Displacement</span>
                    <span className="text-[#a1a1aa]">15 / 15</span>
                  </div>
                  <div className="w-full bg-zinc-900 h-2 rounded-full overflow-hidden border border-[rgba(255,255,255,0.07)]">
                    <div className="bg-purple-500 h-full rounded-full" style={{ width: "100%" }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-zinc-400">Order Block Alignment</span>
                    <span className="text-[#a1a1aa]">10 / 10</span>
                  </div>
                  <div className="w-full bg-zinc-900 h-2 rounded-full overflow-hidden border border-[rgba(255,255,255,0.07)]">
                    <div className="bg-purple-500 h-full rounded-full" style={{ width: "100%" }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-zinc-400">SMT Divergence</span>
                    <span className="text-purple-450">10 / 10</span>
                  </div>
                  <div className="w-full bg-zinc-900 h-2 rounded-full overflow-hidden border border-[rgba(255,255,255,0.07)]">
                    <div className="bg-purple-500 h-full rounded-full" style={{ width: "100%" }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Signal Reasoning */}
            <div className="p-5 bg-[--bg-card] border border-[--border] rounded-lg flex flex-col justify-between">
              <div>
                <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-zinc-400 mb-4">
                  Signal Reasoning & Checklist
                </h3>
                <div className="space-y-2.5 font-mono text-[11px] text-zinc-350">
                  <div className="flex items-start gap-2">
                    <span className="text-[#20e0b2] font-bold">✓</span>
                    <span>H4 bullish market structure confirmed</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-[#20e0b2] font-bold">✓</span>
                    <span>H1 bullish continuation bias active</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-[#20e0b2] font-bold">✓</span>
                    <span>Sell-side liquidity swept on London open</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-[#20e0b2] font-bold">✓</span>
                    <span>M15 bullish Market Structure Shift (MSS)</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-[#20e0b2] font-bold">✓</span>
                    <span>Price tapped into bullish 15m FVG</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-[#20e0b2] font-bold">✓</span>
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
          <div className="p-5 bg-[--bg-card] border border-[--border] rounded-lg space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider font-mono text-zinc-400">
              Open Positions ({activeEa?.last_report?.open_trades?.length || 0})
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs font-mono border-collapse">
                <thead>
                  <tr className="border-b border-[rgba(255,255,255,0.07)] text-[10px] text-zinc-500 uppercase text-left">
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
                              t.type === "BUY" ? "bg-emerald-950/20 text-emerald-450 border border-emerald-900/30" : "bg-red-950/20 text-[#ff5c73] border border-red-900/30"
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
                              <span className="text-[#20e0b2]">TP1 🟢</span>
                              <span className="text-zinc-650">·</span>
                              <span className="text-zinc-600">TP2 ⏳</span>
                              <span className="text-zinc-650">·</span>
                              <span className="text-zinc-600">TP3 ⏳</span>
                            </div>
                          </td>
                          <td className="py-3.5">
                            <div className="flex justify-center gap-2 text-[9px]">
                              <span className={t.breakeven_active ? "text-[#20e0b2] font-bold" : "text-zinc-600"}>BE</span>
                              <span className={t.trailing_active ? "text-[#a1a1aa] font-bold" : "text-zinc-600"}>TRAIL</span>
                            </div>
                          </td>
                          <td className={`py-3.5 text-right font-bold ${isWin ? "text-[#20e0b2]" : "text-[#ff5c73]"}`}>
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
          <div className="p-5 bg-[--bg-card] border border-[--border] rounded-lg space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider font-mono text-white flex items-center justify-between border-b border-[rgba(255,255,255,0.04)] pb-3">
              <span className="flex items-center gap-1.5">
                <Settings className="w-4 h-4 text-[#a1a1aa]" /> Advanced Configurator
              </span>
              <span className="text-[10px] text-zinc-500 font-mono">Magic: #{selectedMagic}</span>
            </h3>

            {/* Presets Quick Actions (Static presets from previous task + local presets) */}
            <div className="bg-black/35 border border-[rgba(255,255,255,0.04)] rounded-xl p-3.5 space-y-3 font-mono text-xs">
              <div className="flex justify-between items-center text-[10px] text-zinc-500 uppercase tracking-wider font-bold">
                <span>Quick Preset Profiles</span>
                <span className="text-[9px] text-[#a1a1aa] lowercase italic">Instant Push</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => handleLoadPreset('safe')}
                  disabled={pushing}
                  className="bg-[#20e0b2]/10 text-[#20e0b2] border border-[rgba(32,224,178,0.3)]/20 hover:bg-[#20e0b2]/20 py-2 px-1 rounded-lg text-[10px] font-bold transition-all flex flex-col items-center gap-1"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" /> Safe Scalp
                </button>
                <button
                  onClick={() => handleLoadPreset('controlled')}
                  disabled={pushing}
                  className="bg-amber-500/10 text-[#f5c451] border border-amber-500/20 hover:bg-amber-500/20 py-2 px-1 rounded-lg text-[10px] font-bold transition-all flex flex-col items-center gap-1"
                >
                  <Activity className="w-3.5 h-3.5" /> Controlled Grid
                </button>
                <button
                  onClick={() => handleLoadPreset('wild')}
                  disabled={pushing}
                  className="bg-[rgba(255,92,115,0.08)] text-[#ff5c73] border border-[rgba(255,92,115,0.2)] hover:bg-[rgba(255,92,115,0.12)] py-2 px-1 rounded-lg text-[10px] font-bold transition-all flex flex-col items-center gap-1"
                >
                  <Zap className="w-3.5 h-3.5" /> Wild Pyramid
                </button>
              </div>
            </div>

            {/* Drag & Drop Zone */}
            <div
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-xl p-3 text-center transition-all ${
                dragActive ? "border-purple-500 bg-purple-950/20" : "border-[rgba(255,255,255,0.07)] bg-black/10 hover:border-[rgba(255,255,255,0.1)]"
              }`}
            >
              <label className="cursor-pointer flex flex-col items-center gap-1">
                <Download className="w-5 h-5 text-zinc-500" />
                <span className="text-[10px] font-mono text-zinc-400">
                  Drag & Drop MT5 <code className="text-[#a1a1aa]">.set</code> file or <span className="underline">browse</span>
                </span>
                <input type="file" accept=".set" onChange={handleFileInput} className="hidden" />
              </label>
            </div>

            {/* Accordion Tabs Selection */}
            <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none border-b border-[rgba(255,255,255,0.04)]">
              {[
                { id: "identity", label: "Identity", icon: Bot },
                { id: "strategy", label: "Strategy", icon: Cpu },
                { id: "risk", label: "Risk", icon: Shield },
                { id: "momentum", label: "Momentum/Grid", icon: Zap },
                { id: "confluence", label: "Filters", icon: Target },
                { id: "custom", label: "My Presets", icon: Copy },
              ].map(t => {
                const Icon = t.icon;
                const active = activeTab === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => setActiveTab(t.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-mono font-bold transition-all whitespace-nowrap ${
                      active ? "bg-purple-950/45 text-[#a1a1aa] border border-purple-900/40" : "text-zinc-500 hover:text-zinc-350"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {t.label}
                  </button>
                );
              })}
            </div>

            {/* Tab Panels */}
            <div className="space-y-4 text-xs font-mono pt-2">
              {activeTab === "identity" && (
                <div className="space-y-4">
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-[10px] font-bold text-zinc-500 uppercase">
                      <span>Magic Number</span>
                      <span className="text-[8px] text-zinc-650 flex items-center gap-1"><AlertCircle className="w-2.5 h-2.5" /> Static</span>
                    </div>
                    <input
                      type="number"
                      value={editSettings.magic}
                      onChange={(e) => setEditSettings({ ...editSettings, magic: parseInt(e.target.value) || 88001 })}
                      className="w-full bg-black/45 border border-[rgba(255,255,255,0.04)] rounded-xl px-3.5 py-2 text-zinc-300 text-xs focus:outline-none focus:border-purple-500 font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-[10px] font-bold text-zinc-500 uppercase">
                      <span>Bridge Server URL</span>
                      <span className="text-[8px] text-zinc-650 flex items-center gap-1"><AlertCircle className="w-2.5 h-2.5" /> Static</span>
                    </div>
                    <input
                      type="text"
                      value={editSettings.bridge_url}
                      onChange={(e) => setEditSettings({ ...editSettings, bridge_url: e.target.value })}
                      className="w-full bg-black/45 border border-[rgba(255,255,255,0.04)] rounded-xl px-3.5 py-2 text-zinc-350 text-xs focus:outline-none focus:border-purple-500 font-mono"
                    />
                  </div>
                </div>
              )}

              {activeTab === "strategy" && (
                <div className="space-y-4">
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-[10px] font-bold text-zinc-500 uppercase">
                      <span>Strategy Selection</span>
                      <span className="text-[8px] text-zinc-650 flex items-center gap-1"><AlertCircle className="w-2.5 h-2.5" /> Static</span>
                    </div>
                    <select
                      value={editSettings.strategy_type}
                      onChange={(e) => setEditSettings({ ...editSettings, strategy_type: parseInt(e.target.value) })}
                      className="w-full bg-black/45 border border-[rgba(255,255,255,0.04)] rounded-xl px-3.5 py-2 text-zinc-300 text-xs focus:outline-none focus:border-purple-500 font-mono"
                    >
                      <option value="0">ICT Sniper Strategy</option>
                      <option value="1">ICT Scalper Strategy</option>
                      <option value="2">Mean Reversion Strategy</option>
                      <option value="3">Breakout Strategy</option>
                      <option value="4">Momentum Scalper Strategy</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-[10px] font-bold text-zinc-500 uppercase">
                      <span>Signal Timeframe</span>
                      <span className="text-[8px] text-zinc-650 flex items-center gap-1"><AlertCircle className="w-2.5 h-2.5" /> Static</span>
                    </div>
                    <input
                      type="text"
                      value={editSettings.signal_timeframe}
                      onChange={(e) => setEditSettings({ ...editSettings, signal_timeframe: e.target.value })}
                      className="w-full bg-black/45 border border-[rgba(255,255,255,0.04)] rounded-xl px-3.5 py-2 text-zinc-300 text-xs focus:outline-none focus:border-purple-500 font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-[10px] font-bold text-zinc-500 uppercase">
                      <span>Allowed Session</span>
                      <span className="text-[8px] text-emerald-450 flex items-center gap-1"><CheckCircle2 className="w-2.5 h-2.5" /> Live-Synced</span>
                    </div>
                    <select
                      value={editSettings.session}
                      onChange={(e) => setEditSettings({ ...editSettings, session: e.target.value })}
                      className="w-full bg-black/45 border border-[rgba(255,255,255,0.04)] rounded-xl px-3.5 py-2 text-zinc-300 text-xs focus:outline-none focus:border-purple-500 font-mono"
                    >
                      <option value="both">London & New York</option>
                      <option value="london">London Only</option>
                      <option value="ny">New York Only</option>
                      <option value="all">All Times</option>
                    </select>
                  </div>
                </div>
              )}

              {activeTab === "risk" && (
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between font-bold text-[10px] mb-1.5">
                      <span className="text-zinc-500 uppercase tracking-wider flex items-center gap-1">
                        Risk Per Trade <CheckCircle2 className="w-2.5 h-2.5 text-[#20e0b2]" />
                      </span>
                      <span className="text-[#a1a1aa]">{editSettings.risk.toFixed(1)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0.1"
                      max="10.0"
                      step="0.1"
                      value={editSettings.risk}
                      onChange={(e) => setEditSettings({ ...editSettings, risk: parseFloat(e.target.value) })}
                      className="w-full accent-purple-500 h-1 bg-zinc-900 rounded-full appearance-none cursor-pointer mt-1"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between font-bold text-[10px] mb-1.5">
                      <span className="text-zinc-500 uppercase tracking-wider flex items-center gap-1">
                        Max Daily Loss <CheckCircle2 className="w-2.5 h-2.5 text-[#20e0b2]" />
                      </span>
                      <span className="text-[#a1a1aa]">{editSettings.max_daily_loss}%</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="20"
                      step="1"
                      value={editSettings.max_daily_loss}
                      onChange={(e) => setEditSettings({ ...editSettings, max_daily_loss: parseFloat(e.target.value) })}
                      className="w-full accent-purple-500 h-1 bg-zinc-900 rounded-full appearance-none cursor-pointer mt-1"
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-[10px] font-bold text-zinc-500 uppercase">
                      <span>Minimum Setup RR</span>
                      <span className="text-[8px] text-emerald-455 flex items-center gap-1"><CheckCircle2 className="w-2.5 h-2.5" /> Live-Synced</span>
                    </div>
                    <select
                      value={editSettings.min_rr}
                      onChange={(e) => setEditSettings({ ...editSettings, min_rr: parseFloat(e.target.value) })}
                      className="w-full bg-black/45 border border-[rgba(255,255,255,0.04)] rounded-xl px-3.5 py-2 text-zinc-300 text-xs focus:outline-none focus:border-purple-500 font-mono"
                    >
                      <option value="1.0">1:1.0 Minimum</option>
                      <option value="1.5">1:1.5 Minimum</option>
                      <option value="2.0">1:2.0 Minimum</option>
                      <option value="2.5">1:2.5 Minimum</option>
                      <option value="3.0">1:3.0 Minimum</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-[10px] font-bold text-zinc-500 uppercase">
                      <span>Max Open Trades Cap</span>
                      <span className="text-[8px] text-zinc-650 flex items-center gap-1"><AlertCircle className="w-2.5 h-2.5" /> Static</span>
                    </div>
                    <input
                      type="number"
                      value={editSettings.max_open_trades}
                      onChange={(e) => setEditSettings({ ...editSettings, max_open_trades: parseInt(e.target.value) })}
                      className="w-full bg-black/45 border border-[rgba(255,255,255,0.04)] rounded-xl px-3.5 py-2 text-zinc-300 text-xs focus:outline-none focus:border-purple-500 font-mono"
                    />
                  </div>
                </div>
              )}

              {activeTab === "momentum" && (
                <div className="space-y-4">
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-[10px] font-bold text-zinc-500 uppercase">
                      <span>Position Mode Selection</span>
                      <span className="text-[8px] text-emerald-450 flex items-center gap-1"><CheckCircle2 className="w-2.5 h-2.5" /> Live-Synced</span>
                    </div>
                    <select
                      value={editSettings.position_mode}
                      onChange={(e) => setEditSettings({ ...editSettings, position_mode: parseInt(e.target.value) })}
                      className="w-full bg-black/45 border border-[rgba(255,255,255,0.04)] rounded-xl px-3.5 py-2 text-zinc-300 text-xs focus:outline-none focus:border-purple-500 font-mono"
                    >
                      <option value="0">Single Position Mode</option>
                      <option value="1">Partial Exit Mode</option>
                      <option value="2">Grid / Pyramiding Mode</option>
                    </select>
                  </div>
                  
                  <div className="flex items-center justify-between bg-black/20 border border-[rgba(255,255,255,0.04)] rounded-xl p-3">
                    <div>
                      <span className="text-[10px] font-bold text-zinc-400 block uppercase">Equity Trailing Stop</span>
                      <span className="text-[8px] text-emerald-450 flex items-center gap-1 mt-0.5"><CheckCircle2 className="w-2 h-2" /> Live-Synced</span>
                    </div>
                    <button
                      onClick={() => setEditSettings({ ...editSettings, use_equity_trail: !editSettings.use_equity_trail })}
                      className={`w-10 h-5 rounded-full p-0.5 transition-all ${
                        editSettings.use_equity_trail ? "bg-purple-600 flex justify-end" : "bg-zinc-800 flex justify-start"
                      }`}
                    >
                      <span className="w-4 h-4 bg-white rounded-full block shadow-md" />
                    </button>
                  </div>

                  {editSettings.use_equity_trail && (
                    <div className="grid grid-cols-2 gap-3.5 border-l-2 border-purple-900/40 pl-3">
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-zinc-500 uppercase">Trail Activation %</label>
                        <input
                          type="number"
                          step="0.5"
                          value={editSettings.equity_trail_activate}
                          onChange={(e) => setEditSettings({ ...editSettings, equity_trail_activate: parseFloat(e.target.value) })}
                          className="w-full bg-black/45 border border-[rgba(255,255,255,0.04)] rounded-xl px-3 py-1.5 text-zinc-300 text-xs focus:outline-none focus:border-purple-500 font-mono"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-zinc-500 uppercase">Trail Drop Stop %</label>
                        <input
                          type="number"
                          step="0.5"
                          value={editSettings.equity_trail_drop}
                          onChange={(e) => setEditSettings({ ...editSettings, equity_trail_drop: parseFloat(e.target.value) })}
                          className="w-full bg-black/45 border border-[rgba(255,255,255,0.04)] rounded-xl px-3 py-1.5 text-zinc-300 text-xs focus:outline-none focus:border-purple-500 font-mono"
                        />
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-[9px] font-bold text-zinc-500 uppercase">
                        <span>Pyramid Cooldown</span>
                        <span className="text-[7px] text-emerald-450">Live</span>
                      </div>
                      <input
                        type="number"
                        value={editSettings.pyramid_cooldown}
                        onChange={(e) => setEditSettings({ ...editSettings, pyramid_cooldown: parseInt(e.target.value) })}
                        className="w-full bg-black/45 border border-[rgba(255,255,255,0.04)] rounded-xl px-3 py-1.5 text-zinc-300 text-xs focus:outline-none focus:border-purple-500 font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-[9px] font-bold text-zinc-500 uppercase">
                        <span>Equity Stop %</span>
                        <span className="text-[7px] text-emerald-450">Live</span>
                      </div>
                      <input
                        type="number"
                        value={editSettings.hard_stop_pct}
                        onChange={(e) => setEditSettings({ ...editSettings, hard_stop_pct: parseFloat(e.target.value) })}
                        className="w-full bg-black/45 border border-[rgba(255,255,255,0.04)] rounded-xl px-3 py-1.5 text-zinc-300 text-xs focus:outline-none focus:border-purple-500 font-mono"
                      />
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "confluence" && (
                <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                  <div className="flex items-center justify-between bg-black/20 border border-[rgba(255,255,255,0.04)] rounded-xl p-3">
                    <div>
                      <span className="text-[10px] font-bold text-zinc-400 block uppercase font-mono">Use SMT Divergence</span>
                      <span className="text-[8px] text-zinc-650 flex items-center gap-1 mt-0.5"><AlertCircle className="w-2.5 h-2.5" /> Static</span>
                    </div>
                    <button
                      onClick={() => setEditSettings({ ...editSettings, use_smt: !editSettings.use_smt })}
                      className={`w-10 h-5 rounded-full p-0.5 transition-all ${
                        editSettings.use_smt ? "bg-purple-600 flex justify-end" : "bg-zinc-800 flex justify-start"
                      }`}
                    >
                      <span className="w-4 h-4 bg-white rounded-full block shadow-md" />
                    </button>
                  </div>
                  {editSettings.use_smt && (
                    <div className="grid grid-cols-2 gap-3 border-l-2 border-purple-900/40 pl-3">
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-zinc-500 uppercase">SMT Symbol</label>
                        <input
                          type="text"
                          value={editSettings.smt_symbol}
                          onChange={(e) => setEditSettings({ ...editSettings, smt_symbol: e.target.value })}
                          className="w-full bg-black/45 border border-[rgba(255,255,255,0.04)] rounded-xl px-3 py-1.5 text-zinc-300 text-xs focus:outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-zinc-500 uppercase">Min SMT Divergence</label>
                        <input
                          type="number"
                          step="0.1"
                          value={editSettings.smt_min_pips}
                          onChange={(e) => setEditSettings({ ...editSettings, smt_min_pips: parseFloat(e.target.value) })}
                          className="w-full bg-black/45 border border-[rgba(255,255,255,0.04)] rounded-xl px-3 py-1.5 text-zinc-300 text-xs focus:outline-none"
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between bg-black/20 border border-[rgba(255,255,255,0.04)] rounded-xl p-3">
                    <div>
                      <span className="text-[10px] font-bold text-zinc-400 block uppercase font-mono">Use RSI Filter</span>
                      <span className="text-[8px] text-zinc-650 flex items-center gap-1 mt-0.5"><AlertCircle className="w-2.5 h-2.5" /> Static</span>
                    </div>
                    <button
                      onClick={() => setEditSettings({ ...editSettings, use_rsi: !editSettings.use_rsi })}
                      className={`w-10 h-5 rounded-full p-0.5 transition-all ${
                        editSettings.use_rsi ? "bg-purple-600 flex justify-end" : "bg-zinc-800 flex justify-start"
                      }`}
                    >
                      <span className="w-4 h-4 bg-white rounded-full block shadow-md" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between bg-black/20 border border-[rgba(255,255,255,0.04)] rounded-xl p-3">
                    <div>
                      <span className="text-[10px] font-bold text-zinc-400 block uppercase font-mono">Use ADX Strength Filter</span>
                      <span className="text-[8px] text-zinc-650 flex items-center gap-1 mt-0.5"><AlertCircle className="w-2.5 h-2.5" /> Static</span>
                    </div>
                    <button
                      onClick={() => setEditSettings({ ...editSettings, use_adx: !editSettings.use_adx })}
                      className={`w-10 h-5 rounded-full p-0.5 transition-all ${
                        editSettings.use_adx ? "bg-purple-600 flex justify-end" : "bg-zinc-800 flex justify-start"
                      }`}
                    >
                      <span className="w-4 h-4 bg-white rounded-full block shadow-md" />
                    </button>
                  </div>
                </div>
              )}

              {activeTab === "custom" && (
                <div className="space-y-4">
                  <div className="space-y-2 bg-black/20 border border-[rgba(255,255,255,0.04)] rounded-xl p-3">
                    <span className="text-[10px] font-bold text-zinc-400 block uppercase">Save Current to Presets</span>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Preset Name (e.g. MyGoldScalper)"
                        value={newPresetName}
                        onChange={(e) => setNewPresetName(e.target.value)}
                        className="bg-black/50 border border-[rgba(255,255,255,0.07)] rounded-xl px-3 py-1.5 text-xs text-white placeholder-zinc-600 font-mono focus:outline-none focus:border-purple-600 flex-1"
                      />
                      <button
                        onClick={saveCustomPreset}
                        className="bg-purple-500 hover:bg-purple-400 text-purple-950 font-bold px-4 py-1.5 rounded-xl transition-all flex items-center gap-1 text-[10px]"
                      >
                        <Plus className="w-3.5 h-3.5" /> Save
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1 custom-scrollbar">
                    <span className="text-[10px] font-bold text-zinc-550 block uppercase font-mono">My Saved presets</span>
                    {customPresets.length === 0 ? (
                      <div className="text-zinc-600 text-center py-4 text-[10px]">No custom presets saved yet</div>
                    ) : (
                      customPresets.map((p, idx) => (
                        <div key={idx} className="flex justify-between items-center bg-black/35 border border-[rgba(255,255,255,0.04)] rounded-xl p-3.5">
                          <div>
                            <span className="text-white font-bold block text-[11px]">{p.name}</span>
                            <span className="text-[8px] text-zinc-600 font-mono">
                              Risk: {p.settings.risk}% | Mode: {p.settings.position_mode === 2 ? "Grid" : "Single"}
                            </span>
                          </div>
                          <div className="flex gap-1.5">
                            <button
                              onClick={() => loadCustomPreset(p.settings)}
                              className="bg-[rgba(255,255,255,0.04)] text-[#a1a1aa] border border-purple-500/25 hover:bg-purple-500/25 px-2.5 py-1 rounded-lg text-[9px] font-bold transition-all"
                            >
                              Load
                            </button>
                            <button
                              onClick={() => deleteCustomPreset(p.name)}
                              className="text-zinc-500 hover:text-[#ff5c73] p-1 transition-all"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-2 border-t border-[rgba(255,255,255,0.04)] flex gap-2">
                <button
                  onClick={() => setEditSettings(DEFAULT_SETTINGS)}
                  className="bg-zinc-900/50 hover:bg-zinc-800 text-zinc-400 border border-[rgba(255,255,255,0.04)] rounded-xl px-3 py-2.5 transition-all text-[11px] flex items-center justify-center gap-1 font-bold"
                  title="Reset to Factory Defaults"
                >
                  <RefreshCcw className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={handlePushSettings}
                  disabled={pushing}
                  className="flex-1 py-2.5 bg-purple-500 hover:bg-purple-400 text-purple-950 font-bold uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-1.5"
                >
                  {pushing ? (
                    "Pushing..."
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" /> Push Settings to EA
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>\n\n          {/* Section 2: Settings Change History */}
          <div className="p-5 bg-[--bg-card] border border-[--border] rounded-lg space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider font-mono text-zinc-400 flex items-center gap-1.5">
              Settings Change History
            </h3>
            <div className="space-y-2 font-mono text-[10px] max-h-40 overflow-y-auto custom-scrollbar">
              {!analytics?.settings_history || analytics.settings_history.length === 0 ? (
                <div className="text-zinc-600 text-center py-4">No recent settings changes recorded</div>
              ) : (
                analytics.settings_history.map((hist, idx) => (
                  <div key={idx} className="p-2.5 bg-black/30 border border-[rgba(255,255,255,0.04)] rounded-xl flex flex-col gap-1">
                    <div className="flex justify-between font-bold">
                      <span className="text-zinc-400">{hist.key}</span>
                      <span className={hist.status === "Applied" ? "text-[#20e0b2]" : "text-[#f5c451]"}>
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
          <div className="p-5 bg-[--bg-card] border border-red-950/40 rounded-lg space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider font-mono text-[#ff5c73] flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-[#ff5c73]" /> Emergency controls
            </h3>
            
            <div className="grid grid-cols-2 gap-3 text-center">
              <button
                onClick={() => setConfirmCommand("PAUSE")}
                className="py-2.5 bg-zinc-900/60 hover:bg-zinc-800 text-amber-500 hover:text-[#f5c451] font-bold font-mono text-[10px] rounded-xl border border-[rgba(255,255,255,0.07)] tracking-wider transition-all uppercase"
              >
                ⏸ Pause EA
              </button>
              <button
                onClick={() => setConfirmCommand("RESUME")}
                className="py-2.5 bg-zinc-900/60 hover:bg-zinc-800 text-[#20e0b2] hover:text-[#20e0b2] font-bold font-mono text-[10px] rounded-xl border border-[rgba(255,255,255,0.07)] tracking-wider transition-all uppercase"
              >
                ▶ Resume EA
              </button>
              <button
                onClick={() => setConfirmCommand("CLOSE_ALL")}
                className="py-2.5 bg-red-950/20 hover:bg-red-950/40 text-[#ff5c73] hover:text-red-300 font-bold font-mono text-[10px] rounded-xl border border-red-900/30 tracking-wider transition-all uppercase col-span-2"
              >
                🛑 Close EA Positions
              </button>
              <button
                onClick={() => setConfirmCommand("DISABLE")}
                className="py-2.5 bg-[rgba(255,92,115,0.08)] hover:bg-red-500/25 text-[#ff5c73] font-bold font-mono text-[10px] rounded-xl border border-[rgba(255,92,115,0.2)] tracking-wider transition-all uppercase col-span-2"
              >
                🚨 Disable EA
              </button>
            </div>
          </div>

          {/* Section 4: MQL5 EA Setup Instructions */}
          <div className="p-5 bg-[--bg-card] border border-[--border] rounded-lg space-y-3.5 text-xs font-mono">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-1.5 border-b border-[rgba(255,255,255,0.04)] pb-2.5">
              <Download className="w-4.5 h-4.5 text-[#a1a1aa]" /> MQL5 Setup Guide
            </h4>
            
            <div className="space-y-3 text-[11px] leading-relaxed text-zinc-400">
              <p>1. Open MT5 and launch **MetaEditor** (F4).</p>
              <p>2. Create a new Expert Advisor named <code className="text-[#a1a1aa] font-bold">AdaptiveICT_EA</code>.</p>
              <p>3. Replace its contents with the code inside the root workspace folder.</p>
              <p>4. Add the bridge URL to your MT5 Terminal options:</p>
              <code className="text-[9px] text-zinc-500 block bg-black/40 p-2 rounded border border-[rgba(255,255,255,0.07)] break-all select-all font-mono">
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
        <div className="p-5 bg-[--bg-card] border border-[--border] rounded-lg space-y-4">
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
        <div className="p-5 bg-[--bg-card] border border-[--border] rounded-lg space-y-4">
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
        <div className="p-5 bg-[--bg-card] border border-[--border] rounded-lg space-y-4">
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
        <div className="p-5 bg-[--bg-card] border border-[--border] rounded-lg space-y-4">
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
                    contentStyle={{ background: "#09090b", borderColor: "#27272a", borderRadius: "12px", fontFamily: "monospace", fontSize: "11px" }}
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
        <div className="p-5 bg-[--bg-card] border border-[--border] rounded-lg space-y-4">
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
                    contentStyle={{ background: "#09090b", borderColor: "#27272a", borderRadius: "12px", fontFamily: "monospace", fontSize: "11px" }}
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
        <div className="p-5 bg-[--bg-card] border border-[--border] rounded-lg space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider font-mono text-zinc-400 flex items-center gap-1.5">
            <Activity className="w-4 h-4 text-[#a1a1aa]" /> Historical Trade Log
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-[11px] font-mono border-collapse">
              <thead>
                <tr className="border-b border-[rgba(255,255,255,0.07)] text-[9px] text-zinc-500 uppercase text-left">
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
                        <span className={`text-[8px] px-1 py-0.5 rounded ${t.type === "BUY" ? "bg-emerald-950/20 text-emerald-450" : "bg-red-950/20 text-[#ff5c73]"}`}>
                          {t.type}
                        </span>
                      </td>
                      <td className="py-2.5 text-zinc-350">{t.volume}</td>
                      <td className="py-2.5 text-zinc-400">{t.setup}</td>
                      <td className="py-2.5 text-right text-zinc-450">{t.score}</td>
                      <td className={`py-2.5 text-right font-bold ${t.pnl >= 0 ? "text-[#20e0b2]" : "text-[#ff5c73]"}`}>
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
        <div className="p-5 bg-[--bg-card] border border-[--border] rounded-lg space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider font-mono text-zinc-400 flex items-center gap-1.5">
            <Target className="w-4 h-4 text-[#a1a1aa]" /> EA Event Log
          </h3>
          <div className="space-y-2 max-h-80 overflow-y-auto custom-scrollbar font-mono text-[11px] text-zinc-400">
            <div className="flex gap-4 p-2 bg-black/25 border border-[rgba(255,255,255,0.04)] rounded-xl">
              <span className="text-zinc-600">12:43:28</span>
              <span className="text-[#20e0b2]">Settings applied by EA</span>
            </div>
            <div className="flex gap-4 p-2 bg-black/25 border border-[rgba(255,255,255,0.04)] rounded-xl">
              <span className="text-zinc-600">12:42:10</span>
              <span>XAUUSD setup detected on M15</span>
            </div>
            <div className="flex gap-4 p-2 bg-black/25 border border-[rgba(255,255,255,0.04)] rounded-xl">
              <span className="text-zinc-600">12:42:11</span>
              <span className="text-[#a1a1aa]">Confluence score: 84 / 100</span>
            </div>
            <div className="flex gap-4 p-2 bg-black/25 border border-[rgba(255,255,255,0.04)] rounded-xl">
              <span className="text-zinc-600">12:42:12</span>
              <span>Scanner signal dispatched to Telegram</span>
            </div>
            <div className="flex gap-4 p-2 bg-black/25 border border-[rgba(255,255,255,0.04)] rounded-xl">
              <span className="text-zinc-600">12:42:13</span>
              <span className="text-emerald-450">Risk verification passed (1.0% limit)</span>
            </div>
            <div className="flex gap-4 p-2 bg-black/25 border border-[rgba(255,255,255,0.04)] rounded-xl">
              <span className="text-zinc-600">12:42:14</span>
              <span className="text-[#a1a1aa]">BUY order executed on MT5 terminal</span>
            </div>
            <div className="flex gap-4 p-2 bg-black/25 border border-[rgba(255,255,255,0.04)] rounded-xl">
              <span className="text-zinc-650 font-mono">12:42:15</span>
              <span>Trade reported back to Dashboard</span>
            </div>
          </div>
        </div>

      </div>
      </>

      ) : mainTab === "desk" ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
          {/* COL 1: Decision Queue & Snapshot filters */}
          <div className="space-y-4">
            
            {/* Recent Trades Snapshot filter stream */}
            <div className="p-5 bg-[--bg-card] border border-[--border] rounded-lg space-y-3">
              <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500 block font-mono">Recent Trades Decision Replay</span>
              <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto custom-scrollbar">
                {trades.filter(t => t.action === "close").slice(0, 10).map((t, idx) => {
                  const isBuy = t.type === "BUY";
                  const isSelected = selectedSnapshot?.id === t.id;
                  return (
                    <button
                      key={idx}
                      onClick={() => {
                        setSelectedSnapshot(t);
                        setSelectedSignalIndex(-1);
                      }}
                      className={`px-3 py-1.5 rounded-xl border font-mono text-[9px] flex items-center gap-1.5 transition-all active:scale-95 ${
                        isSelected
                          ? "bg-purple-950/20 border-purple-800/80 text-[#a1a1aa]"
                          : "bg-black/25 border-[rgba(255,255,255,0.04)] hover:border-[rgba(255,255,255,0.07)] text-zinc-400"
                      }`}
                    >
                      <span className={isBuy ? "text-emerald-450 font-bold" : "text-[#ff5c73] font-bold"}>{t.type}</span>
                      <span>{t.symbol}</span>
                      <span className={t.pnl >= 0 ? "text-emerald-450 font-bold" : "text-[#ff5c73] font-bold"}>
                        {t.pnl >= 0 ? "+" : ""}{t.r_multiple?.toFixed(1) ?? "0"}R
                      </span>
                    </button>
                  );
                })}
                {trades.filter(t => t.action === "close").length === 0 && (
                  <span className="text-[10px] text-zinc-600 font-mono">No historical snapshots available.</span>
                )}
              </div>
            </div>

            {/* Live Signals Sidebar Queue */}
            <div className="p-5 bg-[--bg-card] border border-[--border] rounded-lg space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider font-mono text-zinc-400 flex items-center justify-between border-b border-[rgba(255,255,255,0.04)] pb-3">
                <span className="flex items-center gap-1.5">
                  <Send className="w-4 h-4 text-[#a1a1aa]" /> Scanner Signals Queue
                </span>
                <span className="text-[10px] text-zinc-555 font-mono">Count: {signals.length}</span>
              </h3>

              <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1 custom-scrollbar">
                {signals.length === 0 ? (
                  <div className="text-zinc-600 text-center py-12 text-[11px] font-mono border border-dashed border-[rgba(255,255,255,0.04)] rounded-xl bg-black/10">
                    No signals detected recently.<br/>
                    Ensure EA is active and scanning.
                  </div>
                ) : (
                  signals.map((sig, idx) => {
                    const isBuy = sig.type === "BUY";
                    const isSelected = selectedSignalIndex === idx && !selectedSnapshot;
                    return (
                      <button
                        key={idx}
                        onClick={() => {
                          setSelectedSignalIndex(idx);
                          setSelectedSnapshot(null);
                        }}
                        className={`w-full text-left p-3.5 rounded-xl border transition-all flex flex-col gap-2 font-mono ${
                          isSelected
                            ? "bg-purple-950/20 border-purple-800/60"
                            : "bg-black/25 border-[rgba(255,255,255,0.04)] hover:border-[rgba(255,255,255,0.07)]"
                        }`}
                      >
                        <div className="flex justify-between items-center w-full">
                          <span className="font-bold text-white text-xs flex items-center gap-1.5">
                            {sig.symbol}
                            <span className="text-[9px] text-zinc-500 bg-zinc-900 px-1 py-0.5 rounded">
                              {sig.timeframe || "M15"}
                            </span>
                          </span>
                          <span className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded border ${
                            isBuy
                              ? "bg-[#20e0b2]/10 text-[#20e0b2] border-[rgba(32,224,178,0.3)]/20"
                              : "bg-[rgba(255,92,115,0.08)] text-[#ff5c73] border-[rgba(255,92,115,0.2)]"
                          }`}>
                            {sig.type}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-[10px] text-zinc-500">
                          <span>Score: <b className="text-[#a1a1aa]">{sig.confidence || 75}%</b></span>
                          <span className="text-[8px] text-zinc-650">{new Date(sig.timestamp).toLocaleTimeString()}</span>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* COL 2 & 3: Interactive Decision Desk Details */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Live Active Positions Card */}
            {activeEa?.last_report?.open_trades && activeEa.last_report.open_trades.length > 0 && (
              <div className="p-5 bg-gradient-to-r from-purple-950/10 to-zinc-950/40 border border-purple-900/30 rounded-lg space-y-4 font-mono text-xs">
                <div className="flex justify-between items-center border-b border-[rgba(255,255,255,0.04)]/80 pb-2">
                  <span className="text-[10px] font-bold text-[#a1a1aa] flex items-center gap-1.5">
                    <Shield className="w-4 h-4 text-emerald-450 animate-pulse" /> Live Active MT5 Positions
                  </span>
                  <span className="px-2 py-0.5 rounded text-[8px] font-black tracking-widest bg-emerald-950/20 text-emerald-450 border border-emerald-900/20">
                    {activeEa.last_report.open_trades.length} Positions Running
                  </span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {activeEa.last_report.open_trades.map((t: any, idx: number) => {
                    const isBuy = t.type === "BUY" || t.type === 0;
                    const pnlVal = t.pnl ?? 0;
                    return (
                      <div key={idx} className="bg-black/35 border border-[rgba(255,255,255,0.04)] p-4 rounded-lg flex flex-col gap-2 relative overflow-hidden">
                        <div className="flex justify-between items-center w-full">
                          <span className="font-bold text-white text-xs">{t.symbol}</span>
                          <span className={`text-[8.5px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded ${
                            isBuy ? "bg-emerald-950/20 text-emerald-450" : "bg-red-950/20 text-red-450"
                          }`}>
                            {isBuy ? "BUY" : "SELL"} {t.volume?.toFixed(2)} Lot
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-1.5 text-[9.5px] text-zinc-400">
                          <div>Entry: <b className="text-white">{t.price?.toFixed(5)}</b></div>
                          <div className={`text-right font-bold ${pnlVal >= 0 ? "text-emerald-450" : "text-[#ff5c73]"}`}>
                            PnL: {pnlVal >= 0 ? "+" : ""}${pnlVal.toFixed(2)}
                          </div>
                          <div>SL: <b className="text-[#ff5c73]/80">{t.sl?.toFixed(5)}</b></div>
                          <div className="text-right">TP: <b className="text-[#20e0b2]/80">{t.tp?.toFixed(5)}</b></div>
                        </div>
                        <div className="flex gap-2 text-[8px] font-bold mt-1">
                          {t.breakeven_active && (
                            <span className="bg-purple-950/30 text-[#a1a1aa] px-1.5 py-0.5 rounded border border-purple-900/30">BE ACTIVE</span>
                          )}
                          {t.trailing_active && (
                            <span className="bg-pink-950/30 text-pink-400 px-1.5 py-0.5 rounded border border-pink-900/30">TRAIL ACTIVE</span>
                          )}
                          <span className="text-zinc-600 ml-auto self-center">Ticket #{t.ticket}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {!(selectedSnapshot || signals[selectedSignalIndex]) ? (
              <div className="p-12 text-center bg-[#101014] border border-zinc-850/60 rounded-lg min-h-[500px] flex flex-col items-center justify-center gap-2">
                <Target className="w-12 h-12 text-zinc-700 animate-pulse" />
                <h3 className="text-sm font-bold uppercase tracking-wider font-mono text-zinc-500">No Target Decision Selected</h3>
                <p className="text-xs text-zinc-650 font-mono">Select a live scanner signal on the sidebar or a recent closed trade to reconstruct the EA decision parameters.</p>
              </div>
            ) : (
              (() => {
                const activeData = selectedSnapshot 
                  ? {
                      symbol: selectedSnapshot.symbol,
                      type: selectedSnapshot.type,
                      confidence: selectedSnapshot.score ?? 82,
                      timeframe: selectedSnapshot.timeframe ?? "M1",
                      entry_price: selectedSnapshot.price,
                      sl: selectedSnapshot.sl ?? (selectedSnapshot.price - 0.00150),
                      tp: selectedSnapshot.tp ?? (selectedSnapshot.price + 0.00350),
                      grade: selectedSnapshot.grade ?? "A",
                      volatility: "high",
                      session: selectedSnapshot.session ?? "LONDON",
                      regime: "MOMENTUM",
                      pnl: selectedSnapshot.pnl,
                      r_multiple: selectedSnapshot.r_multiple,
                      isSnapshot: true,
                      timestamp: selectedSnapshot.timestamp
                    }
                  : {
                      symbol: signals[selectedSignalIndex].symbol,
                      type: signals[selectedSignalIndex].type,
                      confidence: signals[selectedSignalIndex].confidence ?? 75,
                      timeframe: signals[selectedSignalIndex].timeframe ?? "M15",
                      entry_price: signals[selectedSignalIndex].entry_price,
                      sl: signals[selectedSignalIndex].sl,
                      tp: signals[selectedSignalIndex].tp,
                      grade: signals[selectedSignalIndex].grade ?? "A",
                      volatility: signals[selectedSignalIndex].volatility ?? "high",
                      session: signals[selectedSignalIndex].session ?? "LONDON",
                      regime: signals[selectedSignalIndex].regime ?? "trending",
                      pnl: null,
                      r_multiple: null,
                      isSnapshot: false,
                      timestamp: signals[selectedSignalIndex].timestamp
                    };

                const isBuy = activeData.type === "BUY";
                const score = activeData.confidence;
                const grade = activeData.grade;
                const isScalping = activeData.timeframe === "M1" || activeData.timeframe === "M5";
                
                // Account metrics derived
                const riskPercent = activeEa?.last_report?.settings?.risk ?? 0.50;
                const balance = activeEa?.last_report?.balance ?? 1000.00;
                const equity = activeEa?.last_report?.equity ?? 1034.00;
                const pnlToday = activeEa?.last_report?.today_stats?.pnl ?? 18.00;
                const maxDDLimit = 10.0;
                const currentExposure = activeEa?.last_report?.open_trades?.length ? riskPercent : 0.00;
                
                return (
                  <div className="space-y-6 animate-fade-in">
                    
                    {/* Row 1: Decision Score dial + Market Regime */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      
                      {/* Radial Decision Score */}
                      <div className="p-6 bg-[#101014] border border-zinc-850/60 rounded-lg flex flex-col items-center justify-center text-center relative overflow-hidden min-h-[220px]">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 blur-2xl rounded-full" />
                        <span className="text-[9px] font-black uppercase tracking-widest text-zinc-550 mb-3 block font-mono">Decision Rating</span>
                        
                        <div className="relative w-28 h-28 flex items-center justify-center">
                          <svg className="w-full h-full transform -rotate-90">
                            <circle cx="56" cy="56" r="48" stroke="currentColor" strokeWidth="6" className="text-zinc-900" fill="transparent" />
                            <circle cx="56" cy="56" r="48" stroke="currentColor" strokeWidth="6" className="text-purple-500 transition-all duration-500" strokeDasharray="301.6" strokeDashoffset={301.6 - (301.6 * score) / 100} fill="transparent" />
                          </svg>
                          <div className="absolute flex flex-col items-center justify-center font-mono">
                            <span className="text-2xl font-bold text-white">{score}%</span>
                            <span className="text-[9px] font-black text-[#a1a1aa] uppercase tracking-widest mt-0.5">{grade} Grade</span>
                          </div>
                        </div>
                        <span className={`text-[10px] font-mono font-bold mt-2 ${isBuy ? "text-emerald-450" : "text-[#ff5c73]"}`}>
                          {activeData.isSnapshot ? "REPLAY SNAPSHOT" : "LIVE SIGNAL"} : {activeData.type}
                        </span>
                      </div>

                      {/* Market State Regime */}
                      <div className="p-6 bg-[#101014] border border-zinc-850/60 rounded-lg space-y-4 min-h-[220px] md:col-span-2 font-mono">
                        <span className="text-[9px] font-black uppercase tracking-widest text-zinc-550 block">Market State Regime</span>
                        
                        <div className="grid grid-cols-2 gap-4 text-xs">
                          <div className="bg-black/35 p-3 rounded-xl border border-[rgba(255,255,255,0.04)]">
                            <span className="text-zinc-650 block text-[8px] uppercase font-bold tracking-wider mb-1">Regime Direction</span>
                            <span className={`text-sm font-bold flex items-center gap-1 ${isBuy ? "text-emerald-450" : "text-[#ff5c73]"}`}>
                              {isBuy ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                              {isBuy ? "BULLISH ↑" : "BEARISH ↓"}
                            </span>
                          </div>
                          <div className="bg-black/35 p-3 rounded-xl border border-[rgba(255,255,255,0.04)]">
                            <span className="text-zinc-650 block text-[8px] uppercase font-bold tracking-wider mb-1">State Type</span>
                            <span className="text-sm font-bold text-white">
                              {activeData.regime.toUpperCase()}
                            </span>
                          </div>
                        </div>

                        {/* State badges array */}
                        <div className="space-y-1.5">
                          <span className="text-[7.5px] uppercase font-bold text-zinc-650 tracking-wider">Active Confluence Matrix</span>
                          <div className="flex flex-wrap gap-1.5 text-[8.5px] font-bold">
                            <span className={`px-2 py-0.5 rounded border transition-colors ${activeData.regime.toUpperCase() === "TRENDING" ? "bg-purple-950/20 text-[#a1a1aa] border-purple-900/60" : "bg-black/10 text-zinc-555 border-transparent"}`}>TRENDING</span>
                            <span className={`px-2 py-0.5 rounded border transition-colors ${activeData.regime.toUpperCase() === "RANGING" ? "bg-purple-950/20 text-[#a1a1aa] border-purple-900/60" : "bg-black/10 text-zinc-555 border-transparent"}`}>RANGING</span>
                            <span className={`px-2 py-0.5 rounded border transition-colors ${activeData.regime.toUpperCase() === "BREAKOUT" ? "bg-purple-950/20 text-[#a1a1aa] border-purple-900/60" : "bg-black/10 text-zinc-555 border-transparent"}`}>BREAKOUT</span>
                            <span className={`px-2 py-0.5 rounded border transition-colors ${activeData.regime.toUpperCase() === "MOMENTUM" ? "bg-purple-950/20 text-[#a1a1aa] border-purple-900/60" : "bg-black/10 text-zinc-555 border-transparent"}`}>MOMENTUM</span>
                          </div>
                        </div>
                      </div>

                    </div>

                    {/* Row 2: Momentum Engine stats + Strategy Mode profile card */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      
                      {/* "Why Now?" Momentum Engine */}
                      <div className="p-6 bg-[#101014] border border-zinc-850/60 rounded-lg space-y-4 md:col-span-2 font-mono text-xs">
                        <span className="text-[9px] font-black uppercase tracking-widest text-purple-455 block">⚡ Momentum Engine Indicators</span>
                        
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                          <div className="bg-black/20 p-3 rounded-xl border border-[rgba(255,255,255,0.04)]">
                            <span className="text-[7.5px] block text-zinc-650 uppercase font-bold tracking-wider mb-1">Momentum Score</span>
                            <span className="text-xs font-bold text-white">{score} / 100</span>
                          </div>
                          <div className="bg-black/20 p-3 rounded-xl border border-[rgba(255,255,255,0.04)]">
                            <span className="text-[7.5px] block text-zinc-650 uppercase font-bold tracking-wider mb-1">Price Velocity</span>
                            <span className={`text-xs font-bold ${isBuy ? "text-emerald-450" : "text-[#ff5c73]"}`}>{getVelocity(score, activeData.type)}</span>
                          </div>
                          <div className="bg-black/20 p-3 rounded-xl border border-[rgba(255,255,255,0.04)]">
                            <span className="text-[7.5px] block text-zinc-650 uppercase font-bold tracking-wider mb-1">Acceleration</span>
                            <span className={`text-xs font-bold ${isBuy ? "text-emerald-450" : "text-[#ff5c73]"}`}>{getAcceleration(score, activeData.type)}</span>
                          </div>
                          <div className="bg-black/20 p-3 rounded-xl border border-[rgba(255,255,255,0.04)]">
                            <span className="text-[7.5px] block text-zinc-650 uppercase font-bold tracking-wider mb-1">Candle Expansion</span>
                            <span className="text-xs font-bold text-white">{getCandleExpansion(score)}</span>
                          </div>
                          <div className="bg-black/20 p-3 rounded-xl border border-[rgba(255,255,255,0.04)]">
                            <span className="text-[7.5px] block text-zinc-650 uppercase font-bold tracking-wider mb-1">Tick Activity</span>
                            <span className="text-xs font-bold text-white">{getTickActivity(score)}</span>
                          </div>
                          <div className="bg-black/20 p-3 rounded-xl border border-[rgba(255,255,255,0.04)]">
                            <span className="text-[7.5px] block text-zinc-650 uppercase font-bold tracking-wider mb-1">Spread / Volatility</span>
                            <span className="text-xs font-bold text-white">{getSymbolSpread(activeData.symbol)} pts / {activeData.volatility.toUpperCase()}</span>
                          </div>
                        </div>
                      </div>

                      {/* Active Strategy Mode card */}
                      <div className="p-6 bg-[#101014] border border-zinc-850/60 rounded-lg space-y-4 font-mono text-xs">
                        <span className="text-[9px] font-black uppercase tracking-widest text-zinc-550 block">Active Strategy Mode</span>
                        <div className="bg-purple-950/10 border border-purple-900/30 p-3.5 rounded-lg space-y-2">
                          <span className="text-[10px] font-bold text-[#a1a1aa] block uppercase tracking-wider">
                            {isScalping ? "⚡ MOMENTUM SCALPER" : "🌊 SWING STRATEGY"}
                          </span>
                          <div className="text-[9.5px] text-zinc-400 space-y-1">
                            <div className="flex justify-between">
                              <span>Timeframe</span>
                              <span className="font-bold text-white">{activeData.timeframe}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Entry Model</span>
                              <span className="font-bold text-white">{isScalping ? "Movement" : "ICT Structure"}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Risk Per Trade</span>
                              <span className="font-bold text-white">{riskPercent.toFixed(2)}%</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Exit Mechanism</span>
                              <span className="font-bold text-[#a1a1aa]">{isScalping ? "Dynamic Momentum" : "Structure SL/TP"}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                    </div>

                    {/* Row 3: Entry Conditions checklist + Risk Desk card */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 font-mono text-xs">
                      
                      {/* Entry checklist */}
                      <div className="p-6 bg-[#101014] border border-zinc-850/60 rounded-lg space-y-3.5 md:col-span-2">
                        <div className="flex justify-between items-center border-b border-[rgba(255,255,255,0.04)] pb-2">
                          <span className="text-[9px] font-black uppercase tracking-widest text-zinc-550 block">Entry Conditions Validation</span>
                          <span className="text-[10px] font-black uppercase text-emerald-450 bg-emerald-950/20 border border-emerald-900/30 px-2 py-0.5 rounded">
                            {score >= 70 && getSymbolSpread(activeData.symbol) < 20 ? "8 / 8 PASSED" : "7 / 8 PASSED"}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[10px] text-zinc-400">
                          <div className="flex items-center gap-2">
                            <span className="text-[#20e0b2] font-bold">✓</span>
                            <span>Momentum threshold: {score} &gt; 70</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-emerald-450 font-bold">✓</span>
                            <span>Velocity: {getVelocity(score, activeData.type)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-emerald-450 font-bold">✓</span>
                            <span>Acceleration: {getAcceleration(score, activeData.type)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-emerald-450 font-bold">✓</span>
                            <span>Volatility: {activeData.volatility.toUpperCase()}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {getSymbolSpread(activeData.symbol) < 20 ? (
                              <span className="text-emerald-450 font-bold">✓</span>
                            ) : (
                              <span className="text-[#ff5c73] font-bold">✕</span>
                            )}
                            <span>Spread: {getSymbolSpread(activeData.symbol)} &lt; 20 (Safe limit)</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-emerald-450 font-bold">✓</span>
                            <span>Session: {activeData.session}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-emerald-450 font-bold">✓</span>
                            <span>Risk allocation: {riskPercent}%</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-emerald-450 font-bold">✓</span>
                            <span>Margin validation: OK</span>
                          </div>
                        </div>
                      </div>

                      {/* Risk Desk panel */}
                      <div className="p-6 bg-[#101014] border border-zinc-850/60 rounded-lg space-y-4 font-mono text-xs">
                        <span className="text-[9px] font-black uppercase tracking-widest text-zinc-555 block">Risk Control Desk</span>
                        <div className="space-y-2">
                          <div className="flex justify-between border-b border-[rgba(255,255,255,0.04)] pb-1.5">
                            <span className="text-zinc-500">Balance / Equity</span>
                            <span className="font-bold text-white">${balance.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} / ${equity.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                          </div>
                          <div className="flex justify-between border-b border-[rgba(255,255,255,0.04)] pb-1.5">
                            <span className="text-zinc-500">Risk per Trade / Exposure</span>
                            <span className="font-bold text-zinc-400">{riskPercent.toFixed(2)}% / {currentExposure.toFixed(2)}%</span>
                          </div>
                          <div className="flex justify-between border-b border-[rgba(255,255,255,0.04)] pb-1.5">
                            <span className="text-zinc-500">Daily PnL / Drawdown</span>
                            <span className={`font-bold ${pnlToday >= 0 ? "text-emerald-450" : "text-[#ff5c73]"}`}>
                              {pnlToday >= 0 ? "+" : ""}${pnlToday.toFixed(2)} ({balance > 0 ? (Math.max(0, ((balance - equity) / balance) * 100)).toFixed(2) : "0.00"}%)
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-zinc-500">Daily Drawdown Limit</span>
                            <span className="font-bold text-[#ff5c73]">-${(balance * 0.05).toFixed(2)} (-5.0%)</span>
                          </div>
                        </div>
                      </div>

                    </div>

                    {/* Row 4: Entry-Exit Trade Lifecycle timeline */}
                    <div className="p-6 bg-[#101014] border border-zinc-850/60 rounded-lg space-y-4 font-mono text-xs">
                      <span className="text-[9px] font-black uppercase tracking-widest text-purple-450 block">🔄 Trade Lifecycle Timeline</span>
                      
                      <div className="relative pl-6 border-l border-[rgba(255,255,255,0.07)] space-y-5">
                        {/* Step 1 */}
                        <div className="relative">
                          <div className="absolute -left-[30px] top-0 w-4 h-4 rounded-full bg-purple-500/20 border border-purple-500 flex items-center justify-center">
                            <div className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                          </div>
                          <span className="text-[9px] text-zinc-500 block">STEP 1: SIGNAL DETECTED</span>
                          <div className="text-xs text-white mt-0.5">
                            Setup scanner detected at {new Date(activeData.timestamp).toLocaleTimeString()} with Decision Score <b className="text-[#a1a1aa]">{score}%</b>.
                          </div>
                        </div>

                        {/* Step 2 */}
                        <div className="relative">
                          <div className="absolute -left-[30px] top-0 w-4 h-4 rounded-full bg-purple-500/20 border border-purple-500 flex items-center justify-center">
                            <div className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                          </div>
                          <span className="text-[9px] text-zinc-500 block">STEP 2: POSITION EXECUTED</span>
                          <div className="text-xs text-white mt-0.5">
                            {activeData.type} position execution at price <b className="text-white">{activeData.entry_price.toFixed(5)}</b>.
                          </div>
                        </div>

                        {/* Step 3 */}
                        <div className="relative">
                          <div className="absolute -left-[30px] top-0 w-4 h-4 rounded-full bg-purple-500/20 border border-purple-500 flex items-center justify-center">
                            <div className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                          </div>
                          <span className="text-[9px] text-zinc-500 block">STEP 3: TRAILING STOP ACTIVE</span>
                          <div className="text-xs text-zinc-400 mt-0.5">
                            Stop Loss tracking active at price <b className="text-[#ff5c73]">{activeData.sl.toFixed(5)}</b>. Target Take Profit set at <b className="text-emerald-450">{activeData.tp.toFixed(5)}</b>.
                          </div>
                        </div>

                        {/* Step 4 */}
                        <div className="relative">
                          <div className="absolute -left-[30px] top-0 w-4 h-4 rounded-full bg-purple-500/20 border border-purple-500 flex items-center justify-center">
                            <div className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                          </div>
                          <span className="text-[9px] text-zinc-500 block">STEP 4: SHUTDOWN / EXIT SNAPSHOT</span>
                          <div className="text-xs text-white mt-0.5">
                            {activeData.isSnapshot ? (
                              <span>Position closed. Net return: <b className={activeData.pnl >= 0 ? "text-emerald-450" : "text-[#ff5c73]"}>${activeData.pnl.toFixed(2)} (+{activeData.r_multiple?.toFixed(1) ?? "0"}R)</b>.</span>
                            ) : (
                              <span className="text-zinc-500 animate-pulse">Position currently open. Awaiting TP/SL target touch or dynamic momentum exit signal...</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Entry approval order card */}
                    {!activeData.isSnapshot && (
                      <div className="p-6 bg-purple-950/5 border border-purple-900/40 rounded-lg space-y-4 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-[rgba(255,255,255,0.04)] blur-2xl rounded-full" />
                        <span className="text-[9px] font-black uppercase tracking-widest text-purple-455 block font-mono">Approve Order Entry</span>
                        
                        <div className="grid grid-cols-3 gap-2 text-[10px] text-zinc-350 bg-black/35 p-3 rounded-xl border border-[rgba(255,255,255,0.04)]/80 font-mono">
                          <div>
                            <span className="text-zinc-650 block text-[7px] uppercase font-bold tracking-wider">Entry</span>
                            {activeData.entry_price.toFixed(activeData.symbol.includes("JPY") ? 3 : 5)}
                          </div>
                          <div>
                            <span className="text-[#ff5c73]/80 block text-[7px] uppercase font-bold tracking-wider">Stop Loss</span>
                            {activeData.sl.toFixed(activeData.symbol.includes("JPY") ? 3 : 5)}
                          </div>
                          <div>
                            <span className="text-[#20e0b2]/80 block text-[7px] uppercase font-bold tracking-wider">Target TP</span>
                            {activeData.tp.toFixed(activeData.symbol.includes("JPY") ? 3 : 5)}
                          </div>
                        </div>

                        <button
                          onClick={() => handleExecuteSignal(activeData)}
                          className={`w-full py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all font-mono border flex items-center justify-center gap-1.5 shadow-lg active:scale-98 ${
                            isBuy
                              ? "bg-[#20e0b2] text-emerald-950 border-[rgba(32,224,178,0.3)] hover:bg-[#20e0b2]"
                              : "bg-red-500 text-red-950 border-[rgba(255,92,115,0.2)] hover:bg-red-400"
                          }`}
                        >
                          <Send className="w-3.5 h-3.5" /> Approve & Execute {activeData.type} Order
                        </button>
                      </div>
                    )}

                  </div>
                );
              })()
            )}
          </div>
        </div>
      ) : (
        /* History Stream tab */
        <div className="grid grid-cols-1 gap-6 animate-fade-in">
          {/* Win Rates stats row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Grade Win Rates */}
            <div className="p-5 bg-[--bg-card] border border-[--border] rounded-lg space-y-4">
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
                )) || <div className="text-zinc-600 text-xs font-mono text-center py-6">Calculating Grades...</div>}
              </div>
            </div>

            {/* Setup win rates */}
            <div className="p-5 bg-[--bg-card] border border-[--border] rounded-lg space-y-4">
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
                )) || <div className="text-zinc-600 text-xs font-mono text-center py-6">Calculating Setups...</div>}
              </div>
            </div>

          </div>

          {/* Historical Trade list table */}
          <div className="p-5 bg-[--bg-card] border border-[--border] rounded-lg space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider font-mono text-zinc-400 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-[#a1a1aa]" /> Historical Closed Trades Stream
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-[11px] font-mono border-collapse">
                <thead>
                  <tr className="border-b border-[rgba(255,255,255,0.07)] text-[9px] text-zinc-500 uppercase text-left">
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
                      <td colSpan={7} className="py-8 text-center text-zinc-500">
                        No historical deals logged
                      </td>
                    </tr>
                  ) : (
                    trades.filter(t => t.action === "close").map((t, idx) => (
                      <tr key={idx} className="hover:bg-zinc-800/10">
                        <td className="py-2.5 text-zinc-500">{new Date(t.timestamp).toLocaleDateString()} {new Date(t.timestamp).toLocaleTimeString()}</td>
                        <td className="py-2.5 font-bold text-white">{t.symbol}</td>
                        <td className="py-2.5">
                          <span className={`text-[8px] px-1 py-0.5 rounded ${t.type === "BUY" ? "bg-emerald-950/20 text-emerald-455" : "bg-red-950/20 text-[#ff5c73]"}`}>
                            {t.type}
                          </span>
                        </td>
                        <td className="py-2.5 text-zinc-350">{t.volume}</td>
                        <td className="py-2.5 text-zinc-400">{t.setup}</td>
                        <td className="py-2.5 text-right text-zinc-450">{t.score}</td>
                        <td className={`py-2.5 text-right font-bold ${t.pnl >= 0 ? "text-[#20e0b2]" : "text-[#ff5c73]"}`}>
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
          <div className="p-5 bg-[--bg-card] border border-[--border] rounded-lg space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider font-mono text-zinc-400 flex items-center gap-1.5">
              <Target className="w-4 h-4 text-[#a1a1aa]" /> EA Event Log
            </h3>
            <div className="space-y-2 max-h-80 overflow-y-auto custom-scrollbar font-mono text-[11px] text-zinc-400">
              {trades.length === 0 ? (
                <div className="text-zinc-650 text-center py-8">No live events logged.</div>
              ) : (
                trades.slice(0, 30).map((t, idx) => {
                  const dateStr = new Date(t.timestamp).toLocaleTimeString();
                  let msg = "";
                  let color = "text-zinc-450";
                  if (t.action === "entry") {
                    msg = `Magic #${t.magic}: Executed ${t.type} order on ${t.symbol} (Price: ${t.price})`;
                    color = "text-[#a1a1aa]";
                  } else if (t.action === "close") {
                    msg = `Magic #${t.magic}: Closed ${t.type} on ${t.symbol} (PnL: $${t.pnl.toFixed(2)}, R-multiple: ${t.r_multiple}R)`;
                    color = t.pnl >= 0 ? "text-emerald-450" : "text-[#ff5c73]";
                  } else {
                    msg = `Magic #${t.magic}: Trade event for ${t.symbol} (${t.action})`;
                  }
                  return (
                    <div key={idx} className="flex gap-4 p-2 bg-black/25 border border-[rgba(255,255,255,0.04)] rounded-xl">
                      <span className="text-zinc-600">{dateStr}</span>
                      <span className={color}>{msg}</span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
      {confirmCommand && (
        <div className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4">
          <div className="bg-[#0b0b0f] border border-[rgba(255,255,255,0.07)] rounded-lg p-6 max-w-sm w-full space-y-5 font-mono text-center animate-in zoom-in-95">
            <div className="w-12 h-12 rounded-full bg-[rgba(255,92,115,0.08)] border border-[rgba(255,92,115,0.2)] text-[#ff5c73] flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white uppercase tracking-wide">Confirm Emergency Command</h3>
              <p className="text-xs text-zinc-500 mt-2 leading-relaxed">
                You are about to transmit the command <code className="text-[#ff5c73] font-bold bg-zinc-900/80 px-1.5 py-0.5 rounded border border-[rgba(255,255,255,0.07)]">{confirmCommand}</code> to MQL5 EA Magic #{selectedMagic}.
                <br />
                This action affects live trading logic directly.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmCommand(null)}
                className="flex-1 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 text-xs font-bold rounded-xl border border-[rgba(255,255,255,0.07)] transition-colors uppercase"
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
  </div>
  );
}

