"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Maximize2,
  Minimize2,
  TrendingUp,
  BarChart2,
  Layers,
  ChevronDown,
  Sparkles,
  Activity,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { createChart, LineStyle, IChartApi, IPriceLine } from "lightweight-charts";
import { RealCandle } from "@/hooks/useCommandCenterRealData";
import { sanitizeChartData } from "@/lib/chartSanitizer";
import TradingViewWidgetComponent from "@/components/ui/TradingViewWidget";

function mapToTvInterval(tf: string): string {
  const t = (tf || "").toUpperCase();
  if (t === "1M" || t === "M1") return "1";
  if (t === "5M" || t === "M5") return "5";
  if (t === "15M" || t === "M15") return "15";
  if (t === "30M" || t === "M30") return "30";
  if (t === "1H" || t === "H1" || t === "60") return "60";
  if (t === "4H" || t === "H4" || t === "240") return "240";
  if (t === "D1" || t === "1D" || t === "D") return "D";
  if (t === "W1" || t === "1W" || t === "W") return "W";
  if (t === "MN" || t === "1MN" || t === "M") return "M";
  return "60";
}

interface Props {
  symbol: string;
  onSelectSymbol?: (symbol: string) => void;
  timeframe?: string;
  onTimeframeChange?: (tf: string) => void;
  candles?: RealCandle[];
  currentPrice?: number;
  bidPrice?: number;
  askPrice?: number;
  spreadPips?: number;
}

const AVAILABLE_PAIRS = [
  "XAU/USD",
  "EUR/USD",
  "GBP/USD",
  "USD/JPY",
  "AUD/USD",
  "NZD/USD",
  "USD/CAD",
  "USD/CHF",
  "EUR/JPY",
  "GBP/JPY",
  "BTC/USD",
  "NAS100",
  "US30",
];

function calculateEMA(data: Array<{ time: string | number; close: number }>, period: number) {
  if (data.length === 0) return [];
  const k = 2 / (period + 1);
  let ema = data[0].close;
  const out = [{ time: data[0].time, value: ema }];
  for (let i = 1; i < data.length; i++) {
    ema = data[i].close * k + ema * (1 - k);
    out.push({ time: data[i].time, value: Number(ema.toFixed(5)) });
  }
  return sanitizeChartData(out);
}

