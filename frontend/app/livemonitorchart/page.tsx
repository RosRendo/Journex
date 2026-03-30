"use client";
import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import {
  BarChart3,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Activity,
  Database,
  FlaskConical,
  AlertCircle,
  MoonStar,
} from "lucide-react";

/* ─── Market hours helper ────────────────────────────────────────────────── */
// Forex market is open Sunday 22:00 UTC → Friday 22:00 UTC.
// XAU/USD follows the same schedule.
function isMarketOpen(): boolean {
  const now = new Date();
  const day = now.getUTCDay(); // 0=Sun … 6=Sat
  const hour = now.getUTCHours();
  const min = now.getUTCMinutes();
  const timeVal = hour * 60 + min; // minutes since midnight UTC

  if (day === 6) return false; // Saturday all day closed
  if (day === 0 && timeVal < 22 * 60) return false; // Sunday before 22:00 UTC
  if (day === 5 && timeVal >= 22 * 60) return false; // Friday after 22:00 UTC
  return true;
}

/* ─── Types ──────────────────────────────────────────────────────────────── */
interface Candle {
  time: number; // unix seconds UTC
  open: number;
  high: number;
  low: number;
  close: number;
}

type DataSource = "mt5" | "demo" | "loading";

/* ─── Constants ──────────────────────────────────────────────────────────── */
const MT5_API = "";

