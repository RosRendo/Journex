"use client";

import { useEffect, useRef } from "react";
import { createChart } from "lightweight-charts";
import { useWebSocket } from "../providers/WebSocketProvider";
import { sanitizeChartData } from "@/lib/chartSanitizer";

const COLORS = {
  bg: "#000000",
  text: "#a1a1aa",
  grid: "#18181b",
  border: "#27272a",
  up: "#10b981",
  down: "#ef4444",
  ma20: "#06b6d4",
  ma50: "#f59e0b",
  ma200: "#a78bfa",
  vol: "rgba(82, 82, 91, 0.5)",
};

function sma(data: any[], period: number) {
  const out: any[] = [];
  let sum = 0;
  for (let i = 0; i < data.length; i++) {
    sum += data[i].close;
    if (i >= period) sum -= data[i - period].close;
    if (i >= period - 1) {
      out.push({ time: data[i].time, value: +(sum / period).toFixed(6) });
    }
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
  const fEma = computeEMA(data, fast);
  const sEma = computeEMA(data, slow);
  const macdLine: Array<{ time: any; value: number }> = [];
  for (let i = 0; i < data.length; i++) {
    macdLine.push({ time: data[i].time, value: fEma[i].value - sEma[i].value });
  }
  const sigEma = computeEMA(macdLine, signal, "value");
  const hist: Array<{ time: any; value: number; color: string }> = [];
  for (let i = 0; i < data.length; i++) {
    const val = macdLine[i].value - sigEma[i].value;
    hist.push({
      time: data[i].time,
      value: val,
      color: val >= 0 ? "rgba(16,185,129,0.5)" : "rgba(239,68,68,0.5)",
    });
  }
  return { macd: macdLine, signal: sigEma, hist };
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
    out.push({ time: data[i].time, value: 100 - 100 / (1 + avgGain / (avgLoss || 1e-10)) });
  }
  return out;
}

function updateIndicatorsData(s: any, cleanCandles: any[], indicators: any) {
  if (!s || cleanCandles.length === 0) return;
  if (s.ma20) s.ma20.setData(indicators?.ma20 ? sma(cleanCandles, 20) : []);
  if (s.ma50) s.ma50.setData(indicators?.ma50 ? sma(cleanCandles, 50) : []);
  if (s.ma200) s.ma200.setData(indicators?.ma200 ? sma(cleanCandles, 200) : []);

  if (s.rsi) {
    if (indicators?.rsi) {
      s.rsi.setData(computeRSI(cleanCandles));
    } else {
      s.rsi.setData([]);
    }
  }

  if (s.macd && s.macdSignal && s.macdHist) {
    if (indicators?.macd) {
      const { macd, signal, hist } = computeMACD(cleanCandles);
      s.macd.setData(macd);
      s.macdSignal.setData(signal);
      s.macdHist.setData(hist);
    } else {
      s.macd.setData([]);
      s.macdSignal.setData([]);
      s.macdHist.setData([]);
    }
  }
}

interface Point {
  time: number;
  price: number;
}

interface Drawing {
  id: string;
  type: string;
  points: Point[];
  label?: string;
}

interface ChartProps {
  candles: any[];
  indicators: any;
  drawingMode: string | null;
  drawings: Drawing[];
  onDrawingComplete?: (d: any) => void;
  symbol: string;
}

