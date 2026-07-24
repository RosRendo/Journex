import { useState, useCallback, useEffect } from "react";
import { getBackendUrl, fetchWithAuth } from "@/lib/utils";
import { getSession } from "@/lib/useSession";
import { useWorkspace, WorkspaceType } from "@/src/context/WorkspaceContext";

// Use getBackendUrl() — returns NEXT_PUBLIC_BACKEND_URL or localhost:5000.
// Never uses resolveLocalUrl() which was blindly replacing 'localhost' with
// the current window hostname, producing broken URLs like
// http://dashboard-roan-tau-xrg43s0811.vercel.app:3000 on Vercel.
const BRIDGE_URL = process.env.NEXT_PUBLIC_BRIDGE_URL || "/api/bridge";
const DB_API_URL = process.env.NEXT_PUBLIC_API_URL || "/api";
const API_URL   = getBackendUrl();

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
  notes?: string;
  imageUrl?: string;
  followedPlan?: boolean;
  planDeviationReason?: string;
  checklistPassed?: boolean;
  emotion?: string;
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
export function useCsvTrades(accountId?: string, autoRefreshMs: number = 0) {
  const [trades, setTrades] = useState<TradeData[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  // Safe workspace retrieval (fallback to 'Global' if context not available, e.g. some layouts)
  let activeWorkspace: WorkspaceType = "Global";
  try {
    const wsContext = useWorkspace();
    activeWorkspace = wsContext.activeWorkspace;
  } catch (e) {}

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

  const filterByWorkspace = useCallback((unfiltered: TradeData[]) => {
    if (activeWorkspace === "Global" || activeWorkspace === "Funded Challenge" || activeWorkspace === "Scalping" || activeWorkspace === "Swing") {
      return unfiltered;
    }
    return unfiltered.filter((t) => {
      if (!t || !t.pair) return false;
      const pair = t.pair.toUpperCase();
      if (activeWorkspace === "Gold") {
        return pair.includes("XAU");
      }
      if (activeWorkspace === "Crypto") {
        return pair.includes("BTC") || pair.includes("ETH") || pair.includes("SOL");
      }
      if (activeWorkspace === "Forex") {
        return pair.length >= 6 && !pair.includes("XAU") && !pair.includes("BTC") && !pair.includes("ETH") && !pair.includes("SOL");
      }
      return true;
    });
  }, [activeWorkspace]);

  const API_BASE = BRIDGE_URL;
  const DB_API = DB_API_URL;

  // Fetch true history from Live MT5 bridge (bypassing node backend)
  const fetchTrades = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // 1. Fetch from MT5 bridge history
      const url = `${API_BASE}/api/history`;
      const response = await fetchWithAuth(url);

      if (!response.ok) {
        throw new Error(`Failed to fetch MT5 history (${response.status})`);
      }

      const data = await response.json();
      const fetchedTrades = data.trades || data.data || [];

      const normalized: TradeData[] = fetchedTrades.map((t: any) => ({
        id: t.id,
        date: t.date,
        openTime: t.openTime,
        pair: t.pair,
        direction: t.direction,
        entry: Number(t.entry || 0),
        closePrice: t.closePrice !== undefined && t.closePrice !== null ? Number(t.closePrice) : undefined,
        lotSize: t.lotSize !== undefined && t.lotSize !== null ? Number(t.lotSize) : undefined,
        profit: Number(t.profit || 0),
        outcome: t.outcome,
        ticket: t.ticket,
      }));

      // 2. ALSO fetch from database API for recently placed trades
      try {
        const session = await getSession();
        const headers: Record<string, string> = { "ngrok-skip-browser-warning": "true" };
        const apiToken = (session?.user as any)?.apiToken;
        if (apiToken) {
          headers["Authorization"] = `Bearer ${apiToken}`;
        }

        const fetchUrl = DB_API_URL === "http://localhost:5000" ? `${DB_API}/api/trades?limit=100&sortBy=date&order=DESC` : `/api/trades?limit=100&sortBy=date&order=DESC`;
        const dbRes = await fetch(fetchUrl, {
          headers
        });
        if (dbRes.ok) {
          const dbData = await dbRes.json();
          const dbTrades = dbData.data || [];
          
          // Merge and dedupe by ticket
          const ticketMap = new Map<string, TradeData>();
          normalized.forEach(t => { if (t.ticket) ticketMap.set(String(t.ticket), t); });
          
          dbTrades.forEach((t: any) => {
            const ticketStr = t.ticket ? String(t.ticket) : null;
            if (ticketStr) {
              if (ticketMap.has(ticketStr)) {
                // If it is in both, copy the database details onto the bridge trade object
                const existing = ticketMap.get(ticketStr)!;
                existing.id = t.id; // DB auto-increment integer ID
                existing.notes = t.notes || "";
                existing.imageUrl = t.imageUrl || "";
                existing.followedPlan = t.followedPlan !== null ? t.followedPlan : undefined;
                existing.planDeviationReason = t.planDeviationReason || "";
                existing.checklistPassed = t.checklistPassed !== null ? t.checklistPassed : undefined;
                existing.emotion = t.emotion || "";
              } else {
                // If only in DB, add it
                ticketMap.set(ticketStr, {
                  id: t.id,
                  date: t.closeTime || t.date,
                  openTime: t.date,
                  pair: t.pair,
                  direction: (t.direction?.toLowerCase() === "buy" || t.direction?.toLowerCase() === "long") ? "Long" : "Short",
                  entry: Number(t.entry || 0),
                  closePrice: t.closePrice !== undefined && t.closePrice !== null ? Number(t.closePrice) : undefined,
                  lotSize: t.lotSize !== undefined && t.lotSize !== null ? Number(t.lotSize) : undefined,
                  profit: Number(t.profit || 0),
                  outcome: Number(t.profit || 0) > 0 ? "W" : Number(t.profit || 0) < 0 ? "L" : "E",
                  ticket: String(t.ticket),
                  notes: t.notes || "",
                  imageUrl: t.imageUrl || "",
                  followedPlan: t.followedPlan !== null ? t.followedPlan : undefined,
                  planDeviationReason: t.planDeviationReason || "",
                  checklistPassed: t.checklistPassed !== null ? t.checklistPassed : undefined,
                  emotion: t.emotion || "",
                });
              }
            }
          });
          
          const merged = Array.from(ticketMap.values());
          const filteredMerged = filterByWorkspace(merged);
          setTrades(filteredMerged.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
          const calculatedAnalytics = calculateAnalytics(filteredMerged);
          setAnalytics(calculatedAnalytics);
          setLastUpdated(new Date().toISOString());
          setLoading(false);
          return;
        }
      } catch (dbErr) {
        console.warn("Failed to fetch trades from DB:", dbErr);
      }

      const filteredNormalized = filterByWorkspace(normalized);
      setTrades(filteredNormalized);
      const calculatedAnalytics = calculateAnalytics(filteredNormalized);
      setAnalytics(calculatedAnalytics);
      setLastUpdated(new Date().toISOString());
    } catch (err: any) {
      setError(err.message || "Error fetching trades");
      console.error("Error fetching CSV trades:", err);
    } finally {
      setLoading(false);
    }
  }, [accountId, calculateAnalytics]);

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
  }, [fetchTrades, autoRefreshMs]); // Dependency on fetchTrades which now depends on activeWorkspace

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
  }, [accountId]);

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
  }, []);

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
