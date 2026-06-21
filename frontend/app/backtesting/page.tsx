"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Play, Pause, SkipBack, SkipForward, X, Plus, Minus, Trash2, Type, SlidersHorizontal, BarChart2, Briefcase, TrendingUp, TrendingDown, Target, ShieldAlert, Activity, LayoutTemplate, Save, Database, History
} from "lucide-react";
import {
  createChart, IChartApi, ISeriesApi, Time, IPriceLine, LineStyle
} from "lightweight-charts";
import { useSession } from "@/lib/useSession";
import { ProLock } from "@/components/ui/ProLock";
import { toast } from "sonner";


const BRIDGE_URL = typeof window !== "undefined"
  ? (window.location.hostname === "localhost" ? "/api/bridge" : (process.env.NEXT_PUBLIC_BRIDGE_URL || "/api/bridge"))
  : (process.env.NEXT_PUBLIC_BRIDGE_URL || "/api/bridge");
const BACKTEST_API_URL = `${BRIDGE_URL}/api`;

interface Candle { time: number; open: number; high: number; low: number; close: number; volume: number; }
interface SavedSessionItem { id: string; symbol: string; timeframe: string; date: string; candles: Candle[]; }
interface ReplaySession { session_id: string; symbol: string; timeframe: string; total_candles: number; candles?: Candle[]; }
interface Statistics { total_trades: number; wins: number; losses: number; win_rate: number; total_pnl: number; average_r: number; expectancy: number; max_drawdown: number; current_balance: number; equity: number; }
interface OpenPosition { id: string; symbol: string; direction: "BUY" | "SELL"; entry: number; sl: number; tp: number; lot_size: number; current_pnl?: number; }

// Helper for floating PnL
function calculateFloatingPnl(pos: OpenPosition, currentPrice: number) {
  const diff = currentPrice - pos.entry;
  const directionMultiplier = pos.direction === "BUY" ? 1 : -1;
  return diff * directionMultiplier * 100000 * pos.lot_size;
}
type DrawTool = "none" | "horizontal" | "trend" | "vertical";

function StatRow({ label, value, colorClass = "text-[--text-primary]" }: { label: string, value: string | number, colorClass?: string }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-[--border] last:border-0">
      <span className="text-[--text-tertiary] text-[10px] uppercase font-bold tracking-widest">{label}</span>
      <span className={`text-[12px] font-mono font-bold ${colorClass}`}>{value}</span>
    </div>
  );
}

