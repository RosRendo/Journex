import { useEffect, useRef, useState, useCallback } from "react";
import { api } from "../lib/terminalApi";

export interface WatchlistSymbol {
  symbol: string;
  name: string;
  price: number;
  bid: number;
  ask: number;
  change_pips: number;
  change_pct: number;
  digits: number;
  lastDir?: "up" | "down" | "flat";
}

export interface Position {
  id: string;
  symbol: string;
  type: "BUY" | "SELL";
  volume: number;
  entryPrice: number;
  current: number;
  pnl: number;
  pnl_pct: number;
  magic?: number;
  comment?: string;
  open_time?: string;
  lastDir?: "up" | "down";
}

export interface TerminalSnapshot {
  symbol: string;
  timeframe: string;
  status: {
    live: boolean;
    connected: boolean;
    latency_ms: number;
    updates_per_sec: number;
    provider?: string;
  };
  watchlist: WatchlistSymbol[];
  positions: Position[];
  account: {
    balance: number;
    equity: number;
    margin: number;
    margin_free: number;
    margin_level: number;
    leverage: number;
    profit: number;
  };
  news: Array<{
    id: string;
    time: string;
    title: string;
    source: string;
    sentiment: "positive" | "negative" | "neutral" | string;
    urgency: "high" | "medium" | "low" | string;
    impact: string;
  }>;
  trades_today: number;
  watchlist_count: number;
  drawings: any[];
  [key: string]: any;
}

/**
 * Fetches a full snapshot from the backend and keeps a few streams "live"
 * by mutating prices on a fixed interval. This simulates a websocket feed.
 */
export function useTerminalData(symbol: string, timeframe: string) {
  const [snapshot, setSnapshot] = useState<TerminalSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const tickRef = useRef(0);

  // Initial snapshot fetch + auto-refetch when live, simulated drift when mock.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const load = () =>
      api
        .get<TerminalSnapshot>("/terminal/snapshot", { params: { symbol, timeframe } })
        .then((res) => {
          if (cancelled) return;
          setSnapshot(res.data);
          setError(null);
        })
        .catch((e: any) => {
          if (cancelled) return;
          setError(e?.message || "Failed to load snapshot");
        })
        .finally(() => !cancelled && setLoading(false));
    load();
    return () => {
      cancelled = true;
    };
  }, [symbol, timeframe]);

  // Real Data Polling: Fetch snapshot every 4 seconds directly from broker adapter
  useEffect(() => {
    const id = setInterval(() => {
      api
        .get<TerminalSnapshot>("/terminal/snapshot", { params: { symbol, timeframe } })
        .then((res) => setSnapshot(res.data))
        .catch(() => {});
    }, 4000);
    return () => clearInterval(id);
  }, [symbol, timeframe]);

  const refetch = useCallback(() => {
    api
      .get<TerminalSnapshot>("/terminal/snapshot", { params: { symbol, timeframe } })
      .then((res) => setSnapshot(res.data))
      .catch(() => {});
  }, [symbol, timeframe]);

  return { snapshot, loading, error, refetch };
}

export function useUtcClock() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}
