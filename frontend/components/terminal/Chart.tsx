"use client";

import { useEffect, useRef } from "react";
import { createChart } from "lightweight-charts";
import { usePriceStream } from "../../hooks/usePriceStream";

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
  const { lastTick, status: streamStatus } = usePriceStream(symbol);

  useEffect(() => {
    modeRef.current = drawingMode;
    pendingPointsRef.current = [];
  }, [drawingMode]);

  // Tick-by-tick chart animation: when a new tick arrives, update the last candle's close
  useEffect(() => {
    if (!lastTick || !seriesRef.current.candle || !lastCandleRef.current) return;
    if (lastTick.symbol !== symbol) return;
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
  }, [lastTick, symbol]);

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

    seriesRef.current = {
      candle: candleSeries,
      vol: volumeSeries,
      ma20: ma20Series,
      ma50: ma50Series,
      ma200: ma200Series,
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

  // Update data when candles change — but only do a full setData when the
  // chart's last-bar time is different from incoming. Otherwise the streaming
  // WS updates would be overwritten by every snapshot poll and the chart would
  // "snap back" every second.
  useEffect(() => {
    if (!chartRef.current || !candles || candles.length === 0) return;
    const s = seriesRef.current;
    const incomingLast = candles[candles.length - 1];
    const currentLast = lastCandleRef.current;
    const sameBar =
      currentLast &&
      incomingLast &&
      currentLast.time === incomingLast.time &&
      // Heuristic: keep WS-driven state if streaming is open (we already have
      // ticks flowing). Only refresh when a new bar appears or on first load.
      streamStatus === "open";

    if (!sameBar) {
      s.candle.setData(candles);
      s.vol.setData(
        candles.map((c: any) => ({
          time: c.time,
          value: c.volume,
          color: c.close >= c.open ? "rgba(16,185,129,0.35)" : "rgba(239,68,68,0.35)",
        }))
      );
      s.ma20.setData(indicators?.ma20 ? sma(candles, 20) : []);
      s.ma50.setData(indicators?.ma50 ? sma(candles, 50) : []);
      s.ma200.setData(indicators?.ma200 ? sma(candles, 200) : []);

      const last = candles[candles.length - 1];
      if (last) {
        s.candle.setMarkers([
          {
            time: last.time,
            position: "belowBar" as any,
            color: COLORS.up,
            shape: "arrowUp" as any,
            text: "ENTRY",
          },
        ]);
      }

      chartRef.current.timeScale().fitContent();
      lastCandleRef.current = incomingLast;
    }
  }, [candles, indicators, streamStatus]);

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
          color: "#f59e0b", lineWidth: 1.5, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false,
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
      data-testid="chart-container"
      ref={containerRef}
      className="w-full h-full relative"
    >
      <div
        data-testid="stream-status"
        className={`absolute top-1 right-1 z-10 text-[9px] font-mono uppercase tracking-widest px-1.5 py-0.5 ${
          streamStatus === "open"
            ? "text-emerald-500 border border-emerald-500/50"
            : streamStatus === "connecting"
            ? "text-amber-500 border border-amber-500/50"
            : "text-zinc-500 border border-zinc-700"
        }`}
      >
        {streamStatus === "open" ? "● Streaming" : streamStatus === "connecting" ? "○ Connecting" : "○ Polling"}
      </div>
    </div>
  );
}
