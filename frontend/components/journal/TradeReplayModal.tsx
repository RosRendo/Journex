"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  RotateCcw,
  Loader2,
  AlertCircle,
  FastForward,
  Target,
  Shield,
  Clock,
  Eye,
  EyeOff,
  TrendingUp,
  TrendingDown,
  Compass,
} from "lucide-react";
import { createChart, IChartApi, ISeriesApi, IPriceLine, Time, LineStyle } from "lightweight-charts";
import { getBackendUrl, fetchWithAuth } from "@/lib/utils";

interface TradeReplayModalProps {
  tradeId: number | string | null;
  onClose: () => void;
}

const TIMEFRAMES = ["M1", "M5", "M15", "M30", "H1", "H4", "D1"];

export function TradeReplayModal({ tradeId, onClose }: TradeReplayModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tradeData, setTradeData] = useState<any>(null);
  const [allCandles, setAllCandles] = useState<any[]>([]);
  const [timeframe, setTimeframe] = useState<string>("M5");
  const [showLevels, setShowLevels] = useState<boolean>(true);

  const [playing, setPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1000); // ms per candle

  // Container DOM element node state for robust lifecycle in Radix Dialog
  const [containerNode, setContainerNode] = useState<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const playIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const entryLineRef = useRef<IPriceLine | null>(null);
  const slLineRef = useRef<IPriceLine | null>(null);
  const tpLineRef = useRef<IPriceLine | null>(null);
  const exitLineRef = useRef<IPriceLine | null>(null);

  // Helper: Find index of closest candle to a target UNIX timestamp (in seconds)
  const findClosestCandleIndex = useCallback((candles: any[], targetSec: number): number => {
    if (!candles || candles.length === 0 || !targetSec) return -1;
    let bestIdx = 0;
    let minDiff = Infinity;
    for (let i = 0; i < candles.length; i++) {
      const diff = Math.abs(candles[i].time - targetSec);
      if (diff < minDiff) {
        minDiff = diff;
        bestIdx = i;
      }
    }
    return bestIdx;
  }, []);

  // Compute entry & exit candle timestamps
  const entryTimeSec = tradeData?.openTimestamp != null
    ? Number(tradeData.openTimestamp)
    : tradeData?.openTime || tradeData?.date
    ? Math.floor(new Date(tradeData.openTime || tradeData.date).getTime() / 1000)
    : 0;
  const exitTimeSec = tradeData?.closeTimestamp != null
    ? Number(tradeData.closeTimestamp)
    : tradeData?.closeTime || tradeData?.date
    ? Math.floor(new Date(tradeData.closeTime || tradeData.date).getTime() / 1000)
    : 0;

  const entryIndex = findClosestCandleIndex(allCandles, entryTimeSec);
  const exitIndex = findClosestCandleIndex(allCandles, exitTimeSec);

  // 1. Fetch Replay Data whenever tradeId or timeframe changes
  useEffect(() => {
    if (!tradeId) return;

    let isMounted = true;
    const fetchReplayData = async () => {
      setLoading(true);
      setError(null);
      setPlaying(false);
      try {
        const res = await fetchWithAuth(`${getBackendUrl()}/api/replay/${tradeId}?timeframe=${timeframe}`);
        const data = await res.json();

        if (!isMounted) return;

        if (data.success) {
          setTradeData(data.trade);
          const candles = data.candles || [];
          setAllCandles(candles);

          // Find entry index in new candles
          const entryTime = data.trade.openTimestamp != null
            ? Number(data.trade.openTimestamp)
            : Math.floor(new Date(data.trade.openTime || data.trade.date).getTime() / 1000);
          const eIdx = findClosestCandleIndex(candles, entryTime);

          // Default view: Show the full trade path from start to end so both entry and exit are IMMEDIATELY visible!
          setCurrentIndex(Math.max(0, candles.length - 1));
        } else {
          setError(data.error || "Failed to load replay data");
        }
      } catch (err) {
        if (isMounted) setError("Network error fetching replay data");
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchReplayData();

    return () => {
      isMounted = false;
    };
  }, [tradeId, timeframe, findClosestCandleIndex]);

  // Helper: Draw / Update horizontal price lines for Entry, SL, TP, Exit
  const updatePriceLines = useCallback(() => {
    if (!seriesRef.current) return;

    // Clean up existing price lines
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
    if (exitLineRef.current) {
      try { seriesRef.current.removePriceLine(exitLineRef.current); } catch (_) {}
      exitLineRef.current = null;
    }

    if (!showLevels || !tradeData) return;

    const pair = String(tradeData.pair || "").toUpperCase();
    const isCrypto = pair.includes("BTC") || pair.includes("ETH");
    const isJpy = pair.includes("JPY");
    const decimals = isCrypto ? 2 : isJpy ? 3 : 2;

    // 1. Entry Line (Sky Blue)
    if (tradeData.entry != null) {
      entryLineRef.current = seriesRef.current.createPriceLine({
        price: Number(tradeData.entry),
        color: "#38bdf8",
        lineWidth: 2,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: `ENTRY ${Number(tradeData.entry).toFixed(decimals)}`,
      });
    }

    // 2. Stop Loss Line (Vibrant Red)
    if (tradeData.sl != null) {
      slLineRef.current = seriesRef.current.createPriceLine({
        price: Number(tradeData.sl),
        color: "#ff5c73",
        lineWidth: 2,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: `SL ${Number(tradeData.sl).toFixed(decimals)}`,
      });
    }

    // 3. Take Profit Line (Vibrant Emerald)
    if (tradeData.tp != null) {
      tpLineRef.current = seriesRef.current.createPriceLine({
        price: Number(tradeData.tp),
        color: "#20e0b2",
        lineWidth: 2,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: `TP ${Number(tradeData.tp).toFixed(decimals)}`,
      });
    }

    // 4. Exit Price Line (Amber Gold)
    if (tradeData.closePrice != null && Number(tradeData.closePrice) !== Number(tradeData.entry)) {
      exitLineRef.current = seriesRef.current.createPriceLine({
        price: Number(tradeData.closePrice),
        color: "#f5c451",
        lineWidth: 1,
        lineStyle: LineStyle.Dotted,
        axisLabelVisible: true,
        title: `EXIT ${Number(tradeData.closePrice).toFixed(decimals)}`,
      });
    }
  }, [showLevels, tradeData]);

  // 2. Initialize Lightweight Chart instance when container node is MOUNTED in the DOM
  useEffect(() => {
    if (!containerNode || !tradeId) return;

    const initialWidth = containerNode.clientWidth || 900;
    const chart = createChart(containerNode, {
      autoSize: true,
      width: initialWidth,
      height: 520,
      layout: {
        background: { type: "solid" as any, color: "transparent" },
        textColor: "#94a3b8",
      },
      grid: {
        vertLines: { color: "rgba(255,255,255,0.04)" },
        horzLines: { color: "rgba(255,255,255,0.04)" },
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        borderColor: "rgba(255,255,255,0.1)",
        rightOffset: 8,
      },
      rightPriceScale: {
        borderColor: "rgba(255,255,255,0.1)",
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

    // ResizeObserver ensures chart canvas accurately tracks modal dimensions after portal animation
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && chartRef.current) {
          chartRef.current.applyOptions({
            width: Math.floor(width),
            height: height > 0 ? Math.floor(height) : 520,
          });
        }
      }
    });

    resizeObserver.observe(containerNode);

    // Initial refit on next frame
    requestAnimationFrame(() => {
      if (containerNode && chart) {
        const w = containerNode.clientWidth;
        if (w > 0) {
          chart.applyOptions({ width: w, height: 520 });
        }
        chart.timeScale().fitContent();
      }
    });

    return () => {
      resizeObserver.disconnect();
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, [containerNode, tradeId]);

  // 3. Update Candles, Price Lines, and Markers when currentIndex, allCandles, or seriesRef changes
  useEffect(() => {
    if (!seriesRef.current || allCandles.length === 0) return;

    const visibleSlice = allCandles.slice(0, currentIndex + 1);
    const visibleData = visibleSlice.map((c) => ({
      time: c.time as Time,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }));

    seriesRef.current.setData(visibleData);

    // Update Price Lines (Entry, SL, TP, Exit)
    updatePriceLines();

    // Render Markers: Entry Arrow & Exit Marker
    if (tradeData) {
      const markers: any[] = [];
      const isLong =
        String(tradeData.direction).toLowerCase().includes("long") ||
        String(tradeData.direction).toLowerCase().includes("buy");

      // 1. Entry Arrow: Visible as soon as currentIndex reaches or passes entryIndex
      if (entryIndex !== -1 && entryIndex <= currentIndex && allCandles[entryIndex]) {
        markers.push({
          time: allCandles[entryIndex].time as Time,
          position: isLong ? "belowBar" : "aboveBar",
          color: isLong ? "#20e0b2" : "#ff5c73",
          shape: isLong ? "arrowUp" : "arrowDown",
          text: `ENTRY @ ${tradeData.entry ?? ""}`,
          size: 2,
        });
      }

      // 2. Exit Marker: Visible as soon as currentIndex reaches or passes exitIndex
      if (exitIndex !== -1 && exitIndex <= currentIndex && allCandles[exitIndex]) {
        const isProfit = Number(tradeData.profit ?? 0) >= 0;
        markers.push({
          time: allCandles[exitIndex].time as Time,
          position: isLong ? "aboveBar" : "belowBar",
          color: isProfit ? "#20e0b2" : "#ff5c73",
          shape: "circle",
          text: `EXIT @ ${tradeData.closePrice ?? ""} (${isProfit ? "+" : ""}$${Number(tradeData.profit ?? 0).toFixed(2)})`,
          size: 2,
        });
      }

      // lightweight-charts requires markers to be strictly sorted by time ascending
      markers.sort((a, b) => Number(a.time) - Number(b.time));
      seriesRef.current.setMarkers(markers);
    }
  }, [currentIndex, allCandles, tradeData, entryIndex, exitIndex, updatePriceLines, containerNode]);

  // 4. Fit content whenever candles are fetched
  useEffect(() => {
    if (chartRef.current && allCandles.length > 0) {
      const timer = setTimeout(() => {
        chartRef.current?.timeScale().fitContent();
      }, 60);
      return () => clearTimeout(timer);
    }
  }, [allCandles]);

  // 5. Auto-Play interval loop
  useEffect(() => {
    if (playing) {
      playIntervalRef.current = setInterval(() => {
        setCurrentIndex((prev) => {
          if (prev >= allCandles.length - 1) {
            setPlaying(false);
            return prev;
          }
          const next = prev + 1;
          // Auto-pause when reaching exit candle
          if (exitIndex !== -1 && next === exitIndex) {
            setPlaying(false);
          }
          return next;
        });
      }, playbackSpeed);
    } else if (playIntervalRef.current) {
      clearInterval(playIntervalRef.current);
    }

    return () => {
      if (playIntervalRef.current) clearInterval(playIntervalRef.current);
    };
  }, [playing, playbackSpeed, allCandles.length, exitIndex]);

  // Navigation jump actions
  const jumpToSetup = () => {
    setPlaying(false);
    setCurrentIndex(Math.max(0, entryIndex - 20));
  };

  const jumpToEntry = () => {
    setPlaying(false);
    setCurrentIndex(Math.max(0, entryIndex));
  };

  const jumpToExit = () => {
    setPlaying(false);
    setCurrentIndex(Math.max(0, exitIndex));
  };

  const jumpToFull = () => {
    setPlaying(false);
    setCurrentIndex(Math.max(0, allCandles.length - 1));
  };

  const handlePrev = () => {
    setPlaying(false);
    setCurrentIndex((prev) => Math.max(0, prev - 1));
  };

  const handleNext = () => {
    if (currentIndex < allCandles.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  // Metrics calculations
  const isLong =
    String(tradeData?.direction).toLowerCase().includes("long") ||
    String(tradeData?.direction).toLowerCase().includes("buy");
  const entryVal = Number(tradeData?.entry || tradeData?.price || 0);
  const slVal = Number(tradeData?.sl || 0);
  const tpVal = Number(tradeData?.tp || 0);
  const closeVal = Number(tradeData?.closePrice || 0);
  const profitVal = Number(tradeData?.profit || 0);

  const risk = Math.abs(entryVal - slVal);
  const reward = Math.abs(tpVal - entryVal);
  const rrRatio = risk > 0 && reward > 0 ? (reward / risk).toFixed(1) : "—";

  const pairStr = String(tradeData?.pair || "").toUpperCase();
  const isJpy = pairStr.includes("JPY");
  const isCrypto = pairStr.includes("BTC") || pairStr.includes("ETH");
  const decimals = isCrypto ? 2 : isJpy ? 3 : 2;

  const currentCandle = allCandles[currentIndex];
  const currentCandleTime = currentCandle?.time
    ? new Date(currentCandle.time * 1000).toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  return (
    <Dialog open={!!tradeId} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[98vw] max-w-6xl max-h-[92vh] flex flex-col overflow-hidden bg-[#0a0a0c] border border-white/10 text-white p-0 shadow-2xl !z-[150]">
        {/* Sticky Modal Header - NEVER scrolls out of view */}
        <DialogHeader className="p-4 border-b border-white/5 bg-[#121216] flex flex-col md:flex-row md:items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
              <Play className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold flex items-center gap-2">
                <span>Trade Replay Cockpit</span>
                {tradeData && (
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-mono font-semibold flex items-center gap-1 ${
                      isLong
                        ? "bg-emerald-500/15 text-[#20e0b2] border border-emerald-500/30"
                        : "bg-rose-500/15 text-[#ff5c73] border border-rose-500/30"
                    }`}
                  >
                    {isLong ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {tradeData.direction?.toUpperCase()}
                  </span>
                )}
                <span className="text-xs text-gray-500 font-mono">#{tradeData?.ticket || tradeId}</span>
              </DialogTitle>
              <p className="text-xs text-gray-400 font-mono">
                {tradeData?.pair} • {tradeData?.openTime ? new Date(tradeData.openTime).toLocaleString() : ""}
              </p>
            </div>
          </div>

          {/* Timeframe Selector & SL/TP Toggle */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400 font-mono flex items-center gap-1 hidden sm:inline-flex">
              <Clock className="w-3.5 h-3.5 text-gray-400" /> Timeframe:
            </span>
            <div className="flex items-center bg-black/60 p-1 rounded-lg border border-white/10 shadow-inner">
              {TIMEFRAMES.map((tf) => (
                <button
                  key={tf}
                  onClick={() => setTimeframe(tf)}
                  disabled={loading}
                  className={`px-2.5 py-1 text-xs font-mono font-bold rounded transition-all ${
                    timeframe === tf
                      ? "bg-[#20e0b2] text-black shadow-md font-extrabold"
                      : "text-gray-400 hover:text-white hover:bg-white/10"
                  }`}
                >
                  {tf}
                </button>
              ))}
            </div>

            {/* Toggle Price Lines */}
            <button
              onClick={() => setShowLevels(!showLevels)}
              title={showLevels ? "Hide SL / TP lines" : "Show SL / TP lines"}
              className={`p-2 rounded-lg border text-xs font-mono flex items-center gap-1.5 transition-all ${
                showLevels
                  ? "bg-white/10 border-white/20 text-[#20e0b2]"
                  : "bg-black/30 border-white/5 text-gray-500 hover:text-gray-300"
              }`}
            >
              {showLevels ? <Eye className="w-4 h-4 text-[#20e0b2]" /> : <EyeOff className="w-4 h-4" />}
              <span className="hidden md:inline font-semibold">SL/TP</span>
            </button>
          </div>
        </DialogHeader>

        {/* Sticky HUD Metrics Strip */}
        {tradeData && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 p-3 bg-[#0d0d10] border-b border-white/5 text-xs font-mono shrink-0">
            <div className="bg-black/40 p-2 rounded border border-white/5 flex flex-col">
              <span className="text-[10px] text-gray-400 flex items-center gap-1">
                <Compass className="w-3 h-3 text-sky-400" /> ENTRY
              </span>
              <span className="text-sky-400 font-bold text-sm mt-0.5">
                {entryVal ? entryVal.toFixed(decimals) : "—"}
              </span>
            </div>

            <div className="bg-black/40 p-2 rounded border border-white/5 flex flex-col">
              <span className="text-[10px] text-gray-400 flex items-center gap-1">
                <Shield className="w-3 h-3 text-[#ff5c73]" /> STOP LOSS
              </span>
              <span className="text-[#ff5c73] font-bold text-sm mt-0.5">
                {slVal ? slVal.toFixed(decimals) : "—"}
              </span>
            </div>

            <div className="bg-black/40 p-2 rounded border border-white/5 flex flex-col">
              <span className="text-[10px] text-gray-400 flex items-center gap-1">
                <Target className="w-3 h-3 text-[#20e0b2]" /> TAKE PROFIT
              </span>
              <span className="text-[#20e0b2] font-bold text-sm mt-0.5">
                {tpVal ? tpVal.toFixed(decimals) : "—"}
              </span>
            </div>

            <div className="bg-black/40 p-2 rounded border border-white/5 flex flex-col">
              <span className="text-[10px] text-gray-400 flex items-center gap-1">
                <FastForward className="w-3 h-3 text-[#f5c451]" /> EXIT / CLOSE
              </span>
              <span className="text-[#f5c451] font-bold text-sm mt-0.5">
                {closeVal ? closeVal.toFixed(decimals) : "—"}
              </span>
            </div>

            <div className="bg-black/40 p-2 rounded border border-white/5 flex flex-col">
              <span className="text-[10px] text-gray-400">RISK : REWARD</span>
              <span className="text-white font-bold text-sm mt-0.5">1 : {rrRatio}</span>
            </div>

            <div className="bg-black/40 p-2 rounded border border-white/5 flex flex-col">
              <span className="text-[10px] text-gray-400">NET RESULT</span>
              <span
                className={`font-bold text-sm mt-0.5 ${
                  profitVal >= 0 ? "text-[#20e0b2]" : "text-[#ff5c73]"
                }`}
              >
                {profitVal >= 0 ? "+" : ""}${profitVal.toFixed(2)}
              </span>
            </div>
          </div>
        )}

        {/* Scrollable Viewport & Controls */}
        <div className="flex-1 overflow-y-auto p-4 bg-[#08080a] flex flex-col gap-3">
          {/* Interactive Replay Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-[#121216] border border-white/10 shrink-0">
            {/* Playback buttons */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={handlePrev}
                className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 transition-colors"
                disabled={playing || currentIndex <= 0}
                title="Previous Candle"
              >
                <SkipBack className="w-4 h-4" />
              </button>

              <button
                onClick={() => setPlaying(!playing)}
                className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/15 transition-all flex items-center gap-1.5 font-mono text-xs font-bold"
              >
                {playing ? (
                  <>
                    <Pause className="w-4 h-4 text-yellow-400" />
                    <span>PAUSE</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 text-[#20e0b2] fill-[#20e0b2]" />
                    <span>PLAY</span>
                  </>
                )}
              </button>

              <button
                onClick={handleNext}
                className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 transition-colors"
                disabled={playing || currentIndex >= allCandles.length - 1}
                title="Next Candle"
              >
                <SkipForward className="w-4 h-4" />
              </button>

              <div className="h-6 w-px bg-white/10 mx-1" />

              {/* Speed buttons */}
              <button
                onClick={() => setPlaybackSpeed(1000)}
                className={`px-2 py-1 text-xs font-mono font-bold rounded ${
                  playbackSpeed === 1000 ? "bg-white/20 text-white" : "text-gray-500 hover:text-white"
                }`}
              >
                1x
              </button>
              <button
                onClick={() => setPlaybackSpeed(400)}
                className={`px-2 py-1 text-xs font-mono font-bold rounded ${
                  playbackSpeed === 400 ? "bg-white/20 text-white" : "text-gray-500 hover:text-white"
                }`}
              >
                2x
              </button>
              <button
                onClick={() => setPlaybackSpeed(150)}
                className={`px-2 py-1 text-xs font-mono font-bold rounded ${
                  playbackSpeed === 150 ? "bg-white/20 text-white" : "text-gray-500 hover:text-white"
                }`}
              >
                4x
              </button>
            </div>

            {/* Quick Navigation Jump Buttons */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={jumpToSetup}
                className="px-2.5 py-1 text-xs font-mono rounded bg-white/5 hover:bg-white/10 border border-white/5 text-gray-300 hover:text-white flex items-center gap-1"
                title="Rewind 20 candles prior to entry"
              >
                <RotateCcw className="w-3 h-3 text-sky-400" />
                <span>Approach</span>
              </button>
              <button
                onClick={jumpToEntry}
                className="px-2.5 py-1 text-xs font-mono rounded bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 text-sky-400 font-semibold flex items-center gap-1"
                title="Jump directly to Entry candle"
              >
                <Target className="w-3 h-3" />
                <span>Entry</span>
              </button>
              <button
                onClick={jumpToExit}
                className="px-2.5 py-1 text-xs font-mono rounded bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 font-semibold flex items-center gap-1"
                title="Jump directly to Exit candle"
              >
                <FastForward className="w-3 h-3" />
                <span>Exit</span>
              </button>
              <button
                onClick={jumpToFull}
                className="px-2.5 py-1 text-xs font-mono rounded bg-white/5 hover:bg-white/10 border border-white/5 text-gray-300 hover:text-white"
                title="Show all available candles"
              >
                Full
              </button>
            </div>

            {/* Stage Indicator & Candle Counter */}
            <div className="flex items-center gap-3 text-xs font-mono">
              {currentIndex < entryIndex ? (
                <span className="px-2 py-0.5 rounded bg-blue-500/15 text-blue-400 border border-blue-500/30">
                  PRE-ENTRY SETUP
                </span>
              ) : currentIndex === entryIndex ? (
                <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-[#20e0b2] border border-emerald-500/40 animate-pulse font-bold">
                  🎯 ENTRY EXECUTED
                </span>
              ) : currentIndex < exitIndex ? (
                <span className="px-2 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30">
                  TRADE ACTIVE
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded bg-gray-500/20 text-gray-300 border border-white/10">
                  CLOSED
                </span>
              )}
              <span className="text-gray-400">
                Bar {currentIndex + 1} / {allCandles.length}
                {currentCandleTime && ` • ${currentCandleTime}`}
              </span>
            </div>
          </div>

          {/* Timeline Scrubber Slider */}
          <div className="px-2 py-1 flex items-center gap-3 shrink-0">
            <span className="text-[10px] text-gray-500 font-mono">Start</span>
            <input
              type="range"
              min={0}
              max={Math.max(0, allCandles.length - 1)}
              value={currentIndex}
              onChange={(e) => {
                setPlaying(false);
                setCurrentIndex(Number(e.target.value));
              }}
              className="w-full accent-[#20e0b2] h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer"
            />
            <span className="text-[10px] text-gray-500 font-mono">End</span>
          </div>

          {/* Main Chart Viewport */}
          <div className="relative border border-white/10 rounded-xl overflow-hidden bg-[#070709] shadow-inner min-h-[520px]">
            {/* Loading Overlay */}
            {loading && (
              <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-4 bg-[#08080a]/85 backdrop-blur-sm">
                <Loader2 className="w-9 h-9 text-[#20e0b2] animate-spin" />
                <p className="text-gray-400 animate-pulse font-mono text-sm">
                  Fetching historical {timeframe} OHLC candles...
                </p>
              </div>
            )}

            {/* Error Overlay */}
            {error && !loading && (
              <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-3 text-[#ff5c73] bg-[#08080a]/90 backdrop-blur-sm p-6 text-center">
                <AlertCircle className="w-10 h-10" />
                <p className="font-mono text-sm">{error}</p>
              </div>
            )}

            {/* Replay Background Watermark */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-[0.03] z-0 flex flex-col items-center select-none">
              <Play className="w-36 h-36" />
              <span className="text-5xl font-black tracking-widest mt-2">REPLAY</span>
            </div>

            {/* Chart Canvas: Mounted with state ref so createChart runs on mount in Radix Dialog */}
            <div ref={setContainerNode} className="w-full h-[520px] relative z-10" />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
