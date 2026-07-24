"use client";

import { useEffect, useState, useCallback } from "react";
import { useWebSocket } from "../providers/WebSocketProvider";
import Chart from "./Chart";
import VolumeProfile from "./VolumeProfile";
import MultiChartCompare from "./MultiChartCompare";
import { listDrawings, addDrawing, clearDrawings } from "../../lib/terminalApi";

const TIMEFRAMES = ["M1", "M5", "M15", "M30", "H1", "H4", "D1", "W1"];
const INDICATOR_DEFS = [
  { key: "ma20", label: "MA20" },
  { key: "ma50", label: "MA50" },
  { key: "ma200", label: "MA200" },
  { key: "rsi", label: "RSI" },
  { key: "macd", label: "MACD" },
  { key: "bb", label: "BB" },
  { key: "atr", label: "ATR" },
];
const TOOLS = [
  { key: "trendline", label: "Trendline" },
  { key: "fib", label: "Fib" },
  { key: "zone", label: "Zone" },
  { key: "hline", label: "Level" },
];

interface TogglePillProps {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  testId?: string;
}

function TogglePill({ active, onClick, children, testId }: TogglePillProps) {
  return (
    <button
      data-testid={testId}
      onClick={onClick}
      className={`text-[10px] tracking-widest uppercase border px-2 py-0.5 transition-colors ${
        active
          ? "border-amber-500 text-amber-500 bg-amber-500/10"
          : "border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200"
      }`}
    >
      {children}
    </button>
  );
}

interface CenterPanelProps {
  symbol: string;
  timeframe: string;
  onTimeframeChange: (tf: string) => void;
  snapshot: any;
}

