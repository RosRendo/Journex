"use client";
import React, { useEffect, useRef, useState } from "react";
import { X, Loader2, Camera, TrendingUp, TrendingDown } from "lucide-react";

export interface ChartTrade {
  pair: string;
  direction: string;
  entry: number;
  closePrice?: number;
  openTime?: string; // when the order was placed
  date: string; // when the order was closed (used as fallback)
}

interface Props {
  trades: ChartTrade[]; // 1 trade = single trade view; many = day view per pair
  title?: string;
  onCapture: (base64: string, pairLabel: string) => void;
  onClose: () => void;
}

const BRIDGE = process.env.NEXT_PUBLIC_BRIDGE_URL || "/api/bridge";

// ── draw one chart in a given container div ──────────────────────────────────
async function drawChart(
  container: HTMLDivElement,
  trades: ChartTrade[],
): Promise<any> {
  const lw = await import("lightweight-charts");
  const { createChart } = lw;
  container.innerHTML = "";

  // Use the open time of the first trade for chart centering
  const firstTrade = trades[0];
  const entryTs = Math.floor(
    new Date(firstTrade.openTime || firstTrade.date).getTime() / 1000,
  );
  const closeTs = Math.floor(new Date(firstTrade.date).getTime() / 1000);

  // For multi-trade: span from earliest open to latest close
  const allOpenTs = trades.map((t) =>
    Math.floor(new Date(t.openTime || t.date).getTime() / 1000),
  );
  const allCloseTs = trades.map((t) =>
    Math.floor(new Date(t.date).getTime() / 1000),
  );
  const minTs = Math.min(...allOpenTs);
  const maxTs = Math.max(...allCloseTs);
  const rangeSeconds = Math.max(maxTs - minTs, 3600); // at least 1 hour

  // Auto-pick timeframe based on trade duration
  let timeframe = "M15";
  let countBefore = 80;
  let countAfter = 40;
  if (rangeSeconds > 86400 * 3) {
    timeframe = "H4";
    countBefore = 60;
    countAfter = 30;
  } else if (rangeSeconds > 86400) {
    timeframe = "H1";
    countBefore = 80;
    countAfter = 40;
  } else if (rangeSeconds > 14400) {
    timeframe = "M30";
    countBefore = 80;
    countAfter = 40;
  } else if (rangeSeconds <= 900) {
    timeframe = "M5";
    countBefore = 80;
    countAfter = 40;
  }

  const res = await fetch(`${BRIDGE}/api/historical-candles-range?symbol=${encodeURIComponent(firstTrade.pair)}&target_time=${minTs}&timeframe=${timeframe}&count_before=${countBefore}&count_after=${countAfter}`,
    { headers: { "ngrok-skip-browser-warning": "true" } }
  );
  const data = await res.json();

  if (data.error || !data.candles?.length) {
    throw new Error(data.error || "No chart data returned from MT5");
  }

  // Cast raw numbers to UTCTimestamp brand so lightweight-charts is happy
  const candles = (data.candles as any[]).map((c: any) => ({
    time: c.time as number & { _type: "UTCTimestamp" },
    open: c.open as number,
    high: c.high as number,
    low: c.low as number,
    close: c.close as number,
  }));

  const chart = createChart(container, {
    width: container.clientWidth,
    height: 380,
    layout: { background: { color: "#0F1117" }, textColor: "#94A3B8" },
    grid: { vertLines: { color: "#1E2535" }, horzLines: { color: "#1E2535" } },
    crosshair: { mode: 1 },
    timeScale: {
      timeVisible: true,
      secondsVisible: false,
      borderColor: "#1E2535",
    },
    rightPriceScale: { borderColor: "#1E2535" },
  });

  const series = chart.addCandlestickSeries({
    upColor: "#22c55e",
    downColor: "#ef4444",
    borderVisible: false,
    wickUpColor: "#22c55e",
    wickDownColor: "#ef4444",
  });
  series.setData(candles as any);

  // Helper: find closest candle to a unix timestamp
  const closest = (ts: number) =>
    candles.reduce((prev, curr) =>
      Math.abs(curr.time - ts) < Math.abs(prev.time - ts) ? curr : prev,
    );

  // Build markers — arrows only, no text labels
  const markers: any[] = [];

  trades.forEach((trade) => {
    const openTs = Math.floor(
      new Date(trade.openTime || trade.date).getTime() / 1000,
    );
    const cCloseTs = Math.floor(new Date(trade.date).getTime() / 1000);
    const openCandle = closest(openTs);
    const closeCandle = closest(cCloseTs);
    const isLong = trade.direction === "Long";

    // Entry arrow — blue ▲ (Long) or blue ▼ (Short), inBar, size 1
    markers.push({
      time: openCandle.time,
      position: "inBar",
      color: "#3B82F6", // blue — entry
      shape: isLong ? "arrowUp" : "arrowDown",
      size: 1,
    });

    // Close arrow — red ▼ (Long exit) or red ▲ (Short exit), inBar, size 1
    if (Math.abs(cCloseTs - openTs) > 60 && trade.closePrice !== undefined) {
      markers.push({
        time: closeCandle.time,
        position: "inBar",
        color: "#ef4444", // red — exit
        shape: isLong ? "arrowDown" : "arrowUp",
        size: 1,
      });
    }

    // Entry price line — thin dashed, no axis label, no title
    series.createPriceLine({
      price: trade.entry,
      color: "#3B82F6",
      lineWidth: 1,
      lineStyle: 2,
      axisLabelVisible: false,
      title: "",
    });

    // Close price line — red dashed, no label
    if (trade.closePrice !== undefined && trade.closePrice !== trade.entry) {
      series.createPriceLine({
        price: trade.closePrice,
        color: "#ef4444",
        lineWidth: 1,
        lineStyle: 2,
        axisLabelVisible: false,
        title: "",
      });
    }
  });

  // Sort markers by time (required by lightweight-charts)
  markers.sort((a, b) => {
    const ta = typeof a.time === "number" ? a.time : 0;
    const tb = typeof b.time === "number" ? b.time : 0;
    return ta - tb;
  });
  series.setMarkers(markers);
  chart.timeScale().fitContent();

  return chart;
}

