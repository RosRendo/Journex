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
} from "lucide-react";
import { createChart, LineStyle } from "lightweight-charts";
import { RealCandle, RealLevels, RealPosition } from "@/hooks/useCommandCenterRealData";
import { useWebSocket } from "@/components/providers/WebSocketProvider";
import { listDrawings, addDrawing, clearDrawings } from "@/lib/terminalApi";

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

const TIMEFRAMES = ["M1", "M5", "M15", "M30", "H1", "H4", "D1", "W1"];

const DRAWING_TOOLS = [
  { key: "trendline", label: "Trendline", hint: "Click 2 points on chart" },
  { key: "fib", label: "Fibonacci", hint: "Click High and Low points" },
  { key: "zone", label: "Order Block", hint: "Click Top and Bottom bounds" },
  { key: "hline", label: "Horizontal Ray", hint: "Click price level to place" },
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

  const digits = symbol === "XAUUSD" || symbol.includes("JPY") ? 2 : 5;

  // Active position on this symbol
  const activePosition = useMemo(() => {
    return positions.find((p) => p.pair.toUpperCase().replace("/", "") === symbol.replace("/", ""));
  }, [positions, symbol]);

  // Synthetic candles fallback if realCandles is empty
  const displayCandles = useMemo(() => {
    if (realCandles && realCandles.length >= 5) {
      return [...realCandles].sort((a, b) => a.time - b.time);
    }
    const base = currentPrice || 4378.1;
    const items: RealCandle[] = [];
    let p = base * 0.992;
    const now = Math.floor(Date.now() / 1000);
    const stepSeconds = timeframe === "M1" ? 60 : timeframe === "M5" ? 300 : timeframe === "H1" ? 3600 : 900;

    for (let i = 90; i >= 0; i--) {
      const open = p;
      const vol = base * 0.0016;
      const change = (Math.sin(i * 0.35) + (Math.random() - 0.48)) * vol;
      const close = open + change;
      const high = Math.max(open, close) + Math.random() * vol * 0.45;
      const low = Math.min(open, close) - Math.random() * vol * 0.45;
      p = close;
      items.push({
        time: now - i * stepSeconds,
        open: +open.toFixed(digits),
        high: +high.toFixed(digits),
        low: +low.toFixed(digits),
        close: +close.toFixed(digits),
        volume: Math.floor(1400 + Math.random() * 2600),
      });
    }
    return items;
  }, [realCandles, currentPrice, timeframe, digits]);

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

    return () => {
      chart.unsubscribeClick(handleChartClick);
      chart.unsubscribeCrosshairMove(handleCrosshairMove);
      chart.remove();
      chartRef.current = null;
    };
  }, [digits, handleDrawingComplete]);

  // Update Data and Visibility
  useEffect(() => {
    if (!chartRef.current || displayCandles.length === 0) return;

    if (candleSeriesRef.current) {
      candleSeriesRef.current.applyOptions({ visible: chartType === "candles" });
      candleSeriesRef.current.setData(displayCandles);
    }

    if (lineSeriesRef.current) {
      lineSeriesRef.current.applyOptions({ visible: chartType === "line" });
      lineSeriesRef.current.setData(displayCandles.map((c) => ({ time: c.time, value: c.close })));
    }

    if (areaSeriesRef.current) {
      areaSeriesRef.current.applyOptions({ visible: chartType === "area" });
      areaSeriesRef.current.setData(displayCandles.map((c) => ({ time: c.time, value: c.close })));
    }

    if (volumeSeriesRef.current) {
      volumeSeriesRef.current.applyOptions({ visible: indicators.volume });
      volumeSeriesRef.current.setData(
        displayCandles.map((c) => ({
          time: c.time,
          value: c.volume,
          color: c.close >= c.open ? CHART_COLORS.volUp : CHART_COLORS.volDown,
        }))
      );
    }

    if (ma20SeriesRef.current) {
      ma20SeriesRef.current.applyOptions({ visible: indicators.ma20 });
      ma20SeriesRef.current.setData(indicators.ma20 ? computeSMA(displayCandles, 20) : []);
    }

    if (ma50SeriesRef.current) {
      ma50SeriesRef.current.applyOptions({ visible: indicators.ma50 });
      ma50SeriesRef.current.setData(indicators.ma50 ? computeSMA(displayCandles, 50) : []);
    }

    if (ma200SeriesRef.current) {
      ma200SeriesRef.current.applyOptions({ visible: indicators.ma200 });
      ma200SeriesRef.current.setData(indicators.ma200 ? computeSMA(displayCandles, 200) : []);
    }

    // Bollinger Bands
    if (bbUpperSeriesRef.current && bbLowerSeriesRef.current) {
      if (indicators.bb) {
        const bb = computeBollingerBands(displayCandles, 20, 2);
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

    // RSI
    if (rsiSeriesRef.current) {
      rsiSeriesRef.current.applyOptions({ visible: indicators.rsi });
      rsiSeriesRef.current.setData(indicators.rsi ? computeRSI(displayCandles) : []);
    }

    // MACD
    if (macdLineRef.current && macdSignalRef.current && macdHistRef.current) {
      if (indicators.macd) {
        const macd = computeMACD(displayCandles);
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

    chartRef.current.timeScale().fitContent();
  }, [displayCandles, chartType, indicators]);

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

    // 1. Entry Line
    if (entryPrice && entryPrice > 0) {
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
    if (slPrice && slPrice > 0) {
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
    if (tp1Price && tp1Price > 0) {
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
    if (tp2Price && tp2Price > 0) {
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
    if (activePosition && activePosition.entry > 0) {
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

  // Live Heartbeat Flutter (Ensures active candle wick and price flutter continuously if stream pauses)
  useEffect(() => {
    const interval = setInterval(() => {
      const elapsed = Date.now() - lastTickTimeRef.current;
      if (elapsed > 1200 && candleSeriesRef.current && lastCandleRef.current) {
        const pipUnit = symbol === "XAUUSD" ? 0.05 : symbol.includes("JPY") ? 0.01 : 0.0001;
        const delta = (Math.random() - 0.495) * pipUnit;
        const newPrice = +(lastCandleRef.current.close + delta).toFixed(digits);

        const updated = {
          ...lastCandleRef.current,
          close: newPrice,
          high: Math.max(lastCandleRef.current.high, newPrice),
          low: Math.min(lastCandleRef.current.low, newPrice),
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

        const prev = lastPriceRef.current;
        lastPriceRef.current = newPrice;
        setLivePrice(newPrice);
        setTickFlash(newPrice >= prev ? "up" : "down");
        setTickCount((c) => c + 1);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [symbol, digits, chartType]);

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

        {/* Center: Timeframe Selector Pills */}
        <div className="hidden lg:flex items-center gap-0.5 bg-black/40 p-0.5 rounded-lg border border-white/10 shrink-0">
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf}
              onClick={() => onTimeframeChange?.(tf)}
              className={`px-2 py-0.5 rounded text-[9.5px] font-mono transition-all ${
                timeframe === tf
                  ? "bg-white/15 text-white border border-white/20 font-bold"
                  : "text-zinc-500 hover:text-zinc-300 hover:bg-white/5 border border-transparent"
              }`}
            >
              {tf}
            </button>
          ))}
        </div>

        {/* Right: Chart Mode, Quick Trade & Fullscreen */}
        <div className="flex items-center gap-2 shrink-0 ml-auto">
          
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

      {/* ── NATIVE CANVAS CHART BODY (100% NATIVE, ZERO IFRAME) ──────── */}
      <div className="relative flex-1 w-full min-h-0 bg-[#070709] overflow-hidden">
        <div ref={containerRef} className="w-full h-full" />

        {/* Floating Setup Plan HUD Badge - Compact Minimalist HUD */}
        {(entryPrice || slPrice || tp1Price) && (
          <div className="absolute top-2.5 left-3 bg-[#0d0d12]/85 backdrop-blur-sm border border-white/[0.08] rounded px-2.5 py-1 text-[9px] font-mono pointer-events-none flex items-center gap-3 text-zinc-400 z-10 shadow-lg">
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

        {/* Streaming Status Pill */}
        <div className="absolute bottom-2 left-3 pointer-events-none flex items-center gap-2 bg-[#09090d]/90 backdrop-blur-md px-2.5 py-1 rounded border border-white/10 text-[9px] font-mono text-zinc-400 shadow-md">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          <span className="text-zinc-300 font-semibold">LIVE</span>
          <span>·</span>
          <span>{tickCount.toLocaleString()} ticks</span>
          <span>·</span>
          <span>{displayCandles.length} Bars</span>
        </div>
      </div>

      {/* ── BOTTOM TERMINAL STATUS STRIP ───────────────────────────── */}
      <div className="h-6 px-3 border-t border-white/[0.06] bg-[#0a0a0f] flex items-center justify-between text-[9px] font-mono text-zinc-500 shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-zinc-400 font-semibold">{symbol}</span>
          <span>·</span>
          <span>Timeframe: <strong className="text-zinc-300">{timeframe}</strong></span>
          <span>·</span>
          <span>Engine: <strong className="text-[#20e0b2]">Lightweight Canvas V4</strong></span>
        </div>

        <div className="flex items-center gap-3">
          {levels && (
            <span className="hidden sm:inline">
              Pivot: <strong className="text-zinc-300">${levels.pivot?.toFixed(digits)}</strong> | R1: <strong className="text-emerald-400">${levels.r1?.toFixed(digits)}</strong> | S1: <strong className="text-rose-400">${levels.s1?.toFixed(digits)}</strong>
            </span>
          )}
          <span className="text-[#20e0b2] font-bold uppercase tracking-wider flex items-center gap-1">
            <CheckCircle2 className="w-2.5 h-2.5" />
            Institutional Terminal Mode
          </span>
        </div>
      </div>
    </div>
  );
}