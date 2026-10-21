"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { createChart, IChartApi, ISeriesApi, IPriceLine, Time, LineStyle } from "lightweight-charts";
import { fetchWithAuth, getBackendUrl } from "@/lib/utils";
import {
  Loader2,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  RotateCcw,
  Target,
  FastForward,
  Eye,
  EyeOff,
  CheckCircle2,
  Maximize2,
} from "lucide-react";

interface TradeDetailChartProps {
  tradeId: string | number;
  pair: string;
  entry: number;
  closePrice?: number;
  sl?: number;
  tp?: number;
  direction: string;
  profit: number;
  date: string;
  openTime?: string;
  autoStartReplay?: boolean;
  replayTrigger?: number;
}

const TIMEFRAMES = ["M1", "M5", "M15", "H1"];

export default function TradeDetailChart({
  tradeId,
  pair,
  entry,
  closePrice,
  sl,
  tp,
  direction,
  profit,
  date,
  openTime,
  autoStartReplay = false,
  replayTrigger,
}: TradeDetailChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);

  const entryLineRef = useRef<IPriceLine | null>(null);
  const slLineRef = useRef<IPriceLine | null>(null);
  const tpLineRef = useRef<IPriceLine | null>(null);

  const [timeframe, setTimeframe] = useState<string>("M5");
  const [lookback, setLookback] = useState<number>(80);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showLevels, setShowLevels] = useState(true);
  const [showMarkers, setShowMarkers] = useState(true);
  const [candles, setCandles] = useState<any[]>([]);
  const [tradeData, setTradeData] = useState<any>(null);

  // In-Screen Replay State
  const [playing, setPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(500); // ms per candle
  const playIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const isLong = direction.toLowerCase().includes("long") || direction.toLowerCase().includes("buy");
  const isCrypto = pair.toUpperCase().includes("BTC") || pair.toUpperCase().includes("ETH");
  const isJpy = pair.toUpperCase().includes("JPY");
  const decimals = isCrypto ? 2 : isJpy ? 3 : 2;

  // Helper: Find closest candle
  const findClosestCandleIndex = useCallback((candleList: any[], targetSec: number): number => {
    if (!candleList || candleList.length === 0 || !targetSec) return -1;
    let bestIdx = 0;
    let minDiff = Infinity;
    for (let i = 0; i < candleList.length; i++) {
      const diff = Math.abs(candleList[i].time - targetSec);
      if (diff < minDiff) {
        minDiff = diff;
        bestIdx = i;
      }
    }
    return bestIdx;
  }, []);

  // Fetch replay candles
  useEffect(() => {
    let active = true;
    const fetchCandles = async () => {
      setLoading(true);
      setError(null);
      setPlaying(false);
      try {
        const res = await fetchWithAuth(`${getBackendUrl()}/api/replay/${tradeId}?timeframe=${timeframe}&lookback=${lookback}`);
        const data = await res.json();
        if (!active) return;
        if (data.success && data.candles?.length > 0) {
          const fetchedCandles = data.candles;
          setCandles(fetchedCandles);
          setTradeData(data.trade);
          // By default, show the complete trade with entry & exit visible!
          setCurrentIndex(Math.max(0, fetchedCandles.length - 1));
          setTimeout(() => {
            chartRef.current?.timeScale().fitContent();
          }, 80);
        } else {
          setError(data.error || "No chart data available");
        }
      } catch (err: any) {
        if (active) setError(err.message || "Failed to load chart");
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchCandles();
    return () => {
      active = false;
    };
  }, [tradeId, timeframe, lookback]);

  // Compute entry & exit candle indexes
  const entryTimeSec = tradeData?.openTimestamp != null
    ? Number(tradeData.openTimestamp)
    : Math.floor(new Date(openTime || date).getTime() / 1000);
  const exitTimeSec = tradeData?.closeTimestamp != null
    ? Number(tradeData.closeTimestamp)
    : Math.floor(new Date(date).getTime() / 1000);

  const eIdx = findClosestCandleIndex(candles, entryTimeSec);
  const xIdx = findClosestCandleIndex(candles, exitTimeSec);

  // Trigger replay from external button (e.g. top bar)
  useEffect(() => {
    if (replayTrigger && replayTrigger > 0 && candles.length > 0) {
      if (currentIndex >= candles.length - 1 || (xIdx !== -1 && currentIndex >= xIdx)) {
        setCurrentIndex(eIdx !== -1 ? Math.max(0, eIdx - 6) : 0);
      }
      setPlaying(true);
    }
  }, [replayTrigger]);

  // Auto-start replay if prop requested
  useEffect(() => {
    if (autoStartReplay && candles.length > 0) {
      setCurrentIndex(eIdx !== -1 ? Math.max(0, eIdx - 6) : 0);
      setPlaying(true);
    }
  }, [autoStartReplay, candles.length, eIdx]);

  // Auto-play loop
  useEffect(() => {
    if (playing) {
      playIntervalRef.current = setInterval(() => {
        setCurrentIndex((prev) => {
          if (prev >= candles.length - 1) {
            setPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, playbackSpeed);
    } else {
      if (playIntervalRef.current) clearInterval(playIntervalRef.current);
    }
    return () => {
      if (playIntervalRef.current) clearInterval(playIntervalRef.current);
    };
  }, [playing, playbackSpeed, candles.length]);

  // Update price lines
  const updatePriceLines = useCallback(() => {
    if (!seriesRef.current) return;

    if (entryLineRef.current) {
      try { seriesRef.current.removePriceLine(entryLineRef.current); } catch (_) {}
      entryLineRef.current = null;
    }
    if (slLineRef.current) {
      try { seriesRef.current.removePriceLine(slLineRef.current); } catch (_) {}
      slLineRef.current = null;
    }
    if (tpLineRef.current) {
      try { seriesRef.current.removePriceLine(tpLineRef.current); } catch (_) {}
      tpLineRef.current = null;
    }

    if (!showLevels) return;

    const currentEntry = tradeData?.entry ?? entry;
    const currentSl = tradeData?.sl ?? sl;
    const currentTp = tradeData?.tp ?? tp;

    // 1. Entry Line: Thin, subtle, crisp dashed line
    if (currentEntry != null && Number(currentEntry) > 0) {
      entryLineRef.current = seriesRef.current.createPriceLine({
        price: Number(currentEntry),
        color: "rgba(56, 189, 248, 0.75)",
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: "Entry",
      });
    }

    // 2. Stop Loss: Only if SL was set and > 0
    if (currentSl != null && Number(currentSl) > 0) {
      slLineRef.current = seriesRef.current.createPriceLine({
        price: Number(currentSl),
        color: "rgba(244, 63, 94, 0.8)",
        lineWidth: 1,
        lineStyle: LineStyle.Dotted,
        axisLabelVisible: true,
        title: "SL",
      });
    }

    // 3. Take Profit: Only if TP was set and > 0
    if (currentTp != null && Number(currentTp) > 0) {
      tpLineRef.current = seriesRef.current.createPriceLine({
        price: Number(currentTp),
        color: "rgba(32, 224, 178, 0.8)",
        lineWidth: 1,
        lineStyle: LineStyle.Dotted,
        axisLabelVisible: true,
        title: "TP",
      });
    }
  }, [showLevels, tradeData, entry, sl, tp]);

  // Init chart
  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      autoSize: true,
      height: 380,
      layout: {
        background: { type: "solid" as any, color: "transparent" },
        textColor: "#71717a",
        fontFamily: "monospace",
      },
      grid: {
        vertLines: { color: "rgba(255,255,255,0.03)" },
        horzLines: { color: "rgba(255,255,255,0.03)" },
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        borderColor: "rgba(255,255,255,0.08)",
        rightOffset: 6,
        barSpacing: 14,
      },
      rightPriceScale: {
        borderColor: "rgba(255,255,255,0.08)",
        scaleMargins: { top: 0.15, bottom: 0.15 },
      },
      crosshair: { mode: 0 },
    });

    const series = chart.addCandlestickSeries({
      upColor: "#20e0b2",
      downColor: "#ff5c73",
      borderVisible: false,
      wickUpColor: "#20e0b2",
      wickDownColor: "#ff5c73",
    });

    chartRef.current = chart;
    seriesRef.current = series;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entryItem of entries) {
        if (entryItem.contentRect.width > 0 && chartRef.current) {
          chartRef.current.applyOptions({
            width: Math.floor(entryItem.contentRect.width),
            height: Math.floor(entryItem.contentRect.height) || 380,
          });
        }
      }
    });

    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, []);

  // Update chart candles & markers based on currentIndex
  useEffect(() => {
    if (!seriesRef.current || candles.length === 0) return;

    const visibleCandles = candles.slice(0, currentIndex + 1);
    const chartData = visibleCandles.map((c) => ({
      time: c.time as Time,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }));

    seriesRef.current.setData(chartData);
    updatePriceLines();

    const markers: any[] = [];

    if (showMarkers) {
      const isProfit = profit >= 0;
      const pnlStr = `${isProfit ? "+" : ""}$${profit.toFixed(2)}`;

      // 1. If entry and exit happened on the same candle (quick scalp):
      if (eIdx !== -1 && xIdx !== -1 && eIdx === xIdx && currentIndex >= eIdx && candles[eIdx]) {
        markers.push({
          time: candles[eIdx].time as Time,
          position: isLong ? "belowBar" : "aboveBar",
          color: isProfit ? "#20e0b2" : "#ff5c73",
          shape: isLong ? "arrowUp" : "arrowDown",
          text: `${isLong ? "BUY" : "SELL"} (${pnlStr})`,
          size: 1,
        });
      } else {
        // 2. Distinct bars:
        // Entry Arrow
        if (eIdx !== -1 && currentIndex >= eIdx && candles[eIdx]) {
          markers.push({
            time: candles[eIdx].time as Time,
            position: isLong ? "belowBar" : "aboveBar",
            color: isLong ? "#20e0b2" : "#ff5c73",
            shape: isLong ? "arrowUp" : "arrowDown",
            text: isLong ? "BUY" : "SELL",
            size: 1,
          });
        }

        // Exit Marker
        if (xIdx !== -1 && currentIndex >= xIdx && candles[xIdx]) {
          markers.push({
            time: candles[xIdx].time as Time,
            position: isLong ? "aboveBar" : "belowBar",
            color: isProfit ? "#20e0b2" : "#ff5c73",
            shape: "circle",
            text: `EXIT ${pnlStr}`,
            size: 1,
          });
        }
      }
    }

    markers.sort((a, b) => Number(a.time) - Number(b.time));
    seriesRef.current.setMarkers(markers);
  }, [currentIndex, candles, tradeData, entry, closePrice, profit, isLong, eIdx, xIdx, showMarkers, updatePriceLines]);

  // Replay Navigation Helpers
  const handlePlayPause = () => {
    if (currentIndex >= candles.length - 1) {
      // If at the end, rewind to pre-entry approach and play!
      setCurrentIndex(eIdx !== -1 ? Math.max(0, eIdx - 8) : 0);
      setPlaying(true);
    } else {
      setPlaying(!playing);
    }
  };

  const jumpToApproach = () => {
    setPlaying(false);
    setCurrentIndex(eIdx !== -1 ? Math.max(0, eIdx - 12) : 0);
  };

  const jumpToEntry = () => {
    setPlaying(false);
    if (eIdx !== -1) setCurrentIndex(eIdx);
  };

  const jumpToExit = () => {
    setPlaying(false);
    if (xIdx !== -1) setCurrentIndex(xIdx);
  };

  const jumpToFull = () => {
    setPlaying(false);
    setCurrentIndex(Math.max(0, candles.length - 1));
  };

  const stepBack = () => {
    setPlaying(false);
    setCurrentIndex((prev) => Math.max(0, prev - 1));
  };

  const stepForward = () => {
    setPlaying(false);
    setCurrentIndex((prev) => Math.min(candles.length - 1, prev + 1));
  };

  // Stage Badge text
  const stageBadge = () => {
    if (eIdx === -1 || currentIndex < eIdx) {
      return { text: "PRE-ENTRY SETUP", cls: "bg-blue-500/15 text-blue-400 border-blue-500/30" };
    }
    if (currentIndex === eIdx) {
      return { text: "ENTRY TRIGGERED", cls: "bg-emerald-500/20 text-[#20e0b2] border-emerald-500/40 animate-pulse font-bold" };
    }
    if (xIdx !== -1 && currentIndex >= xIdx) {
      return {
        text: `CLOSED (${profit >= 0 ? "+" : ""}$${profit.toFixed(2)})`,
        cls: profit >= 0 ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" : "bg-rose-500/15 text-rose-400 border-rose-500/30",
      };
    }
    return { text: "LIVE IN-TRADE", cls: "bg-amber-500/15 text-amber-400 border-amber-500/30 font-bold" };
  };

  const stage = stageBadge();

  return (
    <div className="h-full flex flex-col bg-[#0b0b0f] text-[#f4f4f5] select-none">
      {/* ── Top Bar: Timeframe & Replay Controls (ALL ON SCREEN) ── */}
      <div className="flex flex-wrap items-center justify-between px-3 py-2 border-b border-white/[0.06] bg-[#0c0c11] shrink-0 font-mono text-[10px] gap-2">
        {/* Left: Timeframe & SL/TP toggle */}
        <div className="flex items-center gap-1">
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={`px-2 py-0.5 rounded font-bold transition-all ${
                timeframe === tf
                  ? "bg-white/15 text-white border border-white/25"
                  : "text-zinc-500 hover:text-zinc-300 border border-transparent"
              }`}
            >
              {tf}
            </button>
          ))}
          <div className="w-px h-3 bg-white/10 mx-1" />
          <button
            onClick={() => setShowLevels(!showLevels)}
            className={`flex items-center gap-1 px-1.5 py-0.5 rounded transition-all border text-[8.5px] font-bold ${
              showLevels
                ? "bg-white/10 text-[#38bdf8] border-white/15"
                : "text-zinc-500 border-transparent hover:text-zinc-300"
            }`}
            title="Toggle Entry, SL, TP price lines"
          >
            {showLevels ? <Eye className="w-2.5 h-2.5 text-[#38bdf8]" /> : <EyeOff className="w-2.5 h-2.5" />}
            <span>Lines</span>
          </button>
          <button
            onClick={() => setShowMarkers(!showMarkers)}
            className={`flex items-center gap-1 px-1.5 py-0.5 rounded transition-all border text-[8.5px] font-bold ${
              showMarkers
                ? "bg-white/10 text-[#20e0b2] border-white/15"
                : "text-zinc-500 border-transparent hover:text-zinc-300"
            }`}
            title="Toggle Entry / Exit candle badges"
          >
            {showMarkers ? <Eye className="w-2.5 h-2.5 text-[#20e0b2]" /> : <EyeOff className="w-2.5 h-2.5" />}
            <span>Badges</span>
          </button>
          <div className="w-px h-3 bg-white/10 mx-1" />
          <span className="text-[9px] text-zinc-500 uppercase font-mono">Behind:</span>
          {[40, 80, 150].map((lb) => (
            <button
              key={lb}
              onClick={() => setLookback(lb)}
              className={`px-1.5 py-0.5 rounded text-[8.5px] font-bold transition-all ${
                lookback === lb
                  ? "bg-white/15 text-white border border-white/25"
                  : "text-zinc-500 hover:text-zinc-300 border border-transparent"
              }`}
              title={`Show ${lb} bars of history behind entry`}
            >
              {lb}b
            </button>
          ))}
          <button
            onClick={() => chartRef.current?.timeScale().fitContent()}
            className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[8.5px] font-bold border border-white/10 hover:border-white/20 text-zinc-400 hover:text-white transition-all ml-0.5"
            title="Fit all candles on screen"
          >
            <Maximize2 className="w-2.5 h-2.5" /> Fit
          </button>
        </div>

        {/* Center: IN-SCREEN REPLAY CONTROLS */}
        <div className="flex items-center gap-1 bg-black/40 px-2 py-1 rounded-lg border border-white/[0.06]">
          {/* Step Back */}
          <button
            onClick={stepBack}
            disabled={currentIndex <= 0}
            className="p-1 rounded text-zinc-400 hover:text-white disabled:opacity-30 transition-all"
            title="Step 1 bar backward"
          >
            <SkipBack className="w-3 h-3" />
          </button>

          {/* PLAY / PAUSE BUTTON */}
          <button
            onClick={handlePlayPause}
            className="flex items-center gap-1 px-2.5 py-0.5 rounded bg-white text-black hover:bg-zinc-200 transition-all font-bold text-[9px] uppercase tracking-wider"
          >
            {playing ? (
              <>
                <Pause className="w-3 h-3 fill-black" /> Pause
              </>
            ) : (
              <>
                <Play className="w-3 h-3 fill-black" /> Replay
              </>
            )}
          </button>

          {/* Step Forward */}
          <button
            onClick={stepForward}
            disabled={currentIndex >= candles.length - 1}
            className="p-1 rounded text-zinc-400 hover:text-white disabled:opacity-30 transition-all"
            title="Step 1 bar forward"
          >
            <SkipForward className="w-3 h-3" />
          </button>

          <div className="w-px h-3 bg-white/10 mx-1" />

          {/* Jump Buttons */}
          <button
            onClick={jumpToApproach}
            className="px-1.5 py-0.5 rounded text-[8.5px] font-bold border border-white/[0.07] text-zinc-400 hover:text-white transition-all flex items-center gap-0.5"
            title="Rewind to pre-entry approach"
          >
            <RotateCcw className="w-2.5 h-2.5" /> Approach
          </button>

          <button
            onClick={jumpToEntry}
            className="px-1.5 py-0.5 rounded text-[8.5px] font-bold border border-sky-500/25 bg-sky-500/10 text-sky-400 hover:bg-sky-500/20 transition-all flex items-center gap-0.5"
            title="Jump to entry bar"
          >
            <Target className="w-2.5 h-2.5" /> Entry
          </button>

          <button
            onClick={jumpToExit}
            className="px-1.5 py-0.5 rounded text-[8.5px] font-bold border border-amber-500/25 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition-all flex items-center gap-0.5"
            title="Jump to exit bar"
          >
            <FastForward className="w-2.5 h-2.5" /> Exit
          </button>

          <button
            onClick={jumpToFull}
            className="px-1.5 py-0.5 rounded text-[8.5px] font-bold border border-white/[0.07] text-zinc-400 hover:text-white transition-all"
            title="Show full trade path"
          >
            Full
          </button>

          <div className="w-px h-3 bg-white/10 mx-1" />

          {/* Speed Toggles */}
          {[
            { label: "1x", val: 500 },
            { label: "2x", val: 250 },
            { label: "4x", val: 100 },
          ].map((sp) => (
            <button
              key={sp.label}
              onClick={() => setPlaybackSpeed(sp.val)}
              className={`px-1 rounded text-[8.5px] font-bold ${
                playbackSpeed === sp.val ? "text-white bg-white/20" : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {sp.label}
            </button>
          ))}
        </div>

        {/* Right: Stage Badge & Counter */}
        <div className="flex items-center gap-2">
          <span className={`px-2 py-0.5 rounded text-[8.5px] font-bold border ${stage.cls}`}>
            {stage.text}
          </span>
          <span className="text-[9px] text-zinc-500 font-mono tabular-nums">
            {currentIndex + 1} / {candles.length}
          </span>
        </div>
      </div>

      {/* Chart Canvas Area */}
      <div className="flex-1 relative overflow-hidden">
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 z-10 text-zinc-400 gap-2 font-mono text-xs">
            <Loader2 className="w-6 h-6 animate-spin text-[#20e0b2]" />
            <span>Loading Replay Candles...</span>
          </div>
        )}

        {error && !loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 z-10 text-zinc-400 gap-2 font-mono text-xs p-4 text-center">
            <p className="text-rose-400 font-bold">Chart unavailable: {error}</p>
            <p className="text-[10px] text-zinc-500">Ensure MT5 bridge is running or switch to Screenshots.</p>
          </div>
        )}

        <div ref={containerRef} className="w-full h-full" />
      </div>
    </div>
  );
}