// ── Group trades by pair ─────────────────────────────────────────────────────
function groupByPair(trades: ChartTrade[]): Record<string, ChartTrade[]> {
  return trades.reduce(
    (acc, t) => {
      if (!acc[t.pair]) acc[t.pair] = [];
      acc[t.pair].push(t);
      return acc;
    },
    {} as Record<string, ChartTrade[]>,
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function AutoScreenshotModal({
  trades,
  title,
  onCapture,
  onClose,
}: Props) {
  const isSingleTrade = trades.length === 1;
  const pairGroups = groupByPair(trades);
  const pairs = Object.keys(pairGroups);

  // Refs & chart instances per pair
  const containerRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const chartInstances = useRef<Record<string, any>>({});

  const [loadingPairs, setLoadingPairs] = useState<Record<string, boolean>>(
    Object.fromEntries(pairs.map((p) => [p, true])),
  );
  const [errorPairs, setErrorPairs] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      for (const pair of pairs) {
        const container = containerRefs.current[pair];
        if (!container) continue;
        try {
          const chart = await drawChart(container, pairGroups[pair]);
          if (cancelled) {
            chart.remove();
            return;
          }
          chartInstances.current[pair] = chart;
          setLoadingPairs((prev) => ({ ...prev, [pair]: false }));
        } catch (err: any) {
          if (!cancelled) {
            setLoadingPairs((prev) => ({ ...prev, [pair]: false }));
            setErrorPairs((prev) => ({
              ...prev,
              [pair]: err.message || "Failed",
            }));
          }
        }
      }
    };

    init();
    return () => {
      cancelled = true;
      Object.values(chartInstances.current).forEach((c) => {
        try {
          c.remove();
        } catch {}
      });
    };
  }, []); // run once

  const captureAll = () => {
    for (const pair of pairs) {
      const chart = chartInstances.current[pair];
      if (!chart) continue;
      try {
        const dataUrl = chart.takeScreenshot().toDataURL("image/png");
        onCapture(dataUrl, pair);
      } catch {}
    }
    onClose();
  };

  const isAnyLoading = Object.values(loadingPairs).some(Boolean);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative bg-card w-full max-w-5xl max-h-[92vh] overflow-y-auto border border-border/50 shadow-2xl rounded-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-border/50 bg-card/95 backdrop-blur-sm">
          <div>
            <h3 className="font-bold text-lg flex items-center gap-2">
              <Camera className="w-5 h-5 text-primary" />
              {title ??
                (isSingleTrade
                  ? `Chart — ${trades[0].pair}`
                  : `Day Chart — ${pairs.length} Pair${pairs.length > 1 ? "s" : ""}`)}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Entry & close markers pulled from MT5 history
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-secondary rounded-full transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* One chart section per pair */}
        <div className="p-5 space-y-6">
          {pairs.map((pair) => {
            const pTrades = pairGroups[pair];
            const isLong = pTrades[0].direction === "Long";
            return (
              <div
                key={pair}
                className="rounded-xl border border-border/50 overflow-hidden"
              >
                {/* Pair header */}
                <div className="flex items-center gap-3 px-4 py-3 bg-secondary/40 border-b border-border/50">
                  <span
                    className={`flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded 
                    ${
                      isLong
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        : "bg-red-500/10 text-red-400 border border-red-500/20"
                    }`}
                  >
                    {isLong ? (
                      <TrendingUp className="w-3 h-3" />
                    ) : (
                      <TrendingDown className="w-3 h-3" />
                    )}
                    {pTrades[0].direction.toUpperCase()}
                  </span>
                  <span className="font-bold text-sm">{pair}</span>
                  <span className="text-xs text-muted-foreground ml-auto">
                    {pTrades.length} trade{pTrades.length > 1 ? "s" : ""}
                  </span>
                </div>

                {/* Trade detail pills */}
                <div className="flex flex-wrap gap-2 px-4 py-2 bg-secondary/20 border-b border-border/30">
                  {pTrades.map((t, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 text-xs bg-card border border-border/50 rounded-lg px-3 py-1.5"
                    >
                      <span className="text-muted-foreground">Entry</span>
                      <span className="font-mono font-semibold text-foreground">
                        {t.entry}
                      </span>
                      {t.closePrice !== undefined && (
                        <>
                          <span className="text-muted-foreground">→ Close</span>
                          <span className="font-mono font-semibold text-amber-400">
                            {t.closePrice}
                          </span>
                        </>
                      )}
                      <span
                        className={`ml-1 font-bold ${pTrades[0].direction === "Long" ? "text-emerald-400" : "text-red-400"}`}
                      >
                        |
                      </span>
                      {t.openTime && (
                        <span className="text-muted-foreground">
                          {new Date(t.openTime).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      )}
                      <span className="text-muted-foreground">→</span>
                      <span className="text-muted-foreground">
                        {new Date(t.date).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Chart */}
                <div className="relative bg-[#0F1117]">
                  {loadingPairs[pair] && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#0F1117]">
                      <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                  )}
                  {errorPairs[pair] && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center flex-col gap-2 bg-[#0F1117]">
                      <X className="w-8 h-8 text-red-400" />
                      <p className="text-red-400 text-sm font-medium px-4 text-center">
                        {errorPairs[pair]}
                      </p>
                    </div>
                  )}
                  <div
                    ref={(el) => {
                      containerRefs.current[pair] = el;
                    }}
                    className="w-full h-[380px]"
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="px-6 pb-2 flex flex-wrap gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />{" "}
            Entry arrow (blue)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />{" "}
            Exit arrow (red)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-blue-500 rounded inline-block" />{" "}
            Entry price line
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-red-500 rounded inline-block" /> Exit
            price line
          </span>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 p-4 border-t border-border/50 bg-card/95 backdrop-blur-sm flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-sm font-bold text-muted-foreground hover:bg-secondary transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={captureAll}
            disabled={isAnyLoading}
            className="flex items-center gap-2 px-6 py-2 rounded-xl text-sm font-bold bg-primary hover:bg-primary/90 text-primary-foreground disabled:opacity-50 transition-all shadow-[0_0_15px_rgba(59,130,246,0.25)] hover:shadow-[0_0_20px_rgba(59,130,246,0.4)]"
          >
            <Camera className="w-4 h-4" />
            Save {pairs.length > 1 ? `All ${pairs.length} Charts` : "Chart"} to
            Journal
          </button>
        </div>
      </div>
    </div>
  );
}