export default function Chart({ candles, indicators, drawingMode, drawings, onDrawingComplete, symbol }: ChartProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<any>(null);
  const seriesRef = useRef<any>({});
  const drawingSeriesRef = useRef<Map<string, any[]>>(new Map()); // drawingId -> [series...]
  const pendingPointsRef = useRef<any[]>([]);
  const modeRef = useRef<string | null>(drawingMode);
  const lastCandleRef = useRef<any>(null);
  const isInitialFitDoneRef = useRef(false);
  const lastSymbolRef = useRef(symbol);
  const { livePrices, isConnected } = useWebSocket();
  const lastTick = livePrices[symbol] ?? null;

  // Reset viewport fit lock and clear stale series when symbol changes
  useEffect(() => {
    if (lastSymbolRef.current !== symbol) {
      lastSymbolRef.current = symbol;
      isInitialFitDoneRef.current = false;
      lastCandleRef.current = null;
      try {
        seriesRef.current.candle?.setData([]);
        seriesRef.current.vol?.setData([]);
        seriesRef.current.ma20?.setData([]);
        seriesRef.current.ma50?.setData([]);
        seriesRef.current.ma200?.setData([]);
        seriesRef.current.rsi?.setData([]);
        seriesRef.current.macd?.setData([]);
        seriesRef.current.macdSignal?.setData([]);
        seriesRef.current.macdHist?.setData([]);
      } catch (_) {}
    }
  }, [symbol]);

  useEffect(() => {
    modeRef.current = drawingMode;
    pendingPointsRef.current = [];
  }, [drawingMode]);

  // Tick-by-tick chart animation: when a new tick arrives, update the last candle's close
  useEffect(() => {
    if (!lastTick || !seriesRef.current.candle || !lastCandleRef.current) return;
    const last = lastCandleRef.current;
    const newClose = Number(lastTick.mid);
    if (!newClose || Number.isNaN(newClose)) return;
    const updated = {
      ...last,
      close: newClose,
      high: Math.max(last.high, newClose),
      low: Math.min(last.low, newClose),
    };
    lastCandleRef.current = updated;
    try {
      seriesRef.current.candle.update(updated);
    } catch (_) {
      /* ignore stale chart */
    }
  }, [lastTick]);

  useEffect(() => {
    if (!containerRef.current) return undefined;
    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: "solid" as any, color: COLORS.bg },
        textColor: COLORS.text,
        fontFamily: "JetBrains Mono, monospace",
        fontSize: 11,
      },
      grid: {
        vertLines: { color: COLORS.grid },
        horzLines: { color: COLORS.grid },
      },
      rightPriceScale: { borderColor: COLORS.border },
      timeScale: {
        borderColor: COLORS.border,
        timeVisible: true,
        secondsVisible: false,
      },
      crosshair: {
        mode: 1,
        vertLine: { color: COLORS.border, labelBackgroundColor: "#f59e0b" },
        horzLine: { color: COLORS.border, labelBackgroundColor: "#f59e0b" },
      },
      autoSize: true,
    });
    chartRef.current = chart;

    const candleSeries = chart.addCandlestickSeries({
      upColor: COLORS.up,
      downColor: COLORS.down,
      borderUpColor: COLORS.up,
      borderDownColor: COLORS.down,
      wickUpColor: COLORS.up,
      wickDownColor: COLORS.down,
    });

    const volumeSeries = chart.addHistogramSeries({
      priceFormat: { type: "volume" },
      priceScaleId: "",
      color: COLORS.vol,
    });
    volumeSeries.priceScale().applyOptions({
      scaleMargins: { top: 0.85, bottom: 0 },
    });

    const ma20Series = chart.addLineSeries({
      color: COLORS.ma20,
      lineWidth: 1,
      priceLineVisible: false,
      lastValueVisible: false,
    });
    const ma50Series = chart.addLineSeries({
      color: COLORS.ma50,
      lineWidth: 1,
      priceLineVisible: false,
      lastValueVisible: false,
    });
    const ma200Series = chart.addLineSeries({
      color: COLORS.ma200,
      lineWidth: 1,
      priceLineVisible: false,
      lastValueVisible: false,
    });

    // Sub-pane style via priceScale configuration
    const rsiSeries = chart.addLineSeries({
      color: "#8b5cf6",
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: false,
      priceScaleId: "rsi",
    });
    rsiSeries.priceScale().applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } });

    const macdHist = chart.addHistogramSeries({
      priceFormat: { type: "volume" },
      priceScaleId: "macd",
      priceLineVisible: false,
      lastValueVisible: false,
    });
    const macdSeries = chart.addLineSeries({
      color: "#3b82f6",
      lineWidth: 2,
      priceScaleId: "macd",
      priceLineVisible: false,
      lastValueVisible: false,
    });
    const macdSignal = chart.addLineSeries({
      color: "#f59e0b",
      lineWidth: 2,
      priceScaleId: "macd",
      priceLineVisible: false,
      lastValueVisible: false,
    });
    macdHist.priceScale().applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } });

    seriesRef.current = {
      candle: candleSeries,
      vol: volumeSeries,
      ma20: ma20Series,
      ma50: ma50Series,
      ma200: ma200Series,
      rsi: rsiSeries,
      macd: macdSeries,
      macdSignal,
      macdHist,
    };

    // Click handler for drawing tools
    const handleClick = (param: any) => {
      const mode = modeRef.current;
      if (!mode || !param || !param.time || !param.point) return;
      const price = candleSeries.coordinateToPrice(param.point.y);
      if (price === null || price === undefined) return;
      const point = { time: typeof param.time === "number" ? param.time : Number(param.time), price: +price.toFixed(5) };
      const required = mode === "hline" ? 1 : 2;
      pendingPointsRef.current.push(point);
      if (pendingPointsRef.current.length >= required) {
        const points = pendingPointsRef.current.slice(0, required);
        pendingPointsRef.current = [];
        onDrawingComplete?.({ type: mode, points });
      }
    };
    chart.subscribeClick(handleClick);

    return () => {
      chart.unsubscribeClick(handleClick);
      chart.remove();
      chartRef.current = null;
      seriesRef.current = {};
      drawingSeriesRef.current.clear();
    };
  }, [onDrawingComplete]);

  // ── ZERO-GLITCH DATA PIPELINE ──
  // 1. Initial load / symbol change: setData once + fitContent once.
  // 2. Intra-bar ticks: update(last) without full setData or resetting zoom.
  // 3. New bar formation: update(newBar) without snapping zoom.
  useEffect(() => {
    if (!chartRef.current || !candles || candles.length === 0) return;
    const cleanCandles = sanitizeChartData(candles);
    if (cleanCandles.length === 0) return;
    const s = seriesRef.current;
    if (!s.candle) return;

    const incomingLast = cleanCandles[cleanCandles.length - 1];
    const currentLast = lastCandleRef.current;

    // 1. Initial Load or Symbol Switch: Load full dataset and fit content ONCE
    if (!isInitialFitDoneRef.current || !currentLast) {
      try {
        s.candle.setData(cleanCandles);
        s.vol?.setData(
          cleanCandles.map((c: any) => ({
            time: c.time,
            value: c.volume,
            color: c.close >= c.open ? "rgba(16,185,129,0.35)" : "rgba(239,68,68,0.35)",
          }))
        );
        updateIndicatorsData(s, cleanCandles, indicators);
        chartRef.current.timeScale().fitContent();
      } catch (_) {}

      isInitialFitDoneRef.current = true;
      lastCandleRef.current = incomingLast;
      return;
    }

    // 2. Intra-bar update (same timestamp): Smoothly update the active candle, NEVER call fitContent or full setData!
    if (currentLast.time === incomingLast.time) {
      try {
        s.candle.update(incomingLast);
        s.vol?.update({
          time: incomingLast.time,
          value: incomingLast.volume,
          color: incomingLast.close >= incomingLast.open ? "rgba(16,185,129,0.35)" : "rgba(239,68,68,0.35)",
        });
      } catch (_) {}
      lastCandleRef.current = incomingLast;
      return;
    }

    // 3. New bar formed (incoming time > current time): Append cleanly via update, never snap zoom!
    if (incomingLast.time > currentLast.time) {
      try {
        s.candle.update(incomingLast);
        s.vol?.update({
          time: incomingLast.time,
          value: incomingLast.volume,
          color: incomingLast.close >= incomingLast.open ? "rgba(16,185,129,0.35)" : "rgba(239,68,68,0.35)",
        });
        updateIndicatorsData(s, cleanCandles, indicators);
      } catch (_) {
        try { s.candle.setData(cleanCandles); } catch (_) {}
      }
      lastCandleRef.current = incomingLast;
      return;
    }

    // 4. Timeframe change or historical reload: full setData without jerking if already fit
    try {
      s.candle.setData(cleanCandles);
      s.vol?.setData(
        cleanCandles.map((c: any) => ({
          time: c.time,
          value: c.volume,
          color: c.close >= c.open ? "rgba(16,185,129,0.35)" : "rgba(239,68,68,0.35)",
        }))
      );
      updateIndicatorsData(s, cleanCandles, indicators);
    } catch (_) {}
    lastCandleRef.current = incomingLast;
  }, [candles]);

  // Separate effect for indicator toggles: Updating indicators NEVER resets candles or zoom!
  useEffect(() => {
    if (!chartRef.current || !candles || candles.length === 0) return;
    const cleanCandles = sanitizeChartData(candles);
    updateIndicatorsData(seriesRef.current, cleanCandles, indicators);
  }, [indicators]);

  // Render persisted drawings
  useEffect(() => {
    if (!chartRef.current || !seriesRef.current.candle) return;
    const chart = chartRef.current;
    const candleSeries = seriesRef.current.candle;
    const currentIds = new Set();

    (drawings || []).forEach((d) => {
      currentIds.add(d.id);
      if (drawingSeriesRef.current.has(d.id)) return;
      const created: any[] = [];
      if (d.type === "trendline" && d.points?.length >= 2) {
        const s = chart.addLineSeries({
          color: "#f59e0b", lineWidth: 2, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false,
        });
        const pts = [...d.points].sort((a, b) => a.time - b.time).map((p) => ({ time: p.time, value: p.price }));
        s.setData(pts);
        created.push(s);
      } else if (d.type === "hline" && d.points?.length >= 1) {
        const pl = candleSeries.createPriceLine({
          price: d.points[0].price, color: "#06b6d4", lineWidth: 1, lineStyle: 2, axisLabelVisible: true, title: d.label || "Level",
        });
        created.push({ priceLine: pl });
      } else if (d.type === "zone" && d.points?.length >= 2) {
        const [a, b] = d.points;
        const top = Math.max(a.price, b.price);
        const bottom = Math.min(a.price, b.price);
        const topL = candleSeries.createPriceLine({ price: top, color: "rgba(245,158,11,0.7)", lineWidth: 1, lineStyle: 0, axisLabelVisible: true, title: "Zone↑" });
        const botL = candleSeries.createPriceLine({ price: bottom, color: "rgba(245,158,11,0.7)", lineWidth: 1, lineStyle: 0, axisLabelVisible: true, title: "Zone↓" });
        created.push({ priceLine: topL }, { priceLine: botL });
      } else if (d.type === "fib" && d.points?.length >= 2) {
        const [a, b] = d.points;
        const hi = Math.max(a.price, b.price);
        const lo = Math.min(a.price, b.price);
        const levels = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
        levels.forEach((lv) => {
          const price = hi - (hi - lo) * lv;
          const pl = candleSeries.createPriceLine({
            price, color: "rgba(167,139,250,0.6)", lineWidth: 1, lineStyle: 2, axisLabelVisible: true, title: `${(lv * 100).toFixed(1)}%`,
          });
          created.push({ priceLine: pl });
        });
      }
      drawingSeriesRef.current.set(d.id, created);
    });

    // Cleanup removed drawings
    drawingSeriesRef.current.forEach((items, id) => {
      if (!currentIds.has(id)) {
        items.forEach((it) => {
          if (it.priceLine) {
            try { candleSeries.removePriceLine(it.priceLine); } catch (_) { /* ignore */ }
          } else {
            try { chart.removeSeries(it); } catch (_) { /* ignore */ }
          }
        });
        drawingSeriesRef.current.delete(id);
      }
    });
  }, [drawings]);

  return (
    <div
      data-testid="chart-wrapper"
      className="w-full h-full relative overflow-hidden"
    >
      <div
        data-testid="chart-container"
        ref={containerRef}
        className="w-full h-full"
      />
      
      {(!candles || candles.length === 0) && (
        <div className="absolute inset-0 bg-black/90 backdrop-blur-sm z-20 flex flex-col items-center justify-center p-6 text-center select-none">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-3 shadow-lg">
            <svg className="w-6 h-6 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div className="text-sm font-semibold text-zinc-100 tracking-wider font-mono uppercase">
            No Real Broker Feed — {symbol}
          </div>
          <p className="text-xs text-zinc-400 max-w-sm mt-1 mb-4 leading-relaxed font-sans">
            Waiting for live candlestick telemetry from MetaTrader 5 bridge. Synthetic mock fallback has been disabled to prevent misleading setups.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-xs font-mono font-bold text-zinc-200 transition-all flex items-center gap-1.5 shadow-sm"
          >
            Retry Feed
          </button>
        </div>
      )}

      <div
        data-testid="stream-status"
        className={`absolute top-1 right-1 z-10 text-[9px] font-mono uppercase tracking-widest px-1.5 py-0.5 pointer-events-none rounded ${
          isConnected
            ? "text-emerald-500 border border-emerald-500/50 bg-black/60"
            : "text-amber-500 border border-amber-500/50 bg-black/60"
        }`}
      >
        {isConnected ? "● Streaming" : "○ Polling 5s"}
      </div>
    </div>
  );
}
