"use client";
import React, {
  useState, useEffect, useRef, useCallback, useMemo,
} from "react";
import {
  BarChart3, RefreshCw, TrendingUp, TrendingDown, Activity,
  Database, FlaskConical, AlertCircle, MoonStar,
} from "lucide-react";

/* ─── Market hours helper ────────────────────────────────────────────────── */
// Forex market is open Sunday 22:00 UTC → Friday 22:00 UTC.
// XAU/USD follows the same schedule.
function isMarketOpen(): boolean {
  const now = new Date();
  const day = now.getUTCDay();   // 0=Sun … 6=Sat
  const hour = now.getUTCHours();
  const min = now.getUTCMinutes();
  const timeVal = hour * 60 + min; // minutes since midnight UTC

  if (day === 6) return false;                        // Saturday all day closed
  if (day === 0 && timeVal < 22 * 60) return false;  // Sunday before 22:00 UTC
  if (day === 5 && timeVal >= 22 * 60) return false; // Friday after 22:00 UTC
  return true;
}

/* ─── Types ──────────────────────────────────────────────────────────────── */
interface Candle {
  time: number;   // unix seconds UTC
  open: number;
  high: number;
  low: number;
  close: number;
}

type DataSource = "mt5" | "demo" | "loading";

/* ─── Constants ──────────────────────────────────────────────────────────── */
const MT5_API = "";

const PAIRS = [
  { label: "XAU/USD", key: "XAUUSD", basePrice: 2900.00, digits: 2, color: "#f59e0b", volatility: 0.0008 },
  { label: "EUR/USD", key: "EURUSD", basePrice: 1.08500, digits: 5, color: "#6366f1", volatility: 0.00015 },
  { label: "GBP/USD", key: "GBPUSD", basePrice: 1.26500, digits: 5, color: "#8b5cf6", volatility: 0.00018 },
  { label: "USD/JPY", key: "USDJPY", basePrice: 149.800, digits: 3, color: "#ef4444", volatility: 0.00013 },
  { label: "AUD/USD", key: "AUDUSD", basePrice: 0.63500, digits: 5, color: "#10b981", volatility: 0.00014 },
  { label: "NZD/USD", key: "NZDUSD", basePrice: 0.58500, digits: 5, color: "#14b8a6", volatility: 0.00013 },
  { label: "USD/CHF", key: "USDCHF", basePrice: 0.89500, digits: 5, color: "#0ea5e9", volatility: 0.00012 },
  { label: "USD/CAD", key: "USDCAD", basePrice: 1.35500, digits: 5, color: "#f97316", volatility: 0.00012 },
  { label: "GBP/JPY", key: "GBPJPY", basePrice: 190.500, digits: 3, color: "#ec4899", volatility: 0.00020 },
  { label: "EUR/JPY", key: "EURJPY", basePrice: 162.500, digits: 3, color: "#06b6d4", volatility: 0.00017 },
];

const INTERVALS = [
  { label: "1m", mt5: "M1", seconds: 60, bars: 150 },
  { label: "5m", mt5: "M5", seconds: 300, bars: 150 },
  { label: "15m", mt5: "M15", seconds: 900, bars: 150 },
  { label: "30m", mt5: "M30", seconds: 1800, bars: 100 },
  { label: "1H", mt5: "H1", seconds: 3600, bars: 100 },
  { label: "4H", mt5: "H4", seconds: 14400, bars: 60 },
  { label: "1D", mt5: "D1", seconds: 86400, bars: 60 },
];

const CHART_TYPES = ["Candle", "Line", "Area"] as const;
type ChartType = (typeof CHART_TYPES)[number];

/* ─── Simulation fallback ────────────────────────────────────────────────── */
function generateSimulated(
  basePrice: number,
  volatility: number,
  intervalSec: number,
  bars: number,
): Candle[] {
  const now = Math.floor(Date.now() / 1000);
  const start = Math.floor((now - bars * intervalSec) / intervalSec) * intervalSec;
  const list: Candle[] = [];
  let price = basePrice * (1 + (Math.random() - 0.5) * 0.002);

  for (let i = 0; i < bars; i++) {
    const t = start + i * intervalSec;
    const open = price;
    let high = price, low = price;
    for (let j = 0; j < 20; j++) {
      price += (Math.random() - 0.499) * volatility * price;
      if (price > high) high = price;
      if (price < low) low = price;
    }
    list.push({ time: t, open, high, low, close: price });
  }
  return list;
}

