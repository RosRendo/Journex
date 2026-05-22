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

  // When live broker is connected, poll the snapshot every 5 seconds (the WS
  // handles tick-by-tick chart animation; snapshot just refreshes the other
  // widgets — positions/account/news/etc.). Polling faster causes the chart
  // to snap back on every setData call.
  useEffect(() => {
    if (!snapshot?.status?.live) return undefined;
    const id = setInterval(() => {
      api
        .get<TerminalSnapshot>("/terminal/snapshot", { params: { symbol, timeframe } })
        .then((res) => setSnapshot(res.data))
        .catch(() => {});
    }, 5000);
    return () => clearInterval(id);
  }, [snapshot?.status?.live, symbol, timeframe]);

  // Simulated streaming tick: drift watchlist prices + positions P&L (only mock)
  useEffect(() => {
    if (!snapshot) return undefined;
    if (snapshot.status?.live) return undefined; // do not drift on real data
    const id = setInterval(() => {
      tickRef.current += 1;
      setSnapshot((prev) => {
        if (!prev) return prev;
        const next = { ...prev };
        
        // Watchlist drift (bounded — does not accumulate change_pct/change_pips)
        next.watchlist = prev.watchlist.map((w) => {
          const tick = Math.pow(10, -w.digits);
          const drift = (Math.random() - 0.5) * tick * 6;
          const newPrice = +(w.price + drift).toFixed(w.digits);
          const direction: "up" | "down" | "flat" = newPrice > w.price ? "up" : newPrice < w.price ? "down" : w.lastDir || "flat";
          // Random walk change_pips around a small band [-90, +90]
          const newPips = Math.max(-90, Math.min(90, (w.change_pips ?? 0) + (Math.random() - 0.5) * 2));
          // change_pct as % of price (small movement in basis-points scale)
          const newPct = +(newPips / 100).toFixed(2);
          return {
            ...w,
            price: newPrice,
            bid: +(newPrice - tick).toFixed(w.digits),
            ask: +(newPrice + tick).toFixed(w.digits),
            change_pips: +newPips.toFixed(1),
            change_pct: newPct,
            lastDir: direction,
          };
        });

        // Positions P&L drift
        next.positions = prev.positions.map((p) => {
          const drift = (Math.random() - 0.48) * 40;
          return {
            ...p,
            pnl: +(p.pnl + drift).toFixed(2),
            pnl_pct: +(p.pnl_pct + drift / 10000).toFixed(3),
            current:
              p.symbol === "USDJPY"
                ? +(p.current + (Math.random() - 0.5) * 0.02).toFixed(3)
                : +(p.current + (Math.random() - 0.5) * 0.0002).toFixed(5),
            lastDir: drift >= 0 ? "up" : "down" as const,
          };
        });

        // Account equity tracks position P&L
        const totalPnl = next.positions.reduce((s, p) => s + p.pnl, 0);
        next.account = {
          ...prev.account,
          equity: +(prev.account.balance + totalPnl).toFixed(2),
        };

        // Status tick
        next.status = {
          ...prev.status,
          latency_ms: 35 + Math.floor(Math.random() * 25),
          updates_per_sec: 480 + Math.floor(Math.random() * 90),
        };
        return next;
      });
    }, 1200);
    return () => clearInterval(id);
  }, [snapshot?.symbol, snapshot?.timeframe, snapshot?.status?.live]); // eslint-disable-line

  const refetch = useCallback(() => {
    api
      .get<TerminalSnapshot>("/terminal/snapshot", { params: { symbol, timeframe } })
      .then((res) => setSnapshot(res.data))
      .catch(() => {});
  }, [symbol, timeframe]);

  return { snapshot, loading, error, refetch };
}

export function useUtcClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}
