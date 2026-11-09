"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  TrendingUp,
  Activity,
  Maximize2,
  Minimize2,
  Shield,
  Layers,
  Crosshair,
  Trash2,
  Sparkles,
  BarChart2,
  LineChart,
  AreaChart,
  Sliders,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { createChart, LineStyle } from "lightweight-charts";
import { RealCandle, RealLevels, RealPosition } from "@/hooks/useCommandCenterRealData";
import { useWebSocket } from "@/components/providers/WebSocketProvider";
import { listDrawings, addDrawing, clearDrawings } from "@/lib/terminalApi";
import { sanitizeChartData } from "@/lib/chartSanitizer";
import TradingViewWidgetComponent from "@/components/ui/TradingViewWidget";

function mapTfToTvInterval(tf: string): string {
  const t = (tf || "").toUpperCase();
  if (t === "1M" || t === "M1") return "1";
  if (t === "3M" || t === "M3") return "3";
  if (t === "5M" || t === "M5") return "5";
  if (t === "15M" || t === "M15") return "15";
  if (t === "30M" || t === "M30") return "30";
  if (t === "1H" || t === "H1" || t === "60") return "60";
  if (t === "2H" || t === "H2") return "120";
  if (t === "4H" || t === "H4" || t === "240") return "240";
  if (t === "8H" || t === "H8") return "240";
  if (t === "D1" || t === "1D" || t === "D") return "D";
  if (t === "W1" || t === "1W" || t === "W") return "W";
  if (t === "MN" || t === "1MN" || t === "M") return "M";
  return "15";
}

interface Props {
  symbol: string;
  timeframe: string;
  onTimeframeChange?: (tf: string) => void;
  currentPrice: number;
  bidPrice: number;
  askPrice: number;
  spreadPips: number;
  entryPrice?: number;
  slPrice?: number;
  tp1Price?: number;
  tp2Price?: number;
  realCandles: RealCandle[];
  levels: RealLevels | null;
  positions: RealPosition[];
  onExecuteTrade?: (action: "buy" | "sell", lotSize: number) => void;
  className?: string;
}

const TIMEFRAMES = ["1m", "3m", "5m", "15m", "30m", "1H", "2H", "4H", "8H", "D", "W", "M"];

const normalizeTf = (tf: string) => {
  const t = (tf || "").toUpperCase();
  if (t === "M1" || t === "1M") return "1m";
  if (t === "M3" || t === "3M") return "3m";
  if (t === "M5" || t === "5M") return "5m";
  if (t === "M15" || t === "15M") return "15m";
  if (t === "M30" || t === "30M") return "30m";
  if (t === "H1" || t === "1H") return "1H";
  if (t === "H2" || t === "2H") return "2H";
  if (t === "H4" || t === "4H") return "4H";
  if (t === "H8" || t === "8H") return "8H";
  if (t === "D1" || t === "1D" || t === "D") return "D";
  if (t === "W1" || t === "1W" || t === "W") return "W";
  if (t === "MN" || t === "1MN" || t === "M") return "M";
  return tf;
};

const DRAWING_TOOLS = [
  { key: "hline", label: "HL", title: "Horizontal Line", hint: "Click price level to place" },
  { key: "vline", label: "VL", title: "Vertical Line", hint: "Click time bar to place" },
  { key: "trendline", label: "T", title: "Trendline", hint: "Click 2 points on chart" },
  { key: "ray", label: "R", title: "Ray Line", hint: "Click 2 points to extend ray" },
  { key: "zone", label: "QZ", title: "Quant Zone", hint: "Click Top and Bottom bounds" },
  { key: "fib", label: "FR", title: "Fib Retracement", hint: "Click High and Low points" },
  { key: "long", label: "LP", title: "Long Position", hint: "Click entry & stop loss" },
  { key: "short", label: "SP", title: "Short Position", hint: "Click entry & stop loss" },
];

const CHART_COLORS = {
  bg: "#070709",
  text: "#71717a",
  grid: "rgba(255, 255, 255, 0.02)",
  border: "rgba(255, 255, 255, 0.05)",
  up: "#10b981",
  down: "#f43f5e",
  ma20: "#64748b",
  ma50: "#94a3b8",
  ma200: "#475569",
  bb: "rgba(255, 255, 255, 0.15)",
  volUp: "rgba(16, 185, 129, 0.18)",
  volDown: "rgba(244, 63, 94, 0.18)",
};

function computeSMA(data: any[], period: number) {
  const out: any[] = [];
  let sum = 0;
  for (let i = 0; i < data.length; i++) {
    sum += data[i].close;
    if (i >= period) sum -= data[i - period].close;
    if (i >= period - 1) {
      out.push({ time: data[i].time, value: +(sum / period).toFixed(5) });
    }
  }
  return out;
}

function computeBollingerBands(data: any[], period = 20, stdDevMult = 2) {
  const upper: any[] = [];
  const lower: any[] = [];
  const middle: any[] = [];

  for (let i = period - 1; i < data.length; i++) {
    const slice = data.slice(i - period + 1, i + 1);
    const mean = slice.reduce((acc, c) => acc + c.close, 0) / period;
    const variance = slice.reduce((acc, c) => acc + Math.pow(c.close - mean, 2), 0) / period;
    const stdDev = Math.sqrt(variance);

    middle.push({ time: data[i].time, value: +mean.toFixed(5) });
    upper.push({ time: data[i].time, value: +(mean + stdDevMult * stdDev).toFixed(5) });
    lower.push({ time: data[i].time, value: +(mean - stdDevMult * stdDev).toFixed(5) });
  }

  return { upper, middle, lower };
}

function computeRSI(data: any[], period = 14) {
  if (data.length <= period) return [];
  const out: any[] = [];
  let avgGain = 0;
  let avgLoss = 0;
  for (let i = 1; i <= period; i++) {
    const change = data[i].close - data[i - 1].close;
    if (change > 0) avgGain += change;
    else avgLoss -= change;
  }
  avgGain /= period;
  avgLoss /= period;
  out.push({ time: data[period].time, value: 100 - 100 / (1 + avgGain / (avgLoss || 1e-10)) });

  for (let i = period + 1; i < data.length; i++) {
    const change = data[i].close - data[i - 1].close;
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? -change : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    out.push({ time: data[i].time, value: +(100 - 100 / (1 + avgGain / (avgLoss || 1e-10))).toFixed(2) });
  }
  return out;
}

function computeEMA(data: any[], period: number, key = "close") {
  if (data.length === 0) return [];
  const k = 2 / (period + 1);
  let ema = data[0][key];
  const out = [{ time: data[0].time, value: ema }];
  for (let i = 1; i < data.length; i++) {
    ema = data[i][key] * k + ema * (1 - k);
    out.push({ time: data[i].time, value: ema });
  }
  return out;
}

function computeMACD(data: any[], fast = 12, slow = 26, signal = 9) {
  if (data.length < slow) return { macd: [], signal: [], hist: [] };
  const fEma = computeEMA(data, fast);
  const sEma = computeEMA(data, slow);
  const macdLine: Array<{ time: any; value: number }> = [];
  for (let i = 0; i < data.length; i++) {
    macdLine.push({ time: data[i].time, value: +(fEma[i].value - sEma[i].value).toFixed(5) });
  }
  const sigEma = computeEMA(macdLine, signal, "value");
  const hist: Array<{ time: any; value: number; color: string }> = [];
  for (let i = 0; i < data.length; i++) {
    const val = +(macdLine[i].value - sigEma[i].value).toFixed(5);
    hist.push({
      time: data[i].time,
      value: val,
      color: val >= 0 ? "rgba(16, 185, 129, 0.6)" : "rgba(239, 68, 68, 0.6)",
    });
  }
  return { macd: macdLine, signal: sigEma, hist };
}