export default function BacktestingPage() {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const rsiSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const priceLinesRef = useRef<IPriceLine[]>([]);
  const trendLinesRef = useRef<{ id: string; series: ISeriesApi<"Line"> }[]>([]);
  const replayBusyRef = useRef(false);
  const playingRef = useRef(false);
  const { data: authSession } = useSession();
  const isPro = (authSession?.user as any)?.isPro === true;

  const [session, setSession] = useState<ReplaySession | null>(null);
  const [savedSessions, setSavedSessions] = useState<SavedSessionItem[]>([]);
  const [allCandles, setAllCandles] = useState<Candle[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentCandle, setCurrentCandle] = useState<Candle | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [progress, setProgress] = useState({ current_index: 0, total_candles: 0, progress_percent: 0 });
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [openPositions, setOpenPositions] = useState<OpenPosition[]>([]);
  const [drawTool, setDrawTool] = useState<DrawTool>("none");
  const [showRSI, setShowRSI] = useState(false);
  const [trendPoint1, setTrendPoint1] = useState<{ time: Time; value: number; } | null>(null);
  const [sessionError, setSessionError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("backtest_sessions");
      if (saved) setSavedSessions(JSON.parse(saved));
    } catch(e){}
  }, []);

  const [formData, setFormData] = useState({
    symbol: "XAUUSDm", timeframe: "H1",
    start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    end_date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    initial_balance: 100000,
  });

  const [tradeFormData, setTradeFormData] = useState({ direction: "BUY", entry: 0, sl: 0, tp: 0, lot_size: 1.0 });

  useEffect(() => {
    if (!chartContainerRef.current || chartRef.current) return;
    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth, height: chartContainerRef.current.clientHeight,
      layout: { background: { type: "solid" as any, color: "transparent" }, textColor: "#8e9196" },
      grid: { vertLines: { color: "rgba(255,255,255,0.03)", style: 1 }, horzLines: { color: "rgba(255,255,255,0.03)", style: 1 } },
      timeScale: { timeVisible: true, secondsVisible: false, borderColor: "rgba(255,255,255,0.1)", rightOffset: 15 },
      rightPriceScale: { borderColor: "rgba(255,255,255,0.1)", scaleMargins: { top: 0.1, bottom: 0.1 } },
      crosshair: { mode: 0 },
    });
    const candlestickSeries = chart.addCandlestickSeries({
      upColor: "#00d4a1", downColor: "#ff4d6a", borderVisible: false,
      wickUpColor: "#00d4a1", wickDownColor: "#ff4d6a",
    });
    chartRef.current = chart; candlestickSeriesRef.current = candlestickSeries;

    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({ width: chartContainerRef.current.clientWidth, height: chartContainerRef.current.clientHeight });
      }
    };
    window.addEventListener("resize", handleResize);
    return () => { window.removeEventListener("resize", handleResize); chart.remove(); chartRef.current = null; candlestickSeriesRef.current = null; rsiSeriesRef.current = null; };
  }, []);

  useEffect(() => {
    if (!candlestickSeriesRef.current || !allCandles.length || currentIndex < 0 || currentIndex >= allCandles.length) return;
    const slice = allCandles.slice(0, currentIndex + 1).map((c) => ({ time: c.time as unknown as Time, open: c.open, high: c.high, low: c.low, close: c.close }));
    candlestickSeriesRef.current.setData(slice);

    if (showRSI && chartRef.current) {
      if (!rsiSeriesRef.current) {
        rsiSeriesRef.current = chartRef.current.addLineSeries({
            color: '#8b5cf6', lineWidth: 2,
            priceScaleId: 'rsi-scale',
        });
        chartRef.current.priceScale('rsi-scale').applyOptions({
            scaleMargins: { top: 0.8, bottom: 0 },
        });
        // Add RSI 30/70 boundary lines
        rsiSeriesRef.current.createPriceLine({ price: 70, color: '#ff4d6a', lineWidth: 1, lineStyle: LineStyle.Dashed, axisLabelVisible: false });
        rsiSeriesRef.current.createPriceLine({ price: 30, color: '#00d4a1', lineWidth: 1, lineStyle: LineStyle.Dashed, axisLabelVisible: false });
      }
      // Calculate RSI
      const rsiData: { time: Time; value: number }[] = [];
      let gains = 0, losses = 0;
      const period = 14;
      for (let i = 1; i < slice.length; i++) {
          const change = slice[i].close - slice[i-1].close;
          if (i <= period) {
              if (change > 0) gains += change; else losses -= change;
              if (i === period) {
                  let avgG = gains/period; let avgL = losses/period;
                  rsiData.push({ time: slice[i].time, value: 100 - (100 / (1 + avgG / (avgL||1))) });
              }
          } else {
              const gain = change > 0 ? change : 0;
              const loss = change < 0 ? -change : 0;
              const prevG = ((gains/period) * (period-1) + gain) / period;
              const prevL = ((losses/period) * (period-1) + loss) / period;
              gains = prevG * period; losses = prevL * period;
              rsiData.push({ time: slice[i].time, value: 100 - (100 / (1 + prevG / (prevL||1))) });
          }
      }
      rsiSeriesRef.current.setData(rsiData);
    } else if (!showRSI && rsiSeriesRef.current && chartRef.current) {
      chartRef.current.removeSeries(rsiSeriesRef.current);
      rsiSeriesRef.current = null;
    }
  }, [allCandles, currentIndex, showRSI]);

  
  // Sync chart lines for open positions
  useEffect(() => {
    if (!candlestickSeriesRef.current) return;
    // Clear old position lines
    priceLinesRef.current.forEach((pl) => candlestickSeriesRef.current?.removePriceLine(pl));
    priceLinesRef.current = [];
    
    // Add new lines for each open position
    openPositions.forEach(pos => {
      const color = pos.direction === "BUY" ? "#00d4a1" : "#ff4d6a";
      const line = candlestickSeriesRef.current!.createPriceLine({
        price: pos.entry,
        color: color,
        lineWidth: 2,
        lineStyle: 2, // Dashed
        axisLabelVisible: true,
        title: `${pos.direction} ${pos.lot_size}L`
      });
      priceLinesRef.current.push(line);
      
      if (pos.sl > 0) {
        priceLinesRef.current.push(candlestickSeriesRef.current!.createPriceLine({
          price: pos.sl, color: "#ff4d6a", lineWidth: 1, lineStyle: 3, axisLabelVisible: true, title: "SL"
        }));
      }
      if (pos.tp > 0) {
        priceLinesRef.current.push(candlestickSeriesRef.current!.createPriceLine({
          price: pos.tp, color: "#00d4a1", lineWidth: 1, lineStyle: 3, axisLabelVisible: true, title: "TP"
        }));
      }
    });
  }, [openPositions]);

  const nextCandle = useCallback(async () => {
    if (!session || replayBusyRef.current) return;
    replayBusyRef.current = true;
    try {
      const response = await fetch(`${BACKTEST_API_URL}/replay/${session.session_id}/next`, { headers: { "ngrok-skip-browser-warning": "true" },  method: "POST" });
      const data = await response.json();
      if (data.success && data.progress !== undefined) {
        setProgress(data.progress); setCurrentIndex(data.progress.current_index);
        if (data.candle) { setCurrentCandle(data.candle); setTradeFormData(prev => ({...prev, entry: data.candle.close})); }
        if (data.statistics) setStatistics(data.statistics);
        if (Array.isArray(data.open_positions)) setOpenPositions(data.open_positions);
        if (!data.candle && data.progress.current_index >= data.progress.total_candles - 1) { setIsPlaying(false); playingRef.current = false; }
      }
    } catch (e) { console.error("Next candle error:", e); } finally { replayBusyRef.current = false; }
  }, [session]);

  useEffect(() => { playingRef.current = isPlaying; }, [isPlaying]);
  useEffect(() => {
    if (!session || !playingRef.current) return;
    const interval = setInterval(() => { if (playingRef.current && !replayBusyRef.current) nextCandle(); }, Math.max(50, 1000 / speed));
    return () => clearInterval(interval);
  }, [session, speed, nextCandle]);

  const createSession = async () => {
    setSessionError(null);
    try {
      const response = await fetch(`${BACKTEST_API_URL}/replay/create`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(formData),
      });
      const data = await response.json();
      if (!response.ok || !data.success) { setSessionError(data.error || "Failed to create session"); return; }
      const candles = data.candles || [];
      setSession({ session_id: data.session_id, symbol: data.symbol, timeframe: data.timeframe, total_candles: data.total_candles, candles });
      setAllCandles(candles); setCurrentIndex(0); setCurrentCandle(candles[0] || null);
      setTradeFormData(prev => ({...prev, entry: candles[0]?.close || 0}));
      setProgress({ current_index: 0, total_candles: candles.length, progress_percent: candles.length ? 0 : 0 });
      loadStatus(data.session_id);
    } catch (e) { setSessionError((e as Error).message || "Network error"); }
  };

  const loadStatus = async (sessionId: string) => {
    try {
      const response = await fetch(`${BACKTEST_API_URL}/replay/${sessionId}/status`, { headers: { "ngrok-skip-browser-warning": "true" } });
      const data = await response.json();
      if (data.success) {
        setCurrentCandle(data.current_candle); setProgress(data.progress); setCurrentIndex(data.progress?.current_index ?? 0);
        setStatistics(data.statistics ?? null); setOpenPositions(data.open_positions ?? []);
      }
    } catch (e) { console.error("Load status error:", e); }
  };

  const saveCurrentSession = () => {
    if (!session || !allCandles.length) return;
    try {
        const item: Omit<SavedSessionItem, 'id'> & { id: string } = {
            id: session.session_id, symbol: session.symbol, timeframe: session.timeframe, 
            date: new Date().toLocaleDateString(), candles: allCandles 
        };
        const newSaved = [...savedSessions.filter(s => s.id !== session.session_id), item];
        localStorage.setItem("backtest_sessions", JSON.stringify(newSaved));
        setSavedSessions(newSaved);
        toast.success(`Session ${session.symbol} · ${session.timeframe} saved locally.`);
    } catch(e) { toast.error("Error saving session. localStorage may be full."); }
  };

  const loadSavedSession = async (item: SavedSessionItem) => {
    setSession({ session_id: item.id, symbol: item.symbol, timeframe: item.timeframe, total_candles: item.candles.length, candles: item.candles });
    setAllCandles(item.candles);
    await loadStatus(item.id);
  };

  const previousCandle = async () => {
    if (!session) return;
    try {
      const response = await fetch(`${BACKTEST_API_URL}/replay/${session.session_id}/previous`, { headers: { "ngrok-skip-browser-warning": "true" },  method: "POST" });
      const data = await response.json();
      if (data.success && data.progress) {
        setProgress(data.progress); setCurrentIndex(data.progress.current_index); setCurrentCandle(data.candle);
        setTradeFormData(prev => ({...prev, entry: data.candle.close})); if (data.statistics) setStatistics(data.statistics);
      }
    } catch (e) { console.error("Previous candle error:", e); }
  };

  const jumpToDate = async (date: string) => {
    if (!session) return;
    try {
      const response = await fetch(`${BACKTEST_API_URL}/replay/${session.session_id}/jump`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ date: date + "T00:00:00Z" }),
      });
      const data = await response.json();
      if (data.success && data.progress) { setProgress(data.progress); setCurrentIndex(data.progress.current_index); setCurrentCandle(data.candle); }
    } catch (e) { console.error("Jump error:", e); }
  };

  
  const closePosition = async (posId: string) => {
    if (!session) return;
    try {
      const response = await fetch(`${BACKTEST_API_URL}/replay/${session.session_id}/close_position`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ position_id: posId }),
      });
      const data = await response.json();
      if (data.success) {
        setStatistics(data.statistics);
        setOpenPositions(data.open_positions);
      }
    } catch (e) { console.error("Close position error:", e); }
  };

  const simulateTrade = async () => {
    if (!session || !currentCandle) return;
    try {
      await fetch(`${BACKTEST_API_URL}/replay/${session.session_id}/trade`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...tradeFormData, entry: tradeFormData.entry || currentCandle.close }),
      });
      setTradeFormData(prev => ({ ...prev, sl: 0, tp: 0 })); loadStatus(session.session_id);
    } catch (e) { toast.error("Error opening trade: " + (e as Error).message); }
  };

  const addHorizontalLine = () => {
    if (!candlestickSeriesRef.current || !currentCandle) return;
    const line = candlestickSeriesRef.current.createPriceLine({ price: currentCandle.close, color: "#00d4a1", lineWidth: 2, lineStyle: 2, axisLabelVisible: true });
    priceLinesRef.current.push(line);
  };

  const handleChartClick = useCallback((param: { point?: { x: number; y: number }; time?: Time }) => {
    if (drawTool !== "trend" || !chartRef.current || !candlestickSeriesRef.current) return;
    const chart = chartRef.current; const series = candlestickSeriesRef.current;
    const time: Time | undefined = (param.time as Time | undefined) ?? (param.point != null ? (chart.timeScale().coordinateToTime(param.point.x) as Time) : undefined);
    const value = param.point != null ? series.coordinateToPrice(param.point.y) : undefined;
    if (time == null || value == null) return;
    if (!trendPoint1) { setTrendPoint1({ time, value }); return; }
    const lineSeries = chart.addLineSeries({ color: "#00d4a1", lineWidth: 2, lineStyle: 2 });
    lineSeries.setData([{ time: trendPoint1.time, value: trendPoint1.value }, { time, value }]);
    trendLinesRef.current.push({ id: `tl-${Date.now()}`, series: lineSeries });
    setTrendPoint1(null);
  }, [drawTool, trendPoint1]);

  useEffect(() => {
    if (!chartRef.current) return; const unsub = chartRef.current.subscribeClick(handleChartClick);
    return () => { if (typeof unsub === "function") { (unsub as () => void)(); } };
  }, [handleChartClick]);

  const clearDrawings = () => {
    priceLinesRef.current.forEach((pl) => candlestickSeriesRef.current?.removePriceLine(pl)); priceLinesRef.current = [];
    trendLinesRef.current.forEach(({ series }) => chartRef.current?.removeSeries(series)); trendLinesRef.current = [];
    setTrendPoint1(null);
  };

  const currentEquity = statistics ? statistics.equity : formData.initial_balance;
  const currentPnL = currentEquity - formData.initial_balance;

  return (
    <div className="h-[calc(100vh-80px)] w-full flex bg-[--bg-base] overflow-hidden">
      
      {/* ── LEFT: Full Screen Charting Area ── */}
      <div className="flex-1 relative flex flex-col h-full overflow-hidden border-r" style={{ borderColor: "var(--border)" }}>
        
        {/* Top Floating Header */}
        <div className="absolute top-4 left-4 right-4 z-10 flex justify-between items-start pointer-events-none">
          <div className="backdrop-blur-md rounded-2xl px-5 py-3 flex items-center gap-3 shadow-2xl pointer-events-auto border" style={{ background: "rgba(10,10,15,0.8)", borderColor: "var(--border-strong)" }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-[--accent] bg-[--accent]/10 border border-[--accent]/20">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-bold text-[18px] text-[--text-primary] leading-none mb-1" style={{ fontFamily: "var(--font-display, Syne, sans-serif)" }}>
                {session ? `${session.symbol} • ${session.timeframe}` : "QuantPlay Engine"}
              </h1>
              <p className="text-[10px] text-[--text-tertiary] font-mono tracking-widest uppercase">
                {session ? (new Date(currentCandle!.time * 1000).toISOString().slice(0, 10)) : "NO ACTIVE INSTANCE"}
              </p>
            </div>
          </div>
          
          {/* Drawing Tools */}
          {session && (
            <div className="flex gap-2 pointer-events-auto">
              <div className="backdrop-blur-md border rounded-xl flex items-center p-1.5 shadow-2xl" style={{ background: "rgba(10,10,15,0.8)", borderColor: "var(--border-strong)" }}>
                <button onClick={() => { setDrawTool("none"); setTrendPoint1(null); }} className={`p-2 rounded-lg transition-colors ${drawTool === "none" ? "bg-[--text-primary] text-[--bg-base]" : "text-[--text-secondary] hover:bg-[--bg-elevated]"}`}>
                  <LayoutTemplate size={16} />
                </button>
                <button onClick={() => { setDrawTool("horizontal"); addHorizontalLine(); }} className={`p-2 rounded-lg transition-colors ${drawTool === "horizontal" ? "bg-[--accent] text-black" : "text-[--text-secondary] hover:bg-[--bg-elevated]"}`}>
                  <SlidersHorizontal size={16} />
                </button>
                <button onClick={() => setDrawTool("trend")} className={`p-2 rounded-lg transition-colors ${drawTool === "trend" ? "bg-[--accent] text-black" : "text-[--text-secondary] hover:bg-[--bg-elevated]"}`}>
                  <Type size={16} />
                </button>
                <div className="w-[1px] h-6 mx-2" style={{ background: "var(--border)" }} />
                <button onClick={() => setShowRSI(!showRSI)} className={`p-2 rounded-lg transition-colors font-bold text-xs px-3 ${showRSI ? "bg-purple-500/20 text-purple-400" : "text-[--text-secondary] hover:bg-[--bg-elevated]"}`}>
                  RSI
                </button>
                <button onClick={clearDrawings} className="p-2 ml-1 rounded-lg text-red-500 hover:bg-red-500/10 transition-colors">
                  <Trash2 size={16} />
                </button>
              </div>
              
              <button onClick={saveCurrentSession} className="backdrop-blur-md border rounded-xl p-3 flex items-center justify-center shadow-2xl hover:bg-[--bg-elevated] text-[--text-primary] transition-all" style={{ background: "rgba(10,10,15,0.8)", borderColor: "var(--border-strong)" }}>
                <Save size={16} />
              </button>
            </div>
          )}
        </div>

        {/* Chart Viewport */}
        <div className="flex-1 relative z-0 bg-[#0a0a0f]">
          <div ref={chartContainerRef} className="absolute inset-0 bg-transparent flex items-center justify-center" />
          
          {/* Empty State Overlay */}
          {!session && (
            <div className="absolute inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-20 flex-col gap-6">
              
              {/* Main New Session Box */}
              <div className="rounded-3xl p-8 max-w-2xl w-full shadow-[0_0_50px_rgba(0,0,0,0.5)] flex flex-col gap-6 backdrop-blur-3xl border transition-all hover:border-white/10" style={{ background: "rgba(15,15,20,0.8)", borderColor: "var(--border-strong)" }}>
                
                <div className="text-center">
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 border" style={{ background: "rgba(0,212,161,0.1)", borderColor: "rgba(0,212,161,0.2)" }}>
                    <BarChart2 className="w-8 h-8 text-[--accent]" />
                  </div>
                  <h2 className="text-[24px] font-bold text-[--text-primary]" style={{ fontFamily: "var(--font-display, Syne, sans-serif)" }}>Research Terminal</h2>
                  <p className="text-[--text-secondary] text-[13px] mt-1">Configure your replay engine parameters to synthesize historical market conditions.</p>
                </div>

                {sessionError && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 text-[--loss] rounded-lg text-[13px] text-center font-bold">
                    {sessionError}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <label className="text-[10px] uppercase font-bold text-[--text-tertiary] tracking-widest mb-1.5 block">Asset / Pair</label>
                    <select value={formData.symbol} onChange={(e) => setFormData({...formData, symbol: e.target.value})} className="w-full bg-[--bg-base] border border-[--border] rounded-xl px-4 py-3 font-bold text-[13px] text-[--text-primary] outline-none">
                      <optgroup label="Gold & Silver">
                        {["XAUUSDm","XAGUSDm"].map(s => <option key={s} value={s}>{s}</option>)}
                      </optgroup>
                      <optgroup label="Major Forex">
                        {["EURUSDm","GBPUSDm","USDJPYm","USDCHFm","AUDUSDm","USDCADm","NZDUSDm"].map(s => <option key={s} value={s}>{s}</option>)}
                      </optgroup>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-bold text-[--text-tertiary] tracking-widest mb-1.5 block">Timeframe</label>
                    <select value={formData.timeframe} onChange={(e) => setFormData({...formData, timeframe: e.target.value})} className="w-full bg-[--bg-base] border border-[--border] rounded-xl px-4 py-3 font-bold text-[13px] text-[--text-primary] outline-none">
                      {["M1", "M5", "M15", "M30", "H1", "H4", "D1"].map(tf => <option key={tf} value={tf}>{tf}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-bold text-[--text-tertiary] tracking-widest mb-1.5 block">Start Date</label>
                    <input type="date" value={formData.start_date} onChange={(e) => setFormData({...formData, start_date: e.target.value})} className="w-full bg-[--bg-base] border border-[--border] rounded-xl px-4 py-3 font-bold text-[13px] text-[--text-primary] outline-none" style={{ colorScheme: "dark" }} />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-bold text-[--text-tertiary] tracking-widest mb-1.5 block">End Date</label>
                    <input type="date" value={formData.end_date} onChange={(e) => setFormData({...formData, end_date: e.target.value})} className="w-full bg-[--bg-base] border border-[--border] rounded-xl px-4 py-3 font-bold text-[13px] text-[--text-primary] outline-none" style={{ colorScheme: "dark" }} />
                  </div>
                  <div className="col-span-2">
                    <label className="text-[10px] uppercase font-bold text-[--text-tertiary] tracking-widest mb-1.5 block">Starting Equity ($)</label>
                    <input type="number" value={formData.initial_balance} onChange={(e) => setFormData({...formData, initial_balance: parseFloat(e.target.value) || 100000})} className="w-full bg-[--bg-base] border border-[--border] rounded-xl px-4 py-4 font-mono font-bold text-center text-[18px] text-[--text-primary] focus:border-[--accent] outline-none transition-all" />
                  </div>
                </div>

                <button onClick={createSession} className="w-full font-bold py-4 rounded-xl shadow-[0_0_20px_rgba(0,212,161,0.2)] hover:shadow-[0_0_30px_rgba(0,212,161,0.4)] transition-all flex items-center justify-center gap-2" style={{ background: "var(--accent)", color: "#000" }}>
                  <Play className="w-5 h-5" /> Launch Simulation Engine
                </button>
              </div>
              
              {/* Saved Sessions Box */}
              {savedSessions.length > 0 && (
                  <div className="rounded-3xl p-6 max-w-2xl w-full shadow-2xl border backdrop-blur-3xl transition-all" style={{ background: "rgba(15,15,20,0.8)", borderColor: "var(--border-strong)" }}>
                      <h3 className="font-bold text-[14px] uppercase tracking-wider text-[--text-primary] mb-3 flex items-center gap-2">
                          <History size={16} className="text-blue-500"/> Saved Replay Sessions
                      </h3>
                      <div className="flex flex-wrap gap-2 max-h-[150px] overflow-y-auto custom-scrollbar">
                          {savedSessions.map(s => (
                              <button key={s.id} onClick={() => loadSavedSession(s)} className="bg-[--bg-base] border text-left rounded-xl p-3 hover:border-blue-500/50 transition-colors flex items-center justify-between gap-4" style={{ borderColor: "var(--border)" }}>
                                  <div>
                                      <p className="font-bold text-[13px] text-[--text-primary]">{s.symbol} • {s.timeframe}</p>
                                      <p className="text-[10px] text-[--text-tertiary] mt-0.5">Saved: {s.date} • {s.candles.length} bars</p>
                                  </div>
                                  <div className="w-6 h-6 rounded bg-blue-500/20 text-blue-400 flex items-center justify-center"><Play size={12} className="ml-0.5 fill-current"/></div>
                              </button>
                          ))}
                      </div>
                  </div>
              )}
              
              {/* Pro Feature: Monte Carlo Settings */}
              <ProLock featureName="Advanced Monte Carlo Simulations">
                  <div className="rounded-3xl p-6 max-w-2xl w-full shadow-2xl border relative overflow-hidden" style={{ background: "var(--bg-card)", borderColor: "var(--border-strong)" }}>
                      <h3 className="font-bold text-[14px] uppercase tracking-wider text-[--text-primary] mb-3 flex items-center gap-2">
                           <BarChart2 size={16} className="text-[--accent]"/> Advanced Monte Carlo Parameters
                      </h3>
                      <div className="grid grid-cols-2 gap-4">
                         <div className="p-3 bg-[--bg-base] border rounded-xl" style={{ borderColor: "var(--border)" }}>
                            <p className="text-[10px] uppercase font-bold text-[--text-tertiary] tracking-widest mb-1.5">Permutations</p>
                            <p className="text-[13px] font-mono font-bold text-[--text-primary]">10,000</p>
                         </div>
                         <div className="p-3 bg-[--bg-base] border rounded-xl" style={{ borderColor: "var(--border)" }}>
                            <p className="text-[10px] uppercase font-bold text-[--text-tertiary] tracking-widest mb-1.5">Confidence Level</p>
                            <p className="text-[13px] font-mono font-bold text-[--text-primary]">95%</p>
                         </div>
                      </div>
                  </div>
              </ProLock>

            </div>
          )}
        </div>

        {/* Bottom Floating Timeline Controls overlay */}
        {session && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-3xl z-10 pointer-events-none">
            <div className="backdrop-blur-xl border rounded-2xl p-4 shadow-2xl pointer-events-auto flex flex-col gap-4" style={{ background: "rgba(15,15,20,0.85)", borderColor: "var(--border-strong)" }}>
              
              <div className="w-full flex items-center gap-4">
                <span className="text-[11px] font-mono font-bold text-[--text-tertiary]">{currentIndex}</span>
                <div className="flex-1 h-2 rounded-full overflow-hidden relative cursor-pointer group" style={{ background: "var(--bg-base)", border: "1px solid var(--border)" }}
                    onClick={(e) => {
                       const rect = e.currentTarget.getBoundingClientRect();
                       const pct = (e.clientX - rect.left) / rect.width;
                       const newIdx = Math.floor(pct * progress.total_candles);
                       // We'd jump logic here. 
                    }}>
                  <div className="absolute top-0 bottom-0 left-0 transition-all rounded-full" style={{ width: `${progress.progress_percent}%`, background: "var(--accent)", boxShadow: "0 0 10px rgba(0,212,161,0.5)" }}>
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full border-2 border-[--accent] scale-0 group-hover:scale-100 transition-transform shadow-lg"/>
                  </div>
                </div>
                <span className="text-[11px] font-mono font-bold text-[--text-tertiary]">{progress.total_candles}</span>
              </div>

              <div className="flex justify-between items-center px-1">
                <div className="flex items-center gap-2 bg-[--bg-base] p-1 rounded-xl border" style={{ borderColor: "var(--border)" }}>
                  <button onClick={() => setSpeed(Math.max(1, speed - 1))} className="p-1.5 rounded-lg text-[--text-tertiary] hover:text-[--text-primary] hover:bg-[--bg-elevated]"><Minus size={14} /></button>
                  <span className="text-[11px] font-mono font-bold w-8 text-center" style={{ color: "var(--text-primary)" }}>{speed}x</span>
                  <button onClick={() => setSpeed(Math.min(20, speed + 1))} className="p-1.5 rounded-lg text-[--text-tertiary] hover:text-[--text-primary] hover:bg-[--bg-elevated]"><Plus size={14} /></button>
                </div>

                <div className="flex items-center gap-2">
                  <button onClick={previousCandle} disabled={isPlaying} className="w-10 h-10 rounded-full flex items-center justify-center border hover:bg-[--bg-elevated] transition-colors disabled:opacity-30" style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}>
                    <SkipBack size={16} className="fill-current mr-0.5" />
                  </button>
                  <button onClick={() => setIsPlaying(!isPlaying)} className="w-14 h-14 rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(0,212,161,0.3)] transition-transform hover:scale-105" style={{ background: isPlaying ? "var(--bg-card)" : "var(--accent)", color: isPlaying ? "var(--text-primary)" : "#000", border: isPlaying ? "1px solid var(--border-strong)" : "none" }}>
                    {isPlaying ? <Pause size={24} className="fill-current" /> : <Play size={24} className="fill-current ml-1" />}
                  </button>
                  <button onClick={nextCandle} disabled={isPlaying} className="w-10 h-10 rounded-full flex items-center justify-center border hover:bg-[--bg-elevated] transition-colors disabled:opacity-30" style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}>
                    <SkipForward size={16} className="fill-current ml-0.5" />
                  </button>
                </div>

                <div className="flex items-center">
                  <input type="date" value={currentCandle?.time ? currentCandle.time.toString().slice(0, 10) : ""} onChange={(e) => jumpToDate(e.target.value)} 
                    className="bg-[--bg-base] border text-[11px] px-3 py-2 rounded-xl outline-none font-mono font-bold transition-colors" 
                    style={{ borderColor: "var(--border)", color: "var(--text-secondary)", colorScheme: "dark" }} />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── RIGHT: Execution & Analytics Sidebar ── */}
      <div className={`w-[360px] backdrop-blur-2xl h-full flex flex-col transition-all duration-300 border-l shadow-2xl ${!session ? 'opacity-30 pointer-events-none' : 'opacity-100'}`} style={{ background: "rgba(10,10,15,0.8)", borderColor: "var(--border-strong)" }}>
        
        {/* Equity Header */}
        <div className="p-6 border-b" style={{ borderColor: "var(--border)" }}>
           <p className="text-[10px] uppercase font-bold tracking-widest text-[--text-tertiary] mb-1">Simulated Equity</p>
           <div className="flex items-end justify-between">
             <h2 className={`text-[28px] font-bold font-mono leading-none ${currentPnL >= 0 ? "text-[--profit]" : "text-[--loss]"}`}>
               ${currentEquity.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
             </h2>
             <div className="text-[11px] font-bold px-2 py-1 rounded border" style={{ background: currentPnL >= 0 ? "rgba(0,212,161,0.1)" : "rgba(255,77,106,0.1)", borderColor: currentPnL >= 0 ? "rgba(0,212,161,0.2)" : "rgba(255,77,106,0.2)", color: currentPnL >= 0 ? "var(--profit)" : "var(--loss)" }}>
               {currentPnL >= 0 ? '+' : ''}{((currentPnL / formData.initial_balance) * 100).toFixed(2)}%
             </div>
           </div>
        </div>

        {/* Execution Block */}
        <div className="p-6 border-b flex-shrink-0" style={{ borderColor: "var(--border)" }}>
          <h3 className="text-[13px] font-bold uppercase tracking-wider text-[--text-primary] flex items-center gap-2 mb-4"><Target className="w-4 h-4 text-[--accent]"/> Order Ticket</h3>
          
          <div className="flex gap-2 p-1.5 rounded-xl border mb-5" style={{ background: "var(--bg-base)", borderColor: "var(--border)" }}>
            <button onClick={() => setTradeFormData({...tradeFormData, direction: "SELL"})} 
              className={`flex-1 py-2.5 rounded-lg text-[13px] font-bold transition-all flex justify-center items-center gap-2 ${tradeFormData.direction === "SELL" ? "bg-[--loss] text-white shadow-[0_0_15px_rgba(255,77,106,0.3)]" : "text-[--text-secondary]"}`}>
              SELL
            </button>
            <button onClick={() => setTradeFormData({...tradeFormData, direction: "BUY"})} 
              className={`flex-1 py-2.5 rounded-lg text-[13px] font-bold transition-all flex justify-center items-center gap-2 ${tradeFormData.direction === "BUY" ? "bg-[--profit] text-black shadow-[0_0_15px_rgba(0,212,161,0.3)]" : "text-[--text-secondary]"}`}>
              BUY
            </button>
          </div>

          <div className="space-y-4 mb-6">
            <div className="flex items-center justify-between gap-4">
              <label className="text-[11px] uppercase font-bold text-[--text-tertiary] tracking-widest w-20">Volume (Lot)</label>
              <input type="number" step="0.01" value={tradeFormData.lot_size} onChange={e => setTradeFormData({...tradeFormData, lot_size: parseFloat(e.target.value)})} className="flex-1 bg-[--bg-base] border border-[--border] rounded-lg px-3 py-2 font-mono text-[13px] font-bold text-right outline-none text-[--text-primary]" />
            </div>
            <div className="flex items-center justify-between gap-4">
              <label className="text-[11px] uppercase font-bold text-[--text-tertiary] tracking-widest w-20">Entry</label>
              <input type="number" step="0.00001" value={tradeFormData.entry || 0} onChange={e => setTradeFormData({...tradeFormData, entry: parseFloat(e.target.value)})} className="flex-1 bg-[--bg-base] border rounded-lg px-3 py-2 font-mono text-[13px] font-bold text-right outline-none text-[--text-primary]" style={{ borderColor: "var(--border)" }} />
            </div>
            <div className="flex items-center justify-between gap-4">
              <label className="text-[11px] uppercase font-bold tracking-widest w-20" style={{ color: tradeFormData.direction === 'BUY' ? "var(--loss)" : "var(--profit)" }}>Stops</label>
              <input type="number" step="0.00001" placeholder="Stops" value={tradeFormData.sl || 0} onChange={e => setTradeFormData({...tradeFormData, sl: parseFloat(e.target.value)})} className="flex-1 bg-[--bg-base] border border-[--border] rounded-lg px-3 py-2 font-mono text-[13px] font-bold text-right outline-none text-[--text-primary]" />
            </div>
          </div>

          <button onClick={simulateTrade} className="w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2" 
            style={{ 
              background: tradeFormData.direction === "BUY" ? "var(--profit)" : "var(--loss)", 
              color: tradeFormData.direction === "BUY" ? "#000" : "#fff",
              boxShadow: `0 0 20px ${tradeFormData.direction === "BUY" ? "rgba(0,212,161,0.3)" : "rgba(255,77,106,0.3)"}` 
            }}>
            Execute {tradeFormData.direction} {tradeFormData.lot_size}
          </button>
        </div>

        {/* Dynamic Analytics & Positions */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
          
          <h3 className="text-[13px] font-bold uppercase tracking-wider text-[--text-primary] mb-4">Portfolio</h3>
          {openPositions.length === 0 ? (
            <div className="text-center py-6 border border-dashed rounded-xl bg-[--bg-base] mb-8" style={{ borderColor: "var(--border)" }}>
              <p className="text-[11px] font-medium text-[--text-tertiary]">No active positions.</p>
            </div>
          ) : (
            <div className="space-y-3 mb-8">
              {openPositions.map(pos => {
                const floatingPnl = currentCandle ? calculateFloatingPnl(pos, currentCandle.close) : 0;
                const isProfit = floatingPnl >= 0;
                return (
                <div key={pos.id} className="rounded-2xl border p-4 flex flex-col backdrop-blur-xl shadow-lg transition-all hover:border-white/10 group" style={{ background: "rgba(15,15,20,0.6)", borderColor: "var(--border)" }}>
                  <div className="flex justify-between items-center mb-3">
                    <div className="flex flex-col">
                      <span className="font-bold font-mono text-[14px] text-[--text-primary]">{pos.symbol}</span>
                      <span className="text-[10px] font-bold mt-1 px-2 py-0.5 rounded w-max" style={{ background: pos.direction === 'BUY' ? "rgba(0,212,161,0.1)" : "rgba(255,77,106,0.1)", color: pos.direction === 'BUY' ? "var(--bull)" : "var(--bear)" }}>{pos.direction} {pos.lot_size}L</span>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className={`font-bold font-mono text-[15px] ${isProfit ? "text-[--profit]" : "text-[--loss]"}`}>
                        {isProfit ? '+' : ''}${floatingPnl.toFixed(2)}
                      </span>
                      <span className="text-[10px] font-mono text-[--text-tertiary] mt-1">{currentCandle?.close.toFixed(3)}</span>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-end mt-2">
                    <div>
                      <p className="text-[9px] uppercase font-bold text-[--text-tertiary] tracking-wider mb-0.5">Entry Price</p>
                      <p className="text-[12px] font-mono font-bold text-[--text-secondary]">{pos.entry.toFixed(3)}</p>
                    </div>
                    <button onClick={() => closePosition(pos.id)} className="opacity-0 group-hover:opacity-100 transition-opacity bg-[--bg-base] hover:bg-white/10 text-white border rounded-lg px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest" style={{ borderColor: "var(--border)" }}>
                      Close
                    </button>
                  </div>
                </div>
              )})}
            </div>
          )}
          
          <h3 className="text-[13px] font-bold uppercase tracking-wider text-[--text-primary] mb-4">Simulation Analytics</h3>
          {statistics ? (
            <div className="rounded-2xl p-4 border space-y-2 backdrop-blur-xl shadow-lg" style={{ background: "rgba(15,15,20,0.6)", borderColor: "var(--border-strong)" }}>
              <StatRow label="Win Rate" value={`${statistics.win_rate.toFixed(1)}%`} colorClass={statistics.win_rate > 50 ? "text-[--profit]" : "text-[--loss]"} />
              <StatRow label="Total Deals" value={statistics.total_trades} />
              <StatRow label="Wins / Defeats" value={`${statistics.wins} / ${statistics.losses}`} />
              <StatRow label="Max Drawdown" value={`${statistics.max_drawdown.toFixed(2)}%`} colorClass="text-[--loss]" />
              <StatRow label="Expectancy" value={`$${statistics.expectancy.toFixed(2)}`} colorClass={statistics.expectancy > 0 ? "text-[--profit]" : "text-[--loss]"} />
            </div>
          ) : (
            <div className="text-center py-6 border border-dashed rounded-xl bg-[--bg-base]" style={{ borderColor: "var(--border)" }}>
              <p className="text-[11px] font-medium text-[--text-tertiary]">Run simulation to generate.</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
