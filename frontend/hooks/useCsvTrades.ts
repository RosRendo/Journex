import { useState, useCallback, useEffect } from "react";
import { resolveLocalUrl } from "@/lib/utils";

const BRIDGE_URL = resolveLocalUrl(process.env.NEXT_PUBLIC_BRIDGE_URL || "http://localhost:5003");
const API_URL = resolveLocalUrl(process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000");
const DB_API_URL = resolveLocalUrl(process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000");

export interface TradeData {
  id: number;
  date: string; // close time
  openTime?: string; // open/entry time
  pair: string;
  direction: "Long" | "Short";
  entry: number;
  closePrice?: number;
  lotSize?: number;
  profit: number;
  outcome: "W" | "L" | "E";
  ticket?: string;
}

export interface Analytics {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  breakEvenTrades: number;
  winRate: number;
  totalProfit: number;
  profitFactor: number;
  avgWin: number;
  avgLoss: number;
  bestTrade: number;
  worstTrade: number;
}

/**
 * Hook to fetch trades and analytics from CSV imports
 * Replaces the MT5 Bridge connection hook
 */
export function useCsvTrades(accountId?: number, autoRefreshMs: number = 0) {
  const [trades, setTrades] = useState<TradeData[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  // Calculate analytics from trades
  const calculateAnalytics = useCallback((tradesList: TradeData[]) => {
    if (tradesList.length === 0) {
      return {
        totalTrades: 0,
        winningTrades: 0,
        losingTrades: 0,
        breakEvenTrades: 0,
        winRate: 0,
        totalProfit: 0,
        profitFactor: 0,
        avgWin: 0,
        avgLoss: 0,
        bestTrade: 0,
        worstTrade: 0,
      };
    }

    const wins = tradesList.filter((t) => t.profit > 0);
    const losses = tradesList.filter((t) => t.profit < 0);
    const breakEven = tradesList.filter((t) => t.profit === 0);

    const totalProfit = tradesList.reduce((sum, t) => sum + t.profit, 0);
    const totalWins = wins.reduce((sum, t) => sum + t.profit, 0);
    const totalLosses = Math.abs(losses.reduce((sum, t) => sum + t.profit, 0));

    return {
      totalTrades: tradesList.length,
      winningTrades: wins.length,
      losingTrades: losses.length,
      breakEvenTrades: breakEven.length,
      winRate:
        tradesList.length > 0 ? (wins.length / tradesList.length) * 100 : 0,
      totalProfit: totalProfit,
      profitFactor: totalLosses > 0 ? totalWins / totalLosses : 0,
      avgWin: wins.length > 0 ? totalWins / wins.length : 0,
      avgLoss: losses.length > 0 ? -totalLosses / losses.length : 0,
      bestTrade:
        wins.length > 0 ? Math.max(...tradesList.map((t) => t.profit)) : 0,
      worstTrade:
        losses.length > 0 ? Math.min(...tradesList.map((t) => t.profit)) : 0,
    };
  }, []);

  const API_BASE = BRIDGE_URL;
  const DB_API = DB_API_URL;

  // Fetch true history from Live MT5 bridge (bypassing node backend)
  const fetchTrades = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // 1. Fetch from MT5 bridge history
      const url = `${API_BASE}/api/history`;
      const response = await fetch(url, {
        headers: {
          "ngrok-skip-browser-warning": "true"
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch MT5 history (${response.status})`);
      }

      const data = await response.json();
      const fetchedTrades = data.data || [];

      const normalized: TradeData[] = fetchedTrades.map((t: any) => ({
        id: t.id,
        date: t.date,
        openTime: t.openTime,
        pair: t.pair,
        direction: t.direction,
        entry: t.entry,
        closePrice: t.closePrice,
        lotSize: t.lotSize,
        profit: t.profit,
        outcome: t.outcome,
        ticket: t.ticket,
      }));

      // 2. ALSO fetch from database API for recently placed trades
      try {
        const dbRes = await fetch(`${DB_API}/api/trades?limit=100&sortBy=date&order=DESC`, {
          headers: { "ngrok-skip-browser-warning": "true" }
        });
        if (dbRes.ok) {
          const dbData = await dbRes.json();
          const dbTrades = dbData.data || [];
          
          // Merge and dedupe by ticket
          const ticketMap = new Map<number, TradeData>();
          normalized.forEach(t => { if (t.ticket) ticketMap.set(Number(t.ticket), t); });
          
          dbTrades.forEach((t: any) => {
            if (t.ticket && !ticketMap.has(Number(t.ticket))) {
              ticketMap.set(Number(t.ticket), {
                id: t.id,
                date: t.closeTime || t.date,
                openTime: t.date,
                pair: t.pair,
                direction: t.direction === "buy" ? "Long" : "Short",
                entry: t.entry,
                closePrice: t.closePrice,
                lotSize: t.lot,
                profit: t.profit || 0,
                outcome: (t.profit || 0) > 0 ? "W" : (t.profit || 0) < 0 ? "L" : "E",
                ticket: String(t.ticket)
              });
            }
          });
          
          const merged = Array.from(ticketMap.values());
          setTrades(merged.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
          const calculatedAnalytics = calculateAnalytics(merged);
          setAnalytics(calculatedAnalytics);
          setLastUpdated(new Date().toISOString());
          setLoading(false);
          return;
        }
      } catch (dbErr) {
        console.warn("Failed to fetch trades from DB:", dbErr);
      }

      setTrades(normalized);
      const calculatedAnalytics = calculateAnalytics(normalized);
      setAnalytics(calculatedAnalytics);
      setLastUpdated(new Date().toISOString());
    } catch (err: any) {
      setError(err.message || "Error fetching trades");
      console.error("Error fetching CSV trades:", err);
    } finally {
      setLoading(false);
    }
  }, [accountId, calculateAnalytics, API_BASE, DB_API]);

  // Fetch trades when component mounts
  useEffect(() => {
    fetchTrades();

    // Set up auto-refresh (every 30 seconds for journal sync)
    if (autoRefreshMs > 0) {
      const interval = setInterval(() => {
        fetchTrades();
      }, autoRefreshMs);
      return () => clearInterval(interval);
    } else {
      // Default 30s sync interval
      const interval = setInterval(() => {
        fetchTrades();
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [fetchTrades, autoRefreshMs]);

  return {
    trades,
    analytics,
    loading,
    error,
    lastUpdated,
    refresh: fetchTrades,
  };
}

/**
 * Hook to fetch broker account analytics
 */
export function useBrokerAnalytics(accountId: number) {
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const API_BASE = API_URL;

  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `${API_BASE}/api/broker/analytics/${accountId}`,
      );

      if (!response.ok) {
        throw new Error("Failed to fetch analytics");
      }

      const data = await response.json();
      setAnalyticsData(data.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [accountId, API_BASE]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  return {
    analyticsData,
    loading,
    error,
    refresh: fetchAnalytics,
  };
}

/**
 * Hook to fetch all broker accounts
 */
export function useBrokerAccounts() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const API_BASE = API_URL;

  const fetchAccounts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${API_BASE}/api/broker/accounts`, { headers: { "ngrok-skip-browser-warning": "true" } });

      if (!response.ok) {
        throw new Error("Failed to fetch accounts");
      }

      const data = await response.json();
      setAccounts(data.data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [API_BASE]);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  return {
    accounts,
    loading,
    error,
    refresh: fetchAccounts,
  };
}