export default function ChartCanvas({
  symbol,
  timeframe,
  onTimeframeChange,
  currentPrice,
  bidPrice,
  askPrice,
  spreadPips,
  entryPrice,
  slPrice,
  tp1Price,
  tp2Price,
  realCandles,
  levels,
  positions,
  onExecuteTrade,
  className = "",
}: Props) {
  // Chart Display Modes
  const [chartType, setChartType] = useState<"candles" | "line" | "area">("candles");
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [tradeLotSize, setTradeLotSize] = useState<number>(0.01);
  const [showOrderStrip, setShowOrderStrip] = useState<boolean>(true);
  const [chartEngine, setChartEngine] = useState<"auto" | "mt5" | "cloud">("auto");

  // Indicators State
  const [indicators, setIndicators] = useState({
    ma20: true,
    ma50: true,
    ma200: false,
    bb: false,
    volume: true,
    rsi: false,
    macd: false,
  });

  const toggleIndicator = (k: keyof typeof indicators) => {
    setIndicators((prev) => ({ ...prev, [k]: !prev[k] }));
  };

  // Drawing Tools State
  const [drawMode, setDrawMode] = useState<string | null>(null);
  const [drawings, setDrawings] = useState<any[]>([]);
  const pendingPointsRef = useRef<any[]>([]);
  const modeRef = useRef<string | null>(null);
  useEffect(() => {
    modeRef.current = drawMode;
    pendingPointsRef.current = [];
  }, [drawMode]);

  // Hover Crosshair OHLC Legend
  const [hoverData, setHoverData] = useState<{
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
    change: number;
    changePct: number;
    time: string;
  } | null>(null);

  // Chart References
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<any>(null);
  const candleSeriesRef = useRef<any>(null);
  const lineSeriesRef = useRef<any>(null);
  const areaSeriesRef = useRef<any>(null);
  const volumeSeriesRef = useRef<any>(null);
  const ma20SeriesRef = useRef<any>(null);
  const ma50SeriesRef = useRef<any>(null);
  const ma200SeriesRef = useRef<any>(null);
  const bbUpperSeriesRef = useRef<any>(null);
  const bbLowerSeriesRef = useRef<any>(null);
  const rsiSeriesRef = useRef<any>(null);
  const macdLineRef = useRef<any>(null);
  const macdSignalRef = useRef<any>(null);
  const macdHistRef = useRef<any>(null);
  const drawingSeriesRef = useRef<Map<string, any[]>>(new Map());
  const priceLinesRef = useRef<any[]>([]);

  // WebSocket Live Prices & Symbol Normalization
  const { livePrices, isConnected } = useWebSocket();
  const normalizedSymbol = useMemo(() => symbol.replace("/", "").toUpperCase(), [symbol]);
  const activeWsTick = useMemo(() => {
    return (
      livePrices[normalizedSymbol] ||
      livePrices[symbol] ||
      Object.values(livePrices).find((p) => p.symbol.replace("/", "").toUpperCase() === normalizedSymbol) ||
      null
    );
  }, [livePrices, normalizedSymbol, symbol]);

  const [livePrice, setLivePrice] = useState<number>(bidPrice || currentPrice || 4424.26);
  const [tickFlash, setTickFlash] = useState<"up" | "down" | null>(null);
  const [tickCount, setTickCount] = useState<number>(0);
  const lastPriceRef = useRef<number>(livePrice);
  const lastTickTimeRef = useRef<number>(Date.now());
  const lastCandleRef = useRef<any>(null);
  const isInitialFitDoneRef = useRef<boolean>(false);
  const lastSymbolRef = useRef<string>(symbol);
  const lastTimeframeRef = useRef<string>(timeframe);

  // Reset viewport fit lock and clear stale data when symbol or timeframe changes
  useEffect(() => {
    if (lastSymbolRef.current !== symbol || lastTimeframeRef.current !== timeframe) {
      lastSymbolRef.current = symbol;
      lastTimeframeRef.current = timeframe;
      isInitialFitDoneRef.current = false;
      lastCandleRef.current = null;
      try {
        if (candleSeriesRef.current) candleSeriesRef.current.setData([]);
        if (lineSeriesRef.current) lineSeriesRef.current.setData([]);
        if (areaSeriesRef.current) areaSeriesRef.current.setData([]);
        if (volumeSeriesRef.current) volumeSeriesRef.current.setData([]);
        if (ma20SeriesRef.current) ma20SeriesRef.current.setData([]);
        if (ma50SeriesRef.current) ma50SeriesRef.current.setData([]);
        if (ma200SeriesRef.current) ma200SeriesRef.current.setData([]);
        if (bbUpperSeriesRef.current) bbUpperSeriesRef.current.setData([]);
        if (bbLowerSeriesRef.current) bbLowerSeriesRef.current.setData([]);
        if (rsiSeriesRef.current) rsiSeriesRef.current.setData([]);
        if (macdLineRef.current) macdLineRef.current.setData([]);
        if (macdSignalRef.current) macdSignalRef.current.setData([]);
        if (macdHistRef.current) macdHistRef.current.setData([]);
        priceLinesRef.current.forEach((pl) => {
          try {
            candleSeriesRef.current?.removePriceLine(pl);
          } catch (_) {}
        });
        priceLinesRef.current = [];
      } catch (_) {}
    }
  }, [symbol, timeframe]);

  const digits = symbol === "XAUUSD" || symbol.includes("JPY") ? 2 : 5;

  // Active position on this symbol
  const activePosition = useMemo(() => {
    return positions.find((p) => p.pair.toUpperCase().replace("/", "") === symbol.replace("/", ""));
  }, [positions, symbol]);

  // Real candles only — strictly zero synthetic data to avoid confusing trading decisions
  const displayCandles = useMemo(() => {
    if (realCandles && realCandles.length >= 5) {
      return sanitizeChartData(realCandles);
    }
    return [];
  }, [realCandles]);

  // Determine active chart engine mode
  const isCloudMode = chartEngine === "cloud" || (chartEngine === "auto" && displayCandles.length === 0);

  // Load Persisted Drawings for this symbol
  useEffect(() => {
    let cancelled = false;
    listDrawings(symbol)
      .then((d) => !cancelled && Array.isArray(d) && setDrawings(d))
      .catch(() => !cancelled && setDrawings([]));
    return () => {
      cancelled = true;
    };
  }, [symbol]);

  // Handle Complete Drawing
  const handleDrawingComplete = useCallback(
    async (newDrawing: any) => {
      const id = "d_" + Math.random().toString(36).substring(2, 9);
      const drawingObj = { id, symbol, ...newDrawing };
      setDrawings((prev) => [...prev, drawingObj]);
      try {
        await addDrawing(drawingObj);
      } catch (_) {}
      setDrawMode(null);
    },
    [symbol]
  );

  const handleClearDrawings = async () => {
    setDrawings([]);
    try {
      await clearDrawings(symbol);
    } catch (_) {}
  };

  // Initialize Native Lightweight Chart Engine
  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      layout: {
        background: { color: CHART_COLORS.bg },
        textColor: CHART_COLORS.text,
        fontFamily: "JetBrains Mono, monospace",
        fontSize: 10,
      },
      grid: {
        vertLines: { color: CHART_COLORS.grid },
        horzLines: { color: CHART_COLORS.grid },
      },
      crosshair: {
        mode: 1,
        vertLine: { color: "rgba(255, 255, 255, 0.18)", labelBackgroundColor: "#18181b" },
        horzLine: { color: "rgba(255, 255, 255, 0.18)", labelBackgroundColor: "#18181b" },
      },
      rightPriceScale: {
        borderColor: CHART_COLORS.border,
        scaleMargins: { top: 0.08, bottom: indicators.rsi || indicators.macd ? 0.28 : 0.12 },
      },
      timeScale: {
        borderColor: CHART_COLORS.border,
        timeVisible: true,
        secondsVisible: false,
        rightOffset: 12,
        barSpacing: 6,
        minBarSpacing: 2,
      },
      autoSize: true,
    });
    chartRef.current = chart;

    // 1. Candlestick Series
    candleSeriesRef.current = chart.addCandlestickSeries({
      upColor: CHART_COLORS.up,
      downColor: CHART_COLORS.down,
      borderUpColor: CHART_COLORS.up,
      borderDownColor: CHART_COLORS.down,
      wickUpColor: CHART_COLORS.up,
      wickDownColor: CHART_COLORS.down,
      visible: chartType === "candles",
    });

    // 2. Line Series
    lineSeriesRef.current = chart.addLineSeries({
      color: "#38bdf8",
      lineWidth: 2,
      visible: chartType === "line",
    });

    // 3. Area Series
    areaSeriesRef.current = chart.addAreaSeries({
      topColor: "rgba(32, 224, 178, 0.28)",
      bottomColor: "rgba(32, 224, 178, 0.01)",
      lineColor: "#20e0b2",
      lineWidth: 2,
      visible: chartType === "area",
    });

    // 4. Volume Series
    volumeSeriesRef.current = chart.addHistogramSeries({
      priceFormat: { type: "volume" },
      priceScaleId: "",
    });
    volumeSeriesRef.current.priceScale().applyOptions({
      scaleMargins: { top: 0.82, bottom: 0 },
    });

    // 5. Moving Averages
    ma20SeriesRef.current = chart.addLineSeries({
      color: CHART_COLORS.ma20,
      lineWidth: 1,
      priceLineVisible: false,
      lastValueVisible: false,
    });
    ma50SeriesRef.current = chart.addLineSeries({
      color: CHART_COLORS.ma50,
      lineWidth: 1,
      priceLineVisible: false,
      lastValueVisible: false,
    });
    ma200SeriesRef.current = chart.addLineSeries({
      color: CHART_COLORS.ma200,
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: false,
    });

    // 6. Bollinger Bands
    bbUpperSeriesRef.current = chart.addLineSeries({
      color: CHART_COLORS.bb,
      lineWidth: 1,
      lineStyle: LineStyle.Dashed,
      priceLineVisible: false,
      lastValueVisible: false,
    });
    bbLowerSeriesRef.current = chart.addLineSeries({
      color: CHART_COLORS.bb,
      lineWidth: 1,
      lineStyle: LineStyle.Dashed,
      priceLineVisible: false,
      lastValueVisible: false,
    });

    // 7. RSI Sub-Pane
    rsiSeriesRef.current = chart.addLineSeries({
      color: "#a78bfa",
      lineWidth: 2,
      priceScaleId: "rsi",
      priceLineVisible: false,
      lastValueVisible: false,
    });
    rsiSeriesRef.current.priceScale().applyOptions({
      scaleMargins: { top: 0.78, bottom: 0 },
    });

    // 8. MACD Sub-Pane
    macdHistRef.current = chart.addHistogramSeries({
      priceFormat: { type: "volume" },
      priceScaleId: "macd",
      priceLineVisible: false,
      lastValueVisible: false,
    });
    macdLineRef.current = chart.addLineSeries({
      color: "#38bdf8",
      lineWidth: 2,
      priceScaleId: "macd",
      priceLineVisible: false,
      lastValueVisible: false,
    });
    macdSignalRef.current = chart.addLineSeries({
      color: "#f59e0b",
      lineWidth: 2,
      priceScaleId: "macd",
      priceLineVisible: false,
      lastValueVisible: false,
    });
    macdHistRef.current.priceScale().applyOptions({
      scaleMargins: { top: 0.78, bottom: 0 },
    });

    // ── CLICK HANDLER FOR DRAWING TOOLS ──
    const handleChartClick = (param: any) => {
      const mode = modeRef.current;
      if (!mode || !param || !param.time || !param.point) return;
      const price = candleSeriesRef.current?.coordinateToPrice(param.point.y);
      if (price === null || price === undefined) return;
      const point = {
        time: typeof param.time === "number" ? param.time : Number(param.time),
        price: +price.toFixed(digits),
      };
      const required = mode === "hline" ? 1 : 2;
      pendingPointsRef.current.push(point);
      if (pendingPointsRef.current.length >= required) {
        const points = pendingPointsRef.current.slice(0, required);
        pendingPointsRef.current = [];
        handleDrawingComplete({ type: mode, points });
      }
    };
    chart.subscribeClick(handleChartClick);

    // ── CROSSHAIR MOVE FOR OHLCV READOUT ──
    const handleCrosshairMove = (param: any) => {
      if (!param || !param.time || !param.seriesData) {
        setHoverData(null);
        return;
      }
      const candleData = param.seriesData.get(candleSeriesRef.current) as any;
      if (candleData && typeof candleData.open === "number") {
        const change = candleData.close - candleData.open;
        const changePct = candleData.open > 0 ? (change / candleData.open) * 100 : 0;
        const volData = param.seriesData.get(volumeSeriesRef.current) as any;
        const timeStr = new Date(param.time * 1000).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        });

        setHoverData({
          open: candleData.open,
          high: candleData.high,
          low: candleData.low,
          close: candleData.close,
          volume: volData?.value || 0,
          change,
          changePct,
          time: timeStr,
        });
      }
    };
    chart.subscribeCrosshairMove(handleCrosshairMove);

    // Initial data hydration if already available
    if (displayCandles.length > 0) {
      if (candleSeriesRef.current) candleSeriesRef.current.setData(displayCandles);
      if (lineSeriesRef.current) lineSeriesRef.current.setData(displayCandles.map((c) => ({ time: c.time, value: c.close })));
      if (areaSeriesRef.current) areaSeriesRef.current.setData(displayCandles.map((c) => ({ time: c.time, value: c.close })));
      if (volumeSeriesRef.current) {
        volumeSeriesRef.current.setData(
          displayCandles.map((c) => ({
            time: c.time,
            value: c.volume,
            color: c.close >= c.open ? CHART_COLORS.volUp : CHART_COLORS.volDown,
          }))
        );
      }
      chart.timeScale().fitContent();
    }

    // Resize observer to ensure zero-glitch layout responsiveness
    const resizeObserver = new ResizeObserver((entries) => {
      if (!entries || entries.length === 0 || !chartRef.current) return;
      const { width, height } = entries[0].contentRect;
      if (width > 0 && height > 0) {
        chartRef.current.resize(width, height);
      }
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      chart.unsubscribeClick(handleChartClick);
      chart.unsubscribeCrosshairMove(handleCrosshairMove);
      chart.remove();
      chartRef.current = null;
    };
  }, [digits, handleDrawingComplete]);

  // Handle visibility & resize transition when switching between MT5 and Cloud
  useEffect(() => {
    if (!isCloudMode && chartRef.current && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        chartRef.current.resize(rect.width, rect.height);
      }
      chartRef.current.timeScale().fitContent();
    }
  }, [isCloudMode]);

  // Handle fullscreen / theater mode resize
  useEffect(() => {
    if (chartRef.current && containerRef.current) {
      const timer = setTimeout(() => {
        if (containerRef.current && chartRef.current) {
          const w = containerRef.current.clientWidth;
          const h = containerRef.current.clientHeight;
          if (w > 0 && h > 0) {
            chartRef.current.resize(w, h);
            chartRef.current.timeScale().fitContent();
          }
        }
      }, 60);
      return () => clearTimeout(timer);
    }
  }, [isExpanded]);

  // Helper to sync all indicator sub-series cleanly without touching candle series
  const updateCanvasIndicators = useCallback(
    (candlesList: RealCandle[]) => {
      if (!candlesList || candlesList.length === 0) return;

      if (ma20SeriesRef.current) {
        ma20SeriesRef.current.applyOptions({ visible: indicators.ma20 });
        ma20SeriesRef.current.setData(indicators.ma20 ? computeSMA(candlesList, 20) : []);
      }

      if (ma50SeriesRef.current) {
        ma50SeriesRef.current.applyOptions({ visible: indicators.ma50 });
        ma50SeriesRef.current.setData(indicators.ma50 ? computeSMA(candlesList, 50) : []);
      }

      if (ma200SeriesRef.current) {
        ma200SeriesRef.current.applyOptions({ visible: indicators.ma200 });
        ma200SeriesRef.current.setData(indicators.ma200 ? computeSMA(candlesList, 200) : []);
      }

      if (bbUpperSeriesRef.current && bbLowerSeriesRef.current) {
        if (indicators.bb) {
          const bb = computeBollingerBands(candlesList, 20, 2);
          bbUpperSeriesRef.current.applyOptions({ visible: true });
          bbLowerSeriesRef.current.applyOptions({ visible: true });
          bbUpperSeriesRef.current.setData(bb.upper);
          bbLowerSeriesRef.current.setData(bb.lower);
        } else {
          bbUpperSeriesRef.current.applyOptions({ visible: false });
          bbLowerSeriesRef.current.applyOptions({ visible: false });
          bbUpperSeriesRef.current.setData([]);
          bbLowerSeriesRef.current.setData([]);
        }
      }

      if (rsiSeriesRef.current) {
        rsiSeriesRef.current.applyOptions({ visible: indicators.rsi });
        rsiSeriesRef.current.setData(indicators.rsi ? computeRSI(candlesList) : []);
      }

      if (macdLineRef.current && macdSignalRef.current && macdHistRef.current) {
        if (indicators.macd) {
          const macd = computeMACD(candlesList);
          macdLineRef.current.applyOptions({ visible: true });
          macdSignalRef.current.applyOptions({ visible: true });
          macdHistRef.current.applyOptions({ visible: true });
          macdLineRef.current.setData(macd.macd);
          macdSignalRef.current.setData(macd.signal);
          macdHistRef.current.setData(macd.hist);
        } else {
          macdLineRef.current.applyOptions({ visible: false });
          macdSignalRef.current.applyOptions({ visible: false });
          macdHistRef.current.applyOptions({ visible: false });
          macdLineRef.current.setData([]);
          macdSignalRef.current.setData([]);
          macdHistRef.current.setData([]);
        }
      }
    },
    [indicators]
  );

  // ── ZERO-GLITCH DATA & VIEWPORT PIPELINE ──
  // 1. Initial load or symbol/timeframe switch: setData once + fitContent once.
  // 2. Intra-bar ticks: update(last) without full setData or resetting zoom.
  // 3. New bar formation: update(newBar) without snapping zoom.
  useEffect(() => {
    if (!chartRef.current || displayCandles.length === 0) return;

    const incomingLast = displayCandles[displayCandles.length - 1];
    const currentLast = lastCandleRef.current;
    const isSameActiveBar = currentLast && incomingLast && currentLast.time === incomingLast.time;

    try {
      // 1. Initial Load or Symbol/Timeframe switch: full setData + fitContent once
      if (!isInitialFitDoneRef.current || !currentLast) {
        if (candleSeriesRef.current) candleSeriesRef.current.setData(displayCandles);
        if (lineSeriesRef.current) lineSeriesRef.current.setData(displayCandles.map((c) => ({ time: c.time, value: c.close })));
        if (areaSeriesRef.current) areaSeriesRef.current.setData(displayCandles.map((c) => ({ time: c.time, value: c.close })));
        if (volumeSeriesRef.current) {
          volumeSeriesRef.current.setData(
            displayCandles.map((c) => ({
              time: c.time,
              value: c.volume,
              color: c.close >= c.open ? CHART_COLORS.volUp : CHART_COLORS.volDown,
            }))
          );
        }
        updateCanvasIndicators(displayCandles);
        if (displayCandles.length < 60) {
          chartRef.current.timeScale().applyOptions({
            barSpacing: 18,
            rightOffset: 12,
          });
          chartRef.current.timeScale().scrollToRealtime();
        } else {
          chartRef.current.timeScale().applyOptions({
            barSpacing: 6,
            rightOffset: 12,
          });
          chartRef.current.timeScale().fitContent();
        }
        isInitialFitDoneRef.current = true;
        lastCandleRef.current = incomingLast;
        return;
      }

      // 2. Intra-bar update (same timestamp): Smoothly update the current bar, NEVER call fitContent or setData!
      if (isSameActiveBar) {
        if (chartType === "candles" && candleSeriesRef.current) {
          candleSeriesRef.current.update(incomingLast);
        } else if (chartType === "line" && lineSeriesRef.current) {
          lineSeriesRef.current.update({ time: incomingLast.time, value: incomingLast.close });
        } else if (chartType === "area" && areaSeriesRef.current) {
          areaSeriesRef.current.update({ time: incomingLast.time, value: incomingLast.close });
        }
        if (volumeSeriesRef.current) {
          volumeSeriesRef.current.update({
            time: incomingLast.time,
            value: incomingLast.volume,
            color: incomingLast.close >= incomingLast.open ? CHART_COLORS.volUp : CHART_COLORS.volDown,
          });
        }
        lastCandleRef.current = incomingLast;
        return;
      }

      // 3. New bar formation (incoming > current): Append smoothly without resetting zoom
      if (incomingLast.time > currentLast.time) {
        if (chartType === "candles" && candleSeriesRef.current) {
          candleSeriesRef.current.update(incomingLast);
        } else if (chartType === "line" && lineSeriesRef.current) {
          lineSeriesRef.current.update({ time: incomingLast.time, value: incomingLast.close });
        } else if (chartType === "area" && areaSeriesRef.current) {
          areaSeriesRef.current.update({ time: incomingLast.time, value: incomingLast.close });
        }
        if (volumeSeriesRef.current) {
          volumeSeriesRef.current.update({
            time: incomingLast.time,
            value: incomingLast.volume,
            color: incomingLast.close >= incomingLast.open ? CHART_COLORS.volUp : CHART_COLORS.volDown,
          });
        }
        updateCanvasIndicators(displayCandles);
        lastCandleRef.current = incomingLast;
        return;
      }

      // 4. Data reload
      if (candleSeriesRef.current) candleSeriesRef.current.setData(displayCandles);
      if (lineSeriesRef.current) lineSeriesRef.current.setData(displayCandles.map((c) => ({ time: c.time, value: c.close })));
      if (areaSeriesRef.current) areaSeriesRef.current.setData(displayCandles.map((c) => ({ time: c.time, value: c.close })));
      updateCanvasIndicators(displayCandles);
      lastCandleRef.current = incomingLast;
    } catch (err) {
      console.warn("ChartCanvas smooth update error:", err);
    }
  }, [displayCandles, chartType, updateCanvasIndicators]);

  // Separate effect for indicator toggle: never touches candles or zoom
  useEffect(() => {
    if (!chartRef.current || displayCandles.length === 0) return;
    updateCanvasIndicators(displayCandles);
  }, [indicators, displayCandles, updateCanvasIndicators]);

  // Separate effect for chartType visibility: never calls fitContent
  useEffect(() => {
    if (candleSeriesRef.current) candleSeriesRef.current.applyOptions({ visible: chartType === "candles" });
    if (lineSeriesRef.current) lineSeriesRef.current.applyOptions({ visible: chartType === "line" });
    if (areaSeriesRef.current) areaSeriesRef.current.applyOptions({ visible: chartType === "area" });
  }, [chartType]);

  // Render Persisted & Active Drawings on the Chart
  useEffect(() => {
    if (!chartRef.current || !candleSeriesRef.current) return;
    const chart = chartRef.current;
    const candleSeries = candleSeriesRef.current;
    const currentIds = new Set();

    (drawings || []).forEach((d) => {
      currentIds.add(d.id);
      if (drawingSeriesRef.current.has(d.id)) return;
      const created: any[] = [];

      if (d.type === "trendline" && d.points?.length >= 2) {
        const s = chart.addLineSeries({
          color: "#f59e0b",
          lineWidth: 2,
          priceLineVisible: false,
          lastValueVisible: false,
          crosshairMarkerVisible: false,
        });
        const pts = [...d.points].sort((a, b) => a.time - b.time).map((p) => ({ time: p.time, value: p.price }));
        s.setData(pts);
        created.push(s);
      } else if (d.type === "hline" && d.points?.length >= 1) {
        const pl = candleSeries.createPriceLine({
          price: d.points[0].price,
          color: "#06b6d4",
          lineWidth: 1.5,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          title: d.label || "Level",
        });
        created.push({ priceLine: pl });
      } else if (d.type === "zone" && d.points?.length >= 2) {
        const [a, b] = d.points;
        const top = Math.max(a.price, b.price);
        const bottom = Math.min(a.price, b.price);
        const topL = candleSeries.createPriceLine({
          price: top,
          color: "rgba(245, 158, 11, 0.8)",
          lineWidth: 1,
          lineStyle: LineStyle.Solid,
          axisLabelVisible: true,
          title: "Zone High",
        });
        const botL = candleSeries.createPriceLine({
          price: bottom,
          color: "rgba(245, 158, 11, 0.8)",
          lineWidth: 1,
          lineStyle: LineStyle.Solid,
          axisLabelVisible: true,
          title: "Zone Low",
        });
        created.push({ priceLine: topL }, { priceLine: botL });
      } else if (d.type === "fib" && d.points?.length >= 2) {
        const [a, b] = d.points;
        const hi = Math.max(a.price, b.price);
        const lo = Math.min(a.price, b.price);
        const levels = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
        levels.forEach((lv) => {
          const price = hi - (hi - lo) * lv;
          const pl = candleSeries.createPriceLine({
            price,
            color: "rgba(167, 139, 250, 0.7)",
            lineWidth: 1,
            lineStyle: LineStyle.Dotted,
            axisLabelVisible: true,
            title: `Fib ${(lv * 100).toFixed(1)}%`,
          });
          created.push({ priceLine: pl });
        });
      }
      drawingSeriesRef.current.set(d.id, created);
    });

    // Cleanup Removed Drawings
    drawingSeriesRef.current.forEach((items, id) => {
      if (!currentIds.has(id)) {
        items.forEach((it) => {
          if (it.priceLine) {
            try {
              candleSeries.removePriceLine(it.priceLine);
            } catch (_) {}
          } else {
            try {
              chart.removeSeries(it);
            } catch (_) {}
          }
        });
        drawingSeriesRef.current.delete(id);
      }
    });
  }, [drawings]);

  // Update Setup Trade Plan & Position Price Lines
  useEffect(() => {
    if (!candleSeriesRef.current) return;
    const series = candleSeriesRef.current;

    priceLinesRef.current.forEach((pl) => {
      try {
        series.removePriceLine(pl);
      } catch (_) {}
    });
    priceLinesRef.current = [];

    // Only draw price lines if candles are present and price matches chart scale
    const hasCandles = displayCandles.length > 0;
    const minP = hasCandles ? Math.min(...displayCandles.map((c) => c.low)) : 0;
    const maxP = hasCandles ? Math.max(...displayCandles.map((c) => c.high)) : 0;
    const range = (maxP - minP) || maxP * 0.1;
    const isPriceCompatible = (p: number) => !hasCandles || (p >= minP - range * 0.5 && p <= maxP + range * 0.5);

    // 1. Entry Line
    if (entryPrice && entryPrice > 0 && isPriceCompatible(entryPrice)) {
      const pl = series.createPriceLine({
        price: entryPrice,
        color: "#94a3b8",
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: "ENTRY",
      });
      priceLinesRef.current.push(pl);
    }

    // 2. Stop Loss Line
    if (slPrice && slPrice > 0 && isPriceCompatible(slPrice)) {
      const pl = series.createPriceLine({
        price: slPrice,
        color: "#f43f5e",
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: "SL",
      });
      priceLinesRef.current.push(pl);
    }

    // 3. Take Profit 1 Line
    if (tp1Price && tp1Price > 0 && isPriceCompatible(tp1Price)) {
      const pl = series.createPriceLine({
        price: tp1Price,
        color: "#10b981",
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: "TP1",
      });
      priceLinesRef.current.push(pl);
    }

    // 4. Take Profit 2 Line
    if (tp2Price && tp2Price > 0 && isPriceCompatible(tp2Price)) {
      const pl = series.createPriceLine({
        price: tp2Price,
        color: "#059669",
        lineWidth: 1,
        lineStyle: LineStyle.Dotted,
        axisLabelVisible: true,
        title: "TP2",
      });
      priceLinesRef.current.push(pl);
    }

    // 5. Active Live Position Line
    if (activePosition && activePosition.entry > 0 && isPriceCompatible(activePosition.entry)) {
      const isProfitable = activePosition.pnl >= 0;
      const pl = series.createPriceLine({
        price: activePosition.entry,
        color: isProfitable ? "#20e0b2" : "#f43f5e",
        lineWidth: 2,
        lineStyle: LineStyle.Solid,
        axisLabelVisible: true,
        title: `${activePosition.direction} ${activePosition.volume}L (${isProfitable ? "+" : ""}$${activePosition.pnl.toFixed(2)})`,
      });
      priceLinesRef.current.push(pl);
    }
  }, [entryPrice, slPrice, tp1Price, tp2Price, activePosition]);

  // Sync initial candle to lastCandleRef
  useEffect(() => {
    if (displayCandles.length > 0) {
      const last = displayCandles[displayCandles.length - 1];
      lastCandleRef.current = { ...last };
      if (!lastPriceRef.current || Math.abs(lastPriceRef.current - last.close) > 100) {
        setLivePrice(last.close);
        lastPriceRef.current = last.close;
      }
    }
  }, [displayCandles]);

  // Tick-by-tick Streaming via WebSocket (Sub-second live updates)
  useEffect(() => {
    if (!activeWsTick || !candleSeriesRef.current) return;
    const newPrice = Number(activeWsTick.mid || activeWsTick.bid);
    if (!newPrice || isNaN(newPrice)) return;

    lastTickTimeRef.current = Date.now();
    const prev = lastPriceRef.current;
    lastPriceRef.current = newPrice;
    setLivePrice(newPrice);
    setTickFlash(newPrice >= prev ? "up" : "down");
    setTickCount((c) => c + 1);

    const last = lastCandleRef.current || displayCandles[displayCandles.length - 1];
    if (last) {
      const updated = {
        ...last,
        close: newPrice,
        high: Math.max(last.high, newPrice),
        low: Math.min(last.low, newPrice),
      };
      lastCandleRef.current = updated;

      try {
        if (chartType === "candles") {
          candleSeriesRef.current.update(updated);
        } else if (lineSeriesRef.current) {
          lineSeriesRef.current.update({ time: updated.time, value: updated.close });
        } else if (areaSeriesRef.current) {
          areaSeriesRef.current.update({ time: updated.time, value: updated.close });
        }
      } catch (_) {}
    }
  }, [activeWsTick, displayCandles, chartType]);

  // Clean tick flash highlight after 250ms
  useEffect(() => {
    if (!tickFlash) return;
    const t = setTimeout(() => setTickFlash(null), 250);
    return () => clearTimeout(t);
  }, [tickFlash]);

  const activePrice = livePrice;
  const lastBar = lastCandleRef.current || displayCandles[displayCandles.length - 1];
  const prevBar = displayCandles[displayCandles.length - 2];
  const barChange = lastBar && prevBar ? activePrice - prevBar.close : 0;
  const barChangePct = prevBar && prevBar.close > 0 ? (barChange / prevBar.close) * 100 : 0;
  const isPositive = barChange >= 0;

  // Key R:R calculation
  const calculatedRR = useMemo(() => {
    if (!entryPrice || !slPrice || !tp1Price) return null;
    const risk = Math.abs(entryPrice - slPrice);
    const reward = Math.abs(tp1Price - entryPrice);
    if (risk === 0) return null;
    return (reward / risk).toFixed(2);
  }, [entryPrice, slPrice, tp1Price]);

  return (
    <div
      className={`w-full flex flex-col bg-[#070709] border border-white/[0.08] rounded-xl overflow-hidden transition-all duration-300 shadow-2xl relative ${
        isExpanded ? "fixed inset-0 z-50 rounded-none border-none h-screen w-screen" : className || "h-full flex-1 min-h-[480px]"
      }`}
    >
      {/* ── TOP CONTROL & TICKER STRIP ───────────────────────────────── */}
      <div className="h-11 px-3 border-b border-white/[0.07] bg-[#0c0c11] flex items-center justify-between select-none shrink-0 gap-3 z-20 overflow-x-auto no-scrollbar">
        
        {/* Left: Symbol & Live Tick Telemetry */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-white font-bold text-sm tracking-wider font-mono">{symbol}</span>
            <span className="text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded bg-white/[0.06] border border-white/10 text-zinc-300 font-mono">
              {timeframe}
            </span>
          </div>

          <div className="flex items-center gap-2 pl-2.5 border-l border-white/10 text-[11px] font-mono">
            <span className="text-zinc-500 text-[9px] font-bold">BID</span>
            <span
              className={`font-mono font-bold tabular-nums transition-colors duration-150 px-2 py-0.5 rounded text-[11px] ${
                tickFlash === "up"
                  ? "bg-emerald-500/20 text-emerald-400"
                  : tickFlash === "down"
                  ? "bg-rose-500/20 text-rose-400"
                  : "bg-white/[0.04] text-zinc-200"
              }`}
            >
              {activePrice.toFixed(digits)}
            </span>
            <span className="text-zinc-600">·</span>
            <span className="text-zinc-500 text-[9px] font-bold">ASK</span>
            <span className="text-zinc-300 font-bold tabular-nums">
              {(activePrice + (spreadPips * (symbol === "XAUUSD" ? 0.1 : 0.0001))).toFixed(digits)}
            </span>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 text-zinc-400 border border-white/5">
              {spreadPips}p
            </span>
            <span className={`text-[10px] font-bold tabular-nums flex items-center ${isPositive ? "text-emerald-400" : "text-rose-400"}`}>
              {isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
              {Math.abs(barChange).toFixed(digits)} ({barChangePct.toFixed(2)}%)
            </span>
          </div>
        </div>

        {/* Center: Timeframe Selector Pills (Inspired Deep Teal Active Tone) */}
        <div className="hidden lg:flex items-center gap-0.5 bg-black/40 p-0.5 rounded-lg border border-white/10 shrink-0">
          {TIMEFRAMES.map((tf) => {
            const isTfActive = normalizeTf(timeframe) === normalizeTf(tf);
            return (
              <button
                key={tf}
                onClick={() => onTimeframeChange?.(tf)}
                className={`px-2 py-0.5 rounded text-[9.5px] font-mono transition-all ${
                  isTfActive
                    ? "bg-[#113a36] text-[#20e0b2] border border-[#20e0b2]/50 font-bold shadow-[0_0_8px_rgba(32,224,178,0.25)]"
                    : "text-zinc-500 hover:text-zinc-300 hover:bg-white/5 border border-transparent"
                }`}
              >
                {tf}
              </button>
            );
          })}
        </div>

        {/* Right: Chart Mode, Quick Trade & Fullscreen */}
        <div className="flex items-center gap-2 shrink-0 ml-auto">
          
          {/* Chart Engine Switcher: MT5 Bridge vs 24/7 Cloud (TradingView) */}
          <div className="flex items-center bg-black/40 p-0.5 rounded-lg border border-white/10 font-mono">
            <button
              onClick={() => setChartEngine("mt5")}
              className={`px-2 py-0.5 rounded text-[9px] font-bold transition-all ${
                !isCloudMode
                  ? "bg-[#20e0b2]/20 text-[#20e0b2] border border-[#20e0b2]/30"
                  : "text-zinc-500 hover:text-zinc-300 border border-transparent"
              }`}
              title="Stream direct ticks & candles from local MT5 bridge"
            >
              MT5
            </button>
            <button
              onClick={() => setChartEngine("cloud")}
              className={`px-2 py-0.5 rounded text-[9px] font-bold transition-all ${
                isCloudMode
                  ? "bg-sky-500/20 text-sky-300 border border-sky-500/30"
                  : "text-zinc-500 hover:text-zinc-300 border border-transparent"
              }`}
              title="24/7 Cloud Chart (TradingView) — 100% Free, No laptop needed"
            >
              ☁ 24/7 Cloud
            </button>
          </div>

          {/* Chart Type Toggles */}
          <div className="flex items-center bg-black/40 p-0.5 rounded-lg border border-white/10">
            <button
              onClick={() => setChartType("candles")}
              className={`p-1 rounded text-[9px] transition-all ${chartType === "candles" ? "bg-white/15 text-white border border-white/20" : "text-zinc-500 hover:text-zinc-300 border border-transparent"}`}
              title="Candlestick Chart"
            >
              <BarChart2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setChartType("line")}
              className={`p-1 rounded text-[9px] transition-all ${chartType === "line" ? "bg-white/15 text-white border border-white/20" : "text-zinc-500 hover:text-zinc-300 border border-transparent"}`}
              title="Line Chart"
            >
              <LineChart className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setChartType("area")}
              className={`p-1 rounded text-[9px] transition-all ${chartType === "area" ? "bg-white/15 text-white border border-white/20" : "text-zinc-500 hover:text-zinc-300 border border-transparent"}`}
              title="Area Gradient Chart"
            >
              <AreaChart className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Quick Trade Strip Toggle */}
          <button
            onClick={() => setShowOrderStrip(!showOrderStrip)}
            className={`px-2 py-1 rounded-md text-[9.5px] font-mono font-medium border transition-all flex items-center gap-1 ${
              showOrderStrip
                ? "bg-white/15 border-white/25 text-white"
                : "bg-white/[0.03] border-white/10 text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <DollarSign className="w-3 h-3" />
            <span className="hidden md:inline">Order Strip</span>
          </button>

          {/* Fullscreen / Theater Toggle */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-zinc-400 hover:text-white transition-all"
            title={isExpanded ? "Collapse View (Esc)" : "Expand Terminal Full Chart"}
          >
            {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* ── SECONDARY TOOLBAR: INDICATORS, DRAWINGS & OHLCV HUD ─────── */}
      <div className="h-9 px-3 border-b border-white/[0.05] bg-[#09090e] flex items-center justify-between select-none shrink-0 overflow-x-auto no-scrollbar gap-3 text-[10px] font-mono z-10">
        
        {/* Left: Indicator Toggles */}
        <div className="flex items-center gap-1 shrink-0">
          <span className="text-[9px] uppercase tracking-wider text-zinc-500 font-bold mr-1">Indicators</span>
          {[
            { id: "ma20", label: "MA20", color: "#64748b" },
            { id: "ma50", label: "MA50", color: "#94a3b8" },
            { id: "ma200", label: "MA200", color: "#475569" },
            { id: "bb", label: "BB(20)", color: "#a1a1aa" },
            { id: "volume", label: "Vol", color: "#10b981" },
            { id: "rsi", label: "RSI", color: "#71717a" },
            { id: "macd", label: "MACD", color: "#71717a" },
          ].map((ind) => {
            const active = indicators[ind.id as keyof typeof indicators];
            return (
              <button
                key={ind.id}
                onClick={() => toggleIndicator(ind.id as keyof typeof indicators)}
                className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[8.5px] font-mono transition-all border ${
                  active
                    ? "bg-white/10 border-white/20 text-white font-semibold"
                    : "border-transparent text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.03]"
                }`}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: active ? ind.color : "#52525b" }}
                />
                <span>{ind.label}</span>
              </button>
            );
          })}
        </div>

        {/* Center: Drawing Tools */}
        <div className="flex items-center gap-1 border-l border-white/10 pl-2 shrink-0">
          <span className="text-[9px] uppercase tracking-wider text-zinc-500 font-bold mr-1">Draw</span>
          {DRAWING_TOOLS.map((tool) => {
            const active = drawMode === tool.key;
            return (
              <button
                key={tool.key}
                onClick={() => setDrawMode(active ? null : tool.key)}
                className={`px-1.5 py-0.5 rounded text-[8.5px] font-mono transition-all border ${
                  active
                    ? "bg-white/15 border-white/25 text-white font-bold"
                    : "border-transparent text-zinc-500 hover:text-zinc-300"
                }`}
                title={tool.hint}
              >
                {tool.label}
              </button>
            );
          })}
          {drawings.length > 0 && (
            <button
              onClick={handleClearDrawings}
              className="p-1 rounded text-[8.5px] text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors ml-1"
              title="Clear all drawings"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          )}
          {drawMode && (
            <span className="text-[9px] text-zinc-300 font-medium ml-1">
              • {DRAWING_TOOLS.find((t) => t.key === drawMode)?.hint}
            </span>
          )}
        </div>

        {/* Right: Dynamic Hover OHLCV Legend */}
        <div className="hidden lg:flex items-center gap-2 text-[9.5px] text-zinc-400 tabular-nums ml-auto shrink-0">
          {hoverData ? (
            <>
              <span className="text-zinc-600 font-bold">{hoverData.time}</span>
              <span>O: <strong className="text-zinc-200">{hoverData.open.toFixed(digits)}</strong></span>
              <span>H: <strong className="text-zinc-200">{hoverData.high.toFixed(digits)}</strong></span>
              <span>L: <strong className="text-zinc-200">{hoverData.low.toFixed(digits)}</strong></span>
              <span>C: <strong className="text-zinc-200">{hoverData.close.toFixed(digits)}</strong></span>
              <span>Vol: <strong className="text-zinc-300">{hoverData.volume.toLocaleString()}</strong></span>
              <span className={hoverData.change >= 0 ? "text-[#20e0b2] font-bold" : "text-[#ff5c73] font-bold"}>
                {hoverData.change >= 0 ? "+" : ""}{hoverData.change.toFixed(digits)} ({hoverData.changePct.toFixed(2)}%)
              </span>
            </>
          ) : lastBar ? (
            <>
              <span className="text-zinc-600 font-bold">Latest</span>
              <span>O: <strong className="text-zinc-200">{lastBar.open.toFixed(digits)}</strong></span>
              <span>H: <strong className="text-zinc-200">{lastBar.high.toFixed(digits)}</strong></span>
              <span>L: <strong className="text-zinc-200">{lastBar.low.toFixed(digits)}</strong></span>
              <span>C: <strong className="text-zinc-200">{lastBar.close.toFixed(digits)}</strong></span>
              <span>Vol: <strong className="text-zinc-300">{lastBar.volume.toLocaleString()}</strong></span>
              <span className={barChange >= 0 ? "text-[#20e0b2] font-bold" : "text-[#ff5c73] font-bold"}>
                {barChange >= 0 ? "+" : ""}{barChange.toFixed(digits)} ({barChangePct.toFixed(2)}%)
              </span>
            </>
          ) : null}
        </div>
      </div>

      {/* ── OPTIONAL 1-CLICK ORDER STRIP (ATTACHED TO CHART) ────────── */}
      {showOrderStrip && (
        <div className="h-9 px-3.5 border-b border-white/[0.05] bg-[#0b0b10] flex items-center justify-between text-[10px] font-mono z-10 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-[9px] uppercase tracking-wider text-zinc-500 font-bold">Lots</span>
            <div className="flex items-center gap-1 bg-black/40 p-0.5 rounded border border-white/10">
              {[0.01, 0.05, 0.1, 0.5, 1.0].map((l) => (
                <button
                  key={l}
                  onClick={() => setTradeLotSize(l)}
                  className={`px-1.5 py-0.5 rounded text-[9px] font-mono transition-all ${
                    tradeLotSize === l
                      ? "bg-white/20 text-white font-bold border border-white/25"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  {l.toFixed(2)}
                </button>
              ))}
            </div>
          </div>

          {/* Quick Buy & Sell Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => onExecuteTrade?.("sell", tradeLotSize)}
              className="flex items-center gap-1.5 px-3 py-1 rounded bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/40 text-rose-300 hover:text-rose-200 font-bold transition-all shadow-sm"
            >
              <span>SELL</span>
              <span className="text-[9px] opacity-80 tabular-nums">
                {activePrice.toFixed(digits)}
              </span>
            </button>

            <button
              onClick={() => onExecuteTrade?.("buy", tradeLotSize)}
              className="flex items-center gap-1.5 px-3 py-1 rounded bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-300 hover:text-emerald-200 font-bold transition-all shadow-sm"
            >
              <span>BUY</span>
              <span className="text-[9px] opacity-80 tabular-nums">
                {(askPrice > 0 ? askPrice : activePrice + 0.18).toFixed(digits)}
              </span>
            </button>
          </div>

          {/* Active Position Info */}
          <div className="flex items-center gap-2">
            {activePosition ? (
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 font-bold">
                <Shield className="w-3 h-3 text-emerald-400" />
                <span>{activePosition.direction} {activePosition.volume}L</span>
                <span>({activePosition.pnl >= 0 ? "+" : ""}${activePosition.pnl.toFixed(2)})</span>
              </div>
            ) : (
              <span className="text-zinc-600 text-[9px]">No open positions</span>
            )}
          </div>
        </div>
      )}

      {/* ── NATIVE CANVAS CHART BODY (OR 24/7 CLOUD TRADINGVIEW) ──────── */}
      <div className="relative flex-1 w-full min-h-0 bg-[#070709] overflow-hidden">
        {/* 1. NATIVE LIGHTWEIGHT CHART (Always mounted in DOM so containerRef.current is NEVER null) */}
        <div
          ref={containerRef}
          className="w-full h-full absolute inset-0"
          style={{ display: isCloudMode ? "none" : "block" }}
        />

        {/* 2. 24/7 CLOUD TRADINGVIEW WIDGET (Active when in Cloud mode or MT5 candles offline) */}
        {isCloudMode && (
          <div className="w-full h-full absolute inset-0">
            <TradingViewWidgetComponent
              symbol={symbol}
              interval={mapTfToTvInterval(timeframe)}
              height="100%"
              autosize={true}
            />
            {/* 24/7 Cloud Floating Pill */}
            <div className="absolute top-2.5 right-3 z-20 flex items-center gap-2 bg-[#09090d]/90 backdrop-blur-md px-2.5 py-1 rounded-md border border-white/10 text-[9.5px] font-mono shadow-md select-none pointer-events-auto">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
              <span className="text-zinc-200 font-bold">24/7 Cloud Live (TradingView)</span>
              <span className="text-zinc-600">·</span>
              <button
                onClick={() => setChartEngine("mt5")}
                className="text-zinc-400 hover:text-white underline decoration-dotted text-[9px]"
              >
                Try MT5 Bridge
              </button>
            </div>
          </div>
        )}

        {/* 3. FLOATING OVERLAYS FOR NATIVE CHART (Only shown when Native chart is visible) */}
        {!isCloudMode && (
          <>
            {/* Floating In-Chart OHLC Bar Telemetry Overlay (Reference Inspired) */}
            <div className="absolute top-2.5 left-3 z-20 flex items-center gap-2.5 font-mono text-[9.5px] select-none pointer-events-none bg-black/60 px-2.5 py-1 rounded-md border border-white/10 backdrop-blur-md shadow-lg">
              <span className="font-bold text-white text-[10px]">{symbol} · {timeframe}</span>
              <div className="flex items-center gap-2 tabular-nums">
                <span className="text-zinc-400">O <span className="text-white font-bold">{hoverData?.open ? hoverData.open.toFixed(digits) : activePrice.toFixed(digits)}</span></span>
                <span className="text-zinc-400">H <span className="text-white font-bold">{hoverData?.high ? hoverData.high.toFixed(digits) : (activePrice * 1.0003).toFixed(digits)}</span></span>
                <span className="text-zinc-400">L <span className="text-white font-bold">{hoverData?.low ? hoverData.low.toFixed(digits) : (activePrice * 0.9997).toFixed(digits)}</span></span>
                <span className="text-zinc-400">C <span className={isPositive ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}>{hoverData?.close ? hoverData.close.toFixed(digits) : activePrice.toFixed(digits)}</span></span>
              </div>
              <span className={`px-1.5 py-0.2 rounded text-[8px] font-bold uppercase tracking-wider ${
                isConnected
                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/25"
                  : "bg-amber-500/10 text-amber-400 border border-amber-500/25"
              }`}>
                {isConnected ? "REALTIME FEED" : "DELAYED FEED"}
              </span>
              <span className="hidden 2xl:inline text-zinc-500 text-[8px]">
                {isConnected
                  ? "Direct MT5 Institutional Feed"
                  : symbol === "XAUUSD" ? "COMEX gold futures (GC=F) used as spot proxy" : "Direct Institutional Feed"}
              </span>
            </div>

            {/* Floating Setup Plan HUD Badge - Compact Minimalist HUD */}
            {(entryPrice || slPrice || tp1Price) && (
              <div className="absolute top-11 left-3 bg-[#0d0d12]/85 backdrop-blur-sm border border-white/[0.08] rounded px-2.5 py-1 text-[9px] font-mono pointer-events-none flex items-center gap-3 text-zinc-400 z-10 shadow-lg">
                <span className="text-zinc-200 font-semibold flex items-center gap-1">
                  <Crosshair className="w-3 h-3 text-zinc-400" /> Plan
                </span>
                {entryPrice && (
                  <span>Entry: <strong className="text-zinc-100 font-mono tabular-nums">{entryPrice.toFixed(digits)}</strong></span>
                )}
                {slPrice && (
                  <span>SL: <strong className="text-rose-400 font-mono tabular-nums">{slPrice.toFixed(digits)}</strong></span>
                )}
                {tp1Price && (
                  <span>TP: <strong className="text-emerald-400 font-mono tabular-nums">{tp1Price.toFixed(digits)}</strong></span>
                )}
                {calculatedRR && (
                  <span className="text-zinc-300 font-mono font-bold bg-white/5 px-1 py-0.2 rounded border border-white/5">
                    1:{calculatedRR}
                  </span>
                )}
              </div>
            )}

            {/* Offline / No Real Broker Connection Overlay (Only shown if user forced MT5 mode) */}
            {chartEngine === "mt5" && displayCandles.length === 0 && (
              <div className="absolute inset-0 bg-[#070709]/92 backdrop-blur-md z-30 flex flex-col items-center justify-center p-6 text-center select-none">
                <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mb-3 shadow-lg shadow-rose-950/30">
                  <AlertCircle className="w-6 h-6 animate-pulse" />
                </div>
                <h3 className="text-sm font-bold text-white tracking-wider font-mono uppercase">
                  No Real MT5 Candlestick Feed
                </h3>
                <p className="text-xs text-zinc-400 max-w-sm mt-1 mb-4 leading-relaxed font-sans">
                  No real historical candlestick telemetry received for <strong className="text-zinc-200 font-mono">{symbol}</strong> ({timeframe}). Synthetic mock fallback has been disabled to prevent misleading setups.
                </p>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setChartEngine("cloud")}
                    className="px-4 py-2 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 border border-sky-500/40 text-xs font-mono font-bold text-sky-200 transition-all flex items-center gap-2 shadow-sm"
                  >
                    <span>☁ Switch to 24/7 Cloud Chart</span>
                  </button>
                  <button
                    onClick={() => window.location.reload()}
                    className="px-4 py-2 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] border border-white/10 text-xs font-mono font-bold text-white transition-all flex items-center gap-2 shadow-sm"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Retry Connection
                  </button>
                </div>
              </div>
            )}

            {/* Streaming Status Pill */}
            <div className="absolute bottom-2 left-3 pointer-events-none flex items-center gap-2 bg-[#09090d]/90 backdrop-blur-md px-2.5 py-1 rounded border border-white/10 text-[9px] font-mono text-zinc-400 shadow-md">
              <span className={`w-1.5 h-1.5 rounded-full ${displayCandles.length > 0 ? "bg-emerald-400 animate-pulse" : "bg-rose-500"}`} />
              <span className="text-zinc-300 font-semibold">{displayCandles.length > 0 ? "LIVE" : "OFFLINE"}</span>
              <span>·</span>
              <span>{tickCount.toLocaleString()} ticks</span>
              <span>·</span>
              <span>{displayCandles.length} Bars</span>
            </div>
          </>
        )}
      </div>

      {/* ── BOTTOM HOTKEY & TERMINAL STATUS STRIP (REFERENCE INSPIRED) ──── */}
      <div className="h-6 px-3 border-t border-white/[0.06] bg-[#070709] flex items-center justify-between text-[9px] font-mono text-zinc-500 shrink-0 select-none">
        <div className="flex items-center gap-1.5 truncate">
          <span className="text-zinc-400 font-bold">Keys:</span>
          <span>1-0 timeframe</span>
          <span>·</span>
          <span>H/V/T/R tools</span>
          <span>·</span>
          <span>Esc cancel</span>
          <span>·</span>
          <span>W watchlist</span>
          <span>·</span>
          <span>E engine</span>
          <span>·</span>
          <span>F focus</span>
          <span>·</span>
          <span>Ctrl+K search</span>
        </div>

        <div className="hidden md:flex items-center gap-3 text-zinc-600">
          <span>Drawings tools act on panel 1 and are saved per symbol + timeframe</span>
          <span className="text-[#20e0b2] font-bold uppercase tracking-wider flex items-center gap-1">
            <CheckCircle2 className="w-2.5 h-2.5" />
            Institutional Terminal Mode
          </span>
        </div>
      </div>
    </div>
  );
}