// Simple per-pair simulation cache (keyed by "EURUSD-300" etc.) so switching
// pair/TF doesn't regenerate on every render.
const simCache = new Map<string, Candle[]>();
function getSimulated(pair: typeof PAIRS[number], iv: typeof INTERVALS[number]) {
  const k = `${pair.key}-${iv.seconds}`;
  if (!simCache.has(k))
    simCache.set(k, generateSimulated(pair.basePrice, pair.volatility, iv.seconds, iv.bars));
  return simCache.get(k)!;
}

/* ─── LW Chart component ─────────────────────────────────────────────────── */
function LWChart({
  candles,
  chartType,
  pairColor,
  onCrosshairMove,
}: {
  candles: Candle[];
  chartType: ChartType;
  pairColor: string;
  onCrosshairMove?: (price: number | null) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);
  const seriesRef = useRef<any>(null);

  /* Init + full data set — runs when chartType, pairColor, or initial candles change */
  useEffect(() => {
    if (!containerRef.current || candles.length === 0) return;
    let cleanup: (() => void) | null = null;

    const init = async () => {
      const { createChart } = await import("lightweight-charts");
      if (!containerRef.current) return;

      // tear down previous
      if (chartRef.current) {
        try { chartRef.current.remove(); } catch (_) { }
        chartRef.current = null;
        seriesRef.current = null;
      }

      const chart = createChart(containerRef.current, {
        layout: { background: { color: "#0d1117" }, textColor: "#6b7280" },
        grid: {
          vertLines: { color: "rgba(255,255,255,0.04)" },
          horzLines: { color: "rgba(255,255,255,0.04)" },
        },
        crosshair: {
          vertLine: { color: "rgba(255,255,255,0.2)", labelBackgroundColor: "#1f2937" },
          horzLine: { color: "rgba(255,255,255,0.2)", labelBackgroundColor: "#1f2937" },
        },
        rightPriceScale: { borderColor: "rgba(255,255,255,0.06)" },
        timeScale: {
          borderColor: "rgba(255,255,255,0.06)",
          timeVisible: true, secondsVisible: false,
          rightOffset: 8, barSpacing: 8,
        },
        handleScroll: true,
        handleScale: true,
        width: containerRef.current.clientWidth,
        height: containerRef.current.clientHeight,
      });
      chartRef.current = chart;

      // series
      let series: any;
      if (chartType === "Candle") {
        series = chart.addCandlestickSeries({
          upColor: "#22c55e", downColor: "#ef4444",
          wickUpColor: "#16a34a", wickDownColor: "#dc2626",
          borderVisible: false,
        });
      } else if (chartType === "Line") {
        series = chart.addLineSeries({ color: pairColor, lineWidth: 2 });
      } else {
        series = chart.addAreaSeries({
          lineColor: pairColor,
          topColor: `${pairColor}55`,
          bottomColor: `${pairColor}05`,
          lineWidth: 2,
        });
      }
      seriesRef.current = series;

      // data
      const data = chartType === "Candle"
        ? candles
        : candles.map((c) => ({ time: c.time, value: c.close }));
      series.setData(data);
      chart.timeScale().fitContent();

      // crosshair
      if (onCrosshairMove) {
        chart.subscribeCrosshairMove((param: any) => {
          if (!param?.seriesData) { onCrosshairMove(null); return; }
          const d = param.seriesData.values().next().value;
          onCrosshairMove(d?.close ?? d?.value ?? null);
        });
      }

      // resize observer
      const ro = new ResizeObserver(() => {
        if (containerRef.current && chart)
          chart.resize(containerRef.current.clientWidth, containerRef.current.clientHeight);
      });
      ro.observe(containerRef.current!);
      cleanup = () => ro.disconnect();
    };

    init();
    return () => {
      cleanup?.();
      if (chartRef.current) {
        try { chartRef.current.remove(); } catch (_) { }
        chartRef.current = null;
        seriesRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chartType, pairColor, candles.length > 0 ? candles[0].time : 0]);

  /* Live tick — only updates the last candle, no chart recreation */
  useEffect(() => {
    const series = seriesRef.current;
    if (!series || candles.length === 0) return;
    const last = candles[candles.length - 1];
    try {
      if (chartType === "Candle") series.update(last);
      else series.update({ time: last.time, value: last.close });
    } catch (_) {
      /* time went backwards — do a full setData */
      try {
        const data = chartType === "Candle"
          ? candles
          : candles.map((c) => ({ time: c.time, value: c.close }));
        series.setData(data);
      } catch (_2) { }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candles]);

  return <div ref={containerRef} className="w-full h-full" />;
}

/* ─── Page ───────────────────────────────────────────────────────────────── */
export default function LiveMonitorChart() {
  const [pair, setPair] = useState(PAIRS[0]);
  const [iv, setIv] = useState(INTERVALS[1]);  // 5m default
  const [ct, setCt] = useState<ChartType>("Candle");
  const [candles, setCandles] = useState<Candle[]>([]);
  const [livePrice, setLivePrice] = useState<number | null>(null);
  const [prevClose, setPrevClose] = useState<number | null>(null);
  const [source, setSource] = useState<DataSource>("loading");
  const [crosshair, setCrosshair] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [marketOpen, setMarketOpen] = useState<boolean>(isMarketOpen());

  // Execution states
  const [lotSize, setLotSize] = useState<number>(0.01);
  const [isExecuting, setIsExecuting] = useState(false);

  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Re-check market status every minute
  useEffect(() => {
    setMarketOpen(isMarketOpen());
    const moId = setInterval(() => setMarketOpen(isMarketOpen()), 60_000);
    return () => clearInterval(moId);
  }, []);

  /* ── Fetch: try MT5 → fall back to demo ── */
  const loadData = useCallback(async () => {
    setSource("loading");
    setError(null);

    try {
      const res = await fetch(
        `${MT5_API}/api/candles?symbol=${pair.key}&timeframe=${iv.mt5}&count=${iv.bars}`,
        { signal: AbortSignal.timeout(3000) },
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();

      if (json.error || !json.candles?.length) {
        throw new Error(json.error ?? "No candles returned");
      }

      const sorted: Candle[] = (json.candles as Candle[])
        .sort((a, b) => a.time - b.time);

      setCandles(sorted);
      const last = sorted[sorted.length - 1];
      const prev = sorted[sorted.length - 2];
      setLivePrice(last.close);
      setPrevClose(prev?.close ?? null);
      setSource("mt5");
      return; // success — no need for demo
    } catch (e: any) {
      setError(`MT5 unreachable — using demo prices (${e?.message ?? "timeout"})`);
    }

    /* Demo fallback */
    const sim = getSimulated(pair, iv);
    setCandles([...sim]);
    const last = sim[sim.length - 1];
    const prev = sim[sim.length - 2];
    setLivePrice(last.close);
    setPrevClose(prev?.close ?? null);
    setSource("demo");
  }, [pair, iv]);

  useEffect(() => { loadData(); }, [loadData]);

  /* ── Live tick — MT5 OR Demo ── */
  useEffect(() => {
    if (!marketOpen) {
      // Market closed: clear any running interval, leave candles static
      if (tickRef.current) clearInterval(tickRef.current);
      tickRef.current = null;
      return;
    }

    const { volatility } = pair;
    const { seconds } = iv;

    const tick = async () => {
      // 1. Live MT5 polling
      if (source === "mt5") {
        try {
          // Poll for the last 2 candles to seamlessly update or append the active forming candle
          const res = await fetch(`${MT5_API}/api/candles?symbol=${pair.key}&timeframe=${iv.mt5}&count=2`, { signal: AbortSignal.timeout(2000) });
          if (!res.ok) return;
          const json = await res.json();
          if (json.error || !json.candles?.length) return;

          setCandles(prev => {
            if (prev.length === 0) return prev;
            const newCandles = json.candles as Candle[];
            const forming = newCandles[newCandles.length - 1]; // Current active candle

            const last = prev[prev.length - 1];

            if (forming.time === last.time) {
              // Same candle, update it
              const updated = [...prev];
              updated[updated.length - 1] = forming;
              setLivePrice(forming.close);
              return updated;
            } else if (forming.time > last.time) {
              // New candle started
              const updated = [...prev, forming];
              setPrevClose(last.close);
              setLivePrice(forming.close);
              return updated;
            }
            return prev;
          });
        } catch (e) {
          // Ignoring network timeout for tick
        }
        return;
      }

      // 2. Demo fallback drift
      setCandles((prev) => {
        if (prev.length === 0) return prev;
        const last = prev[prev.length - 1];
        const now = Math.floor(Date.now() / 1000);
        const bucket = Math.floor(now / seconds) * seconds;
        const drift = (Math.random() - 0.499) * volatility * last.close;
        const newP = last.close + drift;

        if (bucket === last.time) {
          const updated: Candle = {
            time: last.time, open: last.open,
            high: Math.max(last.high, newP),
            low: Math.min(last.low, newP),
            close: newP,
          };
          setLivePrice(newP);
          return [...prev.slice(0, -1), updated];
        } else {
          const nc: Candle = {
            time: bucket, open: last.close,
            high: Math.max(last.close, newP),
            low: Math.min(last.close, newP),
            close: newP,
          };
          setPrevClose(last.close);
          setLivePrice(newP);
          return [...prev.slice(-300), nc];
        }
      });
    };

    if (tickRef.current) clearInterval(tickRef.current);
    tickRef.current = setInterval(tick, 1000);
    return () => { if (tickRef.current) clearInterval(tickRef.current); };
  }, [pair, iv, marketOpen, source]);

  /* ── Derived ── */
  const displayPrice = crosshair ?? livePrice;
  const isUp = displayPrice !== null && prevClose !== null ? displayPrice >= prevClose : true;
  const priceChange = livePrice !== null && prevClose !== null ? livePrice - prevClose : null;
  const pricePct = priceChange !== null && prevClose ? (priceChange / prevClose) * 100 : null;
  const dayHigh = useMemo(() => candles.length ? Math.max(...candles.map((c) => c.high)) : null, [candles]);
  const dayLow = useMemo(() => candles.length ? Math.min(...candles.map((c) => c.low)) : null, [candles]);

  /* ── Trade Execution ── */
  const executeTrade = async (action: "buy" | "sell") => {
    if (source !== "mt5") {
      alert(`Cannot execute trade: MT5 is disconnected. You are viewing demo data.`);
      return;
    }
    setIsExecuting(true);
    try {
      const res = await fetch(`${MT5_API}/api/execute-trade`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol: pair.key,
          action,
          lot_size: lotSize
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert(`Trade Successful! ${action.toUpperCase()} ${lotSize} on ${pair.key} @ ${data.price || "market"}\nTicket: ${data.ticket}`);
      } else {
        alert(`Trade Failed: ${data.error}`);
      }
    } catch (e: any) {
      alert(`Error sending order: ${e.message}`);
    } finally {
      setIsExecuting(false);
    }
  };

  /* ── Button helpers ── */
  const pairBtn = (p: typeof PAIRS[number]) =>
    `px-2.5 py-1.5 rounded-md text-xs font-bold transition-all ${pair.key === p.key ? "text-black shadow-md" : "text-muted-foreground hover:text-foreground hover:bg-muted"
    }`;
  const tfBtn = (t: typeof INTERVALS[number]) =>
    `px-2.5 py-1.5 rounded-md text-xs font-bold transition-all ${iv.seconds === t.seconds ? "bg-violet-600 text-foreground shadow-md" : "text-muted-foreground hover:text-foreground hover:bg-muted"
    }`;
  const ctBtn = (c: ChartType) =>
    `px-2.5 py-1.5 rounded-md text-xs font-semibold transition-all ${ct === c ? "bg-emerald-600 text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted"
    }`;

  /* ── Market status badge ── */
  const MarketBadge = () => {
    if (!marketOpen) return (
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-600/30 bg-slate-800/50 text-xs font-medium text-slate-400">
        <MoonStar size={12} />
        Market Closed
      </div>
    );
    return (
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-xs font-medium text-emerald-400">
        <Activity size={12} className="animate-pulse" />
        Live
      </div>
    );
  };

  /* ── Source badge ── */
  const SourceBadge = () => {
    if (source === "loading") return (
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-card text-xs text-muted-foreground">
        <div className="w-3 h-3 rounded-full border border-violet-500 border-t-transparent animate-spin" />
        Loading…
      </div>
    );
    if (source === "mt5") return (
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-xs font-medium text-emerald-400">
        <Database size={12} />
        MT5 Real Data
      </div>
    );
    return (
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 text-xs font-medium text-amber-400">
        <FlaskConical size={12} />
        Demo / Simulated
      </div>
    );
  };

  /* ── Render ── */
  return (
    <div className="flex flex-col gap-3" style={{ height: "calc(100vh - 88px)" }}>

      {/* Header row */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-4">
          {/* Title */}
          <div>
            <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
              <BarChart3 className="text-amber-400" size={22} />
              Live Chart Monitor
            </h1>
            <p className="text-muted-foreground text-xs mt-0.5">
              Lightweight Charts™ (TradingView open-source) · All pairs
            </p>
          </div>

          {/* Price card */}
          {displayPrice !== null && (
            <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl border border-border bg-card">
              <div>
                <div className="text-xs text-muted-foreground mb-0.5 font-medium">{pair.label}</div>
                <div className={`text-2xl font-bold font-mono leading-none ${isUp ? "text-emerald-400" : "text-red-400"}`}>
                  {displayPrice.toFixed(pair.digits)}
                </div>
              </div>
              {priceChange !== null && (
                <div className="flex flex-col items-end gap-0.5">
                  <div className={`flex items-center gap-1 text-xs font-semibold ${isUp ? "text-emerald-400" : "text-red-400"}`}>
                    {isUp ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                    {priceChange >= 0 ? "+" : ""}{priceChange.toFixed(pair.digits)}
                  </div>
                  {pricePct !== null && (
                    <div className={`text-xs font-medium px-1.5 py-0.5 rounded ${isUp ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400"}`}>
                      {pricePct >= 0 ? "+" : ""}{pricePct.toFixed(3)}%
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* H/L */}
          {dayHigh !== null && (
            <div className="flex items-center gap-3 text-xs">
              <div>
                <div className="text-muted-foreground">H</div>
                <div className="text-emerald-400 font-mono font-semibold">{dayHigh.toFixed(pair.digits)}</div>
              </div>
              <div>
                <div className="text-muted-foreground">L</div>
                <div className="text-red-400 font-mono font-semibold">{dayLow?.toFixed(pair.digits)}</div>
              </div>
            </div>
          )}
        </div>

        {/* Right controls */}
        <div className="flex items-center gap-4">

          {/* Trade Execution Panel */}
          <div className="flex items-center gap-2 bg-card border border-border/60 p-1.5 rounded-xl shadow-sm">
            <div className="flex items-center gap-1 bg-secondary/40 px-2 py-1.5 rounded-lg border border-border/50">
              <span className="text-xs font-bold text-muted-foreground mr-1">LOT:</span>
              <button
                onClick={() => setLotSize(prev => Math.max(0.01, prev - 0.01))}
                className="w-5 h-5 flex items-center justify-center rounded bg-card border border-border hover:bg-muted text-xs font-bold"
              >-</button>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={lotSize}
                onChange={(e) => setLotSize(parseFloat(e.target.value) || 0.01)}
                className="w-14 bg-transparent text-center text-sm font-black focus:outline-none"
              />
              <button
                onClick={() => setLotSize(prev => prev + 0.01)}
                className="w-5 h-5 flex items-center justify-center rounded bg-card border border-border hover:bg-muted text-xs font-bold"
              >+</button>
            </div>

            <button
              onClick={() => executeTrade("sell")}
              disabled={isExecuting || source !== "mt5"}
              className="px-4 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-500 font-bold text-sm transition-colors disabled:opacity-40 flex items-center gap-1"
            >
              <TrendingDown size={14} /> Sell
            </button>

            <button
              onClick={() => executeTrade("buy")}
              disabled={isExecuting || source !== "mt5"}
              className="px-4 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-500 font-bold text-sm transition-colors disabled:opacity-40 flex items-center gap-1"
            >
              <TrendingUp size={14} /> Buy
            </button>
          </div>

          <SourceBadge />
          <MarketBadge />
          <button
            onClick={loadData}
            title="Reload"
            className="p-2 rounded-lg border border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground transition-all"
          >
            <RefreshCw size={15} />
          </button>
        </div>
      </div>

      {/* MT5 error / demo notice */}
      {error && (
        <div className="flex items-start gap-2 px-3 py-2 rounded-lg border border-amber-500/20 bg-amber-500/5 flex-shrink-0">
          <AlertCircle size={14} className="text-amber-400 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-amber-300/80">
            <span className="font-semibold text-amber-400">MT5 not connected → Demo mode. </span>
            {error} · Start <code className="bg-black/30 px-1 rounded">python mt5_bridge.py</code> in your project folder to get real data.
          </p>
        </div>
      )}

      {/* Pair selector */}
      <div className="flex flex-wrap items-center gap-1.5 flex-shrink-0">
        <div className="flex flex-wrap items-center gap-0.5 bg-card rounded-lg border border-border p-1">
          {PAIRS.map((p) => (
            <button
              key={p.key}
              onClick={() => setPair(p)}
              className={pairBtn(p)}
              style={pair.key === p.key
                ? { backgroundColor: p.color + "22", color: p.color, border: `1px solid ${p.color}44` }
                : {}}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* TF + type row */}
      <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
        {/* Timeframe */}
        <div className="flex items-center gap-0.5 bg-card rounded-lg border border-border p-1">
          <span className="px-2 text-xs text-muted-foreground">TF:</span>
          {INTERVALS.map((t) => (
            <button key={t.label} onClick={() => setIv(t)} className={tfBtn(t)}>
              {t.label}
            </button>
          ))}
        </div>
        {/* Chart type */}
        <div className="flex items-center gap-0.5 bg-card rounded-lg border border-border p-1">
          <span className="px-2 text-xs text-muted-foreground">Type:</span>
          {CHART_TYPES.map((c) => (
            <button key={c} onClick={() => setCt(c)} className={ctBtn(c)}>{c}</button>
          ))}
        </div>
        {/* Stats */}
        <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
          <span>
            <span className="text-foreground font-medium">{candles.length}</span> candles
          </span>
          <span>·</span>
          <span className="text-violet-400 font-medium">{iv.label}</span>
          <span>·</span>
          <span style={{ color: pair.color }} className="font-medium">{pair.label}</span>
          {source === "mt5" && (
            <>
              <span>·</span>
              <span className="text-emerald-400 font-medium">MT5 Real</span>
            </>
          )}
          {source === "demo" && (
            <>
              <span>·</span>
              <span className="text-amber-400 font-medium">Demo Prices</span>
            </>
          )}
        </div>
      </div>

      {/* Chart */}
      <div
        className="flex-1 min-h-0 rounded-xl border overflow-hidden"
        style={{ borderColor: `${pair.color}30`, backgroundColor: "#0d1117" }}
      >
        <LWChart
          key={`${pair.key}-${iv.seconds}-${ct}`}
          candles={candles}
          chartType={ct}
          pairColor={pair.color}
          onCrosshairMove={setCrosshair}
        />
      </div>

      {/* Footer */}
      <p className="text-center text-xs text-muted-foreground flex-shrink-0">
        Powered by <span className="text-violet-400">Lightweight Charts™</span> (TradingView open-source) ·{" "}
        {source === "mt5"
          ? <span className="text-emerald-400">Real MT5 broker data</span>
          : <span className="text-amber-400">Demo mode — start MT5 bridge for real prices</span>
        }
        {!marketOpen && (
          <span className="text-slate-500"> · Market closed — chart is static until Sunday 22:00 UTC</span>
        )}
      </p>

    </div>
  );
}
