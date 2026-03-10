"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Play, Pause, SkipBack, SkipForward, X, Plus, Minus, Trash2, Type, SlidersHorizontal, BarChart2, Briefcase
} from "lucide-react";
import {
  createChart, IChartApi, ISeriesApi, Time, IPriceLine
} from "lightweight-charts";

const BACKTEST_API_URL =
  (typeof window !== "undefined" &&
    (window as unknown as Record<string, unknown>).BACKTEST_API_URL) ||
  "\/api";

interface Candle {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface ReplaySession {
  session_id: string;
  symbol: string;
  timeframe: string;
  total_candles: number;
  candles?: Candle[];
}

interface Statistics {
  total_trades: number;
  wins: number;
  losses: number;
  win_rate: number;
  total_pnl: number;
  average_r: number;
  expectancy: number;
  max_drawdown: number;
  current_balance: number;
  equity: number;
}

interface OpenPosition {
  id: string;
  symbol: string;
  direction: "BUY" | "SELL";
  entry: number;
  sl: number;
  tp: number;
  lot_size: number;
}

type DrawTool = "none" | "horizontal" | "trend" | "vertical";

function StatCard({ label, value, colorClass = "text-foreground" }: { label: string, value: string | number, colorClass?: string }) {
  return (
    <div className="bg-card border border-border p-4 rounded-xl flex flex-col justify-center">
      <span className="text-muted-foreground text-xs uppercase tracking-wider mb-1 font-medium">{label}</span>
      <span className={`text-xl font-bold tabular-nums ${colorClass}`}>{value}</span>
    </div>
  );
}

export default function BacktestingPage() {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const priceLinesRef = useRef<IPriceLine[]>([]);
  const trendLinesRef = useRef<{ id: string; series: ISeriesApi<"Line"> }[]>([]);
  const replayBusyRef = useRef(false);
  const playingRef = useRef(false);

  const [session, setSession] = useState<ReplaySession | null>(null);
  const [allCandles, setAllCandles] = useState<Candle[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentCandle, setCurrentCandle] = useState<Candle | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [progress, setProgress] = useState({
    current_index: 0,
    total_candles: 0,
    progress_percent: 0,
  });
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [openPositions, setOpenPositions] = useState<OpenPosition[]>([]);
  const [drawTool, setDrawTool] = useState<DrawTool>("none");
  const [trendPoint1, setTrendPoint1] = useState<{ time: Time; value: number; } | null>(null);
  const [sessionError, setSessionError] = useState<string | null>(null);

  const [showSessionForm, setShowSessionForm] = useState(true);
  const [formData, setFormData] = useState({
    symbol: "EURUSD",
    timeframe: "H1",
    start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    end_date: new Date().toISOString().split("T")[0],
    initial_balance: 10000,
  });

  const [showTradeForm, setShowTradeForm] = useState(false);
  const [tradeFormData, setTradeFormData] = useState({
    direction: "BUY",
    entry: 0,
    sl: 0,
    tp: 0,
    lot_size: 0.01,
  });

  // Chart init once
  useEffect(() => {
    if (!chartContainerRef.current || chartRef.current) return;

    // Read CSS variables for proper theming
    const rootStyle = getComputedStyle(document.documentElement);
    const getVar = (name: string, fallback: string) => `hsl(${rootStyle.getPropertyValue(name).trim() || fallback})`;

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 520,
      layout: {
        background: { color: "transparent" },
        textColor: getVar("--muted-foreground", "0 0% 50%"),
      },
      grid: {
        vertLines: { color: getVar("--border", "0 0% 20%") },
        horzLines: { color: getVar("--border", "0 0% 20%") },
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        borderColor: getVar("--border", "0 0% 20%"),
      },
      rightPriceScale: {
        borderColor: getVar("--border", "0 0% 20%"),
        scaleMargins: { top: 0.1, bottom: 0.2 },
      },
      crosshair: { mode: 1 },
    });

    const candlestickSeries = chart.addCandlestickSeries({
      upColor: "hsl(var(--primary))",
      downColor: "hsl(var(--destructive))",
      borderVisible: false,
      wickUpColor: "hsl(var(--primary))",
      wickDownColor: "hsl(var(--destructive))",
    });

    chartRef.current = chart;
    candlestickSeriesRef.current = candlestickSeries;

    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    };
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
      chartRef.current = null;
      candlestickSeriesRef.current = null;
    };
  }, []);

  // Sync chart data with current replay index
  useEffect(() => {
    if (!candlestickSeriesRef.current || !allCandles.length || currentIndex < 0 || currentIndex >= allCandles.length) return;

    const slice = allCandles.slice(0, currentIndex + 1).map((c) => ({
      time: c.time as Time,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }));
    candlestickSeriesRef.current.setData(slice);
    chartRef.current?.timeScale().fitContent();
  }, [allCandles, currentIndex]);

  // Replay auto-advance
  const nextCandle = useCallback(async () => {
    if (!session || replayBusyRef.current) return;
    replayBusyRef.current = true;
    try {
      const response = await fetch(`${BACKTEST_API_URL}/replay/${session.session_id}/next`, { method: "POST" });
      const data = await response.json();
      if (data.success && data.progress !== undefined) {
        setProgress(data.progress);
        setCurrentIndex(data.progress.current_index);
        if (data.candle) setCurrentCandle(data.candle);
        if (data.statistics) setStatistics(data.statistics);
        if (Array.isArray(data.open_positions)) setOpenPositions(data.open_positions);
        if (!data.candle && data.progress.current_index >= data.progress.total_candles - 1) {
          setIsPlaying(false);
          playingRef.current = false;
        }
      }
    } catch (e) {
      console.error("Next candle error:", e);
    } finally {
      replayBusyRef.current = false;
    }
  }, [session]);

  useEffect(() => {
    playingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    if (!session || !playingRef.current) return;
    const interval = setInterval(() => {
      if (playingRef.current && !replayBusyRef.current) nextCandle();
    }, Math.max(100, 1000 / speed));
    return () => clearInterval(interval);
  }, [session, speed, nextCandle]);

  const createSession = async () => {
    setSessionError(null);
    try {
      const response = await fetch(`${BACKTEST_API_URL}/replay/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        setSessionError(data.error || "Failed to create session");
        return;
      }
      const candles = data.candles || [];
      setSession({
        session_id: data.session_id,
        symbol: data.symbol,
        timeframe: data.timeframe,
        total_candles: data.total_candles,
        candles,
      });
      setAllCandles(candles);
      setCurrentIndex(0);
      setCurrentCandle(candles[0] || null);
      setProgress({
        current_index: 0,
        total_candles: candles.length,
        progress_percent: candles.length ? 0 : 0,
      });
      setShowSessionForm(false);
      loadStatus(data.session_id);
    } catch (e) {
      setSessionError((e as Error).message || "Network error");
    }
  };

  const loadStatus = async (sessionId: string) => {
    try {
      const response = await fetch(`${BACKTEST_API_URL}/replay/${sessionId}/status`);
      const data = await response.json();
      if (data.success) {
        setCurrentCandle(data.current_candle);
        setProgress(data.progress);
        setCurrentIndex(data.progress?.current_index ?? 0);
        setStatistics(data.statistics ?? null);
        setOpenPositions(data.open_positions ?? []);
      }
    } catch (e) {
      console.error("Load status error:", e);
    }
  };

  const previousCandle = async () => {
    if (!session) return;
    try {
      const response = await fetch(`${BACKTEST_API_URL}/replay/${session.session_id}/previous`, { method: "POST" });
      const data = await response.json();
      if (data.success && data.progress) {
        setProgress(data.progress);
        setCurrentIndex(data.progress.current_index);
        setCurrentCandle(data.candle);
        if (data.statistics) setStatistics(data.statistics);
      }
    } catch (e) {
      console.error("Previous candle error:", e);
    }
  };

  const jumpToDate = async (date: string) => {
    if (!session) return;
    try {
      const response = await fetch(`${BACKTEST_API_URL}/replay/${session.session_id}/jump`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: date + "T00:00:00Z" }),
      });
      const data = await response.json();
      if (data.success && data.progress) {
        setProgress(data.progress);
        setCurrentIndex(data.progress.current_index);
        setCurrentCandle(data.candle);
      }
    } catch (e) {
      console.error("Jump error:", e);
    }
  };

  const simulateTrade = async () => {
    if (!session || !currentCandle) return;
    try {
      await fetch(`${BACKTEST_API_URL}/replay/${session.session_id}/trade`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...tradeFormData,
          entry: tradeFormData.entry || currentCandle.close,
        }),
      });
      setShowTradeForm(false);
      loadStatus(session.session_id);
    } catch (e) {
      alert("Error opening trade: " + (e as Error).message);
    }
  };

  const addHorizontalLine = () => {
    if (!candlestickSeriesRef.current || !currentCandle) return;
    const line = candlestickSeriesRef.current.createPriceLine({
      price: currentCandle.close,
      color: "hsl(var(--primary))",
      lineWidth: 2,
      lineStyle: 2,
      axisLabelVisible: true,
    });
    priceLinesRef.current.push(line);
  };

  const handleChartClick = useCallback((param: { point?: { x: number; y: number }; time?: Time }) => {
    if (drawTool !== "trend" || !chartRef.current || !candlestickSeriesRef.current) return;
    const chart = chartRef.current;
    const series = candlestickSeriesRef.current;
    const time: Time | undefined = (param.time as Time | undefined) ??
      (param.point != null ? (chart.timeScale().coordinateToTime(param.point.x) as Time) : undefined);
    const value = param.point != null ? series.coordinateToPrice(param.point.y) : undefined;

    if (time == null || value == null) return;

    if (!trendPoint1) {
      setTrendPoint1({ time, value });
      return;
    }

    const lineSeries = chart.addLineSeries({
      color: "hsl(var(--primary))",
      lineWidth: 2,
      lineStyle: 2,
    });
    lineSeries.setData([
      { time: trendPoint1.time, value: trendPoint1.value },
      { time, value },
    ]);
    trendLinesRef.current.push({
      id: `tl-${Date.now()}`,
      series: lineSeries,
    });
    setTrendPoint1(null);
  },
    [drawTool, trendPoint1]
  );

  useEffect(() => {
    if (!chartRef.current) return;
    const unsub = chartRef.current.subscribeClick(handleChartClick);
    return () => {
      if (typeof unsub === "function") {
        (unsub as () => void)();
      }
    };
  }, [handleChartClick]);

  const clearDrawings = () => {
    priceLinesRef.current.forEach((pl) => candlestickSeriesRef.current?.removePriceLine(pl));
    priceLinesRef.current = [];
    trendLinesRef.current.forEach(({ series }) => chartRef.current?.removeSeries(series));
    trendLinesRef.current = [];
    setTrendPoint1(null);
  };

  const inputClass = "w-full bg-background border border-border px-4 py-2 rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50";

  return (
    <div className="min-h-screen bg-background text-foreground space-y-6">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg shadow-primary/20">
            <BarChart2 className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">FXReplay Engine</h1>
            <p className="text-xs text-muted-foreground">Historical Chart Replay & Trade Simulator</p>
          </div>
        </div>
      </div>

      {showSessionForm && (
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
          <h2 className="text-lg font-bold mb-5 flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-primary" /> Start New Session
          </h2>
          {sessionError && (
            <div className="mb-5 p-3 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive text-sm font-medium">
              {sessionError}
            </div>
          )}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-5">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">Symbol</label>
              <input type="text" value={formData.symbol} onChange={(e) => setFormData({ ...formData, symbol: e.target.value })} className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">Timeframe</label>
              <select value={formData.timeframe} onChange={(e) => setFormData({ ...formData, timeframe: e.target.value })} className={inputClass}>
                {["M1", "M5", "M15", "M30", "H1", "H4", "D1"].map(tf => <option key={tf} value={tf}>{tf}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">Start Date</label>
              <input type="date" value={formData.start_date} onChange={(e) => setFormData({ ...formData, start_date: e.target.value })} className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">End Date</label>
              <input type="date" value={formData.end_date} onChange={(e) => setFormData({ ...formData, end_date: e.target.value })} className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">Balance ($)</label>
              <input type="number" value={formData.initial_balance} onChange={(e) => setFormData({ ...formData, initial_balance: parseFloat(e.target.value) || 10000 })} className={inputClass} />
            </div>
          </div>
          <button onClick={createSession} className="mt-6 bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-2.5 rounded-xl font-semibold shadow-md transition-all flex items-center gap-2">
            <Play className="w-4 h-4 fill-current" /> Initialize Replay
          </button>
        </div>
      )}

      {session && (
        <div className="space-y-6">
          {/* Replay controls */}
          <div className="bg-card border border-border p-4 rounded-2xl flex flex-wrap items-center gap-6 shadow-sm">
            <div className="flex items-center gap-2 bg-muted p-1 rounded-xl">
              <button onClick={previousCandle} className="p-2.5 rounded-lg text-muted-foreground hover:bg-background hover:text-foreground hover:shadow-sm transition-all" title="Previous candle">
                <SkipBack size={18} />
              </button>
              <button onClick={() => setIsPlaying(!isPlaying)} className="bg-primary hover:bg-primary/90 text-primary-foreground p-2.5 rounded-lg shadow-sm min-w-[44px] flex justify-center transition-all" title={isPlaying ? "Pause" : "Play"}>
                {isPlaying ? <Pause size={18} className="fill-current" /> : <Play size={18} className="fill-current" />}
              </button>
              <button onClick={() => nextCandle()} className="p-2.5 rounded-lg text-muted-foreground hover:bg-background hover:text-foreground hover:shadow-sm transition-all" title="Next candle">
                <SkipForward size={18} />
              </button>
            </div>

            <div className="flex items-center gap-3">
              <Minus size={16} className="text-muted-foreground" />
              <input type="range" min="0.5" max="10" step="0.5" value={speed} onChange={(e) => setSpeed(parseFloat(e.target.value))} className="w-24 accent-primary" />
              <Plus size={16} className="text-muted-foreground" />
              <span className="text-sm font-medium tabular-nums w-10 text-right">{speed}x</span>
            </div>

            <div className="flex-1 min-w-[150px]">
              <div className="flex justify-between text-xs font-semibold mb-1.5 text-muted-foreground uppercase tracking-wider">
                <span>Timeline</span>
                <span className="text-foreground">{progress.progress_percent.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden">
                <div className="bg-primary h-full rounded-full transition-all duration-300 relative" style={{ width: `${progress.progress_percent}%` }}>
                  <div className="absolute inset-0 bg-white/20 w-full h-full" />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <input type="date" className="bg-muted border border-border px-3 py-2 rounded-xl text-sm font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary" value={currentCandle?.time ? currentCandle.time.toString().slice(0, 10) : ""} onChange={(e) => jumpToDate(e.target.value)} />
              <button onClick={() => setShowTradeForm(true)} className="bg-green-600 hover:bg-green-500 text-foreground px-5 py-2 rounded-xl flex items-center gap-2 text-sm font-bold shadow-md shadow-green-600/20 transition-all">
                <Plus size={16} strokeWidth={3} /> TRADE
              </button>
            </div>
          </div>

          {/* Drawing toolbar */}
          <div className="bg-card border border-border px-4 py-2.5 rounded-xl flex flex-wrap items-center gap-3 shadow-sm">
            <span className="text-muted-foreground text-xs font-bold uppercase tracking-wider mr-2">Tools</span>
            <button onClick={() => { setDrawTool("none"); setTrendPoint1(null); }} className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${drawTool === "none" ? "bg-primary text-primary-foreground shadow-sm" : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"}`}>
              Cursor
            </button>
            <button onClick={() => { setDrawTool("horizontal"); addHorizontalLine(); }} className={`px-4 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-colors ${drawTool === "horizontal" ? "bg-primary text-primary-foreground shadow-sm" : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"}`}>
              <SlidersHorizontal size={14} /> Horizontal
            </button>
            <button onClick={() => setDrawTool("trend")} className={`px-4 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-colors ${drawTool === "trend" ? "bg-primary text-primary-foreground shadow-sm" : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"}`}>
              <Type size={14} /> Trendline
            </button>
            {trendPoint1 && <span className="text-primary text-sm font-medium animate-pulse ml-2">Click 2nd point to place...</span>}
            <div className="flex-1" />
            <button onClick={clearDrawings} className="px-4 py-1.5 rounded-lg text-sm font-medium bg-destructive/10 text-destructive hover:bg-destructive/20 border border-destructive/20 transition-colors flex items-center gap-1.5">
              <Trash2 size={14} /> Clear All
            </button>
          </div>

          {/* Analytics */}
          {statistics && (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
              <StatCard label="Trades" value={statistics.total_trades} />
              <StatCard label="Win Rate" value={`${statistics.win_rate.toFixed(1)}%`} />
              <StatCard label="Total P/L" value={`$${statistics.total_pnl.toFixed(2)}`} colorClass={statistics.total_pnl >= 0 ? "text-green-500" : "text-destructive"} />
              <StatCard label="Avg R" value={statistics.average_r.toFixed(2)} />
              <StatCard label="Expectancy" value={`$${statistics.expectancy.toFixed(2)}`} colorClass={statistics.expectancy >= 0 ? "text-green-500" : "text-destructive"} />
              <StatCard label="Drawdown" value={`${statistics.max_drawdown.toFixed(2)}%`} colorClass="text-destructive" />
              <StatCard label="Balance" value={`$${statistics.current_balance.toFixed(2)}`} />
              <StatCard label="Equity" value={`$${statistics.equity.toFixed(2)}`} />
            </div>
          )}

          {/* Chart */}
          <div className="bg-card border border-border p-2 rounded-2xl shadow-sm">
            <div ref={chartContainerRef} className="w-full rounded-xl overflow-hidden shadow-inner" style={{ background: "transparent" }} />
          </div>

          {/* Open positions */}
          {openPositions.length > 0 && (
            <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
              <div className="px-5 py-4 border-b border-border bg-muted/30">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
                  </span>
                  Active Positions ({openPositions.length})
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs uppercase bg-muted/50 text-muted-foreground border-b border-border">
                    <tr>
                      <th className="px-5 py-3 font-semibold">Symbol</th>
                      <th className="px-5 py-3 font-semibold">Direction</th>
                      <th className="px-5 py-3 font-semibold">Entry</th>
                      <th className="px-5 py-3 font-semibold">S/L</th>
                      <th className="px-5 py-3 font-semibold">T/P</th>
                      <th className="px-5 py-3 font-semibold">Lots</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50 bg-card">
                    {openPositions.map((pos, i) => (
                      <tr key={pos.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-5 py-3.5 font-bold">{pos.symbol}</td>
                        <td className="px-5 py-3.5">
                          <span className={`px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wide border ${pos.direction === "BUY" ? "bg-green-500/10 text-green-500 border-green-500/20" : "bg-red-500/10 text-red-500 border-red-500/20"}`}>
                            {pos.direction}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 tabular-nums text-foreground">{pos.entry}</td>
                        <td className="px-5 py-3.5 tabular-nums text-destructive">{pos.sl}</td>
                        <td className="px-5 py-3.5 tabular-nums text-green-500">{pos.tp}</td>
                        <td className="px-5 py-3.5 tabular-nums font-medium">{pos.lot_size}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Trade modal */}
      {showTradeForm && currentCandle && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-card border border-border p-6 rounded-2xl max-w-sm w-full shadow-xl">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-lg font-bold text-foreground">Execute Trade</h2>
              <button onClick={() => setShowTradeForm(false)} className="text-muted-foreground hover:text-foreground bg-muted p-1.5 rounded-lg transition-colors">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">Direction</label>
                <div className="flex gap-2 p-1 bg-muted rounded-xl">
                  <button onClick={() => setTradeFormData({ ...tradeFormData, direction: "BUY" })} className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${tradeFormData.direction === "BUY" ? "bg-green-500 text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>BUY</button>
                  <button onClick={() => setTradeFormData({ ...tradeFormData, direction: "SELL" })} className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${tradeFormData.direction === "SELL" ? "bg-red-500 text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>SELL</button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">Entry Price</label>
                <input type="number" step="0.00001" value={tradeFormData.entry || currentCandle.close} onChange={(e) => setTradeFormData({ ...tradeFormData, entry: parseFloat(e.target.value) })} className={inputClass} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">Stop Loss</label>
                  <input type="number" step="0.00001" value={tradeFormData.sl} onChange={(e) => setTradeFormData({ ...tradeFormData, sl: parseFloat(e.target.value) })} className={inputClass} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">Take Profit</label>
                  <input type="number" step="0.00001" value={tradeFormData.tp} onChange={(e) => setTradeFormData({ ...tradeFormData, tp: parseFloat(e.target.value) })} className={inputClass} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">Lot Size</label>
                <input type="number" step="0.01" value={tradeFormData.lot_size} onChange={(e) => setTradeFormData({ ...tradeFormData, lot_size: parseFloat(e.target.value) })} className={inputClass} />
              </div>
              <button onClick={simulateTrade} className={`w-full py-3 rounded-xl font-bold text-foreground shadow-lg mt-2 transition-all ${tradeFormData.direction === "BUY" ? "bg-green-600 hover:bg-green-500 shadow-green-600/20" : "bg-red-600 hover:bg-red-500 shadow-red-600/20"}`}>
                Submit {tradeFormData.direction}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