export default function InstitutionalMacroChart({
  symbol = "EUR/USD",
  onSelectSymbol,
  timeframe = "D1",
  onTimeframeChange,
  candles = [],
  currentPrice,
  bidPrice,
  askPrice,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<any>(null);
  const ema50SeriesRef = useRef<any>(null);
  const ema20SeriesRef = useRef<any>(null);
  const livePriceLineRef = useRef<IPriceLine | null>(null);
  const prevCloseLineRef = useRef<IPriceLine | null>(null);
  const lastCandleRef = useRef<any>(null);
  const isDisposedRef = useRef<boolean>(false);
  const isInitialFitDoneRef = useRef<boolean>(false);
  const lastSymbolRef = useRef<string>(symbol);

  const [activePair, setActivePair] = useState<string>(symbol);
  const [activeTf, setActiveTf] = useState<string>(timeframe);
  const [activeRange, setActiveRange] = useState<string>("6M");
  const [isLive, setIsLive] = useState<boolean>(true);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [priceFlash, setPriceFlash] = useState<"up" | "down" | null>(null);
  const [isPairDropdownOpen, setIsPairDropdownOpen] = useState<boolean>(false);
  const pairDropdownRef = useRef<HTMLDivElement | null>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (pairDropdownRef.current && !pairDropdownRef.current.contains(e.target as Node)) {
        setIsPairDropdownOpen(false);
      }
    };
    if (isPairDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isPairDropdownOpen]);

  // Real MT5 Candles fetched for the active pair
  const [fetchedCandles, setFetchedCandles] = useState<RealCandle[]>([]);
  const [loadingCandles, setLoadingCandles] = useState<boolean>(false);
  const [chartEngine, setChartEngine] = useState<"auto" | "mt5" | "cloud">("auto");

  // Asset Characteristics
  const cleanSymbol = (activePair || symbol).toUpperCase().replace("/", "").replace(".", "");
  const isGold = cleanSymbol.includes("XAU") || cleanSymbol.includes("GOLD");
  const isJpy = cleanSymbol.includes("JPY");
  const isCrypto = cleanSymbol.includes("BTC");
  const digits = isGold || isJpy ? 2 : isCrypto ? 0 : 5;
  const pipUnit = isGold ? 0.1 : isJpy ? 0.01 : isCrypto ? 1.0 : 0.0001;

  // Sync internal pair when prop changes
  useEffect(() => {
    setActivePair(symbol);
    if (lastSymbolRef.current !== symbol) {
      lastSymbolRef.current = symbol;
      setFetchedCandles([]);
      isInitialFitDoneRef.current = false;
      lastCandleRef.current = null;
      try {
        candleSeriesRef.current?.setData([]);
        ema50SeriesRef.current?.setData([]);
        ema20SeriesRef.current?.setData([]);
        if (prevCloseLineRef.current && candleSeriesRef.current) {
          candleSeriesRef.current.removePriceLine(prevCloseLineRef.current);
          prevCloseLineRef.current = null;
        }
        if (livePriceLineRef.current && candleSeriesRef.current) {
          candleSeriesRef.current.removePriceLine(livePriceLineRef.current);
          livePriceLineRef.current = null;
        }
      } catch (_) {}
    }
  }, [symbol]);

  // Fetch real MT5 candles whenever symbol or timeframe changes
  useEffect(() => {
    let isCancelled = false;
    setLoadingCandles(true);

    const loadRealCandles = async () => {
      try {
        const tfMap: Record<string, string> = {
          "1m": "M1", "M1": "M1",
          "5m": "M5", "M5": "M5",
          "15m": "M15", "M15": "M15",
          "30m": "M30", "M30": "M30",
          "1h": "H1", "1H": "H1", "H1": "H1",
          "4h": "H4", "4H": "H4", "H4": "H4",
          "D1": "D1", "1D": "D1", "D": "D1",
          "W1": "W1", "1W": "W1", "W": "W1",
          "MN": "MN1", "1MN": "MN1", "M": "MN1", "MN1": "MN1",
        };
        const queryTf = tfMap[activeTf] || tfMap[activeTf.toUpperCase()] || "H1";
        const res = await fetch(
          `/api/bridge/api/historical-candles?symbol=${cleanSymbol}&timeframe=${queryTf}&count=300`,
          { headers: { "ngrok-skip-browser-warning": "true" } }
        );
        if (res.ok) {
          const json = await res.json();
          if (json.success && Array.isArray(json.data) && json.data.length > 0 && !isCancelled) {
            setFetchedCandles(sanitizeChartData(json.data));
            setLoadingCandles(false);
            return;
          }
        }
      } catch (_) {}

      // Fallback to Terminal Snapshot API
      try {
        const snapRes = await fetch(
          `/api/terminal/candles?symbol=${cleanSymbol}&timeframe=${activeTf || "M15"}&limit=100`
        );
        if (snapRes.ok) {
          const snapJson = await snapRes.json();
          if (Array.isArray(snapJson.candles) && snapJson.candles.length > 0 && !isCancelled) {
            setFetchedCandles(sanitizeChartData(snapJson.candles));
          }
        }
      } catch (_) {}

      if (!isCancelled) setLoadingCandles(false);
    };

    loadRealCandles();
    return () => {
      isCancelled = true;
    };
  }, [cleanSymbol, activeTf]);

  const handlePairClick = (p: string) => {
    setActivePair(p);
    setFetchedCandles([]);
    isInitialFitDoneRef.current = false;
    lastCandleRef.current = null;
    try {
      candleSeriesRef.current?.setData([]);
      ema50SeriesRef.current?.setData([]);
      ema20SeriesRef.current?.setData([]);
      if (prevCloseLineRef.current && candleSeriesRef.current) {
        candleSeriesRef.current.removePriceLine(prevCloseLineRef.current);
        prevCloseLineRef.current = null;
      }
      if (livePriceLineRef.current && candleSeriesRef.current) {
        candleSeriesRef.current.removePriceLine(livePriceLineRef.current);
        livePriceLineRef.current = null;
      }
    } catch (_) {}
    if (onSelectSymbol) onSelectSymbol(p.replace("/", ""));
  };

  const handleTfClick = (tf: string) => {
    setActiveTf(tf);
    isInitialFitDoneRef.current = false;
    if (onTimeframeChange) onTimeframeChange(tf);
  };

  // Determine if incoming props candles actually match the active asset's price scale
  const isPropCandlesCompatible = useMemo(() => {
    if (!candles || candles.length < 5) return false;
    const samplePrice = candles[candles.length - 1].close;
    if (isGold) return samplePrice > 1000;
    if (isCrypto) return samplePrice > 10000;
    if (isJpy) return samplePrice > 50 && samplePrice < 300;
    return samplePrice > 0.3 && samplePrice < 5.0; // Standard FX range
  }, [candles, isGold, isCrypto, isJpy]);

  const effectiveCandles = useMemo(() => {
    if (fetchedCandles.length >= 5) return fetchedCandles;
    if (isPropCandlesCompatible && candles && candles.length >= 5) return candles;
    return [];
  }, [fetchedCandles, isPropCandlesCompatible, candles]);

  const chartData = useMemo(() => {
    if (effectiveCandles.length >= 5) {
      const times = effectiveCandles.map((c) => c.time);
      const minTime = Math.min(...times);
      const maxTime = Math.max(...times);
      const spanDays = (maxTime - minTime) / 86400;
      const isDailyOrHigher = activeTf === "D1" || activeTf === "W1" || activeTf === "MN" || spanDays > 10;

      const mapped = effectiveCandles.map((c) => {
        let timeVal: string | number;
        if (isDailyOrHigher) {
          const d = new Date(typeof c.time === "number" ? c.time * 1000 : c.time);
          timeVal = d.toISOString().split("T")[0];
        } else {
          timeVal = typeof c.time === "number" ? c.time : Math.floor(new Date(c.time).getTime() / 1000);
        }
        return {
          time: timeVal,
          open: Number(c.open.toFixed(digits)),
          high: Number(c.high.toFixed(digits)),
          low: Number(c.low.toFixed(digits)),
          close: Number(c.close.toFixed(digits)),
          volume: c.volume || 1000,
        };
      });
      return sanitizeChartData(mapped);
    }
    return [];
  }, [effectiveCandles, activeTf, digits]);

  const isCloudMode = chartEngine === "cloud" || (!loadingCandles && chartData.length === 0);

  // Dynamic OHLC and Prices extracted strictly from real chart data
  const lastBar = chartData.length > 0 ? chartData[chartData.length - 1] : null;
  const prevBar = chartData.length > 1 ? chartData[chartData.length - 2] : null;

  const livePriceVal = bidPrice || currentPrice || (lastBar ? lastBar.close : null);
  const openVal = lastBar ? lastBar.open : null;
  const highVal = lastBar ? lastBar.high : null;
  const lowVal = lastBar ? lastBar.low : null;
  const prevCloseVal = prevBar ? prevBar.close : null;

  const priceDiff = (livePriceVal !== null && prevCloseVal !== null) ? Number((livePriceVal - prevCloseVal).toFixed(digits)) : null;
  const pctDiff = (prevCloseVal && prevCloseVal > 0 && priceDiff !== null) ? ((priceDiff / prevCloseVal) * 100).toFixed(2) : "--";
  const isGain = priceDiff !== null ? priceDiff >= 0 : true;

  // Initialize Lightweight Charts
  useEffect(() => {
    if (!containerRef.current) return;
    isDisposedRef.current = false;
    containerRef.current.innerHTML = "";

    const chart = createChart(containerRef.current, {
      layout: {
        background: { color: "#09090e" },
        textColor: "#a1a1aa",
        fontFamily: "JetBrains Mono, monospace",
        fontSize: 10,
      },
      grid: {
        vertLines: { color: "rgba(255, 255, 255, 0.03)" },
        horzLines: { color: "rgba(255, 255, 255, 0.03)" },
      },
      crosshair: {
        mode: 1,
        vertLine: {
          color: "rgba(32, 224, 178, 0.25)",
          style: LineStyle.Dotted,
          labelBackgroundColor: "#161622",
        },
        horzLine: {
          color: "rgba(32, 224, 178, 0.25)",
          style: LineStyle.Dotted,
          labelBackgroundColor: "#161622",
        },
      },
      rightPriceScale: {
        borderColor: "rgba(255, 255, 255, 0.06)",
        scaleMargins: { top: 0.12, bottom: 0.12 },
        alignLabels: true,
      },
      timeScale: {
        borderColor: "rgba(255, 255, 255, 0.06)",
        timeVisible: true,
        secondsVisible: false,
      },
      handleScale: true,
      handleScroll: true,
    });
    chartRef.current = chart;

    // Candlestick series (#20e0b2 Mint & #ff5c73 Rose)
    const candleSeries = chart.addCandlestickSeries({
      upColor: "#20e0b2",
      downColor: "#ff5c73",
      borderUpColor: "#20e0b2",
      borderDownColor: "#ff5c73",
      wickUpColor: "#20e0b2",
      wickDownColor: "#ff5c73",
      priceFormat: {
        type: "price",
        precision: digits,
        minMove: 1 / Math.pow(10, digits),
      },
    });
    candleSeriesRef.current = candleSeries;

    // EMA 50 line (Amber Gold)
    const ema50Series = chart.addLineSeries({
      color: "#f59e0b",
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: false,
    });
    ema50SeriesRef.current = ema50Series;

    // EMA 20 line (Mint Emerald)
    const ema20Series = chart.addLineSeries({
      color: "#20e0b2",
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: false,
    });
    ema20SeriesRef.current = ema20Series;

    // Resize observer
    const resizeObserver = new ResizeObserver((entries) => {
      if (isDisposedRef.current || !chartRef.current || !containerRef.current) return;
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          try {
            chartRef.current.applyOptions({ width, height });
          } catch (_) {}
        }
      }
    });

    resizeObserver.observe(containerRef.current);

    return () => {
      isDisposedRef.current = true;
      resizeObserver.disconnect();
      if (chartRef.current) {
        try {
          chartRef.current.remove();
        } catch (_) {}
        chartRef.current = null;
      }
      candleSeriesRef.current = null;
      ema50SeriesRef.current = null;
      ema20SeriesRef.current = null;
      livePriceLineRef.current = null;
      prevCloseLineRef.current = null;
    };
  }, [digits]);

  // Data update pipeline with single-run fitContent on symbol switch
  useEffect(() => {
    if (isDisposedRef.current || !chartRef.current || !candleSeriesRef.current) return;
    if (chartData.length === 0) {
      // Clear out series immediately so old symbol data doesn't linger
      try {
        candleSeriesRef.current.setData([]);
        if (ema50SeriesRef.current) ema50SeriesRef.current.setData([]);
        if (ema20SeriesRef.current) ema20SeriesRef.current.setData([]);
        if (prevCloseLineRef.current && candleSeriesRef.current) {
          candleSeriesRef.current.removePriceLine(prevCloseLineRef.current);
          prevCloseLineRef.current = null;
        }
        if (livePriceLineRef.current && candleSeriesRef.current) {
          candleSeriesRef.current.removePriceLine(livePriceLineRef.current);
          livePriceLineRef.current = null;
        }
      } catch (_) {}
      return;
    }

    try {
      candleSeriesRef.current.setData(chartData as any);
      if (ema50SeriesRef.current) {
        ema50SeriesRef.current.setData(calculateEMA(chartData, 50) as any);
      }
      if (ema20SeriesRef.current) {
        ema20SeriesRef.current.setData(calculateEMA(chartData, 20) as any);
      }

      // Re-create dynamic price lines for the active asset price
      if (prevCloseLineRef.current) {
        try {
          candleSeriesRef.current.removePriceLine(prevCloseLineRef.current);
        } catch (_) {}
        prevCloseLineRef.current = null;
      }
      if (livePriceLineRef.current) {
        try {
          candleSeriesRef.current.removePriceLine(livePriceLineRef.current);
        } catch (_) {}
        livePriceLineRef.current = null;
      }

      // Price compatibility sanity check: do not draw price lines that distort the chart Y scale
      const lows = chartData.map((c) => c.low);
      const highs = chartData.map((c) => c.high);
      const minP = Math.min(...lows);
      const maxP = Math.max(...highs);
      const range = (maxP - minP) || maxP * 0.1;
      const isPriceCompatible = (p: number) => p >= minP - range * 0.5 && p <= maxP + range * 0.5;

      if (prevCloseVal !== null && isPriceCompatible(prevCloseVal)) {
        prevCloseLineRef.current = candleSeriesRef.current.createPriceLine({
          price: prevCloseVal,
          color: "rgba(255, 255, 255, 0.35)",
          lineWidth: 1,
          lineStyle: LineStyle.Dotted,
          axisLabelVisible: true,
          title: `Prev C ${prevCloseVal.toFixed(digits)}`,
        });
      }

      if (livePriceVal !== null && isPriceCompatible(livePriceVal)) {
        livePriceLineRef.current = candleSeriesRef.current.createPriceLine({
          price: livePriceVal,
          color: isGain ? "#20e0b2" : "#ff5c73",
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          title: livePriceVal.toFixed(digits),
        });
      }

      if (!isInitialFitDoneRef.current) {
        chartRef.current.timeScale().fitContent();
        isInitialFitDoneRef.current = true;
      }
    } catch (err) {
      console.warn("InstitutionalMacroChart update error:", err);
    }
  }, [chartData, digits, prevCloseVal, livePriceVal, isGain]);

  return (
    <div
      className={`w-full h-full flex flex-col bg-[#09090e] select-none text-[9.5px] font-mono ${
        isExpanded ? "fixed inset-0 z-50 p-4 bg-[#070709]" : ""
      }`}
    >
      {/* ── ROW 1: HEADER & CURRENCY DROPDOWN ──────────────────────────────── */}
      <div className="h-7 px-2.5 bg-[#0d0d14] border-b border-white/[0.07] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 relative">
          <span className="text-[8.5px] font-extrabold text-zinc-400 tracking-wider uppercase flex items-center gap-1.5 shrink-0">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#20e0b2] opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#20e0b2]" />
            </span>
            PRICE CHART
          </span>

          {/* Pair Selector Dropdown */}
          <div className="relative" ref={pairDropdownRef}>
            <button
              onClick={() => setIsPairDropdownOpen(!isPairDropdownOpen)}
              className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[#161622] hover:bg-[#1e1e2d] border border-white/10 text-white font-bold text-[9px] transition-all hover:border-[#20e0b2]/40 cursor-pointer shadow-sm"
              title="Change Asset"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#20e0b2]" />
              <span className="tracking-wide text-zinc-100">{activePair}</span>
              <ChevronDown
                className={`w-3 h-3 text-zinc-400 transition-transform duration-200 ${
                  isPairDropdownOpen ? "rotate-180 text-[#20e0b2]" : ""
                }`}
              />
            </button>

            {isPairDropdownOpen && (
              <div className="absolute left-0 top-full mt-1 w-36 rounded-lg bg-[#0e0e15] border border-white/15 shadow-2xl py-1 z-50 text-[9px] font-mono backdrop-blur-md">
                <div className="px-2.5 py-1 text-[7.5px] font-bold text-zinc-500 uppercase tracking-wider border-b border-white/[0.06] flex items-center justify-between">
                  <span>Select Instrument</span>
                  <span className="text-[7px] text-[#20e0b2]">MT5 Real</span>
                </div>
                <div className="max-h-48 overflow-y-auto py-0.5">
                  {AVAILABLE_PAIRS.map((sym) => {
                    const isMatch = activePair.replace("/", "") === sym.replace("/", "");
                    return (
                      <button
                        key={sym}
                        onClick={() => {
                          handlePairClick(sym);
                          setIsPairDropdownOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-2.5 py-1 text-left transition-colors cursor-pointer ${
                          isMatch
                            ? "bg-[#20e0b2]/15 text-[#20e0b2] font-bold"
                            : "text-zinc-300 hover:bg-white/[0.06] hover:text-white"
                        }`}
                      >
                        <span>{sym}</span>
                        {isMatch && <span className="w-1.5 h-1.5 rounded-full bg-[#20e0b2]" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 text-[8px] text-zinc-400 shrink-0">
          <button
            onClick={() => setIsLive(!isLive)}
            className={`flex items-center gap-1.5 px-2 py-0.5 rounded border transition-colors ${
              isLive ? "border-[#20e0b2]/40 text-[#20e0b2] bg-[#20e0b2]/10" : "border-white/10 text-zinc-400"
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${isLive ? "bg-[#20e0b2] animate-pulse" : "bg-zinc-500"}`}
            />
            <span className="font-bold">{isLive ? "LIVE FEED" : "PAUSED"}</span>
          </button>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="hover:text-white transition-colors"
          >
            {isExpanded ? (
              <Minimize2 className="w-3 h-3 text-zinc-400 hover:text-white" />
            ) : (
              <Maximize2 className="w-3 h-3 text-zinc-400 hover:text-white" />
            )}
          </button>
        </div>
      </div>

      {/* ── ROW 2: TIMEFRAMES, RANGES & INDICATOR BUTTONS ──────────────────── */}
      <div className="h-6 px-2.5 bg-[#0b0b10] border-b border-white/[0.05] flex items-center justify-between shrink-0 text-[8.5px]">
        {/* Left: Timeframes */}
        <div className="flex items-center gap-0.5 bg-black/40 p-0.5 rounded border border-white/5">
          {["15m", "1h", "4h", "D1", "W1", "MN"].map((tf) => (
            <button
              key={tf}
              onClick={() => handleTfClick(tf)}
              className={`px-1.5 py-0.5 rounded font-bold transition-all ${
                activeTf.toLowerCase() === tf.toLowerCase()
                  ? "bg-[#20e0b2]/20 text-[#20e0b2] border border-[#20e0b2]/30"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {tf}
            </button>
          ))}
        </div>

        {/* Center: Ranges */}
        <div className="flex items-center gap-1">
          {["1M", "3M", "6M", "YTD", "1Y", "ALL"].map((rg) => (
            <button
              key={rg}
              onClick={() => setActiveRange(rg)}
              className={`px-1 py-0.5 rounded transition-all ${
                activeRange === rg
                  ? "bg-white/15 text-white font-bold"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {rg}
            </button>
          ))}
        </div>

        {/* Right: Indicators & Tools */}
        <div className="flex items-center gap-2">
          <span className="text-zinc-400 hover:text-white cursor-pointer flex items-center gap-1">
            Candle <ChevronDown className="w-2.5 h-2.5 text-zinc-500" />
          </span>
          <span className="text-zinc-400 hover:text-white cursor-pointer flex items-center gap-1">
            Indicators <ChevronDown className="w-2.5 h-2.5 text-zinc-500" />
          </span>
          <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold">
            EMA 50
          </span>
          <span className="px-1.5 py-0.5 rounded bg-[#20e0b2]/10 text-[#20e0b2] border border-[#20e0b2]/20 font-bold">
            EMA 20
          </span>

          {/* Chart Engine Switcher: MT5 Bridge vs 24/7 Cloud (TradingView) */}
          <div className="flex items-center gap-0.5 bg-black/60 p-0.5 rounded border border-white/10 font-mono ml-1">
            <button
              onClick={() => setChartEngine("mt5")}
              className={`px-1.5 py-0.5 rounded text-[8px] font-bold transition-all ${
                (chartEngine === "mt5" || (chartEngine === "auto" && chartData.length > 0))
                  ? "bg-[#20e0b2]/20 text-[#20e0b2] border border-[#20e0b2]/40"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
              title="Stream direct ticks & candles from local MT5 bridge"
            >
              MT5
            </button>
            <button
              onClick={() => setChartEngine("cloud")}
              className={`px-1.5 py-0.5 rounded text-[8px] font-bold transition-all ${
                (chartEngine === "cloud" || (chartEngine === "auto" && chartData.length === 0 && !loadingCandles))
                  ? "bg-sky-500/20 text-sky-300 border border-sky-500/40"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
              title="24/7 Cloud TradingView stream (No laptop bridge required)"
            >
              ☁ 24/7 Cloud
            </button>
          </div>
        </div>
      </div>

      {/* ── ROW 3: OHLC INFORMATION BAR (DYNAMIC ASSET READOUT) ──────────── */}
      <div className="h-6 px-2.5 bg-[#08080c] border-b border-white/[0.04] flex items-center justify-between text-[8px] text-zinc-400 shrink-0">
        <div className="flex items-center gap-2.5">
          <span className="font-bold text-white tracking-wide">
            {activePair} - {activeTf}
          </span>
          <span className="text-zinc-500">O: {openVal !== null ? openVal.toFixed(digits) : "--"}</span>
          <span className="text-zinc-500">H: {highVal !== null ? highVal.toFixed(digits) : "--"}</span>
          <span className="text-zinc-500">L: {lowVal !== null ? lowVal.toFixed(digits) : "--"}</span>

          {/* Current Price Readout */}
          <div className="px-1.5 py-0.5 rounded border border-white/[0.08] flex items-center gap-1 font-mono">
            {livePriceVal !== null ? (
              <>
                <span className="text-white font-bold">{livePriceVal.toFixed(digits)}</span>
                <span className={`font-bold ${isGain ? "text-[#20e0b2]" : "text-[#ff5c73]"}`}>
                  {priceDiff !== null ? `${priceDiff >= 0 ? "+" : ""}${priceDiff.toFixed(digits)} (${pctDiff}%)` : ""}
                </span>
              </>
            ) : (
              <span className="text-sky-400 font-bold tracking-wider">CLOUD 24/7</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-zinc-500">
            Vol: {lastBar ? `${(lastBar.volume / 1000).toFixed(1)}K` : "--"}
          </span>
          <div className={`flex items-center gap-1 font-bold ${chartData.length > 0 ? "text-[#20e0b2]" : "text-sky-400"}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${chartData.length > 0 ? "bg-[#20e0b2] animate-ping" : "bg-sky-400 animate-pulse"}`} />
            <span>{chartData.length > 0 ? "MT5 Telemetry Active" : "24/7 Cloud Live"}</span>
          </div>
        </div>
      </div>

      {/* ── ROW 4: CHART CANVAS WITH DYNAMIC S/R OVERLAYS & 24/7 CLOUD FALLBACK ── */}
      <div className="flex-1 w-full min-h-[290px] relative">
        {/* Native Lightweight Chart DOM container */}
        <div
          ref={containerRef}
          className="w-full h-full absolute inset-0"
          style={{ display: isCloudMode ? "none" : "block" }}
        />

        {/* 24/7 Cloud TradingView Widget */}
        {isCloudMode && (
          <div className="w-full h-full absolute inset-0">
            <TradingViewWidgetComponent
              symbol={activePair}
              interval={mapToTvInterval(activeTf)}
              height="100%"
              autosize={true}
            />
            {/* 24/7 Cloud Stream Notification Pill */}
            <div className="absolute top-2 right-2 z-20 flex items-center gap-2 bg-[#09090d]/90 backdrop-blur-md px-2.5 py-1 rounded-md border border-white/10 text-[9px] font-mono shadow-md select-none pointer-events-auto">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
              <span className="text-zinc-200 font-bold">24/7 Cloud Live (TradingView)</span>
              <span className="text-zinc-600">·</span>
              <button
                onClick={() => setChartEngine("mt5")}
                className="text-zinc-400 hover:text-white underline decoration-dotted text-[8.5px]"
              >
                Try MT5 Bridge
              </button>
            </div>
          </div>
        )}

        {/* Loading Indicator for MT5 Candles */}
        {!isCloudMode && loadingCandles && chartData.length === 0 && (
          <div className="absolute inset-0 bg-[#09090e]/85 flex flex-col items-center justify-center gap-2 z-20 pointer-events-none">
            <span className="w-5 h-5 rounded-full border-2 border-[#20e0b2] border-t-transparent animate-spin" />
            <span className="text-[10px] text-[#20e0b2] font-mono font-bold tracking-widest uppercase">
              Streaming MT5 Real Candles ({cleanSymbol})...
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
