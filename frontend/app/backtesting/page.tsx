"use client";
import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  Play, Pause, SkipBack, SkipForward, X, Plus, Minus, Trash2,
  SlidersHorizontal, BarChart2, TrendingUp, TrendingDown, Target,
  ShieldAlert, Activity, LayoutTemplate, Save, History,
  ChevronUp, ChevronDown, Calendar, Maximize2, Minimize2,
  DollarSign, Percent, Clock, Settings, Layers, RefreshCw,
  ArrowRight, CheckCircle2, AlertCircle, Compass, Crosshair,
  Eye, EyeOff, Scissors
} from "lucide-react";
import {
  createChart, IChartApi, ISeriesApi, Time, IPriceLine, LineStyle
} from "lightweight-charts";
import { useSession } from "@/lib/useSession";
import { toast } from "sonner";

const BRIDGE_URL = typeof window !== "undefined"
  ? (window.location.hostname === "localhost" ? "/api/bridge" : (process.env.NEXT_PUBLIC_BRIDGE_URL || "/api/bridge"))
  : (process.env.NEXT_PUBLIC_BRIDGE_URL || "/api/bridge");
const BACKTEST_API_URL = `${BRIDGE_URL}/api`;

interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface SavedSessionItem {
  id: string;
  symbol: string;
  timeframe: string;
  date: string;
  candles: Candle[];
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
  current_pnl?: number;
}

interface ClosedTrade {
  id: string;
  symbol: string;
  direction: "BUY" | "SELL";
  entry: number;
  exit: number;
  sl: number;
  tp: number;
  lot_size: number;
  pnl: number;
  rr: number;
  outcome: "WIN" | "LOSS" | "BE";
  time: string;
}

// Multi-asset contract sizing
function getContractSize(symbol: string, price: number = 2000): number {
  const sym = symbol.toUpperCase();
  if (sym.includes("XAU") || sym.includes("GOLD")) return 100;
  if (sym.includes("XAG") || sym.includes("SILVER")) return 5000;
  if (sym.includes("BTC") || sym.includes("ETH")) return 1;
  if (sym.includes("JPY")) return 100000 / (price > 50 ? price : 150);
  return 100000;
}

// Helper for floating PnL
function calculateFloatingPnl(pos: OpenPosition, currentPrice: number) {
  const diff = currentPrice - pos.entry;
  const directionMultiplier = pos.direction === "BUY" ? 1 : -1;
  const contractSize = getContractSize(pos.symbol, currentPrice);
  return diff * directionMultiplier * contractSize * pos.lot_size;
}

// FX Replay Session detection based on UTC hour
function getMarketSessionName(timestampSeconds: number): { name: string; color: string; killzone?: string } {
  const date = new Date(timestampSeconds * 1000);
  const hour = date.getUTCHours();
  if (hour >= 13 && hour <= 16) {
    return { name: "London / NY Overlap", color: "#a855f7", killzone: "Silver Bullet / High Vol" };
  } else if (hour >= 12 && hour < 21) {
    return { name: "New York Session", color: "#10b981", killzone: "NY Open Killzone" };
  } else if (hour >= 7 && hour < 16) {
    return { name: "London Session", color: "#f59e0b", killzone: "London Open Killzone" };
  } else {
    return { name: "Asian Session", color: "#3b82f6", killzone: "Tokyo Range Consolidation" };
  }
}

type DrawTool = "none" | "horizontal" | "trend";

