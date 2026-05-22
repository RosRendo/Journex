"use client";

import { useEffect, useState } from "react";
import { createChart } from "lightweight-charts";
import { api } from "../../lib/terminalApi";

const TF_GRID = ["M15", "H1", "H4", "D1"];

interface MiniChartProps {
  symbol: string;
  timeframe: string;
}

function MiniChart({ symbol, timeframe }: MiniChartProps) {
  const [candles, setCandles] = useState<any[]>([]);
  const [ref, setRef] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .get("/terminal/candles", { params: { symbol, timeframe, limit: 120 } })
      .then((r) => !cancelled && setCandles(r.data.candles || []))
      .catch(() => !cancelled && setCandles([]));
    return () => {
      cancelled = true;
    };
  }, [symbol, timeframe]);

  useEffect(() => {
    if (!ref || candles.length === 0) return undefined;
    const chart = createChart(ref, {
      layout: {
        background: { type: "solid" as any, color: "#000000" },
        textColor: "#71717a",
        fontFamily: "JetBrains Mono, monospace",
        fontSize: 9,
      },
      grid: {
        vertLines: { color: "#0a0a0a" },
        horzLines: { color: "#0a0a0a" },
      },
      rightPriceScale: { borderColor: "#27272a" },
      timeScale: { borderColor: "#27272a", timeVisible: true, secondsVisible: false },
      crosshair: { mode: 0 },
      handleScroll: false,
      handleScale: false,
      autoSize: true,
    });
    const s = chart.addCandlestickSeries({
      upColor: "#10b981", downColor: "#ef4444",
      borderUpColor: "#10b981", borderDownColor: "#ef4444",
      wickUpColor: "#10b981", wickDownColor: "#ef4444",
    });
    s.setData(candles);
    chart.timeScale().fitContent();
    return () => chart.remove();
  }, [ref, candles]);

  const last: any = candles[candles.length - 1];
  const first: any = candles[0];
  const change = last && first ? ((last.close - first.close) / first.close) * 100 : 0;

  return (
    <div
      data-testid={`compare-cell-${timeframe}`}
      className="relative flex flex-col bg-black border border-zinc-800"
    >
      <div className="flex items-center justify-between px-2 h-6 border-b border-zinc-800 bg-zinc-950">
        <span className="text-[10px] font-bold tracking-widest uppercase text-amber-500">
          {symbol} · {timeframe}
        </span>
        <span
          className={`text-[10px] font-mono ${
            change >= 0 ? "text-emerald-500" : "text-red-500"
          }`}
        >
          {change >= 0 ? "▲" : "▼"}
          {Math.abs(change).toFixed(2)}%
        </span>
      </div>
      <div ref={setRef} className="flex-1 min-h-0" />
    </div>
  );
}

interface MultiChartCompareProps {
  symbol: string;
}

export default function MultiChartCompare({ symbol }: MultiChartCompareProps) {
  return (
    <div data-testid="multi-chart-grid" className="absolute inset-0 grid grid-cols-2 grid-rows-2 gap-px bg-zinc-800">
      {TF_GRID.map((tf) => (
        <MiniChart key={tf} symbol={symbol} timeframe={tf} />
      ))}
    </div>
  );
}
