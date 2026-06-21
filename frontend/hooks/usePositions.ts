import { useState, useEffect } from "react";
import { getBackendUrl } from "@/lib/utils";
import { getSession } from "@/lib/useSession";

export interface Position {
  ticket: number;
  pair: string;
  direction: "Long" | "Short";
  volume: number;
  entry: number;
  current: number;
  sl: number;
  tp: number;
  pnl: number;
  swap?: number;
  openTime: string;
}

export function usePositions(accountId?: string, autoRefreshMs: number = 2000) {
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const fetchPositions = async () => {
      try {
        // Always route through the backend proxy — never hit the bridge directly from the browser.
        // The backend enforces admin auth and returns mock data for non-admin callers.
        const backendUrl = getBackendUrl();
        const session = await getSession();
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (session?.user?.email) {
          headers["Authorization"] = `Bearer ${session.user.email}`;
        }
        const res = await fetch(`${backendUrl}/api/bridge/api/positions`, { headers });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        if (!mounted) return;

        if (data.success && data.positions) {
          setPositions(data.positions);
          setError(null);
        } else {
          setError(data.error || "Failed to fetch positions");
          if (data.error === "MT5 not connected") setPositions([]);
        }
      } catch (e) {
        if (mounted) setError(e instanceof Error ? e.message : "Failed to fetch");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchPositions();

    if (autoRefreshMs > 0) {
      const interval = setInterval(fetchPositions, autoRefreshMs);
      return () => {
        mounted = false;
        clearInterval(interval);
      };
    }

    return () => {
      mounted = false;
    };
  }, [accountId, autoRefreshMs]);

  return { positions, loading, error };
}