const PAIRS = [
  {
    label: "XAU/USD",
    key: "XAUUSD",
    basePrice: 2900.0,
    digits: 2,
    color: "#f59e0b",
    volatility: 0.0008,
  },
  {
    label: "EUR/USD",
    key: "EURUSD",
    basePrice: 1.085,
    digits: 5,
    color: "#6366f1",
    volatility: 0.00015,
  },
  {
    label: "GBP/USD",
    key: "GBPUSD",
    basePrice: 1.265,
    digits: 5,
    color: "#8b5cf6",
    volatility: 0.00018,
  },
  {
    label: "USD/JPY",
    key: "USDJPY",
    basePrice: 149.8,
    digits: 3,
    color: "#ef4444",
    volatility: 0.00013,
  },
  {
    label: "AUD/USD",
    key: "AUDUSD",
    basePrice: 0.635,
    digits: 5,
    color: "#10b981",
    volatility: 0.00014,
  },
  {
    label: "NZD/USD",
    key: "NZDUSD",
    basePrice: 0.585,
    digits: 5,
    color: "#14b8a6",
    volatility: 0.00013,
  },
  {
    label: "USD/CHF",
    key: "USDCHF",
    basePrice: 0.895,
    digits: 5,
    color: "#0ea5e9",
    volatility: 0.00012,
  },
  {
    label: "USD/CAD",
    key: "USDCAD",
    basePrice: 1.355,
    digits: 5,
    color: "#f97316",
    volatility: 0.00012,
  },
  {
    label: "GBP/JPY",
    key: "GBPJPY",
    basePrice: 190.5,
    digits: 3,
    color: "#ec4899",
    volatility: 0.0002,
  },
  {
    label: "EUR/JPY",
    key: "EURJPY",
    basePrice: 162.5,
    digits: 3,
    color: "#06b6d4",
    volatility: 0.00017,
  },
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
  const start =
    Math.floor((now - bars * intervalSec) / intervalSec) * intervalSec;
  const list: Candle[] = [];
  let price = basePrice * (1 + (Math.random() - 0.5) * 0.002);

  for (let i = 0; i < bars; i++) {
    const t = start + i * intervalSec;
    const open = price;
    let high = price,
      low = price;
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
function getSimulated(
  pair: (typeof PAIRS)[number],
  iv: (typeof INTERVALS)[number],
) {
  const k = `${pair.key}-${iv.seconds}`;
  if (!simCache.has(k))
    simCache.set(
      k,
      generateSimulated(pair.basePrice, pair.volatility, iv.seconds, iv.bars),
    );
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
        try {
          chartRef.current.remove();
        } catch (_) {}
        chartRef.current = null;
        seriesRef.current = null;
      }

      const chart = createChart(containerRef.current, {
        layout: { background: { color: "#0a0a0f" }, textColor: "rgba(255,255,255,0.4)" },
        grid: {
          vertLines: { color: "rgba(255,255,255,0.02)" },
          horzLines: { color: "rgba(255,255,255,0.02)" },
        },
        crosshair: {
          vertLine: {
            color: "rgba(255,255,255,0.2)",
            labelBackgroundColor: "#1f2937",
          },
          horzLine: {
            color: "rgba(255,255,255,0.2)",
            labelBackgroundColor: "#1f2937",
          },
        },
        rightPriceScale: { borderColor: "rgba(255,255,255,0.06)" },
        timeScale: {
          borderColor: "rgba(255,255,255,0.06)",
          timeVisible: true,
          secondsVisible: false,
          rightOffset: 8,
          barSpacing: 8,
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
          upColor: "#22c55e",
          downColor: "#ef4444",
          wickUpColor: "#16a34a",
          wickDownColor: "#dc2626",
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
      const data =
        chartType === "Candle"
          ? candles
          : candles.map((c) => ({ time: c.time, value: c.close }));
      series.setData(data);
      chart.timeScale().fitContent();

      // crosshair
      if (onCrosshairMove) {
        chart.subscribeCrosshairMove((param: any) => {
          if (!param?.seriesData) {
            onCrosshairMove(null);
            return;
          }
          const d = param.seriesData.values().next().value;
          onCrosshairMove(d?.close ?? d?.value ?? null);
        });
      }

      // resize observer
      const ro = new ResizeObserver(() => {
        if (containerRef.current && chart)
          chart.resize(
            containerRef.current.clientWidth,
            containerRef.current.clientHeight,
          );
      });
      ro.observe(containerRef.current!);
      cleanup = () => ro.disconnect();
    };

    init();
    return () => {
      cleanup?.();
      if (chartRef.current) {
        try {
          chartRef.current.remove();
        } catch (_) {}
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
        const data =
          chartType === "Candle"
            ? candles
            : candles.map((c) => ({ time: c.time, value: c.close }));
        series.setData(data);
      } catch (_2) {}
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candles]);

  return <div ref={containerRef} className="w-full h-full" />;
}

/* ─── Page ───────────────────────────────────────────────────────────────── */
export default function LiveMonitorChart() {
  const [pair, setPair] = useState(PAIRS[0]);
  const [iv, setIv] = useState(INTERVALS[1]); // 5m default
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
      const res = await fetch(`${MT5_API}/api/candles?symbol=${pair.key}&timeframe=${iv.mt5}&count=${iv.bars}`,
        { headers: { "ngrok-skip-browser-warning": "true" },  signal: AbortSignal.timeout(3000) },
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();

      if (json.error || !json.candles?.length) {
        throw new Error(json.error ?? "No candles returned");
      }

      const sorted: Candle[] = (json.candles as Candle[]).sort(
        (a, b) => a.time - b.time,
      );

      setCandles(sorted);
      const last = sorted[sorted.length - 1];
      const prev = sorted[sorted.length - 2];
      setLivePrice(last.close);
      setPrevClose(prev?.close ?? null);
      setSource("mt5");
      return; // success — no need for demo
    } catch (e: any) {
      setError(
        `MT5 unreachable — using demo prices (${e?.message ?? "timeout"})`,
      );
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

  useEffect(() => {
    loadData();
  }, [loadData]);

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
          const res = await fetch(`${MT5_API}/api/candles?symbol=${pair.key}&timeframe=${iv.mt5}&count=2`,
            { headers: { "ngrok-skip-browser-warning": "true" },  signal: AbortSignal.timeout(2000) },
          );
          if (!res.ok) return;
          const json = await res.json();
          if (json.error || !json.candles?.length) return;

          setCandles((prev) => {
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
            time: last.time,
            open: last.open,
            high: Math.max(last.high, newP),
            low: Math.min(last.low, newP),
            close: newP,
          };
          setLivePrice(newP);
          return [...prev.slice(0, -1), updated];
        } else {
          const nc: Candle = {
            time: bucket,
            open: last.close,
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
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [pair, iv, marketOpen, source]);

  /* ── Derived ── */
  const displayPrice = crosshair ?? livePrice;
  const isUp =
    displayPrice !== null && prevClose !== null
      ? displayPrice >= prevClose
      : true;
  const priceChange =
    livePrice !== null && prevClose !== null ? livePrice - prevClose : null;
  const pricePct =
    priceChange !== null && prevClose ? (priceChange / prevClose) * 100 : null;
  const dayHigh = useMemo(
    () => (candles.length ? Math.max(...candles.map((c) => c.high)) : null),
    [candles],
  );
  const dayLow = useMemo(
    () => (candles.length ? Math.min(...candles.map((c) => c.low)) : null),
    [candles],
  );

  /* ── Trade Execution ── */
  const executeTrade = async (action: "buy" | "sell") => {
    if (source !== "mt5") {
      alert(
        `Cannot execute trade: MT5 is disconnected. You are viewing demo data.`,
      );
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
          lot_size: lotSize,
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert(
          `Trade Successful! ${action.toUpperCase()} ${lotSize} on ${pair.key} @ ${data.price || "market"}\nTicket: ${data.ticket}`,
        );
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
  const pairBtn = (p: (typeof PAIRS)[number]) =>
    `px-2.5 py-1.5 rounded-md text-xs font-bold transition-all ${
      pair.key === p.key
        ? "text-black shadow-md"
        : "text-muted-foreground hover:text-foreground hover:bg-muted"
    }`;
  const tfBtn = (t: (typeof INTERVALS)[number]) =>
    `px-2.5 py-1.5 rounded-md text-xs font-bold transition-all ${
      iv.seconds === t.seconds
        ? "bg-violet-600 text-foreground shadow-md"
        : "text-muted-foreground hover:text-foreground hover:bg-muted"
    }`;
  const ctBtn = (c: ChartType) =>
    `px-2.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
      ct === c
        ? "bg-emerald-600 text-foreground"
        : "text-muted-foreground hover:text-foreground hover:bg-muted"
    }`;

  /* ── Market status badge ── */
  const MarketBadge = () => {
    if (!marketOpen)
      return (
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
    if (source === "loading")
      return (
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-card text-xs text-muted-foreground">
          <div className="w-3 h-3 rounded-full border border-violet-500 border-t-transparent animate-spin" />
          Loading…
        </div>
      );
    if (source === "mt5")
      return (
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
    <div className="flex flex-col h-[calc(100vh-80px)] overflow-hidden bg-[--bg-base]">
      
      {/* ── TOP HEADER (Asset & Pricing) ── */}
      <div className="flex-shrink-0 border-b p-4 flex flex-col md:flex-row md:items-center justify-between gap-4" style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
        
        {/* Left: Asset Selection & Quick Stats */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-[14px]" style={{ background: `${pair.color}15`, color: pair.color, border: `1px solid ${pair.color}30` }}>
              {pair.label[0]}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-[20px] font-bold leading-none tracking-tight" style={{ fontFamily: "var(--font-display, Syne, sans-serif)", color: "var(--text-primary)" }}>
                  {pair.label}
                </h1>
                <SourceBadge />
              </div>
              <div className="text-[12px] font-medium mt-1" style={{ color: "var(--text-tertiary)" }}>
                Lightweight Charts™ · {source === "mt5" ? "Live Broker Feed" : "Simulated Data"}
              </div>
            </div>
          </div>

          {displayPrice !== null && (
            <div className="h-10 border-l pl-6 flex items-center gap-4" style={{ borderColor: "var(--border)" }}>
              <span className={`text-[28px] font-bold font-mono tracking-tighter ${isUp ? "text-[--bull]" : "text-[--bear]"}`}>
                {displayPrice.toFixed(pair.digits)}
              </span>
              {priceChange !== null && (
                <div className="flex flex-col">
                  <div className={`text-[12px] font-bold flex items-center gap-1 ${isUp ? "text-[--bull]" : "text-[--bear]"}`}>
                    {isUp ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                    {priceChange >= 0 ? "+" : ""}{priceChange.toFixed(pair.digits)}
                  </div>
                  {pricePct !== null && (
                    <div className="text-[10px] font-bold mt-0.5" style={{ color: "var(--text-tertiary)" }}>
                      {pricePct >= 0 ? "+" : ""}{pricePct.toFixed(2)}%
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: Actions & Market Status */}
        <div className="flex items-center gap-4">
          <MarketBadge />
          
          <div className="flex items-center rounded-lg p-1 border" style={{ background: "var(--bg-elevated)", borderColor: "var(--border)" }}>
            <div className="flex items-center px-3 border-r" style={{ borderColor: "var(--border)" }}>
              <span className="text-[10px] font-bold uppercase mr-2" style={{ color: "var(--text-tertiary)" }}>LOT</span>
              <button onClick={() => setLotSize((p) => Math.max(0.01, p - 0.01))} className="w-6 h-6 flex items-center justify-center rounded hover:bg-[--bg-card] text-[12px] font-bold text-[--text-secondary]">-</button>
              <input type="number" step="0.01" value={lotSize} onChange={(e) => setLotSize(parseFloat(e.target.value) || 0.01)} className="w-12 bg-transparent text-center text-[13px] font-mono font-bold mx-1 outline-none text-[--text-primary]" />
              <button onClick={() => setLotSize((p) => p + 0.01)} className="w-6 h-6 flex items-center justify-center rounded hover:bg-[--bg-card] text-[12px] font-bold text-[--text-secondary]">+</button>
            </div>
            <div className="flex items-center px-1 gap-1">
              <button onClick={() => executeTrade("sell")} disabled={isExecuting || source !== "mt5"} className="px-5 py-1.5 rounded text-[12px] font-bold transition-all disabled:opacity-50" style={{ background: "var(--bear)", color: "#fff" }}>
                SELL
              </button>
              <button onClick={() => executeTrade("buy")} disabled={isExecuting || source !== "mt5"} className="px-5 py-1.5 rounded text-[12px] font-bold transition-all disabled:opacity-50" style={{ background: "var(--bull)", color: "#fff" }}>
                BUY
              </button>
            </div>
          </div>
          
          <button onClick={loadData} className="w-9 h-9 rounded-lg border flex items-center justify-center hover:bg-[--bg-elevated] transition-colors" style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}>
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* ── ERROR BANNER ── */}
      {error && (
        <div className="px-4 py-2 border-b flex items-center gap-2 text-[12px] font-bold" style={{ background: "rgba(255,160,0,0.1)", borderColor: "rgba(255,160,0,0.2)", color: "var(--warning)" }}>
          <AlertCircle size={14} />
          <span>MT5 Disconnected. Using fallback demo simulation. Run `python mt5_bridge.py` for live data.</span>
        </div>
      )}

      {/* ── TOOLBAR (Timeframes, Pairs) ── */}
      <div className="flex-shrink-0 border-b p-2 px-4 flex flex-wrap items-center justify-between" style={{ background: "var(--bg-base)", borderColor: "var(--border)" }}>
        <div className="flex items-center gap-6 overflow-x-auto custom-scrollbar pb-1 md:pb-0">
          {/* Pairs */}
          <div className="flex items-center gap-1">
            {PAIRS.map((p) => (
              <button key={p.key} onClick={() => setPair(p)} className="px-3 py-1.5 rounded text-[11px] font-bold transition-all whitespace-nowrap"
                style={{
                  background: pair.key === p.key ? `${p.color}15` : "transparent",
                  color: pair.key === p.key ? p.color : "var(--text-tertiary)",
                  border: pair.key === p.key ? `1px solid ${p.color}40` : "1px solid transparent"
                }}>
                {p.label}
              </button>
            ))}
          </div>
          
          <div className="w-px h-4 bg-[--border]" />
          
          {/* Timeframes */}
          <div className="flex items-center gap-1">
            {INTERVALS.map((t) => (
              <button key={t.label} onClick={() => setIv(t)} className="px-3 py-1.5 rounded text-[11px] font-bold transition-all"
                style={{
                  background: iv.seconds === t.seconds ? "var(--bg-elevated)" : "transparent",
                  color: iv.seconds === t.seconds ? "var(--text-primary)" : "var(--text-tertiary)",
                  border: iv.seconds === t.seconds ? "1px solid var(--border-strong)" : "1px solid transparent"
                }}>
                {t.label}
              </button>
            ))}
          </div>

          <div className="w-px h-4 bg-[--border]" />

          {/* Chart Types */}
          <div className="flex items-center gap-1">
            {CHART_TYPES.map((c) => (
              <button key={c} onClick={() => setCt(c)} className="px-3 py-1.5 rounded text-[11px] font-bold transition-all"
                style={{
                  background: ct === c ? "var(--bg-elevated)" : "transparent",
                  color: ct === c ? "var(--text-primary)" : "var(--text-tertiary)",
                  border: ct === c ? "1px solid var(--border-strong)" : "1px solid transparent"
                }}>
                {c}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── FULL SCREEN CHART ── */}
      <div className="flex-1 relative w-full h-full bg-[--bg-base]">
        <LWChart
          key={`${pair.key}-${iv.seconds}-${ct}`}
          candles={candles}
          chartType={ct}
          pairColor={pair.color}
          onCrosshairMove={setCrosshair}
        />

        {/* Floating Session / Watermark Layer */}
        {!marketOpen && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 px-6 py-3 rounded-full border border-[--border] bg-[--bg-elevated] text-[13px] font-bold text-[--text-tertiary] flex items-center gap-2 shadow-2xl backdrop-blur-md z-10">
            <MoonStar size={16} /> Market Closed (Opens Sun 22:00 UTC)
          </div>
        )}
      </div>
    </div>
  );
}