export default function CenterPanel({ symbol, timeframe, onTimeframeChange, snapshot }: CenterPanelProps) {
  const [chartType, setChartType] = useState("Candles");
  const [indicators, setIndicators] = useState<any>({
    ma20: true,
    ma50: true,
    ma200: false,
    rsi: true,
    macd: false,
    bb: false,
    atr: false,
  });
  const toggleInd = (k: string) => setIndicators((p: any) => ({ ...p, [k]: !p[k] }));

  // Drawing state
  const [drawMode, setDrawMode] = useState<string | null>(null);
  const [drawings, setDrawings] = useState<any[]>([]);
  // Phase B: compare + volume profile
  const [compareMode, setCompareMode] = useState(false);
  const [showVP, setShowVP] = useState(false);

  useEffect(() => {
    let cancelled = false;
    listDrawings(symbol)
      .then((d) => !cancelled && setDrawings(d))
      .catch(() => !cancelled && setDrawings([]));
    return () => {
      cancelled = true;
    };
  }, [symbol]);

  const handleDrawingComplete = useCallback(
    async (drawing: any) => {
      try {
        const saved = await addDrawing({ symbol, ...drawing });
        setDrawings((prev) => [...prev, saved]);
      } catch (_) {
        /* ignore */
      } finally {
        setDrawMode(null);
      }
    },
    [symbol]
  );

  const handleClearDrawings = async () => {
    try {
      await clearDrawings(symbol);
    } catch (_) {
      /* ignore */
    }
    setDrawings([]);
  };

  // Live price via global WebSocket provider (shared single connection)
  const { livePrices } = useWebSocket();
  const lastTick = livePrices[symbol] ?? null;

  const candles = snapshot?.candles || [];
  const last = candles[candles.length - 1];
  const prev = candles[candles.length - 2];

  // Prefer live WebSocket mid; fall back to last candle close
  const lastPrice = lastTick?.mid ?? last?.close;
  // Change vs previous candle close to reflect intra-bar movement
  const basePrice = prev?.close ?? last?.open;
  const change = lastPrice && basePrice ? lastPrice - basePrice : 0;
  const changePct = change && basePrice ? (change / basePrice) * 100 : 0;
  const digits = symbol === "USDJPY" || symbol.endsWith("JPY") ? 3 : 5;

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Chart header */}
      <div className="shrink-0 border-b border-zinc-800 bg-zinc-950">
        <div className="flex items-center gap-3 px-3 min-h-9 py-1 flex-wrap">
          <div className="flex items-baseline gap-2">
            <span data-testid="chart-symbol" className="text-sm font-bold tracking-wider text-zinc-100">
              {symbol}
            </span>
            <span className="text-[10px] uppercase tracking-widest text-zinc-500">
              {timeframe}
            </span>
          </div>
          <span
            data-testid="chart-last-price"
            className={`font-mono text-sm tabular-nums whitespace-nowrap ${
              change >= 0 ? "text-emerald-500" : "text-red-500"
            }`}
          >
            {lastPrice ? lastPrice.toFixed(digits) : "—"}
          </span>
          <span
            className={`font-mono text-[11px] whitespace-nowrap ${change >= 0 ? "text-emerald-500" : "text-red-500"}`}
          >
            {change >= 0 ? "▲" : "▼"} {Math.abs(change).toFixed(digits)} ({changePct.toFixed(2)}%)
          </span>
          <div className="flex-1 min-w-[20px]" />
          <div className="flex items-center gap-1 flex-wrap">
            {TIMEFRAMES.map((tf) => (
              <TogglePill
                key={tf}
                testId={`tf-${tf}`}
                active={timeframe === tf}
                onClick={() => onTimeframeChange(tf)}
              >
                {tf}
              </TogglePill>
            ))}
          </div>
          <div className="flex items-center gap-1 pl-2 ml-2 border-l border-zinc-800 flex-wrap">
            {["Line", "Candles"].map((t) => (
              <TogglePill
                key={t}
                testId={`charttype-${t.toLowerCase()}`}
                active={chartType === t}
                onClick={() => setChartType(t)}
              >
                {t}
              </TogglePill>
            ))}
            <TogglePill
              testId="toggle-compare"
              active={compareMode}
              onClick={() => setCompareMode((v) => !v)}
            >
              Compare 2×2
            </TogglePill>
            <TogglePill
              testId="toggle-volume-profile"
              active={showVP}
              onClick={() => setShowVP((v) => !v)}
            >
              Vol Profile
            </TogglePill>
          </div>
        </div>
        <div className="flex items-center gap-3 px-3 min-h-8 py-1 flex-wrap border-t border-zinc-900">
          <span className="text-[10px] uppercase tracking-widest text-zinc-500">Indicators</span>
          <div className="flex gap-1 flex-wrap">
            {INDICATOR_DEFS.map((ind) => (
              <TogglePill
                key={ind.key}
                testId={`indicator-${ind.key}`}
                active={!!indicators[ind.key]}
                onClick={() => toggleInd(ind.key)}
              >
                {ind.label}
              </TogglePill>
            ))}
          </div>
          <span className="text-[10px] uppercase tracking-widest text-zinc-500 ml-3">Tools</span>
          <div className="flex gap-1 flex-wrap">
            {TOOLS.map((t) => (
              <TogglePill
                key={t.key}
                testId={`tool-${t.key}`}
                active={drawMode === t.key}
                onClick={() => setDrawMode(drawMode === t.key ? null : t.key)}
              >
                {t.label}
              </TogglePill>
            ))}
            <TogglePill testId="clear-all" active={false} onClick={handleClearDrawings}>
              Clear
            </TogglePill>
          </div>
          {drawMode && (
            <span data-testid="drawing-hint" className="text-[10px] text-amber-500 font-mono ml-2">
              Click chart to place {drawMode === "hline" ? "level" : "2 points"}
            </span>
          )}
        </div>
      </div>

      {/* Chart body */}
      <div className="flex-1 min-h-0 relative bg-black" data-testid="chart-body">
        {compareMode ? (
          <MultiChartCompare symbol={symbol} />
        ) : (
          <>
            <Chart
              candles={candles}
              indicators={indicators}
              drawingMode={drawMode}
              drawings={drawings}
              onDrawingComplete={handleDrawingComplete}
              symbol={symbol}
            />
            {showVP && <VolumeProfile candles={candles} />}
          </>
        )}
        {/* Floating legend / trade plan overlay */}
        <div className="absolute top-2 left-2 text-[10px] font-mono space-y-0.5 pointer-events-none">
          <div className="flex items-center gap-2">
            <span className="inline-block w-3 h-px bg-cyan-400" />
            <span className="text-zinc-400">MA20</span>
            <span className="inline-block w-3 h-px bg-amber-500 ml-2" />
            <span className="text-zinc-400">MA50</span>
            <span className="inline-block w-3 h-px bg-violet-400 ml-2" />
            <span className="text-zinc-400">MA200</span>
          </div>
          <div className="text-zinc-500">Vol shown beneath</div>
        </div>
      </div>

      {/* Chart notes */}
      <div className="shrink-0 border-t border-zinc-800 bg-zinc-950 px-3 py-1.5 text-[11px] font-mono">
        <div className="grid grid-cols-2 gap-x-6 gap-y-0.5">
          <span className="text-zinc-500">
            Trade Plan: <span className="text-zinc-200">SELL @ 1.0950 · SL 1.0980 · TP 1.0850</span>{" "}
            <span className="text-emerald-500">R:R 1:3.33</span>
          </span>
          <span className="text-zinc-500">
            RSI: <span className="text-amber-500">35 oversold</span> · MACD:{" "}
            <span className="text-red-500">bearish ✓</span>
          </span>
          <span className="text-zinc-500">
            Levels: <span className="text-zinc-200">S1 1.0850 · S2 1.0800 · R1 1.1050</span>
          </span>
          <span className="text-amber-500">⚠ ECB rate decision in 47 min — expect spike to 1.0920</span>
        </div>
      </div>
    </div>
  );
}
