import { useState, useEffect } from "react";

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
  
  const BRIDGE_URL = process.env.NEXT_PUBLIC_BRIDGE_URL ?? "http://localhost:5003";

  useEffect(() => {
    let mounted = true;

    const fetchPositions = async () => {
      try {
        const res = await fetch(`${BRIDGE_URL}/api/positions`, {
          headers: { "ngrok-skip-browser-warning": "true" }
        });
        if (!res.ok) throw new Error("Network response was not ok");
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
  }, [accountId, BRIDGE_URL, autoRefreshMs]);

  return { positions, loading, error };
}