export default function BacktestingPage() {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const rsiSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const priceLinesRef = useRef<IPriceLine[]>([]);
  const trendLinesRef = useRef<{ id: string; series: ISeriesApi<"Line"> }[]>([]);
  const replayBusyRef = useRef(false);
  const playingRef = useRef(false);
  const hasAutoFittedRef = useRef(false);
  const { data: authSession } = useSession();

  // Replay State
  const [session, setSession] = useState<ReplaySession | null>(null);
  const [savedSessions, setSavedSessions] = useState<SavedSessionItem[]>([]);
  const [allCandles, setAllCandles] = useState<Candle[]>([]);
  const [currentIndex, setCurrentIndex] = useState(100);
  const [currentCandle, setCurrentCandle] = useState<Candle | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isFullChartMode, setIsFullChartMode] = useState(true); // Default to Full Chart so user sees all history!
  const [isCutToolActive, setIsCutToolActive] = useState(false); // TradingView-style scissors tool
  const [speed, setSpeed] = useState(1);
  const [progress, setProgress] = useState({ current_index: 0, total_candles: 0, progress_percent: 0 });
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [openPositions, setOpenPositions] = useState<OpenPosition[]>([]);
  const [closedTrades, setClosedTrades] = useState<ClosedTrade[]>([]);
  const [drawTool, setDrawTool] = useState<DrawTool>("none");
  const [showRSI, setShowRSI] = useState(false);
  const [trendPoint1, setTrendPoint1] = useState<{ time: Time; value: number } | null>(null);
  const [sessionError, setSessionError] = useState<string | null>(null);

  // FX Replay UI Paneling
  const [isOrderTicketOpen, setIsOrderTicketOpen] = useState(false);
  const [bottomTab, setBottomTab] = useState<"positions" | "history" | "analytics">("positions");
  const [isBottomDockExpanded, setIsBottomDockExpanded] = useState(false);

  // FX Replay Order Sizing Mode: "risk_percent" vs "fixed_lot"
  const [sizingMode, setSizingMode] = useState<"risk_percent" | "fixed_lot">("risk_percent");
  const [riskPercent, setRiskPercent] = useState<number>(1.0);

  // Setup Form Data (with Warm-up Lookback Context)
  const [formData, setFormData] = useState({
    symbol: "XAUUSDm",
    timeframe: "H1",
    start_date: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    end_date: new Date().toISOString().split("T")[0],
    initial_balance: 100000,
    warmup_bars: 60, // Standard FX Replay Lookback Context
  });

  // Order Ticket Form
  const [tradeFormData, setTradeFormData] = useState({
    direction: "BUY" as "BUY" | "SELL",
    entry: 0,
    sl: 0,
    tp: 0,
    lot_size: 1.0,
  });

  // Load Saved Sessions
  useEffect(() => {
    try {
      const saved = localStorage.getItem("backtest_sessions");
      if (saved) setSavedSessions(JSON.parse(saved));
    } catch (e) {}
  }, []);

  // Initialize Lightweight-Charts (TradingView / FX Replay aesthetic)
  useEffect(() => {
    if (!chartContainerRef.current || chartRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: chartContainerRef.current.clientHeight,
      layout: {
        background: { type: "solid" as any, color: "#131722" }, // TradingView charcoal
        textColor: "#868993",
        fontSize: 11,
      },
      grid: {
        vertLines: { color: "rgba(255,255,255,0.03)", style: 1 },
        horzLines: { color: "rgba(255,255,255,0.03)", style: 1 },
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        borderColor: "rgba(255,255,255,0.08)",
        rightOffset: 15,
        barSpacing: 9,
      },
      rightPriceScale: {
        borderColor: "rgba(255,255,255,0.08)",
        scaleMargins: { top: 0.1, bottom: 0.15 },
      },
      crosshair: {
        mode: 1, // Magnet crosshair
        vertLine: { color: "rgba(255,255,255,0.2)", width: 1, style: 2 },
        horzLine: { color: "rgba(255,255,255,0.2)", width: 1, style: 2 },
      },
    });

    const candlestickSeries = chart.addCandlestickSeries({
      upColor: "#089981", // FX Replay teal green
      downColor: "#f23645", // FX Replay ruby red
      borderVisible: false,
      wickUpColor: "#089981",
      wickDownColor: "#f23645",
    });

    chartRef.current = chart;
    candlestickSeriesRef.current = candlestickSeries;

    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight,
        });
      }
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
      chartRef.current = null;
      candlestickSeriesRef.current = null;
      rsiSeriesRef.current = null;
    };
  }, []);

  // Update Candlestick Data Slices (Supports Warm-Up Context and Full Chart Mode)
  useEffect(() => {
    if (!candlestickSeriesRef.current || !allCandles.length || currentIndex < 0) return;

    const targetBars = isFullChartMode ? allCandles : allCandles.slice(0, currentIndex + 1);
    const slice = targetBars.map((c) => ({
      time: c.time as unknown as Time,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }));
    candlestickSeriesRef.current.setData(slice);

    // Auto-fit time scale on initial load or mode switch
    if (!hasAutoFittedRef.current && slice.length > 0) {
      chartRef.current?.timeScale().fitContent();
      hasAutoFittedRef.current = true;
    }

    // Optional RSI Series
    if (showRSI && chartRef.current) {
      if (!rsiSeriesRef.current) {
        rsiSeriesRef.current = chartRef.current.addLineSeries({
          color: "#8b5cf6",
          lineWidth: 2,
          priceScaleId: "rsi-scale",
        });
        chartRef.current.priceScale("rsi-scale").applyOptions({
          scaleMargins: { top: 0.8, bottom: 0 },
        });
        rsiSeriesRef.current.createPriceLine({ price: 70, color: "#f23645", lineWidth: 1, lineStyle: LineStyle.Dashed, axisLabelVisible: false });
        rsiSeriesRef.current.createPriceLine({ price: 30, color: "#089981", lineWidth: 1, lineStyle: LineStyle.Dashed, axisLabelVisible: false });
      }

      const rsiData: { time: Time; value: number }[] = [];
      let gains = 0, losses = 0;
      const period = 14;
      for (let i = 1; i < slice.length; i++) {
        const change = slice[i].close - slice[i - 1].close;
        if (i <= period) {
          if (change > 0) gains += change; else losses -= change;
          if (i === period) {
            const avgG = gains / period; const avgL = losses / period;
            rsiData.push({ time: slice[i].time, value: 100 - (100 / (1 + avgG / (avgL || 1))) });
          }
        } else {
          const gain = change > 0 ? change : 0;
          const loss = change < 0 ? -change : 0;
          const prevG = ((gains / period) * (period - 1) + gain) / period;
          const prevL = ((losses / period) * (period - 1) + loss) / period;
          gains = prevG * period; losses = prevL * period;
          rsiData.push({ time: slice[i].time, value: 100 - (100 / (1 + prevG / (prevL || 1))) });
        }
      }
      rsiSeriesRef.current.setData(rsiData);
    } else if (!showRSI && rsiSeriesRef.current && chartRef.current) {
      chartRef.current.removeSeries(rsiSeriesRef.current);
      rsiSeriesRef.current = null;
    }
  }, [allCandles, currentIndex, isFullChartMode, showRSI]);

  // Sync Chart Position Lines (Entry, SL, TP)
  useEffect(() => {
    if (!candlestickSeriesRef.current) return;
    priceLinesRef.current.forEach((pl) => candlestickSeriesRef.current?.removePriceLine(pl));
    priceLinesRef.current = [];

    openPositions.forEach((pos) => {
      const isBuy = pos.direction === "BUY";
      const color = isBuy ? "#089981" : "#f23645";

      // Entry line
      const line = candlestickSeriesRef.current!.createPriceLine({
        price: pos.entry,
        color: color,
        lineWidth: 2,
        lineStyle: 2, // Dashed
        axisLabelVisible: true,
        title: `${pos.direction} ${pos.lot_size}L`,
      });
      priceLinesRef.current.push(line);

      // Stop Loss line
      if (pos.sl > 0) {
        priceLinesRef.current.push(candlestickSeriesRef.current!.createPriceLine({
          price: pos.sl,
          color: "#f23645",
          lineWidth: 1,
          lineStyle: 3,
          axisLabelVisible: true,
          title: `SL (${pos.sl.toFixed(2)})`,
        }));
      }

      // Take Profit line
      if (pos.tp > 0) {
        priceLinesRef.current.push(candlestickSeriesRef.current!.createPriceLine({
          price: pos.tp,
          color: "#089981",
          lineWidth: 1,
          lineStyle: 3,
          axisLabelVisible: true,
          title: `TP (${pos.tp.toFixed(2)})`,
        }));
      }
    });
  }, [openPositions]);

  // Calculate Auto Lot Size when using Risk %
  const currentEquity = statistics ? statistics.equity : formData.initial_balance;
  const currentPnL = currentEquity - formData.initial_balance;

  const autoCalculatedLots = useMemo(() => {
    if (sizingMode !== "risk_percent") return tradeFormData.lot_size;
    const entry = tradeFormData.entry || currentCandle?.close || 0;
    const sl = tradeFormData.sl || 0;
    if (!entry || !sl || entry === sl) return 1.0;

    const riskDollar = currentEquity * (riskPercent / 100);
    const diff = Math.abs(entry - sl);
    const contractSize = getContractSize(formData.symbol, entry);
    const lossPerLot = diff * contractSize;

    if (lossPerLot <= 0) return 1.0;
    const calculated = riskDollar / lossPerLot;
    return Math.max(0.01, Math.min(100, Math.round(calculated * 100) / 100));
  }, [sizingMode, riskPercent, tradeFormData.entry, tradeFormData.sl, currentCandle, currentEquity, formData.symbol, tradeFormData.lot_size]);

  // Update actual lot_size in tradeFormData when sizingMode is risk_percent
  useEffect(() => {
    if (sizingMode === "risk_percent") {
      setTradeFormData((prev) => ({ ...prev, lot_size: autoCalculatedLots }));
    }
  }, [autoCalculatedLots, sizingMode]);

  // Replay Step Forward
  const nextCandle = useCallback(async () => {
    if (!session || replayBusyRef.current) return;
    replayBusyRef.current = true;
    try {
      const response = await fetch(`${BACKTEST_API_URL}/replay/${session.session_id}/next`, {
        headers: { "ngrok-skip-browser-warning": "true" },
        method: "POST",
      });
      const data = await response.json();
      if (data.success && data.progress !== undefined) {
        setProgress(data.progress);
        setCurrentIndex(data.progress.current_index);
        if (data.candle) {
          setCurrentCandle(data.candle);
          setTradeFormData((prev) => ({ ...prev, entry: data.candle.close }));
        }
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

  // Replay Loop
  useEffect(() => { playingRef.current = isPlaying; }, [isPlaying]);
  useEffect(() => {
    if (!session || !playingRef.current) return;
    const interval = setInterval(() => {
      if (playingRef.current && !replayBusyRef.current) nextCandle();
    }, Math.max(40, 1000 / speed));
    return () => clearInterval(interval);
  }, [session, speed, nextCandle]);

  // Seek to arbitrary index (Smooth scrubber navigation)
  const seekToIndex = async (idx: number) => {
    if (!session || !allCandles.length) return;
    const clamped = Math.max(0, Math.min(idx, allCandles.length - 1));
    setCurrentIndex(clamped);
    setCurrentCandle(allCandles[clamped]);
    setTradeFormData((prev) => ({ ...prev, entry: allCandles[clamped]?.close || 0 }));
    const pct = Number(((clamped / (allCandles.length - 1)) * 100).toFixed(1));
    setProgress({ current_index: clamped, total_candles: allCandles.length, progress_percent: pct });
    try {
      const response = await fetch(`${BACKTEST_API_URL}/replay/${session.session_id}/seek`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ index: clamped }),
      });
      const data = await response.json();
      if (data.success && data.statistics) setStatistics(data.statistics);
    } catch (e) {
      console.error("Seek error:", e);
    }
  };

  // Create Replay Session with Warm-Up Lookback Context
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
      const candles: Candle[] = data.candles || [];
      const warmup = formData.warmup_bars !== undefined ? formData.warmup_bars : 60;
      const startIdx = Math.min(Math.max(warmup, 60), Math.max(0, candles.length - 1));

      setSession({
        session_id: data.session_id,
        symbol: data.symbol,
        timeframe: data.timeframe,
        total_candles: data.total_candles,
        candles,
      });
      setAllCandles(candles);
      setCurrentIndex(startIdx);
      setCurrentCandle(candles[startIdx] || null);
      setTradeFormData((prev) => ({ ...prev, entry: candles[startIdx]?.close || 0 }));
      setIsFullChartMode(true); // Always display full historical chart on launch!
      
      const pct = candles.length > 0 ? (startIdx / (candles.length - 1)) * 100 : 0;
      setProgress({ current_index: startIdx, total_candles: candles.length, progress_percent: Number(pct.toFixed(1)) });
      setClosedTrades([]);
      hasAutoFittedRef.current = false;
      loadStatus(data.session_id);
      toast.success(`FX Replay session launched: ${data.symbol} (${candles.length} total candles loaded)`);
    } catch (e) {
      setSessionError((e as Error).message || "Network error");
    }
  };

  const loadStatus = async (sessionId: string) => {
    try {
      const response = await fetch(`${BACKTEST_API_URL}/replay/${sessionId}/status`, {
        headers: { "ngrok-skip-browser-warning": "true" },
      });
      const data = await response.json();
      if (data.success) {
        if (data.current_candle) setCurrentCandle(data.current_candle);
        // Only update index from status if the backend actually stepped forward (> 0)
        if (data.progress && data.progress.current_index > 0) {
          setProgress(data.progress);
          setCurrentIndex(data.progress.current_index);
        }
        if (data.statistics) setStatistics(data.statistics);
        if (data.open_positions) setOpenPositions(data.open_positions);
      }
    } catch (e) {
      console.error("Load status error:", e);
    }
  };

  const previousCandle = async () => {
    if (!session) return;
    try {
      const response = await fetch(`${BACKTEST_API_URL}/replay/${session.session_id}/previous`, {
        headers: { "ngrok-skip-browser-warning": "true" },
        method: "POST",
      });
      const data = await response.json();
      if (data.success && data.progress) {
        setProgress(data.progress);
        setCurrentIndex(data.progress.current_index);
        setCurrentCandle(data.candle);
        setTradeFormData((prev) => ({ ...prev, entry: data.candle.close }));
        if (data.statistics) setStatistics(data.statistics);
      }
    } catch (e) {
      console.error("Previous candle error:", e);
    }
  };

  // Close Position
  const closePosition = async (posId: string) => {
    if (!session) return;
    try {
      const posToClose = openPositions.find((p) => p.id === posId);
      const response = await fetch(`${BACKTEST_API_URL}/replay/${session.session_id}/close_position`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ position_id: posId }),
      });
      const data = await response.json();
      if (data.success) {
        setStatistics(data.statistics);
        setOpenPositions(data.open_positions);

        // Record into Closed Trade History
        if (posToClose && currentCandle) {
          const finalPnl = calculateFloatingPnl(posToClose, currentCandle.close);
          const riskDollar = posToClose.sl > 0 ? Math.abs(posToClose.entry - posToClose.sl) * getContractSize(posToClose.symbol) * posToClose.lot_size : 1;
          const rr = Number((finalPnl / (riskDollar || 1)).toFixed(2));
          const outcome = finalPnl > 5 ? "WIN" : finalPnl < -5 ? "LOSS" : "BE";

          setClosedTrades((prev) => [
            {
              id: posToClose.id,
              symbol: posToClose.symbol,
              direction: posToClose.direction,
              entry: posToClose.entry,
              exit: currentCandle.close,
              sl: posToClose.sl,
              tp: posToClose.tp,
              lot_size: posToClose.lot_size,
              pnl: Math.round(finalPnl * 100) / 100,
              rr,
              outcome,
              time: new Date(currentCandle.time * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            },
            ...prev,
          ]);
        }
        toast.info("Position closed.");
      }
    } catch (e) {
      console.error("Close position error:", e);
    }
  };

  // Quick R:R Setter
  const setQuickRR = (multiplier: number) => {
    const entry = tradeFormData.entry || currentCandle?.close || 0;
    const sl = tradeFormData.sl || 0;
    if (!entry || !sl) {
      toast.info("Set an Entry and Stop Loss first to calculate Take Profit.");
      return;
    }
    const risk = Math.abs(entry - sl);
    if (risk <= 0) return;
    const tp = tradeFormData.direction === "BUY" ? entry + risk * multiplier : entry - risk * multiplier;
    setTradeFormData((prev) => ({ ...prev, entry, tp: Number(tp.toFixed(5)) }));
    toast.success(`TP set to 1:${multiplier} R:R (${tp.toFixed(2)})`);
  };

  // Quick Date Range Setter
  const setQuickRange = (days: number) => {
    const end = new Date();
    const start = new Date(end.getTime() - days * 24 * 60 * 60 * 1000);
    setFormData((prev) => ({
      ...prev,
      start_date: start.toISOString().split("T")[0],
      end_date: end.toISOString().split("T")[0],
    }));
  };

  // End Session
  const endSession = () => {
    setIsPlaying(false);
    playingRef.current = false;
    setSession(null);
    setAllCandles([]);
    setCurrentIndex(60);
    setCurrentCandle(null);
    setOpenPositions([]);
    setClosedTrades([]);
    setStatistics(null);
    clearDrawings();
    setIsOrderTicketOpen(false);
    setIsFullChartMode(false);
    hasAutoFittedRef.current = false;
    toast.info("Replay session closed.");
  };

  // Simulate Trade Execution
  const simulateTrade = async () => {
    if (!session || !currentCandle) return;
    try {
      const entryPrice = tradeFormData.entry || currentCandle.close;
      await fetch(`${BACKTEST_API_URL}/replay/${session.session_id}/trade`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...tradeFormData, entry: entryPrice }),
      });
      setTradeFormData((prev) => ({ ...prev, sl: 0, tp: 0 }));
      loadStatus(session.session_id);
      setIsOrderTicketOpen(false);
      setIsBottomDockExpanded(true);
      setBottomTab("positions");
      toast.success(`Order placed: ${tradeFormData.direction} ${tradeFormData.lot_size}L @ ${entryPrice.toFixed(2)}`);
    } catch (e) {
      toast.error("Error opening trade: " + (e as Error).message);
    }
  };

  // Quick 1-Click Buy / Sell execution
  const executeQuickTrade = (direction: "BUY" | "SELL") => {
    if (!currentCandle) return;
    setTradeFormData((prev) => ({
      ...prev,
      direction,
      entry: currentCandle.close,
    }));
    setIsOrderTicketOpen(true);
  };

  // Drawing Tools
  const addHorizontalLine = () => {
    if (!candlestickSeriesRef.current || !currentCandle) return;
    const line = candlestickSeriesRef.current.createPriceLine({
      price: currentCandle.close,
      color: "#00d4a1",
      lineWidth: 2,
      lineStyle: 2,
      axisLabelVisible: true,
      title: "H-Line",
    });
    priceLinesRef.current.push(line);
    toast.success("Horizontal level plotted at current price.");
  };

  const handleChartClick = useCallback((param: { point?: { x: number; y: number }; time?: Time }) => {
    // If Scissors / Cut Tool is active, cut replay at the clicked bar
    if (isCutToolActive) {
      const chart = chartRef.current;
      const time: Time | undefined = (param.time as Time | undefined) ?? (param.point != null ? (chart?.timeScale().coordinateToTime(param.point.x) as Time) : undefined);
      if (time != null && allCandles.length > 0) {
        const tSec = typeof time === "number" ? time : Number(time);
        const targetIdx = allCandles.findIndex((c) => c.time >= tSec);
        if (targetIdx !== -1) {
          seekToIndex(targetIdx);
          setIsFullChartMode(false);
          setIsCutToolActive(false);
          toast.success(`✂️ Replay cut to Bar ${targetIdx + 1} (${allCandles.length - targetIdx - 1} future bars hidden)`);
          return;
        }
      }
    }

    if (drawTool !== "trend" || !chartRef.current || !candlestickSeriesRef.current) return;
    const chart = chartRef.current;
    const series = candlestickSeriesRef.current;
    const time: Time | undefined = (param.time as Time | undefined) ?? (param.point != null ? (chart.timeScale().coordinateToTime(param.point.x) as Time) : undefined);
    const value = param.point != null ? series.coordinateToPrice(param.point.y) : undefined;
    if (time == null || value == null) return;

    if (!trendPoint1) {
      setTrendPoint1({ time, value });
      toast.info("Click 2nd point to anchor trendline.");
      return;
    }

    const lineSeries = chart.addLineSeries({ color: "#00d4a1", lineWidth: 2, lineStyle: 2 });
    lineSeries.setData([{ time: trendPoint1.time, value: trendPoint1.value }, { time, value }]);
    trendLinesRef.current.push({ id: `tl-${Date.now()}`, series: lineSeries });
    setTrendPoint1(null);
    setDrawTool("none");
    toast.success("Trendline locked.");
  }, [drawTool, trendPoint1, isCutToolActive, allCandles]);

  useEffect(() => {
    if (!chartRef.current) return;
    const unsub = chartRef.current.subscribeClick(handleChartClick);
    return () => {
      if (typeof unsub === "function") (unsub as () => void)();
    };
  }, [handleChartClick]);

  const clearDrawings = () => {
    priceLinesRef.current.forEach((pl) => candlestickSeriesRef.current?.removePriceLine(pl));
    priceLinesRef.current = [];
    trendLinesRef.current.forEach(({ series }) => chartRef.current?.removeSeries(series));
    trendLinesRef.current = [];
    setTrendPoint1(null);
    toast.info("All drawings cleared.");
  };

  const saveCurrentSession = () => {
    if (!session || !allCandles.length) return;
    try {
      const item: SavedSessionItem = {
        id: session.session_id,
        symbol: session.symbol,
        timeframe: session.timeframe,
        date: new Date().toLocaleDateString(),
        candles: allCandles,
      };
      const newSaved = [...savedSessions.filter((s) => s.id !== session.session_id), item];
      localStorage.setItem("backtest_sessions", JSON.stringify(newSaved));
      setSavedSessions(newSaved);
      toast.success(`Saved session: ${session.symbol} (${session.timeframe})`);
    } catch (e) {
      toast.error("Failed to save session locally.");
    }
  };

  const loadSavedSession = async (item: SavedSessionItem) => {
    const warmup = 60;
    const startIdx = Math.min(warmup, Math.max(0, item.candles.length - 1));
    setSession({
      session_id: item.id,
      symbol: item.symbol,
      timeframe: item.timeframe,
      total_candles: item.candles.length,
      candles: item.candles,
    });
    setAllCandles(item.candles);
    setCurrentIndex(startIdx);
    hasAutoFittedRef.current = false;
    await loadStatus(item.id);
  };

  const sessionInfo = currentCandle?.time ? getMarketSessionName(currentCandle.time) : null;

  return (
    <div className="h-[calc(100vh-64px)] w-full flex flex-col bg-[#131722] text-[#d1d4dc] overflow-hidden select-none font-sans">
      
      {/* ═════════════════════════════════════════════════════════════════════
          1. FX REPLAY TOP NAVIGATION & REPLAY CONTROL ISLAND
          ═════════════════════════════════════════════════════════════════════ */}
      <header className="h-[48px] px-3 border-b border-white/[0.08] bg-[#131722] flex items-center justify-between z-20 flex-shrink-0">
        
        {/* Left: Symbol & Timeframe & Killzone */}
        <div className="flex items-center gap-2.5">
          {session ? (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-white/[0.06] border border-white/10 font-bold font-mono text-xs text-white">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>{session.symbol}</span>
                <span className="text-[10px] text-zinc-400 font-normal">({session.timeframe})</span>
              </div>

              {/* Timeframe Indicator */}
              <div className="hidden sm:flex items-center gap-1 bg-white/[0.03] p-0.5 rounded border border-white/5 text-[11px] font-bold font-mono">
                {["M1", "M5", "M15", "M30", "H1", "H4", "D1"].map((tf) => (
                  <span
                    key={tf}
                    className={`px-1.5 py-0.5 rounded ${
                      session.timeframe === tf ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "text-zinc-600"
                    }`}
                  >
                    {tf}
                  </span>
                ))}
              </div>

              {/* Dual Mode Switcher: Full History vs Replay Mode */}
              <div className="hidden md:flex items-center bg-white/[0.04] p-0.5 rounded-lg border border-white/10 text-[11px] font-mono font-bold">
                <button
                  type="button"
                  onClick={() => {
                    setIsFullChartMode(true);
                    setIsCutToolActive(false);
                    hasAutoFittedRef.current = false;
                    toast.success(`Displaying all ${allCandles.length} historical candles`);
                  }}
                  className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1.5 ${
                    isFullChartMode
                      ? "bg-amber-500/25 text-amber-300 border border-amber-500/40 shadow-[0_0_10px_rgba(245,158,11,0.25)]"
                      : "text-zinc-400 hover:text-white"
                  }`}
                  title="View entire dataset without hiding future bars"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Full History ({allCandles.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsFullChartMode(false);
                    hasAutoFittedRef.current = false;
                    // If user is at the beginning, provide 100 bars of historical structure
                    if (currentIndex < 20 && allCandles.length > 50) {
                      const newIdx = Math.min(100, Math.floor(allCandles.length / 2));
                      seekToIndex(newIdx);
                    }
                    toast.info(`Replay Mode active: ${currentIndex + 1} bars visible, ${allCandles.length - currentIndex - 1} future bars hidden`);
                  }}
                  className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1.5 ${
                    !isFullChartMode
                      ? "bg-emerald-500/25 text-emerald-300 border border-emerald-500/40 shadow-[0_0_10px_rgba(8,153,129,0.25)]"
                      : "text-zinc-400 hover:text-white"
                  }`}
                  title="Step through bars and hide future candles"
                >
                  <Scissors className="w-3.5 h-3.5" />
                  <span>Replay ({currentIndex + 1} Bars)</span>
                </button>
              </div>

              {/* Quick Cut to Candle Tool */}
              <button
                type="button"
                onClick={() => {
                  const next = !isCutToolActive;
                  setIsCutToolActive(next);
                  if (next) {
                    toast.info("✂️ Click any candle on the chart to cut replay to that date!");
                  }
                }}
                className={`hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold border transition-all ${
                  isCutToolActive
                    ? "bg-amber-500 text-black border-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.5)] animate-pulse"
                    : "bg-white/[0.04] text-zinc-300 border-white/10 hover:text-white hover:border-white/20"
                }`}
                title="Click any candle on chart to set replay point"
              >
                <Scissors className="w-3 h-3" />
                <span>{isCutToolActive ? "Click Candle on Chart..." : "Cut to Candle"}</span>
              </button>

              {/* Market Session Pill */}
              {sessionInfo && (
                <div 
                  className="hidden lg:flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono border"
                  style={{ background: `${sessionInfo.color}15`, borderColor: `${sessionInfo.color}40`, color: sessionInfo.color }}
                >
                  <Clock className="w-3 h-3" />
                  <span>{sessionInfo.name}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <Activity className="w-3.5 h-3.5" />
              </div>
              <span className="font-bold text-sm tracking-tight text-white font-display">FX Replay Studio</span>
            </div>
          )}
        </div>

        {/* Center: Signature FX Replay Island Playback Dock */}
        {session && (
          <div className="flex items-center gap-2 bg-[#1e222d] border border-white/10 rounded-full px-3 py-1 shadow-lg">
            {/* Step Backward */}
            <button
              onClick={previousCandle}
              disabled={isPlaying}
              className="p-1 rounded-full text-zinc-400 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-30"
              title="Step 1 bar backward (←)"
            >
              <SkipBack className="w-3.5 h-3.5 fill-current" />
            </button>

            {/* Play / Pause Primary Button */}
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="w-7 h-7 rounded-full flex items-center justify-center transition-all shadow-[0_0_12px_rgba(8,153,129,0.3)] hover:scale-105"
              style={{
                background: isPlaying ? "#f23645" : "#089981",
                color: "#ffffff",
              }}
              title={isPlaying ? "Pause Replay (Space)" : "Start Replay (Space)"}
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current ml-0.5" />}
            </button>

            {/* Step Forward */}
            <button
              onClick={nextCandle}
              disabled={isPlaying}
              className="p-1 rounded-full text-zinc-400 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-30"
              title="Step 1 bar forward (→)"
            >
              <SkipForward className="w-3.5 h-3.5 fill-current" />
            </button>

            <div className="w-[1px] h-4 bg-white/10 mx-1" />

            {/* Speed Selector */}
            <div className="flex items-center gap-1 text-[11px] font-mono text-zinc-400">
              {[1, 2, 5, 10].map((s) => (
                <button
                  key={s}
                  onClick={() => setSpeed(s)}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                    speed === s ? "bg-white/15 text-white" : "hover:text-zinc-200"
                  }`}
                >
                  {s}x
                </button>
              ))}
            </div>

            <div className="w-[1px] h-4 bg-white/10 mx-1" />

            {/* Current Bar Timestamp */}
            <span className="text-[11px] font-mono text-emerald-400 font-bold px-1">
              {currentCandle?.time ? new Date(currentCandle.time * 1000).toISOString().slice(0, 16).replace("T", " ") : "Ready"}
            </span>
          </div>
        )}

        {/* Right: Quick Buy/Sell & Account Equity & Order Ticket Toggle */}
        <div className="flex items-center gap-2.5">
          {session ? (
            <>
              {/* Quick Buy / Sell Pill Widget (Signature FX Replay feature) */}
              <div className="hidden lg:flex items-center bg-[#1e222d] border border-white/10 rounded-lg p-0.5 font-mono text-xs">
                <button
                  onClick={() => executeQuickTrade("SELL")}
                  className="px-2.5 py-1 rounded bg-rose-500/15 hover:bg-rose-500/25 text-[#f23645] font-bold flex items-center gap-1 transition-all"
                >
                  <span>SELL</span>
                  <span className="text-[10px] text-rose-300 opacity-80">{currentCandle?.close.toFixed(2)}</span>
                </button>
                <button
                  onClick={() => executeQuickTrade("BUY")}
                  className="px-2.5 py-1 rounded bg-emerald-500/15 hover:bg-emerald-500/25 text-[#089981] font-bold flex items-center gap-1 transition-all"
                >
                  <span>BUY</span>
                  <span className="text-[10px] text-emerald-300 opacity-80">{currentCandle?.close.toFixed(2)}</span>
                </button>
              </div>

              {/* Account Equity Pill */}
              <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-[#1e222d] border border-white/10 text-xs font-mono">
                <div className="flex flex-col text-right leading-none">
                  <span className="text-[9px] text-zinc-400 uppercase font-bold">Sim Equity</span>
                  <span className={`font-bold ${currentPnL >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                    ${currentEquity.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${currentPnL >= 0 ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"}`}>
                  {currentPnL >= 0 ? '+' : ''}{((currentPnL / formData.initial_balance) * 100).toFixed(1)}%
                </span>
              </div>

              {/* Open Order Ticket Button */}
              <button
                onClick={() => setIsOrderTicketOpen(!isOrderTicketOpen)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                  isOrderTicketOpen ? "bg-[#089981] text-black shadow-[0_0_15px_rgba(8,153,129,0.4)]" : "bg-white/10 hover:bg-white/15 text-white"
                }`}
              >
                <Target className="w-3.5 h-3.5" />
                <span>Trade</span>
              </button>

              {/* Exit Session Button */}
              <button
                onClick={endSession}
                className="p-1.5 rounded-lg border border-white/10 text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                title="End Replay Session"
              >
                <X className="w-4 h-4" />
              </button>
            </>
          ) : (
            <button
              onClick={() => {
                const modal = document.getElementById("session-setup-form");
                if (modal) modal.scrollIntoView({ behavior: "smooth" });
              }}
              className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-[#089981] text-black hover:opacity-90 transition-all flex items-center gap-1.5"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>New Session</span>
            </button>
          )}
        </div>
      </header>

      {/* ═════════════════════════════════════════════════════════════════════
          2. MAIN STAGE: LEFT TRADINGVIEW TOOLBAR + FULL CHART VIEWPORT
          ═════════════════════════════════════════════════════════════════════ */}
      <div className="flex-1 flex overflow-hidden relative">
        
        {/* Left Vertical TradingView-style Drawing Toolbar */}
        <div className="w-[46px] border-r border-white/[0.08] bg-[#131722] flex flex-col items-center py-2.5 gap-2 z-10 flex-shrink-0">
          <button
            onClick={() => { setDrawTool("none"); setTrendPoint1(null); }}
            className={`w-8 h-8 rounded flex items-center justify-center transition-colors ${
              drawTool === "none" ? "bg-white/15 text-white" : "text-zinc-400 hover:text-zinc-200 hover:bg-white/5"
            }`}
            title="Crosshair / Cursor"
          >
            <Crosshair className="w-4 h-4" />
          </button>

          <button
            onClick={() => { setDrawTool("horizontal"); addHorizontalLine(); }}
            className={`w-8 h-8 rounded flex items-center justify-center transition-colors ${
              drawTool === "horizontal" ? "bg-[#089981] text-black" : "text-zinc-400 hover:text-zinc-200 hover:bg-white/5"
            }`}
            title="Horizontal Support / Resistance Level"
          >
            <Minus className="w-4 h-4" />
          </button>

          <button
            onClick={() => setDrawTool("trend")}
            className={`w-8 h-8 rounded flex items-center justify-center transition-colors ${
              drawTool === "trend" ? "bg-[#089981] text-black" : "text-zinc-400 hover:text-zinc-200 hover:bg-white/5"
            }`}
            title="Trendline Tool"
          >
            <TrendingUp className="w-4 h-4" />
          </button>

          <button
            onClick={() => setShowRSI(!showRSI)}
            className={`w-8 h-8 rounded flex items-center justify-center font-mono text-[10px] font-bold transition-colors ${
              showRSI ? "bg-purple-500/20 text-purple-300 border border-purple-500/40" : "text-zinc-400 hover:text-zinc-200 hover:bg-white/5"
            }`}
            title="Toggle RSI 14 Indicator"
          >
            RSI
          </button>

          {/* TradingView-style Scissors / Replay Cut Tool */}
          <button
            onClick={() => {
              const next = !isCutToolActive;
              setIsCutToolActive(next);
              if (next) toast.info("✂️ Click any candlestick on the chart to cut replay there!");
            }}
            className={`w-8 h-8 rounded flex items-center justify-center transition-colors ${
              isCutToolActive ? "bg-amber-500 text-black shadow-[0_0_12px_rgba(245,158,11,0.5)]" : "text-zinc-400 hover:text-zinc-200 hover:bg-white/5"
            }`}
            title="Scissors: Cut Replay to Candle (Click any bar on chart)"
          >
            <Scissors className="w-4 h-4" />
          </button>

          {/* Auto-Fit Viewport button */}
          <button
            onClick={() => chartRef.current?.timeScale().fitContent()}
            className="w-8 h-8 rounded flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
            title="Auto-Fit All Candles (F)"
          >
            <Maximize2 className="w-4 h-4" />
          </button>

          <div className="w-5 h-[1px] bg-white/10 my-1" />

          <button
            onClick={clearDrawings}
            className="w-8 h-8 rounded flex items-center justify-center text-rose-400/70 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
            title="Clear all drawings"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          {session && (
            <button
              onClick={saveCurrentSession}
              className="w-8 h-8 rounded flex items-center justify-center text-zinc-400 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors mt-auto"
              title="Save replay session"
            >
              <Save className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Center: Full Edge-to-Edge Chart Container */}
        <div className="flex-1 relative bg-[#131722] overflow-hidden flex flex-col">
          <div ref={chartContainerRef} className="absolute inset-0 bg-[#131722]" />

          {/* Scissors Cut Tool Prompt Floating Banner */}
          {session && isCutToolActive && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 px-4 py-1.5 rounded-full bg-amber-500 text-black font-bold text-xs shadow-2xl flex items-center gap-2 animate-bounce select-none">
              <Scissors className="w-3.5 h-3.5" />
              <span>Click any candle on the chart to cut replay to that date</span>
              <button onClick={() => setIsCutToolActive(false)} className="ml-2 hover:opacity-75">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Empty State / Session Setup Overlay (FX Replay Modal) */}
          {!session && (
            <div className="absolute inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-30 p-4 overflow-y-auto">
              <div 
                id="session-setup-form"
                className="w-full max-w-xl rounded-2xl border border-white/10 bg-[#181c27] p-6 shadow-2xl flex flex-col gap-5 text-[#d1d4dc]"
              >
                {/* Modal Header */}
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-[#089981]">
                      <BarChart2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-white font-display">New Backtest Session</h2>
                      <p className="text-xs text-zinc-400">Configure your FX Replay parameters & simulated account size</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20">
                    FXR 2.0 Engine
                  </span>
                </div>

                {sessionError && (
                  <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-lg flex items-center gap-2 font-mono">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{sessionError}</span>
                  </div>
                )}

                {/* Account Size Prop Presets */}
                <div>
                  <label className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider mb-2 block">
                    Starting Account Balance
                  </label>
                  <div className="grid grid-cols-5 gap-2">
                    {[10000, 25000, 50000, 100000, 200000].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setFormData({ ...formData, initial_balance: amt })}
                        className={`py-2 rounded-lg text-xs font-mono font-bold border transition-all ${
                          formData.initial_balance === amt
                            ? "bg-[#089981] text-black border-[#089981] shadow-[0_0_10px_rgba(8,153,129,0.3)]"
                            : "bg-[#131722] border-white/10 text-zinc-300 hover:border-white/20"
                        }`}
                      >
                        ${(amt / 1000).toFixed(0)}k
                      </button>
                    ))}
                  </div>
                </div>

                {/* Historical Context (Warm-up Bars) Lookback Selector */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">
                      Historical Context (Warm-up Bars)
                    </label>
                    <span className="text-[10px] font-mono text-emerald-400 font-bold">
                      {formData.warmup_bars} Bars Pre-loaded
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { label: "30 Bars", val: 30 },
                      { label: "60 Bars", val: 60, desc: "Standard" },
                      { label: "100 Bars", val: 100, desc: "Deep" },
                      { label: "1 Bar", val: 0, desc: "Raw" },
                    ].map((item) => (
                      <button
                        key={item.label}
                        type="button"
                        onClick={() => setFormData({ ...formData, warmup_bars: item.val })}
                        className={`py-2 px-1 rounded-lg text-xs font-mono font-bold border transition-all flex flex-col items-center justify-center ${
                          formData.warmup_bars === item.val
                            ? "bg-[#089981] text-black border-[#089981] shadow-[0_0_10px_rgba(8,153,129,0.3)]"
                            : "bg-[#131722] border-white/10 text-zinc-400 hover:text-white"
                        }`}
                      >
                        <span>{item.label}</span>
                        {item.desc && <span className={`text-[9px] font-normal ${formData.warmup_bars === item.val ? "text-black/80 font-bold" : "text-zinc-500"}`}>{item.desc}</span>}
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-zinc-500 mt-1 font-sans">
                    Pre-loads historical price action so you see market structure, trends, and key levels immediately.
                  </p>
                </div>

                {/* Quick Date Chips */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">
                      Replay Window
                    </label>
                    <div className="flex items-center gap-1.5">
                      {[
                        { label: "30D", days: 30 },
                        { label: "60D", days: 60 },
                        { label: "90D", days: 90 },
                        { label: "180D", days: 180 },
                      ].map((preset) => (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() => setQuickRange(preset.days)}
                          className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#131722] border border-white/10 text-zinc-400 hover:text-white hover:border-white/20 transition-all"
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <input
                        type="date"
                        value={formData.start_date}
                        onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                        className="w-full bg-[#131722] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white font-mono outline-none focus:border-[#089981]"
                        style={{ colorScheme: "dark" }}
                      />
                    </div>
                    <div>
                      <input
                        type="date"
                        value={formData.end_date}
                        onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                        className="w-full bg-[#131722] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white font-mono outline-none focus:border-[#089981]"
                        style={{ colorScheme: "dark" }}
                      />
                    </div>
                  </div>
                </div>

                {/* Symbol & Timeframe */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider mb-1.5 block">
                      Instrument
                    </label>
                    <select
                      value={formData.symbol}
                      onChange={(e) => setFormData({ ...formData, symbol: e.target.value })}
                      className="w-full bg-[#131722] border border-white/10 rounded-xl px-3 py-2.5 text-xs font-bold text-white outline-none focus:border-[#089981]"
                      style={{ background: "#131722", color: "#ffffff" }}
                    >
                      <optgroup label="Metals" style={{ background: "#181c27", color: "#ffffff" }}>
                        <option value="XAUUSDm" style={{ background: "#181c27", color: "#ffffff" }}>XAUUSDm (Gold)</option>
                        <option value="XAGUSDm" style={{ background: "#181c27", color: "#ffffff" }}>XAGUSDm (Silver)</option>
                      </optgroup>
                      <optgroup label="Forex Majors" style={{ background: "#181c27", color: "#ffffff" }}>
                        <option value="EURUSDm" style={{ background: "#181c27", color: "#ffffff" }}>EURUSDm</option>
                        <option value="GBPUSDm" style={{ background: "#181c27", color: "#ffffff" }}>GBPUSDm</option>
                        <option value="USDJPYm" style={{ background: "#181c27", color: "#ffffff" }}>USDJPYm</option>
                        <option value="AUDUSDm" style={{ background: "#181c27", color: "#ffffff" }}>AUDUSDm</option>
                        <option value="USDCADm" style={{ background: "#181c27", color: "#ffffff" }}>USDCADm</option>
                      </optgroup>
                      <optgroup label="Crypto" style={{ background: "#181c27", color: "#ffffff" }}>
                        <option value="BTCUSDm" style={{ background: "#181c27", color: "#ffffff" }}>BTCUSDm</option>
                        <option value="ETHUSDm" style={{ background: "#181c27", color: "#ffffff" }}>ETHUSDm</option>
                      </optgroup>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider mb-1.5 block">
                      Starting Timeframe
                    </label>
                    <select
                      value={formData.timeframe}
                      onChange={(e) => setFormData({ ...formData, timeframe: e.target.value })}
                      className="w-full bg-[#131722] border border-white/10 rounded-xl px-3 py-2.5 text-xs font-bold text-white outline-none focus:border-[#089981]"
                      style={{ background: "#131722", color: "#ffffff" }}
                    >
                      {["M1", "M5", "M15", "M30", "H1", "H4", "D1"].map((tf) => (
                        <option key={tf} value={tf} style={{ background: "#181c27", color: "#ffffff" }}>
                          {tf}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Launch Button */}
                <button
                  type="button"
                  onClick={createSession}
                  className="w-full py-3.5 rounded-xl font-bold text-sm tracking-wider uppercase bg-[#089981] text-black hover:opacity-95 transition-all shadow-[0_0_20px_rgba(8,153,129,0.3)] flex items-center justify-center gap-2"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Start Simulation</span>
                </button>

                {/* Saved Replays */}
                {savedSessions.length > 0 && (
                  <div className="pt-2 border-t border-white/10">
                    <p className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider mb-2 flex items-center gap-1.5">
                      <History className="w-3.5 h-3.5 text-blue-400" />
                      <span>Saved Sessions</span>
                    </p>
                    <div className="flex flex-wrap gap-2 max-h-[90px] overflow-y-auto">
                      {savedSessions.map((s) => (
                        <button
                          key={s.id}
                          onClick={() => loadSavedSession(s)}
                          className="px-3 py-1.5 rounded-lg bg-[#131722] border border-white/10 hover:border-emerald-500/50 text-left flex items-center gap-2 text-xs transition-all"
                        >
                          <span className="font-bold text-white">{s.symbol}</span>
                          <span className="text-[10px] text-zinc-400">{s.timeframe} · {s.candles.length} bars</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ═════════════════════════════════════════════════════════════════
              3. FLOATING FX REPLAY PRO ORDER TICKET (THE SIGNATURE CARD)
              ═════════════════════════════════════════════════════════════════ */}
          {session && isOrderTicketOpen && (
            <div className="absolute top-4 right-4 w-[340px] rounded-2xl bg-[#1e222d]/95 backdrop-blur-xl border border-white/15 p-4 shadow-2xl z-30 flex flex-col gap-4 text-[#d1d4dc]">
              
              {/* Ticket Header & Direction Tabs */}
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-1 bg-[#131722] p-1 rounded-xl border border-white/5 w-[200px]">
                  <button
                    type="button"
                    onClick={() => setTradeFormData({ ...tradeFormData, direction: "BUY" })}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                      tradeFormData.direction === "BUY"
                        ? "bg-[#089981] text-black shadow-[0_0_12px_rgba(8,153,129,0.4)]"
                        : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span>BUY</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTradeFormData({ ...tradeFormData, direction: "SELL" })}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                      tradeFormData.direction === "SELL"
                        ? "bg-[#f23645] text-white shadow-[0_0_12px_rgba(242,54,69,0.4)]"
                        : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    <TrendingDown className="w-3.5 h-3.5" />
                    <span>SELL</span>
                  </button>
                </div>

                <button
                  onClick={() => setIsOrderTicketOpen(false)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Sizing Mode Toggle: Risk % vs Fixed Lot (FX Replay Special) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[10px] uppercase font-bold text-zinc-400">
                  <span>Position Sizing</span>
                  <div className="flex items-center gap-1 bg-[#131722] p-0.5 rounded border border-white/5">
                    <button
                      type="button"
                      onClick={() => setSizingMode("risk_percent")}
                      className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                        sizingMode === "risk_percent" ? "bg-white/20 text-white" : "text-zinc-500"
                      }`}
                    >
                      Risk %
                    </button>
                    <button
                      type="button"
                      onClick={() => setSizingMode("fixed_lot")}
                      className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                        sizingMode === "fixed_lot" ? "bg-white/20 text-white" : "text-zinc-500"
                      }`}
                    >
                      Fixed Lots
                    </button>
                  </div>
                </div>

                {sizingMode === "risk_percent" ? (
                  <div className="flex items-center gap-2">
                    {[0.5, 1.0, 2.0].map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setRiskPercent(r)}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-mono font-bold border transition-all ${
                          riskPercent === r
                            ? "bg-[#089981]/20 border-[#089981] text-[#089981]"
                            : "bg-[#131722] border-white/10 text-zinc-400 hover:text-white"
                        }`}
                      >
                        {r}%
                      </button>
                    ))}
                    <input
                      type="number"
                      step="0.1"
                      value={riskPercent}
                      onChange={(e) => setRiskPercent(parseFloat(e.target.value) || 1)}
                      className="w-16 bg-[#131722] border border-white/10 rounded-lg px-2 py-1.5 text-xs text-right font-mono font-bold text-white outline-none"
                    />
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-zinc-400 font-mono">Lot Size:</label>
                    <input
                      type="number"
                      step="0.01"
                      value={tradeFormData.lot_size}
                      onChange={(e) => setTradeFormData({ ...tradeFormData, lot_size: parseFloat(e.target.value) || 0.01 })}
                      className="flex-1 bg-[#131722] border border-white/10 rounded-lg px-3 py-1.5 text-xs font-mono font-bold text-right text-white outline-none focus:border-[#089981]"
                    />
                  </div>
                )}
              </div>

              {/* Price Parameters: Entry, SL, TP */}
              <div className="space-y-2.5 text-xs">
                {/* Entry */}
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-bold text-zinc-400">Entry</span>
                  <input
                    type="number"
                    step="0.01"
                    value={tradeFormData.entry || ""}
                    placeholder={currentCandle ? String(currentCandle.close) : "Market"}
                    onChange={(e) => setTradeFormData({ ...tradeFormData, entry: parseFloat(e.target.value) || 0 })}
                    className="w-[180px] bg-[#131722] border border-white/10 rounded-lg px-2.5 py-1.5 font-mono font-bold text-right text-white outline-none"
                  />
                </div>

                {/* Stop Loss */}
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-bold text-rose-400">Stop Loss</span>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="SL Price"
                    value={tradeFormData.sl || ""}
                    onChange={(e) => setTradeFormData({ ...tradeFormData, sl: parseFloat(e.target.value) || 0 })}
                    className="w-[180px] bg-[#131722] border border-rose-500/30 rounded-lg px-2.5 py-1.5 font-mono font-bold text-right text-white outline-none focus:border-rose-500"
                  />
                </div>

                {/* Take Profit */}
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-bold text-emerald-400">Take Profit</span>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="TP Price"
                    value={tradeFormData.tp || ""}
                    onChange={(e) => setTradeFormData({ ...tradeFormData, tp: parseFloat(e.target.value) || 0 })}
                    className="w-[180px] bg-[#131722] border border-emerald-500/30 rounded-lg px-2.5 py-1.5 font-mono font-bold text-right text-white outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Quick R:R Pill Buttons */}
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[10px] font-mono text-zinc-400 font-bold uppercase">Auto TP:</span>
                  <div className="flex items-center gap-1">
                    {[1, 1.5, 2, 3, 5].map((rr) => (
                      <button
                        key={rr}
                        type="button"
                        onClick={() => setQuickRR(rr)}
                        className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#131722] border border-white/10 hover:border-[#089981] hover:text-[#089981] text-zinc-400 transition-colors"
                      >
                        1:{rr}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Execution Summary Pill */}
              <div className="p-2.5 rounded-xl bg-[#131722] border border-white/5 space-y-1 font-mono text-[11px]">
                <div className="flex justify-between text-zinc-400">
                  <span>Calculated Volume:</span>
                  <strong className="text-white">{tradeFormData.lot_size.toFixed(2)} Lot</strong>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>Risk Amount:</span>
                  <span className="text-rose-400 font-bold">
                    ${((currentEquity * (riskPercent / 100)) || 0).toFixed(2)} ({riskPercent}%)
                  </span>
                </div>
              </div>

              {/* Submit Execution Button */}
              <button
                type="button"
                onClick={simulateTrade}
                className="w-full py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg hover:opacity-95"
                style={{
                  background: tradeFormData.direction === "BUY" ? "#089981" : "#f23645",
                  color: tradeFormData.direction === "BUY" ? "#000000" : "#ffffff",
                }}
              >
                Execute {tradeFormData.direction} {tradeFormData.lot_size} Lot
              </button>
            </div>
          )}

          {/* Interactive Replay Timeline Scrubber (Bottom of Chart) */}
          {session && (
            <div className="h-8 px-4 bg-[#131722]/95 border-t border-white/[0.08] flex items-center gap-3 z-10 select-none">
              <span className="text-[11px] font-mono text-zinc-300 font-bold whitespace-nowrap">
                {isFullChartMode ? (
                  <span className="text-amber-400">All {allCandles.length} Bars Shown</span>
                ) : (
                  <span>Bar <strong className="text-white">{currentIndex + 1}</strong> / {allCandles.length}</span>
                )}
              </span>
              <div
                className="flex-1 h-3 rounded-full bg-white/10 hover:bg-white/15 overflow-hidden relative cursor-pointer group transition-all"
                onClick={(e) => {
                  if (!allCandles || allCandles.length === 0) return;
                  const rect = e.currentTarget.getBoundingClientRect();
                  const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                  const targetIdx = Math.floor(pct * (allCandles.length - 1));
                  seekToIndex(targetIdx);
                  setIsFullChartMode(false);
                  toast.success(`Jumped to Bar ${targetIdx + 1}`);
                }}
                title="Click anywhere on this timeline to jump replay point"
              >
                <div
                  className="h-full bg-gradient-to-r from-emerald-600 to-[#089981] transition-all rounded-full group-hover:brightness-125 relative"
                  style={{ width: isFullChartMode ? "100%" : `${progress.progress_percent}%` }}
                >
                  {!isFullChartMode && (
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-md transform translate-x-1/2" />
                  )}
                </div>
              </div>
              <span className="text-[11px] font-mono text-zinc-400 font-bold whitespace-nowrap">
                {isFullChartMode ? "Full Range" : `${progress.progress_percent.toFixed(0)}%`}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ═════════════════════════════════════════════════════════════════════
          4. BOTTOM COLLAPSIBLE DOCK: POSITIONS, TRADE LOG & ANALYTICS
          ═════════════════════════════════════════════════════════════════════ */}
      {session && (
        <div 
          className={`border-t border-white/[0.08] bg-[#181c27] transition-all duration-200 flex flex-col flex-shrink-0 ${
            isBottomDockExpanded ? "h-[220px]" : "h-[36px]"
          }`}
        >
          {/* Bottom Dock Header Tabs */}
          <div className="h-[36px] px-3 bg-[#131722] border-b border-white/[0.05] flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-1">
              <button
                onClick={() => { setBottomTab("positions"); setIsBottomDockExpanded(true); }}
                className={`px-3 py-1 rounded text-xs font-bold font-mono transition-colors flex items-center gap-1.5 ${
                  bottomTab === "positions" && isBottomDockExpanded ? "bg-white/10 text-white" : "text-zinc-400 hover:text-white"
                }`}
              >
                <span>Positions</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                  openPositions.length > 0 ? "bg-emerald-500/20 text-emerald-400" : "bg-white/5 text-zinc-500"
                }`}>
                  {openPositions.length}
                </span>
              </button>

              <button
                onClick={() => { setBottomTab("history"); setIsBottomDockExpanded(true); }}
                className={`px-3 py-1 rounded text-xs font-bold font-mono transition-colors flex items-center gap-1.5 ${
                  bottomTab === "history" && isBottomDockExpanded ? "bg-white/10 text-white" : "text-zinc-400 hover:text-white"
                }`}
              >
                <span>Trade History</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/5 text-zinc-500">
                  {closedTrades.length}
                </span>
              </button>

              <button
                onClick={() => { setBottomTab("analytics"); setIsBottomDockExpanded(true); }}
                className={`px-3 py-1 rounded text-xs font-bold font-mono transition-colors flex items-center gap-1.5 ${
                  bottomTab === "analytics" && isBottomDockExpanded ? "bg-white/10 text-white" : "text-zinc-400 hover:text-white"
                }`}
              >
                <span>Session Analytics</span>
              </button>
            </div>

            {/* Expand / Minimize Toggle */}
            <button
              onClick={() => setIsBottomDockExpanded(!isBottomDockExpanded)}
              className="p-1 rounded text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
              title={isBottomDockExpanded ? "Collapse Panel" : "Expand Panel"}
            >
              {isBottomDockExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
            </button>
          </div>

          {/* Bottom Dock Content Body (When Expanded) */}
          {isBottomDockExpanded && (
            <div className="flex-1 p-3 overflow-y-auto font-mono text-xs">
              
              {/* TAB 1: ACTIVE OPEN POSITIONS */}
              {bottomTab === "positions" && (
                <div>
                  {openPositions.length === 0 ? (
                    <div className="py-8 text-center text-zinc-500 font-sans text-xs">
                      No active simulated positions. Click <strong className="text-white">Trade</strong> in the top bar to place an order.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="text-zinc-400 uppercase text-[10px] border-b border-white/5 pb-2">
                            <th className="pb-2">Side</th>
                            <th className="pb-2">Symbol</th>
                            <th className="pb-2">Volume</th>
                            <th className="pb-2">Entry</th>
                            <th className="pb-2">Current</th>
                            <th className="pb-2">SL</th>
                            <th className="pb-2">TP</th>
                            <th className="pb-2">Floating P&L</th>
                            <th className="pb-2 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {openPositions.map((pos) => {
                            const pnl = currentCandle ? calculateFloatingPnl(pos, currentCandle.close) : 0;
                            const isWin = pnl >= 0;
                            return (
                              <tr key={pos.id} className="hover:bg-white/[0.02]">
                                <td className="py-2.5 font-bold">
                                  <span className={`px-2 py-0.5 rounded text-[10px] ${
                                    pos.direction === "BUY" ? "bg-emerald-500/10 text-[#089981]" : "bg-rose-500/10 text-[#f23645]"
                                  }`}>
                                    {pos.direction}
                                  </span>
                                </td>
                                <td className="py-2.5 font-bold text-white">{pos.symbol}</td>
                                <td className="py-2.5 text-zinc-300">{pos.lot_size}L</td>
                                <td className="py-2.5 text-zinc-300">{pos.entry.toFixed(2)}</td>
                                <td className="py-2.5 text-zinc-300">{currentCandle?.close.toFixed(2)}</td>
                                <td className="py-2.5 text-rose-400">{pos.sl > 0 ? pos.sl.toFixed(2) : "-"}</td>
                                <td className="py-2.5 text-emerald-400">{pos.tp > 0 ? pos.tp.toFixed(2) : "-"}</td>
                                <td className={`py-2.5 font-bold ${isWin ? "text-emerald-400" : "text-rose-400"}`}>
                                  {isWin ? '+' : ''}${pnl.toFixed(2)}
                                </td>
                                <td className="py-2.5 text-right">
                                  <button
                                    onClick={() => closePosition(pos.id)}
                                    className="px-2.5 py-1 rounded bg-rose-500/15 hover:bg-rose-500/25 text-[#f23645] font-bold text-[10px] uppercase transition-all"
                                  >
                                    Close
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: CLOSED TRADE HISTORY */}
              {bottomTab === "history" && (
                <div>
                  {closedTrades.length === 0 ? (
                    <div className="py-8 text-center text-zinc-500 font-sans text-xs">
                      No closed trades in this session yet.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="text-zinc-400 uppercase text-[10px] border-b border-white/5 pb-2">
                            <th className="pb-2">Time</th>
                            <th className="pb-2">Side</th>
                            <th className="pb-2">Symbol</th>
                            <th className="pb-2">Volume</th>
                            <th className="pb-2">Entry</th>
                            <th className="pb-2">Exit</th>
                            <th className="pb-2">Return R</th>
                            <th className="pb-2">Net P&L</th>
                            <th className="pb-2 text-right">Result</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {closedTrades.map((t) => (
                            <tr key={t.id} className="hover:bg-white/[0.02]">
                              <td className="py-2 text-zinc-400">{t.time}</td>
                              <td className="py-2 font-bold">
                                <span className={`px-2 py-0.5 rounded text-[10px] ${
                                  t.direction === "BUY" ? "bg-emerald-500/10 text-[#089981]" : "bg-rose-500/10 text-[#f23645]"
                                }`}>
                                  {t.direction}
                                </span>
                              </td>
                              <td className="py-2 text-white font-bold">{t.symbol}</td>
                              <td className="py-2 text-zinc-300">{t.lot_size}L</td>
                              <td className="py-2 text-zinc-300">{t.entry.toFixed(2)}</td>
                              <td className="py-2 text-zinc-300">{t.exit.toFixed(2)}</td>
                              <td className={`py-2 font-bold ${t.rr >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                                {t.rr >= 0 ? `+${t.rr}R` : `${t.rr}R`}
                              </td>
                              <td className={`py-2 font-bold ${t.pnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                                {t.pnl >= 0 ? '+' : ''}${t.pnl.toFixed(2)}
                              </td>
                              <td className="py-2 text-right">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  t.outcome === "WIN" ? "bg-emerald-500/20 text-emerald-400" : t.outcome === "LOSS" ? "bg-rose-500/20 text-rose-400" : "bg-zinc-500/20 text-zinc-400"
                                }`}>
                                  {t.outcome}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: SESSION ANALYTICS */}
              {bottomTab === "analytics" && (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  <div className="p-3 rounded-xl bg-[#131722] border border-white/5 flex flex-col">
                    <span className="text-[10px] uppercase font-bold text-zinc-400">Total Trades</span>
                    <strong className="text-lg font-bold text-white mt-1">
                      {statistics ? statistics.total_trades : closedTrades.length}
                    </strong>
                  </div>
                  <div className="p-3 rounded-xl bg-[#131722] border border-white/5 flex flex-col">
                    <span className="text-[10px] uppercase font-bold text-zinc-400">Win Rate</span>
                    <strong className="text-lg font-bold text-emerald-400 mt-1">
                      {statistics ? `${statistics.win_rate.toFixed(1)}%` : "0.0%"}
                    </strong>
                  </div>
                  <div className="p-3 rounded-xl bg-[#131722] border border-white/5 flex flex-col">
                    <span className="text-[10px] uppercase font-bold text-zinc-400">Net Realized PnL</span>
                    <strong className={`text-lg font-bold mt-1 ${currentPnL >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                      {currentPnL >= 0 ? '+' : ''}${currentPnL.toFixed(2)}
                    </strong>
                  </div>
                  <div className="p-3 rounded-xl bg-[#131722] border border-white/5 flex flex-col">
                    <span className="text-[10px] uppercase font-bold text-zinc-400">Max Drawdown</span>
                    <strong className="text-lg font-bold text-rose-400 mt-1">
                      {statistics ? `${statistics.max_drawdown.toFixed(2)}%` : "0.00%"}
                    </strong>
                  </div>
                  <div className="p-3 rounded-xl bg-[#131722] border border-white/5 flex flex-col">
                    <span className="text-[10px] uppercase font-bold text-zinc-400">Expectancy</span>
                    <strong className="text-lg font-bold text-white mt-1">
                      {statistics ? `$${statistics.expectancy.toFixed(2)}` : "$0.00"}
                    </strong>
                  </div>
                </div>
              )}

            </div>
          )}
        </div>
      )}

    </div>
  );
}
